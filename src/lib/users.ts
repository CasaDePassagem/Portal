import {
  findUserByEmail,
  findUserById,
  insertUser,
  listUsers,
  patchUser,
  removeUser,
  setUserPassword,
  subscribeUsers,
  verifyPassword,
} from './memoryStore';
import { hydrateFromRemote, syncInBackground } from './remoteSync';
import {
  isBackendAvailable,
  remoteChangePassword,
  remoteConfirmPasswordReset,
  remoteCreateRecord,
  remoteDeleteRecord,
  remoteLoginInit,
  remoteLoginVerify,
  remoteRequestAdminOtp,
  remoteRequestPasswordReset,
  remoteVerifyPassword,
  remoteUpdateRecord,
  remoteGenerateUserInvite,
  remoteResendUserInvite,
  remoteCompleteInvite,
} from './remoteStore';
import type { UserRecord, UserRole } from './types';

export type { UserRecord, UserRole } from './types';

export interface CreateUserInput {
  email: string;
  fullName: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  email?: string;
}

export function normalizeRole(input: unknown): UserRole {
  return input === 'admin' ? 'admin' : 'user';
}


function ensureCrypto() {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto;
  }
  throw new Error('crypto_unavailable');
}

function base64FromString(value: string) {
  if (typeof btoa === 'function') {
    return btoa(value);
  }
  const globalBuffer = (globalThis as Record<string, any>).Buffer as
    | { from: (value: unknown, encoding?: string) => { toString(enc: string): string } }
    | undefined;
  if (globalBuffer) {
    return globalBuffer.from(value, 'utf-8').toString('base64');
  }
  throw new Error('base64_encoding_unavailable');
}

