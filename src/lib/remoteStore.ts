const BASE_URL = (import.meta.env.VITE_REMOTE_BASE_URL ?? '').trim();
const API_SECRET = (import.meta.env.VITE_REMOTE_API_SECRET ?? '').trim();

type RemoteResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
  [key: string]: unknown;
};

type DumpPayload = {
  users?: Array<Record<string, unknown>>;
  topics?: Array<Record<string, unknown>>;
  contents?: Array<Record<string, unknown>>;
  lessons?: Array<Record<string, unknown>>;
  participants?: Array<Record<string, unknown>>;
};

let sessionToken: string | null = null;

function isRemoteEnabled() {
  return Boolean(BASE_URL && API_SECRET);
}

function withQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    q.append(key, String(value));
  });
  return q.toString();
}

async function parseResponse<T>(resp: Response): Promise<RemoteResponse<T>> {
  let json: RemoteResponse<T>;
  try {
    const text = await resp.text();
    json = JSON.parse(text) as RemoteResponse<T>;
  } catch (err) {
    console.error('Erro ao parsear resposta:', err);
    throw new Error(`Erro ao ler resposta do gateway (status ${resp.status})`);
  }
  if (!resp.ok || !json.ok) {
    const reason = json.error ?? `status_${resp.status}`;
    const err = new Error(reason);
    (err as Error & { status?: number }).status = resp.status;
    throw err;
  }
  return json;
}

export function setSession(token: string | null) {
  sessionToken = token;
}

export function getSession() {
  return sessionToken;
}

export async function fetchDump(): Promise<DumpPayload | null> {
  if (!isRemoteEnabled()) return null;
  const query = withQuery({
    action: 'dump',
    secret: API_SECRET,
    sessionToken: sessionToken ?? undefined,
  });
  const resp = await fetch(`${BASE_URL}?${query}`, {
    method: 'GET',
    mode: 'cors',
  });
  const json = await parseResponse<DumpPayload>(resp);
  return json.data ?? null;
}

async function fetchNonce(): Promise<string | null> {
  if (!isRemoteEnabled()) return null;
  const query = withQuery({
    action: 'nonce',
    secret: API_SECRET,
    sessionToken: sessionToken ?? undefined,
  });
  const resp = await fetch(`${BASE_URL}?${query}`, {
    method: 'GET',
    mode: 'cors',
  });
  const json = await parseResponse<{ nonce?: string }>(resp);
  if (typeof (json as Record<string, unknown>).nonce === 'string') {
    return String((json as Record<string, unknown>).nonce ?? '');
  }
  return json.data?.nonce ?? null;
}

async function postAction<T>(body: Record<string, unknown>, opts?: { requireNonce?: boolean }) {
  if (!isRemoteEnabled()) return null;
  const payload = { ...body };

  // Se requireNonce for false, não adiciona nonce nem sessionToken
  if (opts?.requireNonce === false) {
    // Não adiciona nada - chamada pública
  } else if (opts?.requireNonce) {
    // Exige nonce - só funciona com sessão
    const nonce = await fetchNonce();
    if (!nonce) throw new Error('Não foi possível obter nonce remoto');
    payload.nonce = nonce;
  }

  // Só adiciona sessionToken se existir E não for chamada pública
  if (sessionToken && payload.sessionToken === undefined && opts?.requireNonce !== false) {
    payload.sessionToken = sessionToken;
  }

  const query = withQuery({ secret: API_SECRET });
  const resp = await fetch(`${BASE_URL}?${query}`, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(payload),
  });
  const json = await parseResponse<T>(resp);
  return json;
}

export async function remoteLoginInit(email: string, password: string) {
  if (!isRemoteEnabled()) {
    throw new Error('BACKEND indisponível');
  }
  const resp = await postAction<{ token?: string; otp?: boolean; expiresIn?: number }>({
    action: 'auth_login',
    email,
    password,
  });
  return resp;
}

export async function remoteLogout() {
  if (!isRemoteEnabled() || !sessionToken) return;
  try {
    await postAction({ action: 'auth_logout', sessionToken }, { requireNonce: false });
  } catch {
    // ignore
  } finally {
    setSession(null);
  }
}

export async function remoteChangePassword(oldPassword: string, newPassword: string) {
  if (!isRemoteEnabled()) {
    throw new Error('BACKEND indisponível');
  }
  await postAction(
    {
      action: 'auth_change_password',
      oldPassword,
      newPassword,
    },
    { requireNonce: true },
  );
}

export async function remoteUpsertRecords(table: string, records: Array<unknown>) {
  if (!isRemoteEnabled()) return;
  if (!records.length) return;
  const requiresNonce = table === 'participants' ? false : true;
  await postAction(
    {
      action: 'batch_upsert',
      table,
      records,
    },
    { requireNonce: requiresNonce },
  );
}

export async function remoteCreateRecord(
  table: string,
  record: unknown,
  options?: { otpToken?: string; otpCode?: string },
) {
  if (!isRemoteEnabled()) return;
  const payload: Record<string, unknown> = {
    action: 'create',
    table,
    record,
  };
  if (options?.otpToken) payload.otpToken = options.otpToken;
  if (options?.otpCode) payload.otpCode = options.otpCode;
  await postAction(payload, { requireNonce: true });
}