function base64FromBytes(bytes: Uint8Array) {
  const globalBuffer = (globalThis as Record<string, any>).Buffer as
    | { from: (value: unknown, encoding?: string) => { toString(enc: string): string } }
    | undefined;
  if (globalBuffer) {
    return globalBuffer.from(bytes).toString('base64');
  }
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function encodePasswordHash(password: string) {
  const cryptoApi = ensureCrypto();
  const saltSource = typeof cryptoApi.randomUUID === 'function'
    ? cryptoApi.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 18)}`;
  const rawSalt = saltSource.slice(0, 16);
  const saltB64 = base64FromString(rawSalt);
  const encoder = new TextEncoder();
  const keyData = encoder.encode(saltB64);
  const key = await cryptoApi.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await cryptoApi.subtle.sign('HMAC', key, encoder.encode(password));
  const hashB64 = base64FromBytes(new Uint8Array(signature));
  return `s:${saltB64}$h:${hashB64}`;
}

export async function createUser(
  input: CreateUserInput,
  options?: { adminOtp?: { token: string; code: string } },
): Promise<UserRecord> {
  if (!input.email.trim()) throw new Error('Email é obrigatório');
  const normalizedPassword = input.password?.trim() ?? '';
  const backendOnline = isBackendAvailable();
  if (!backendOnline && normalizedPassword.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres');
  }

  const existing = findUserByEmail(input.email);
  if (existing) {
    throw new Error('Já existe um usuário com este email');
  }

  if (backendOnline) {
    const uid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    let hashedPassword: string | null = null;
    if (normalizedPassword.length >= 6) {
      try {
        hashedPassword = await encodePasswordHash(normalizedPassword);
      } catch (err) {
        if ((err as Error)?.message === 'crypto_unavailable') {
          console.warn('[createUser] WebCrypto indisponível; enviando senha para hashing no backend');
          hashedPassword = null;
        } else {
          throw err;
        }
      }
    }
    const remoteRecord: Record<string, unknown> = {
      uid,
      email: input.email.trim(),
      fullName: input.fullName.trim() || input.email.trim(),
      role: input.role ?? 'user',
      isActive: input.isActive ?? false,
    };
    if (hashedPassword) {
      remoteRecord.passwordHash = hashedPassword;
      remoteRecord.hashSenha = hashedPassword; // compatibilidade com backend
      remoteRecord.hasPassword = true;
    } else if (normalizedPassword.length >= 6) {
      remoteRecord.password = normalizedPassword;
    } else {
      remoteRecord.hasPassword = false;
      remoteRecord.passwordHash = '';
    }
    await remoteCreateRecord(
      'users',
      remoteRecord,
      options?.adminOtp
        ? { otpToken: options.adminOtp.token, otpCode: options.adminOtp.code }
        : undefined,
    );
    await hydrateFromRemote();
    const refreshed = findUserById(uid) ?? findUserByEmail(input.email.trim());
    if (!refreshed) throw new Error('Não foi possível localizar o usuário recém-criado.');
    const { passwordHash, ...user } = refreshed;
    return user;
  }

  const record = insertUser({
    email: input.email.trim(),
    fullName: input.fullName.trim() || input.email.trim(),
    password: normalizedPassword,
    role: input.role ?? 'user',
    isActive: input.isActive ?? false,
  });

  const { passwordHash, ...user } = record;
  return user;
}

export async function fetchUser(uid: string): Promise<UserRecord | null> {
  const record = findUserById(uid);
  if (!record) return null;
  const { passwordHash, ...user } = record;
  return user;
}

export async function fetchAllUsers(): Promise<UserRecord[]> {
  return listUsers();
}

export function listenAllUsers(cb: (users: UserRecord[]) => void) {
  return subscribeUsers(cb);
}

export async function updateUser(uid: string, input: UpdateUserInput) {
  const patch: UpdateUserInput = {};
  if (input.fullName !== undefined) {
    patch.fullName = input.fullName.trim();
  }
  if (input.email !== undefined) {
    patch.email = input.email.trim();
  }
  if (input.role !== undefined) {
    patch.role = input.role;
  }
  if (input.isActive !== undefined) {
    patch.isActive = input.isActive;
  }
  patchUser(uid, patch as Partial<UserRecord>);

  if (isBackendAvailable()) {
    await remoteUpdateRecord('users', uid, { ...patch } as Record<string, unknown>);
    syncInBackground({ silent: true });
  }
}

export async function deleteUser(uid: string, options?: { hard?: boolean }) {
  removeUser(uid);
  if (isBackendAvailable()) {
    await remoteDeleteRecord('users', uid, { hard: options?.hard ?? false });
    syncInBackground({ silent: true });
  }
}

export async function changeUserPassword(uid: string, currentPassword: string, newPassword: string) {
  if (newPassword.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres');
  }

  if (isBackendAvailable()) {
    await remoteChangePassword(currentPassword, newPassword);
    setUserPassword(uid, newPassword);
    syncInBackground({ silent: true });
    return;
  }

  const record = findUserById(uid);
  if (!record) throw new Error('Usuário não encontrado');
  const isValid = record.passwordHash
    ? await verifyPassword(record.passwordHash, currentPassword)
    : false;
  if (!isValid) throw new Error('Senha atual incorreta');
  setUserPassword(uid, newPassword);
}

export type InitiateLoginResult =
  | { status: 'success'; user: UserRecord }
  | { status: 'otp_required'; token: string; email: string; expiresIn: number };

export async function initiateLogin(email: string, password: string): Promise<InitiateLoginResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isBackendAvailable()) {
    const response = await remoteLoginInit(normalizedEmail, password);
    if (response && (response as Record<string, unknown>).otp) {
      const token = String((response as Record<string, unknown>).token || '');
      const expiresInRaw = Number((response as Record<string, unknown>).expiresIn || DEFAULT_OTP_TTL);
      return {
        status: 'otp_required',
        token,
        email: normalizedEmail,
        expiresIn: Number.isFinite(expiresInRaw) ? expiresInRaw : DEFAULT_OTP_TTL,
      };
    }
    throw Object.assign(new Error('Fluxo de login inválido'), { code: 'auth/unexpected-response' });
  }

  const record = findUserByEmail(normalizedEmail);
  if (!record) return Promise.reject(Object.assign(new Error('Credenciais inválidas'), { code: 'auth/invalid-credentials' }));

  const isValid = record.passwordHash ? await verifyPassword(record.passwordHash, password) : false;
  if (!isValid) {
    const error = new Error('Credenciais inválidas');
    (error as Error & { code?: string }).code = 'auth/invalid-credentials';
    throw error;
  }

  if (!record.isActive) {
    const error = new Error('Conta desativada. Contate um administrador.');
    (error as Error & { code?: string }).code = 'auth/user-disabled';
    throw error;
  }

  const { passwordHash, ...user } = record;
  return { status: 'success', user };
}

export async function completeLogin(token: string, otpCode: string): Promise<UserRecord> {
  if (!isBackendAvailable()) {
    throw new Error('BACKEND indisponível');
  }
  const actor = (await remoteLoginVerify(token, otpCode)) as { uid?: string } | null;
  await hydrateFromRemote();
  const uid = actor && typeof actor.uid === 'string' ? actor.uid : undefined;
  if (uid) {
    const user = findUserById(uid);
    if (user) {
      const { passwordHash, ...rest } = user;
      return rest;
    }
  }
  throw new Error('Não foi possível finalizar o login');
}

export async function verifyCurrentPassword(uid: string, password: string): Promise<boolean> {
  if (isBackendAvailable()) {
    try {
      await remoteVerifyPassword(password);
      return true;
    } catch {
      return false;
    }
  }
  const record = findUserById(uid);
  if (!record) return false;
  return record.passwordHash ? verifyPassword(record.passwordHash, password) : false;
}

const DEFAULT_OTP_TTL = 300;

export async function requestPasswordReset(email: string, resetBaseUrl: string): Promise<void> {
  if (!email.trim()) return;
  if (isBackendAvailable()) {
    await remoteRequestPasswordReset(email.trim().toLowerCase(), resetBaseUrl);
    return;
  }
}

export async function confirmPasswordReset(params: { token: string; otp: string; newPassword: string }): Promise<void> {
  if (!params.token || !params.otp || !params.newPassword) {
    throw new Error('missing_parameters');
  }
  if (params.newPassword.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres');
  }
  if (isBackendAvailable()) {
    await remoteConfirmPasswordReset(params.token, params.otp, params.newPassword);
    await hydrateFromRemote();
  }
}

export async function sendUserInvite(email: string, baseUrl: string): Promise<void> {
  if (!email.trim()) throw new Error('Email é obrigatório');
  if (!baseUrl.trim()) throw new Error('URL inválida');
  if (!isBackendAvailable()) throw new Error('Convites indisponíveis offline');
  await remoteGenerateUserInvite(email.trim().toLowerCase(), baseUrl.trim());
}

export async function resendUserInvite(email: string, baseUrl: string): Promise<void> {
  if (!email.trim()) throw new Error('Email é obrigatório');
  if (!baseUrl.trim()) throw new Error('URL inválida');
  if (!isBackendAvailable()) throw new Error('Convites indisponíveis offline');
  await remoteResendUserInvite(email.trim().toLowerCase(), baseUrl.trim());
}

export async function completeUserInvite(token: string, newPassword: string): Promise<void> {
  if (!token.trim()) throw new Error('Convite inválido');
  if (newPassword.length < 6) throw new Error('Senha deve ter pelo menos 6 caracteres');
  if (!isBackendAvailable()) throw new Error('BACKEND indisponível');
  await remoteCompleteInvite(token.trim(), newPassword);
  await hydrateFromRemote();
}

export async function requestAdminOtp(purpose: string): Promise<{ token: string; expiresIn: number }> {
  if (!isBackendAvailable()) {
    throw new Error('Não é possível solicitar código no modo offline.');
  }
  const { token, expiresIn } = await remoteRequestAdminOtp(purpose);
  if (!token) {
    throw new Error('Não foi possível gerar um código de confirmação.');
  }
  return {
    token,
    expiresIn: Number.isFinite(expiresIn) ? expiresIn : DEFAULT_OTP_TTL,
  };
}