export async function remoteUpdateRecord(
  table: string,
  id: string,
  patch: unknown,
) {
  if (!isRemoteEnabled()) return;
  await postAction(
    {
      action: 'update',
      table,
      id,
      patch,
    },
    { requireNonce: true },
  );
}

export async function remoteDeleteRecord(table: string, id: string, options?: { hard?: boolean }) {
  if (!isRemoteEnabled()) return;
  await postAction(
    {
      action: 'delete',
      table,
      id,
      hard: options?.hard ?? false,
    },
    { requireNonce: true },
  );
}

export async function remoteFetchParticipant(code: string): Promise<Record<string, unknown> | null> {
  if (!isRemoteEnabled()) return null;
  const query = withQuery({
    action: 'get',
    table: 'participants',
    id: code,
    secret: API_SECRET,
  });
  try {
    const resp = await fetch(`${BASE_URL}?${query}`, {
      method: 'GET',
      mode: 'cors',
    });
    const json = await parseResponse<Record<string, unknown>>(resp);
    return json.data ?? null;
  } catch (error) {
    console.warn('Erro ao buscar participante:', error);
    return null;
  }
}

export async function remoteUpsertCustomFields(records: Array<Record<string, unknown>>) {
  if (!isRemoteEnabled()) return;
  await remoteUpsertRecords(
    'participant_custom_schema',
    records,
  );
}

export async function remoteDeleteCustomField(id: string) {
  await remoteDeleteRecord('participant_custom_schema', id);
}

export async function remoteUpsertCustomPages(records: Array<Record<string, unknown>>) {
  if (!isRemoteEnabled()) return;
  await remoteUpsertRecords('participant_custom_pages', records);
}

export async function remoteDeleteCustomPage(id: string) {
  await remoteDeleteRecord('participant_custom_pages', id);
}

export async function remoteUpsertCustomValues(records: Array<Record<string, unknown>>) {
  if (!isRemoteEnabled()) return;
  await remoteUpsertRecords(
    'participant_custom_data',
    records,
  );
}

export async function remoteDeleteCustomValue(id: string) {
  await remoteDeleteRecord('participant_custom_data', id);
}

export function isBackendAvailable() {
  return isRemoteEnabled();
}

export async function remoteLoginVerify(otpToken: string, otpCode: string) {
  if (!isRemoteEnabled()) {
    throw new Error('BACKEND indisponível');
  }
  const resp = await postAction<{ token: string; actor: Record<string, unknown> }>({
    action: 'auth_login_verify',
    token: otpToken,
    otp: otpCode,
  });
  const session = resp && typeof resp.token === 'string' ? resp.token : undefined;
  if (!session) throw new Error('Sessão não retornou token');
  setSession(session);
  return resp?.actor ?? null;
}

export async function remoteRequestPasswordReset(email: string, resetBaseUrl: string) {
  if (!isRemoteEnabled()) return;
  await postAction(
    {
      action: 'auth_password_reset_request',
      email,
      resetBaseUrl,
    },
    { requireNonce: false },
  );
}

export async function remoteConfirmPasswordReset(token: string, otp: string, newPassword: string) {
  if (!isRemoteEnabled()) return;
  await postAction(
    {
      action: 'auth_password_reset_confirm',
      token,
      otp,
      newPassword,
    },
    { requireNonce: false },
  );
}

export async function remoteVerifyPassword(password: string) {
  if (!isRemoteEnabled()) {
    throw new Error('BACKEND indisponível');
  }
  await postAction({
    action: 'auth_verify_password',
    password,
  });
}

export async function remoteRequestAdminOtp(purpose: string) {
  if (!isRemoteEnabled()) {
    throw new Error('BACKEND indisponível');
  }
  const resp = await postAction<{ token?: string; expiresIn?: number }>(
    {
      action: 'auth_admin_otp_request',
      purpose,
    },
  );
  const data = resp as Record<string, unknown>;
  return {
    token: String(data.token || ''),
    expiresIn: Number(data.expiresIn || 300),
  };
}

export async function remoteGenerateUserInvite(email: string, baseUrl: string) {
  if (!isRemoteEnabled()) return;
  await postAction(
    {
      action: 'auth_invite_generate',
      email,
      baseUrl,
    },
    { requireNonce: true },
  );
}

export async function remoteResendUserInvite(email: string, baseUrl: string) {
  if (!isRemoteEnabled()) return;
  await postAction(
    {
      action: 'auth_invite_resend',
      email,
      baseUrl,
    },
    { requireNonce: true },
  );
}

export async function remoteCompleteInvite(token: string, newPassword: string) {
  if (!isRemoteEnabled()) {
    throw new Error('BACKEND indisponível');
  }
  await postAction(
    {
      action: 'auth_invite_confirm',
      token,
      newPassword,
    },
    { requireNonce: false },
  );
}
