/***** ================= CONFIG / SCHEMA ================= *****/

function cfg(k){ return PropertiesService.getScriptProperties().getProperty(k) || ''; }
const ORIGIN  = () => cfg('ALLOWED_ORIGIN');
const API_SECRET = () => cfg('API_SECRET');
const RECAPTCHA_SECRET = () => cfg('RECAPTCHA_SECRET');

const SCHEMA = {
  users: {
    key: 'id',
    headers: ['id','email','nomeCompleto','perfil','ativo','hashSenha','criadoEm','atualizadoEm'],
    validators: {
      id: s => str(s, 128),
      email: s => str((s||'').toLowerCase(), 256),
      nomeCompleto: s => str(s, 256),
      perfil: s => (String(s) === 'admin' ? 'admin' : 'user'),
      ativo: v => bool(v),
      hashSenha: s => str(s, 512),
      criadoEm: d => dateOrNow(d),
      atualizadoEm: d => dateOrNow(d),
    }
  },
  topics: {
    key: 'id',
    headers: ['id','nome','categoria','cor','ordem','imagemCapaUrl','imagemCapaAlt','criadoEm','atualizadoEm'],
    validators: {
      id: s => str(s, 128),
      nome: s => str(s, 128),
      categoria: s => str(s, 64),
      cor: s => str(s, 32),
      ordem: n => int(n),
      imagemCapaUrl: s => str(s, 512),
      imagemCapaAlt: s => str(s, 256),
      criadoEm: d => dateOrNow(d),
      atualizadoEm: d => dateOrNow(d),
    }
  },
  contents: {
    key: 'id',
    headers: ['id','topicoId','titulo','descricao','ordem','imagemCapaUrl','imagemCapaAlt','dificuldade','criadoEm','atualizadoEm'],
    validators: {
      id: s => str(s, 128),
      topicoId: s => str(s, 128),
      titulo: s => str(s, 256),
      descricao: s => str(s, 4000),
      ordem: n => int(n),
      imagemCapaUrl: s => str(s, 512),
      imagemCapaAlt: s => str(s, 256),
      dificuldade: s => str(s, 32),
      criadoEm: d => dateOrNow(d),
      atualizadoEm: d => dateOrNow(d),
    }
  },
  lessons: {
    key: 'id',
    headers: ['id','conteudoId','titulo','youtubeUrl','ordem','descricao','criadoEm','atualizadoEm'],
    validators: {
      id: s => str(s, 128),
      conteudoId: s => str(s, 128),
      titulo: s => str(s, 256),
      youtubeUrl: s => str(s, 512),
      ordem: n => int(n),
      descricao: s => str(s, 4000),
      criadoEm: d => dateOrNow(d),
      atualizadoEm: d => dateOrNow(d),
    }
  },
  participants: {
    key: 'codigo',
    headers: ['codigo','nome','sobrenome','idade','sexo','nomePai','nomeMae','casaAcolhimento','progressoAulas','criadoEm','ultimaAtividade'],
    validators: {
      codigo: s => str(s, 128),
      nome: s => str(s, 128),
      sobrenome: s => str(s, 128),
      idade: n => int(n),
      sexo: s => str(s, 32),
      nomePai: s => str(s, 256),
      nomeMae: s => str(s, 256),
      casaAcolhimento: s => str(s, 256),
      progressoAulas: v => jsonText(v, 100000),
      criadoEm: d => dateOrNow(d),
      ultimaAtividade: d => dateOrNow(d),
    }
  }
  ,
  participant_custom_pages: {
    key: 'id',
    headers: ['id','label','ordem','icone','cor','criadoPor','criadoEm','atualizadoPor','atualizadoEm','arquivado'],
    validators: {
      id: s => str(s, 128),
      label: s => str(s, 256),
      ordem: n => int(n),
      icone: s => str(s, 64),
      cor: s => str(s, 32),
      criadoPor: s => str(s, 128),
      criadoEm: d => dateOrNow(d),
      atualizadoPor: s => str(s, 128),
      atualizadoEm: d => dateOrNow(d),
      arquivado: v => bool(v),
    },
  },
  participant_custom_schema: {
    key: 'id',
    headers: ['id','label','tipo','descricao','restricoes','ordem','paginaId','obrigatorio','criadoPor','criadoEm','atualizadoPor','atualizadoEm','arquivado'],
    validators: {
      id: s => str(s, 128),
      label: s => str(s, 256),
      tipo: s => str(s, 64),
      descricao: s => str(s, 512),
      restricoes: v => jsonText(v, 5000),
      ordem: n => int(n),
      paginaId: s => str(s, 128),
      obrigatorio: v => bool(v),
      criadoPor: s => str(s, 128),
      criadoEm: d => dateOrNow(d),
      atualizadoPor: s => str(s, 128),
      atualizadoEm: d => dateOrNow(d),
      arquivado: v => bool(v),
    },
  },
  participant_custom_data: {
    key: 'id',
    headers: ['id','codigo','campoId','valor','metadados','criadoPor','criadoEm','atualizadoPor','atualizadoEm'],
    validators: {
      id: s => str(s, 128),
      codigo: s => str(s, 128),
      campoId: s => str(s, 128),
      valor: s => str(s, 4000),
      metadados: v => jsonText(v, 5000),
      criadoPor: s => str(s, 128),
      criadoEm: d => dateOrNow(d),
      atualizadoPor: s => str(s, 128),
      atualizadoEm: d => dateOrNow(d),
    },
  }
};

const LEGACY_HEADERS = {
  users: ['uid','email','fullName','role','isActive','passwordHash','createdAt','updatedAt'],
  topics: ['id','name','category','color','order','coverImageUrl','coverImageAlt','createdAt','updatedAt'],
  contents: ['id','topicId','title','description','order','coverImageUrl','coverImageAlt','difficulty','createdAt','updatedAt'],
  lessons: ['id','contentId','title','youtubeUrl','order','description','createdAt','updatedAt'],
  participants: ['code','displayName','createdAt','lastActiveAt','lessonProgress'],
  participant_custom_pages: ['id','label','order','icon','color','createdBy','createdAt','updatedBy','updatedAt','isArchived'],
  participant_custom_schema: ['id','label','type','description','settings','order','pageId','isRequired','createdBy','createdAt','updatedBy','updatedAt','isArchived'],
  participant_custom_data: ['id','code','fieldId','value','metadata','createdBy','createdAt','updatedBy','updatedAt'],
};

const FIELD_MAP = {
  users: {
    uid: 'id',
    email: 'email',
    fullName: 'nomeCompleto',
    role: 'perfil',
    isActive: 'ativo',
    passwordHash: 'hashSenha',
    createdAt: 'criadoEm',
    updatedAt: 'atualizadoEm',
  },
  topics: {
    name: 'nome',
    category: 'categoria',
    color: 'cor',
    order: 'ordem',
    coverImageUrl: 'imagemCapaUrl',
    coverImageAlt: 'imagemCapaAlt',
    createdAt: 'criadoEm',
    updatedAt: 'atualizadoEm',
  },
  contents: {
    topicId: 'topicoId',
    title: 'titulo',
    description: 'descricao',
    order: 'ordem',
    coverImageUrl: 'imagemCapaUrl',
    coverImageAlt: 'imagemCapaAlt',
    difficulty: 'dificuldade',
    createdAt: 'criadoEm',
    updatedAt: 'atualizadoEm',
  },
  lessons: {
    contentId: 'conteudoId',
    title: 'titulo',
    youtubeUrl: 'youtubeUrl',
    order: 'ordem',
    description: 'descricao',
    createdAt: 'criadoEm',
    updatedAt: 'atualizadoEm',
  },
  participants: {
    code: 'codigo',
    firstName: 'nome',
    lastName: 'sobrenome',
    age: 'idade',
    gender: 'sexo',
    fatherName: 'nomePai',
    motherName: 'nomeMae',
    careHouse: 'casaAcolhimento',
    lessonProgress: 'progressoAulas',
    createdAt: 'criadoEm',
    lastActiveAt: 'ultimaAtividade',
  },
  participant_custom_schema: {
    id: 'id',
    label: 'label',
    type: 'tipo',
    description: 'descricao',
    constraints: 'restricoes',
    order: 'ordem',
    pageId: 'paginaId',
    isRequired: 'obrigatorio',
    createdBy: 'criadoPor',
    createdAt: 'criadoEm',
    updatedBy: 'atualizadoPor',
    updatedAt: 'atualizadoEm',
    isArchived: 'arquivado',
  },
  participant_custom_pages: {
    id: 'id',
    label: 'label',
    order: 'ordem',
    icon: 'icone',
    color: 'cor',
    createdBy: 'criadoPor',
    createdAt: 'criadoEm',
    updatedBy: 'atualizadoPor',
    updatedAt: 'atualizadoEm',
    isArchived: 'arquivado',
  },
  participant_custom_data: {
    id: 'id',
    code: 'codigo',
    fieldId: 'campoId',
    value: 'valor',
    metadata: 'metadados',
    createdBy: 'criadoPor',
    createdAt: 'criadoEm',
    updatedBy: 'atualizadoPor',
    updatedAt: 'atualizadoEm',
  },
};

const FIELD_MAP_REVERSE = Object.keys(FIELD_MAP).reduce((acc, table) => {
  const entries = FIELD_MAP[table];
  const rev = {};
  Object.keys(entries).forEach(clientKey => {
    const sheetKey = entries[clientKey];
    const normalized = String(sheetKey ?? '').trim();
    rev[sheetKey] = clientKey;
    rev[normalized] = clientKey;
  });
  acc[table] = rev;
  return acc;
}, {});

function actorIdentifier(actor){
  if (!actor) return 'anon';
  if (actor.uid) return String(actor.uid);
  if (actor.email) return String(actor.email);
  return 'anon';
}

function ensureUuid(value){
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : Utilities.getUuid();
}

function normalizeCustomPageRecord(record, actor, existing){
  const now = nowStr();
  const merged = { ...record };
  merged.id = ensureUuid(merged.id);
  merged.label = (merged.label || '').toString().trim();
  const existingOrder = existing && typeof existing.order === 'number' ? existing.order : 0;
  merged.order = Number.isFinite(merged.order) ? merged.order : existingOrder;
  merged.icon = (merged.icon || '').toString().trim();
  merged.color = (merged.color || '').toString().trim();
  merged.isArchived = Boolean(merged.isArchived);
  const creator = existing?.createdBy || merged.createdBy || actorIdentifier(actor);
  const createdAt = existing?.createdAt || merged.createdAt || now;
  merged.createdBy = creator;
  merged.createdAt = createdAt;
  merged.updatedBy = actorIdentifier(actor);
  merged.updatedAt = now;
  return merged;
}

function normalizeCustomSchemaRecord(record, actor, existing){
  const now = nowStr();
  const merged = { ...record };
  merged.id = ensureUuid(merged.id);
  merged.label = (merged.label || '').toString().trim();
  merged.type = (merged.type || 'text').toString().trim() || 'text';
  merged.description = (merged.description || '').toString().trim();
  merged.constraints = merged.constraints === undefined ? '{}' : merged.constraints;
  const existingOrder = existing && typeof existing.order === 'number' ? existing.order : 0;
  merged.order = Number.isFinite(merged.order) ? merged.order : existingOrder;
  merged.pageId = (merged.pageId || '').toString().trim();
  merged.isRequired = Boolean(merged.isRequired);
  merged.isArchived = Boolean(merged.isArchived);
  const creator = existing?.createdBy || merged.createdBy || actorIdentifier(actor);
  const createdAt = existing?.createdAt || merged.createdAt || now;
  merged.createdBy = creator;
  merged.createdAt = createdAt;
  merged.updatedBy = actorIdentifier(actor);
  merged.updatedAt = now;
  return merged;
}

function normalizeCustomDataRecord(record, actor, existing){
  const now = nowStr();
  const merged = { ...record };
  merged.id = ensureUuid(merged.id);
  merged.code = (merged.code || '').toString().trim();
  merged.fieldId = (merged.fieldId || '').toString().trim();
  merged.metadata = merged.metadata === undefined ? '{}' : merged.metadata;
  const creator = existing?.createdBy || merged.createdBy || actorIdentifier(actor);
  const createdAt = existing?.createdAt || merged.createdAt || now;
  merged.createdBy = creator;
  merged.createdAt = createdAt;
  merged.updatedBy = actorIdentifier(actor);
  merged.updatedAt = now;
  return merged;
}

function toSheetKey(table, clientKey){
  const map = FIELD_MAP[table] || {};
  return map[clientKey] || clientKey;
}

function toClientKey(table, sheetKey){
  const map = FIELD_MAP_REVERSE[table] || {};
  const normalized = String(sheetKey || '').trim();
  return map[sheetKey] || map[normalized] || normalized;
}

function toSheetRecord(table, input){
  const out = {};
  Object.keys(input || {}).forEach(key => {
    const value = input[key];
    const sheetKey = toSheetKey(table, key);
    out[sheetKey] = value;
  });
  return out;
}

function headersEqual(a, b){
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i=0;i<a.length;i++){
    const left = String(a[i] ?? '').trim();
    const right = String(b[i] ?? '').trim();
    if (left !== right) return false;
  }
  return true;
}

function ensureCurrentHeaders(table, sheet, headers){
  const expected = SCHEMA[table]?.headers;
  if (!expected) return headers;
  if (headersEqual(headers, expected)) return headers;
  const legacy = LEGACY_HEADERS[table];
  if (legacy && headers.length === expected.length) {
    const convertible = headers.every((header, index) => {
      const normalized = String(header || '').trim();
      const expectedHeader = String(expected[index] ?? '').trim();
      const legacyHeader = String(legacy[index] ?? '').trim();
      return normalized === expectedHeader || normalized === legacyHeader;
    });
    if (convertible) {
      sheet.getRange(1,1,1, expected.length).setValues([expected]);
      sheet.setFrozenRows(1);
      sheet.getRange('1:1').setFontWeight('bold').setBackground('#f1f3f4').setWrap(true);
      return expected;
    }
  }
  if (legacy && headersEqual(headers, legacy)) {
    sheet.getRange(1,1,1, expected.length).setValues([expected]);
    sheet.setFrozenRows(1);
    sheet.getRange('1:1').setFontWeight('bold').setBackground('#f1f3f4').setWrap(true);
    return expected;
  }
  return headers;
}

function fromSheetRecord(table, record){
  const out = {};
  Object.keys(record || {}).forEach(key => {
    const clientKey = toClientKey(table, key);
    out[clientKey] = record[key];
  });
  return out;
}

/***** ================= ENTRYPOINTS / CORS ================= *****/

function doOptions(e){ 
  return buildResponse({ ok:true }, 200); 
}

function doGet(e){
  if (!validateApiSecret(e)) return buildResponse({ ok:false, error:'forbidden' }, 403);
  const p = e.parameter || {};
  const action = (p.action || 'dump').toLowerCase();
  const actor = getActorFromRequest(e, null);

  try {
    if (action === 'nonce') return buildResponse({ ok:true, nonce: newNonce() }, 200);

    if (action === 'dump') {
      const out = {};
      Object.keys(SCHEMA).forEach(name => {
        let rows = readAll(name);
        if (name === 'users') rows = sanitizeUsers(rows);
        out[name] = rows;
      });
      return buildResponse({ ok:true, data: out }, 200);
    }

    if (action === 'list') {
      const table = p.table;
      if (!SCHEMA[table]) return buildResponse({ ok:false, error:'unknown_table' }, 400);
      const { rows } = readTable(table);
      const limit  = Math.min(parseInt(p.limit || '100', 10), 1000);
      const offset = Math.max(parseInt(p.offset || '0', 10), 0);
      let filtered = rows;
      if (p.field && typeof p.eq !== 'undefined') {
        filtered = rows.filter(r => String(r[p.field] ?? '') === String(p.eq));
      }
      if (table === 'users') filtered = sanitizeUsers(filtered);
      return buildResponse({ ok:true, total: filtered.length, data: filtered.slice(offset, offset + limit) }, 200);
    }

    if (action === 'get') {
      const table = p.table, id = p.id;
      if (!SCHEMA[table]) return buildResponse({ ok:false, error:'unknown_table' }, 400);
      if (!id) return buildResponse({ ok:false, error:'missing_id' }, 400);
      let rec = getById(table, id);
      if (!rec) return buildResponse({ ok:false, error:'not_found' }, 404);
      if (table === 'users') rec = sanitizeUser(rec);
      return buildResponse({ ok:true, data: rec }, 200);
    }

    return buildResponse({ ok:false, error:'unknown_action' }, 400);
  } catch (err) {
    return buildResponse({ ok:false, error:String(err) }, 500);
  }
}

function doPost(e){
  if (!validateApiSecret(e)) return buildResponse({ ok:false, error:'forbidden' }, 403);

  let body = {};
  try { body = JSON.parse(e.postData?.contents || '{}'); }
  catch { return buildResponse({ ok:false, error:'invalid_json' }, 400); }

  const action = String(body.action || '').toLowerCase();
  if (!action) return buildResponse({ ok:false, error:'missing_action' }, 400);

  // reCAPTCHA opcional
  if (requiresCaptcha(action) && RECAPTCHA_SECRET() && !verifyRecaptcha(body.recaptcha)) {
    return buildResponse({ ok:false, error:'captcha' }, 403);
  }

  // rate limit por sessão/IP
  const key = (body.sessionToken && String(body.sessionToken).slice(0,64)) || getClientIp(e);
  if (hitLimit('rl:'+key, 300)) return buildResponse({ ok:false, error:'rate_limited' }, 429);

  // Auth
  if (action === 'auth_login')   return handleAuthLogin(body, e);
  if (action === 'auth_login_verify') return handleAuthLoginVerify(body);
  if (action === 'auth_logout')  return handleAuthLogout(body);
  if (action === 'auth_change_password') return handleAuthChangePassword(body, e);
  if (action === 'auth_verify_password') return handleAuthVerifyPassword(body, e);
  if (action === 'auth_password_reset_request') return handleAuthPasswordResetRequest(body, e);
  if (action === 'auth_password_reset_confirm') return handleAuthPasswordResetConfirm(body, e);
  if (action === 'auth_admin_otp_request') return handleAdminOtpRequest(body, e);

  // Nonce (reforço para escrita)
  const table = body.table;
  const skipNonce =
    table === 'participants' &&
    ['create', 'update', 'upsert', 'batch_upsert'].indexOf(action) >= 0;
  const needsNonce = requiresNonce(action) && !skipNonce;
  if (needsNonce && !consumeNonce(String(body.nonce||''))) {
    return buildResponse({ ok:false, error:'bad_nonce' }, 403);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return buildResponse({ ok:false, error:'busy' }, 503);

  try {
    switch (action) {
      case 'create':        return handleCreate(body, e);
      case 'update':        return handleUpdate(body, e);
      case 'upsert':        return handleUpsert(body, e);
      case 'delete':        return handleDelete(body, e);
      case 'batch_upsert':  return handleBatchUpsert(body, e);
      default:              return buildResponse({ ok:false, error:'unknown_action' }, 400);
    }
  } catch (err) {
    return buildResponse({ ok:false, error:String(err) }, 500);
  } finally {
    try { lock.releaseLock(); } catch (_){}
  }
}

/***** ================= AUTH (sessão opaca, sem JWT) ================= *****/

const SESSION_TTL_SEC = 8 * 60 * 60; // 8h

function makeToken(){ return Utilities.getUuid(); }
function sessionKey(tok){ return 'sess:'+tok; }

function createSession(user){ // {uid, role, email, fullName}
  const tok = makeToken();
  const now = Date.now();
  const data = { uid:user.uid, role:user.role||'user', email:user.email||'', fullName:user.fullName||'', iat:now, exp: now + SESSION_TTL_SEC*1000 };
  PropertiesService.getScriptProperties().setProperty(sessionKey(tok), JSON.stringify(data));
  return { token: tok, actor: data };
}
function getSession(tok){
  if (!tok) return null;
  const raw = PropertiesService.getScriptProperties().getProperty(sessionKey(tok));
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (Date.now() > s.exp) { deleteSession(tok); return null; }
    return s;
  } catch { return null; }
}
function deleteSession(tok){
  if (!tok) return;
  PropertiesService.getScriptProperties().deleteProperty(sessionKey(tok));
}

function revokeUserSessions(uid){
  if (!uid) return;
  const props = PropertiesService.getScriptProperties();
  const entries = props.getProperties();
  Object.keys(entries || {}).forEach((key) => {
    if (!key || !key.startsWith('sess:')) return;
    try {
      const data = JSON.parse(entries[key]);
      if (data && data.uid && String(data.uid) === String(uid)) {
        props.deleteProperty(key);
      }
    } catch (_err) {
      props.deleteProperty(key);
    }
  });
}

function getActorFromRequest(e, body){
  const hdr = e?.headers || {};
  const tok = (hdr['x-session-token'] || hdr['X-Session-Token'] || (body && body.sessionToken) || '').trim();
  return getSession(tok); // {uid, role, ...} | null
}

function handleAuthLogin(body, e){
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return buildResponse({ ok:false, error:'missing_credentials' }, 400);

  const u = findUserByEmail(email);
  if (!u || !bool(u.isActive)) return buildResponse({ ok:false, error:'invalid_user' }, 401);
  if (!verifyHash(password, u.passwordHash)) return buildResponse({ ok:false, error:'invalid_password' }, 401);

  const throttleKey = 'otp-login:'+u.uid;
  if (hitLimit(throttleKey, 10)) return buildResponse({ ok:false, error:'otp_rate_limited' }, 429);

  const otpCode = generateOtpCode();
  const otpToken = Utilities.getUuid();
  const salt = Utilities.getUuid().slice(0, 8);
  const expiresAt = Date.now() + OTP_TTL_SEC * 1000;

  const record = {
    uid: u.uid,
    email: u.email,
    fullName: u.fullName || u.email,
    role: u.role || 'user',
    salt,
    codeHash: hashOtp(otpCode, salt),
    attempts: 0,
    expiresAt,
  };
  persistOtpRecord('login:', otpToken, record);

  sendEmail({
    to: u.email,
    subject: 'Código de verificação - Itinerário Extensionista',
    htmlBody: loginOtpEmailHtml(otpCode),
    textBody: 'Seu código de verificação é: '+otpCode+'\nEle expira em 5 minutos.',
  });

  return buildResponse({ ok:true, otp:true, token: otpToken, expiresIn: OTP_TTL_SEC }, 200);
}
function handleAuthLoginVerify(body){
  const token = String(body.token || '').trim();
  const code = String(body.otp || body.code || '').trim();
  if (!token || !code) return buildResponse({ ok:false, error:'missing_otp' }, 400);

  const record = otpRecord('login:', token);
  if (!record) return buildResponse({ ok:false, error:'otp_expired' }, 400);
  if (record.expiresAt && Date.now() > record.expiresAt) {
    clearOtpRecord('login:', token);
    return buildResponse({ ok:false, error:'otp_expired' }, 400);
  }

  const expected = hashOtp(code, record.salt || '');
  if (expected !== record.codeHash) {
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      clearOtpRecord('login:', token);
      return buildResponse({ ok:false, error:'otp_max_attempts' }, 403);
    }
    persistOtpRecord('login:', token, record);
    return buildResponse({ ok:false, error:'invalid_otp' }, 400);
  }

  clearOtpRecord('login:', token);
  const { token: sessionToken, actor } = createSession({
    uid: record.uid,
    role: record.role,
    email: record.email,
    fullName: record.fullName,
  });
  const safeActor = { uid: actor.uid, role: actor.role, email: actor.email, fullName: actor.fullName, exp: actor.exp };
  return buildResponse({ ok:true, token: sessionToken, actor: safeActor }, 200);
}
function handleAuthLogout(body){
  deleteSession(String(body.sessionToken || ''));
  return buildResponse({ ok:true }, 200);
}
function handleAuthChangePassword(body, e){
  const actor = getActorFromRequest(e, body);
  if (!actor) return buildResponse({ ok:false, error:'unauthenticated' }, 401);
  const oldp = String(body.oldPassword || '');
  const newp = String(body.newPassword || '');
  if (newp.length < 6) return buildResponse({ ok:false, error:'weak_password' }, 400);

  const u = getById('users', actor.uid);
  if (!u || !verifyHash(oldp, u.passwordHash)) return buildResponse({ ok:false, error:'invalid_old_password' }, 401);

  const { sheet, headers } = getSheetAndHeaders('users');
  const idx = findRowByKey(sheet, headers, SCHEMA.users.key, actor.uid);
  if (idx <= 0) return buildResponse({ ok:false, error:'not_found' }, 404);
  const updatedRecord = {
    ...u,
    passwordHash: encodeHash(newp),
  };
  let sheetRecord = toSheetRecord('users', updatedRecord);
  sheetRecord[toSheetKey('users', 'updatedAt')] = nowStr();
  writeRow(sheet, headers, idx, sheetRecord);
  revokeUserSessions(actor.uid);
  return buildResponse({ ok:true }, 200);
}

function handleAuthVerifyPassword(body, e){
  const actor = getActorFromRequest(e, body);
  if (!actor) return buildResponse({ ok:false, error:'unauthenticated' }, 401);
  const password = String(body.password || '');
  if (!password) return buildResponse({ ok:false, error:'missing_password' }, 400);
  const user = getById('users', actor.uid);
  if (!user || !verifyHash(password, user.passwordHash)) {
    return buildResponse({ ok:false, error:'invalid_password' }, 401);
  }
  return buildResponse({ ok:true }, 200);
}

function handleAuthPasswordResetRequest(body){
  const email = String(body.email || '').trim().toLowerCase();
  const baseUrlRaw = String(body.resetBaseUrl || '').trim();
  if (!email) return buildResponse({ ok:true }, 200);

  if (hitLimit('otp-reset:'+email, 10)) return buildResponse({ ok:false, error:'otp_rate_limited' }, 429);

  const user = findUserByEmail(email);
  if (!user || !bool(user.isActive)) return buildResponse({ ok:true }, 200);

  const token = Utilities.getUuid();
  const otpCode = generateOtpCode();
  const salt = Utilities.getUuid().slice(0, 8);
  const expiresAt = Date.now() + RESET_TTL_SEC * 1000;

  const record = {
    uid: user.uid,
    email: user.email,
    salt,
    codeHash: hashOtp(otpCode, salt),
    attempts: 0,
    expiresAt,
  };
  persistOtpRecord('reset:', token, record);

  const cleanedBase = baseUrlRaw ? baseUrlRaw.replace(/\/+$/, '') : '';
  const link = cleanedBase ? (cleanedBase + '/resetar-senha?token=' + encodeURIComponent(token)) : '';

  sendEmail({
    to: user.email,
    subject: 'Redefinição de senha - Itinerário Extensionista',
    htmlBody: resetOtpEmailHtml(otpCode, link),
    textBody: 'Seu código para redefinir a senha é: '+otpCode+'\nEle expira em 10 minutos.\n'+(link ? 'Abra: '+link : ''),
  });

  return buildResponse({ ok:true }, 200);
}

function handleAuthPasswordResetConfirm(body){
  const token = String(body.token || '').trim();
  const code = String(body.otp || body.code || '').trim();
  const newPassword = String(body.newPassword || '');
  if (!token || !code || !newPassword) return buildResponse({ ok:false, error:'missing_parameters' }, 400);
  if (newPassword.length < 6) return buildResponse({ ok:false, error:'weak_password' }, 400);

  const record = otpRecord('reset:', token);
  if (!record) return buildResponse({ ok:false, error:'otp_expired' }, 400);
  if (record.expiresAt && Date.now() > record.expiresAt) {
    clearOtpRecord('reset:', token);
    return buildResponse({ ok:false, error:'otp_expired' }, 400);
  }

  const expected = hashOtp(code, record.salt || '');
  if (expected !== record.codeHash) {
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      clearOtpRecord('reset:', token);
      return buildResponse({ ok:false, error:'otp_max_attempts' }, 403);
    }
    persistOtpRecord('reset:', token, record);
    return buildResponse({ ok:false, error:'invalid_otp' }, 400);
  }

  const user = getById('users', record.uid);
  if (!user) {
    clearOtpRecord('reset:', token);
    return buildResponse({ ok:false, error:'not_found' }, 404);
  }

  const { sheet, headers } = getSheetAndHeaders('users');
  const idx = findRowByKey(sheet, headers, SCHEMA.users.key, record.uid);
  if (idx <= 0) {
    clearOtpRecord('reset:', token);
    return buildResponse({ ok:false, error:'not_found' }, 404);
  }

  const updatedRecord = {
    ...user,
    passwordHash: encodeHash(newPassword),
  };
  let sheetRecord = toSheetRecord('users', updatedRecord);
  sheetRecord[toSheetKey('users', 'updatedAt')] = nowStr();
  writeRow(sheet, headers, idx, sheetRecord);
  clearOtpRecord('reset:', token);
  revokeUserSessions(record.uid);
  return buildResponse({ ok:true }, 200);
}

function handleAdminOtpRequest(body, e){
  const actor = getActorFromRequest(e, body);
  if (!actor) return buildResponse({ ok:false, error:'unauthenticated' }, 401);
  if (actor.role !== 'admin') return buildResponse({ ok:false, error:'forbidden' }, 403);
  const purpose = String(body.purpose || '').trim() || 'generic';
  const throttleKey = 'otp-admin:'+actor.uid+':'+purpose;
  if (hitLimit(throttleKey, 10)) return buildResponse({ ok:false, error:'otp_rate_limited' }, 429);
  const code = generateOtpCode();
  const token = Utilities.getUuid();
  const salt = Utilities.getUuid().slice(0, 8);
  const expiresAt = Date.now() + ADMIN_OTP_TTL_SEC * 1000;
  persistOtpRecord('admin:'+purpose+':', token, {
    uid: actor.uid,
    email: actor.email,
    purpose,
    salt,
    codeHash: hashOtp(code, salt),
    attempts: 0,
    expiresAt,
  });
  sendEmail({
    to: actor.email,
    subject: 'Confirmação de ação - Itinerário Extensionista',
    htmlBody: adminOtpEmailHtml(code, purpose),
    textBody: 'Código para confirmar a ação "'+purpose+'": '+code+'\nVálido por 5 minutos.',
  });
  return buildResponse({ ok:true, token, expiresIn: ADMIN_OTP_TTL_SEC }, 200);
}

function ensureAdminOtp(actor, token, code, purpose){
  if (!actor) return { ok:false, error:'unauthenticated', status:401 };
  const cacheKey = 'admin:'+purpose+':';
  const record = otpRecord(cacheKey, token);
  if (!record) return { ok:false, error:'otp_expired', status:400 };
  if (String(record.uid) !== String(actor.uid)) {
    clearOtpRecord(cacheKey, token);
    return { ok:false, error:'otp_actor_mismatch', status:403 };
  }
  if (record.expiresAt && Date.now() > record.expiresAt) {
    clearOtpRecord(cacheKey, token);
    return { ok:false, error:'otp_expired', status:400 };
  }
  const expected = hashOtp(code, record.salt || '');
  if (expected !== record.codeHash) {
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      clearOtpRecord(cacheKey, token);
      return { ok:false, error:'otp_max_attempts', status:403 };
    }
    persistOtpRecord(cacheKey, token, record);
    return { ok:false, error:'invalid_otp', status:400 };
  }
  clearOtpRecord(cacheKey, token);
  return { ok:true };
}

// hashing simples (HMAC-SHA256 com salt aleatório)
function makeSalt(){ return Utilities.base64Encode(Utilities.getUuid().slice(0,16)); }
function hmac(password, saltB64){
  // Usa o salt como chave diretamente (string)
  const sig = Utilities.computeHmacSha256Signature(password, saltB64);
  return Utilities.base64Encode(sig);
}
function encodeHash(password){
  const salt = makeSalt();
  return 's:'+salt+'$h:'+hmac(password, salt);
}
function verifyHash(password, passwordHash){
  const m = /^s:([^$]+)\$h:(.+)$/.exec(String(passwordHash||''));
  if (!m) return false;
  const salt = m[1], hash = m[2];
  return hmac(password, salt) === hash;
}
function findUserByEmail(email){
  const { rows } = readTable('users');
  const e = String(email || '').trim().toLowerCase();
  return rows.find(r => String(r.email||'').toLowerCase() === e);
}

/***** ================= OTP / E-MAIL HELPERS ================= *****/

const OTP_TTL_SEC = 5 * 60; // 5 minutos
const RESET_TTL_SEC = 10 * 60; // 10 minutos
const ADMIN_OTP_TTL_SEC = 5 * 60;
const OTP_MAX_ATTEMPTS = 5;

function otpCache(){ return CacheService.getScriptCache(); }
function otpCacheKey(prefix, token){ return prefix + token; }

function otpRecord(prefix, token){
  const raw = otpCache().get(otpCacheKey(prefix, token));
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch (_) { return null; }
}

function persistOtpRecord(prefix, token, record){
  const ttl = Math.max(1, Math.ceil(((record.expiresAt || Date.now()) - Date.now()) / 1000));
  otpCache().put(otpCacheKey(prefix, token), JSON.stringify(record), ttl);
}

function clearOtpRecord(prefix, token){
  otpCache().remove(otpCacheKey(prefix, token));
}

function generateOtpCode(){
  return Utilities.formatString('%06d', Math.floor(Math.random() * 1000000));
}

function hashOtp(code, salt){
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + code);
  return Utilities.base64Encode(digest);
}

function sendEmail({ to, subject, htmlBody, textBody }){
  const payload = {
    to,
    subject,
    htmlBody,
    name: 'Itinerário Extensionista',
    body: textBody || ' ',
  };
  MailApp.sendEmail(payload);
}

function loginOtpEmailHtml(code){
  return '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a">'
    + '<h2 style="margin:0 0 16px;font-size:20px;color:#1d4ed8">Código de verificação</h2>'
    + '<p>Use o código abaixo para concluir seu acesso ao painel administrativo.</p>'
    + '<p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0;color:#1d4ed8">'+code+'</p>'
    + '<p style="font-size:12px;color:#475569">O código expira em 5 minutos. Se você não iniciou este acesso, ignore este e-mail.</p>'
    + '</div>';
}

function resetOtpEmailHtml(code, link){
  const cleanLink = link ? ('<p><a href="'+link+'" style="color:#1d4ed8;font-weight:600">Clique aqui para abrir a página de redefinição</a></p>') : '';
  return '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a">'
    + '<h2 style="margin:0 0 16px;font-size:20px;color:#1d4ed8">Redefinição de senha</h2>'
    + '<p>Use o código abaixo para redefinir sua senha.</p>'
    + '<p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0;color:#1d4ed8">'+code+'</p>'
    + cleanLink
    + '<p style="font-size:12px;color:#475569">O código expira em 10 minutos. Se você não solicitou, ignore este e-mail.</p>'
    + '</div>';
}

function adminOtpEmailHtml(code, purpose){
  var purposeText = 'ação administrativa';
  if (purpose === 'create_user') purposeText = 'criar um novo usuário';
  return '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a">'
    + '<h2 style="margin:0 0 16px;font-size:20px;color:#1d4ed8">Confirme esta ação</h2>'
    + '<p>Código para '+purposeText+':</p>'
    + '<p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0;color:#1d4ed8">'+code+'</p>'
    + '<p style="font-size:12px;color:#475569">O código expira em 5 minutos. Se você não solicitou, não compartilhe e comunique o responsável.</p>'
    + '</div>';
}

/***** ================= RBAC SIMPLES (admin/user) ================= *****/

function isSelf(actor, userId){ return actor && actor.uid && String(actor.uid) === String(userId); }

function authorizeWrite(e, body){
  const actor = getActorFromRequest(e, body);
  const table = body.table;
  const action = body.action;
  
  if (!SCHEMA[table]) return { ok:false, error:'unknown_table' };

  // USERS:
  // - admin: cria/edita/deleta/ upsert
  // - user: só pode update da PRÓPRIA senha
  if (table === 'users') {
    if (!actor) return { ok:false, error:'unauthenticated' };
    const action = body.action;
    if (action === 'update') {
      const id = body.id;
      const isAdmin = actor.role === 'admin';
      const self = isSelf(actor, id);
      if (!isAdmin && !self) return { ok:false, error:'forbidden_users_update' };

      if (!isAdmin) {
        const patch = body.patch || {};
        const allowed = ['passwordHash']; // updatedAt será setado pelo servidor
        const extra = Object.keys(patch).filter(k => !allowed.includes(k));
        if (extra.length) return { ok:false, error:'forbidden_users_self_only_password' };
      }
      return { ok:true, actor };
    }
    if (['create','upsert','batch_upsert','delete'].includes(action)) {
      if (actor.role !== 'admin') return { ok:false, error:'forbidden_users_admin_only' };
      return { ok:true, actor };
    }
    return { ok:false, error:'unknown_users_action' };
  }

  // TOPICS / CONTENTS / LESSONS: qualquer usuário logado pode escrever
  if (table === 'topics' || table === 'contents' || table === 'lessons') return { ok:true, actor };

  // PARTICIPANTS: qualquer usuário autenticado pode criar/atualizar; somente admins podem excluir
  if (table === 'participants') {
    if (action === 'delete') {
      if (!actor) return { ok:false, error:'unauthenticated' };
      if (actor.role !== 'admin') return { ok:false, error:'forbidden_participants_delete_admin_only' };
      return { ok:true, actor };
    }
    // create/update/upsert/batch_upsert podem ser públicos
    return { ok:true, actor: actor || null };
  }

  if (table === 'participant_custom_pages' || table === 'participant_custom_schema' || table === 'participant_custom_data') {
    if (!actor) return { ok:false, error:'unauthenticated' };
    if (action === 'delete' && actor.role !== 'admin') {
      return { ok:false, error:'forbidden_custom_delete_admin_only' };
    }
    return { ok:true, actor };
  }

  return { ok:false, error:'rule_not_defined' };
}

/***** ================= CRUD ================= *****/

function handleCreate(body, e){
  const auth = authorizeWrite(e, body);
  if (!auth.ok) return buildResponse(auth, 403);
  const table = body.table;
  const schema = SCHEMA[table];
  if (table === 'users') {
    const token = String(body.otpToken || '').trim();
    const code = String(body.otpCode || '').trim();
    const otpResult = ensureAdminOtp(auth.actor, token, code, 'create_user');
    if (!otpResult.ok) return buildResponse({ ok:false, error: otpResult.error }, otpResult.status || 403);
  }
  const sheetInput = toSheetRecord(table, body.record || {});
  let validated = validateRecord(table, sheetInput);
  if (!validated[schema.key]) return buildResponse({ ok:false, error:'missing_primary_key' }, 400);

  let clientRecord = fromSheetRecord(table, validated);

  if (table === 'users') {
    if (clientRecord.password) {
      clientRecord.passwordHash = encodeHash(String(clientRecord.password));
      delete clientRecord.password;
    }
    if (!clientRecord.passwordHash) return buildResponse({ ok:false, error:'missing_password_or_hash' }, 400);
    if (clientRecord.role !== 'admin') clientRecord.role = 'user';
    if (clientRecord.isActive === undefined) clientRecord.isActive = true;
  }

  if (table === 'participants') {
    if (!clientRecord.createdAt) clientRecord.createdAt = nowStr();
    if (!clientRecord.lastActiveAt) clientRecord.lastActiveAt = clientRecord.createdAt;
  }

  if (table === 'participant_custom_pages') {
    clientRecord = normalizeCustomPageRecord(clientRecord, auth.actor, null);
  }

  if (table === 'participant_custom_schema') {
    clientRecord = normalizeCustomSchemaRecord(clientRecord, auth.actor, null);
    if (clientRecord.pageId === '') clientRecord.pageId = null;
  }

  if (table === 'participant_custom_data') {
    clientRecord = normalizeCustomDataRecord(clientRecord, auth.actor, null);
    if (!clientRecord.code) return buildResponse({ ok:false, error:'missing_participant_code' }, 400);
    if (!clientRecord.fieldId) return buildResponse({ ok:false, error:'missing_field_id' }, 400);
  }

  validated = toSheetRecord(table, clientRecord);
  const { sheet, headers } = getSheetAndHeaders(table);
  const idx = findRowByKey(sheet, headers, schema.key, validated[schema.key]);
  if (idx > 0) return buildResponse({ ok:false, error:'already_exists' }, 409);

  const createdKey = toSheetKey(table, 'createdAt');
  if (headers.includes(createdKey) && !validated[createdKey]) validated[createdKey] = nowStr();
  const updatedKey = toSheetKey(table, 'updatedAt');
  if (headers.includes(updatedKey)) validated[updatedKey] = nowStr();
  appendRow(sheet, headers, validated);

  const responseRecord = fromSheetRecord(table, validated);
  return buildResponse({ ok:true, data: table==='users'? sanitizeUser(responseRecord): responseRecord }, 201);
}

function handleUpsert(body, e){
  const auth = authorizeWrite(e, body);
  if (!auth.ok) return buildResponse(auth, 403);
  const table = body.table;
  const schema = SCHEMA[table];
  const sheetInput = toSheetRecord(table, body.record || {});
  let validated = validateRecord(table, sheetInput);
  if (!validated[schema.key]) return buildResponse({ ok:false, error:'missing_primary_key' }, 400);

  let clientRecord = fromSheetRecord(table, validated);

  if (table === 'users') {
    if (clientRecord.password) {
      clientRecord.passwordHash = encodeHash(String(clientRecord.password));
      delete clientRecord.password;
    }
    if (clientRecord.role !== 'admin') clientRecord.role = 'user';
  }

  if (table === 'participants') {
    if (!clientRecord.lastActiveAt && clientRecord.createdAt) clientRecord.lastActiveAt = clientRecord.createdAt;
  }

  validated = toSheetRecord(table, clientRecord);
  const { sheet, headers } = getSheetAndHeaders(table);
  const idx = findRowByKey(sheet, headers, schema.key, validated[schema.key]);
  if (idx > 0) {
    const currentSheet = getRowObject(sheet, headers, idx);
    const currentClient = fromSheetRecord(table, currentSheet);
    const mergedClient = { ...currentClient, ...clientRecord };

    if (table === 'users') {
      if (mergedClient.password) {
        mergedClient.passwordHash = encodeHash(String(mergedClient.password));
        delete mergedClient.password;
      }
      if (mergedClient.role !== 'admin') mergedClient.role = 'user';
      if (mergedClient.isActive === undefined) mergedClient.isActive = true;
    }

    if (table === 'participants') {
      if (!mergedClient.createdAt) mergedClient.createdAt = currentClient.createdAt || nowStr();
      if (!mergedClient.lastActiveAt) mergedClient.lastActiveAt = mergedClient.createdAt;
    }

    let mergedNormalized = mergedClient;
    if (table === 'participant_custom_pages') {
      mergedNormalized = normalizeCustomPageRecord(mergedClient, auth.actor, currentClient);
    }
    if (table === 'participant_custom_schema') {
      mergedNormalized = normalizeCustomSchemaRecord(mergedClient, auth.actor, currentClient);
      if (mergedNormalized.pageId === '') mergedNormalized.pageId = null;
    }
    if (table === 'participant_custom_data') {
      mergedNormalized = normalizeCustomDataRecord(mergedClient, auth.actor, currentClient);
      if (!mergedNormalized.code) return buildResponse({ ok:false, error:'missing_participant_code' }, 400);
      if (!mergedNormalized.fieldId) return buildResponse({ ok:false, error:'missing_field_id' }, 400);
    }

    let mergedSheet = validateRecord(table, toSheetRecord(table, mergedNormalized));
    const updatedKey = toSheetKey(table, 'updatedAt');
    if (headers.includes(updatedKey)) mergedSheet[updatedKey] = nowStr();
    writeRow(sheet, headers, idx, mergedSheet);
    const responseRecord = fromSheetRecord(table, mergedSheet);
    return buildResponse({ ok:true, upsert:'updated', data: table==='users'? sanitizeUser(responseRecord): responseRecord }, 200);
  } else {
    const createdKey = toSheetKey(table, 'createdAt');
    if (headers.includes(createdKey) && !validated[createdKey]) validated[createdKey] = nowStr();
    const updatedKey = toSheetKey(table, 'updatedAt');
    if (headers.includes(updatedKey)) validated[updatedKey] = nowStr();
    let newClient = clientRecord;
    if (table === 'participant_custom_pages') {
      newClient = normalizeCustomPageRecord(newClient, auth.actor, null);
    }
    if (table === 'participant_custom_schema') {
      newClient = normalizeCustomSchemaRecord(newClient, auth.actor, null);
      if (newClient.pageId === '') newClient.pageId = null;
    }
    if (table === 'participant_custom_data') {
      newClient = normalizeCustomDataRecord(newClient, auth.actor, null);
      if (!newClient.code) return buildResponse({ ok:false, error:'missing_participant_code' }, 400);
      if (!newClient.fieldId) return buildResponse({ ok:false, error:'missing_field_id' }, 400);
    }
    const newSheetRecord = validateRecord(table, toSheetRecord(table, newClient));
    appendRow(sheet, headers, newSheetRecord);
    const responseRecord = fromSheetRecord(table, newSheetRecord);
    return buildResponse({ ok:true, upsert:'created', data: table==='users'? sanitizeUser(responseRecord): responseRecord }, 201);
  }
}

function handleUpdate(body, e){
  const auth = authorizeWrite(e, body);
  if (!auth.ok) return buildResponse(auth, 403);
  const table = body.table;
  const schema = SCHEMA[table];
  const id = body.id;
  if (!id) return buildResponse({ ok:false, error:'missing_id' }, 400);

  const clientPatchRaw = { ...(body.patch || {}) };

  if (table === 'users' && clientPatchRaw.password) {
    clientPatchRaw.passwordHash = encodeHash(String(clientPatchRaw.password));
    delete clientPatchRaw.password;
  }

  const sheetPatchInput = toSheetRecord(table, clientPatchRaw);
  const validatedPatch = validatePatch(table, sheetPatchInput);
  const clientPatch = fromSheetRecord(table, validatedPatch);

  const { sheet, headers } = getSheetAndHeaders(table);
  const idx = findRowByKey(sheet, headers, schema.key, id);
  if (idx <= 0) return buildResponse({ ok:false, error:'not_found' }, 404);

  const currentSheet = getRowObject(sheet, headers, idx);
  const currentClient = fromSheetRecord(table, currentSheet);
  const mergedClient = { ...currentClient, ...clientPatch };

  if (table === 'users') {
    if (mergedClient.role !== 'admin') mergedClient.role = 'user';
    if (mergedClient.isActive === undefined) mergedClient.isActive = true;
  }

  if (table === 'participants') {
    if (mergedClient.lastActiveAt == null && mergedClient.createdAt) {
      mergedClient.lastActiveAt = mergedClient.createdAt;
    }
  }

  let normalizedClient = mergedClient;
  if (table === 'participant_custom_pages') {
    normalizedClient = normalizeCustomPageRecord(mergedClient, auth.actor, currentClient);
  }
  if (table === 'participant_custom_schema') {
    normalizedClient = normalizeCustomSchemaRecord(mergedClient, auth.actor, currentClient);
    if (normalizedClient.pageId === '') normalizedClient.pageId = null;
  }
  if (table === 'participant_custom_data') {
    normalizedClient = normalizeCustomDataRecord(mergedClient, auth.actor, currentClient);
    if (!normalizedClient.code) return buildResponse({ ok:false, error:'missing_participant_code' }, 400);
    if (!normalizedClient.fieldId) return buildResponse({ ok:false, error:'missing_field_id' }, 400);
  }

  let mergedSheet = validateRecord(table, toSheetRecord(table, normalizedClient));
  const updatedKey = toSheetKey(table, 'updatedAt');
  if (headers.includes(updatedKey)) mergedSheet[updatedKey] = nowStr();
  writeRow(sheet, headers, idx, mergedSheet);

  const responseRecord = fromSheetRecord(table, mergedSheet);
  return buildResponse({ ok:true, data: table==='users'? sanitizeUser(responseRecord): responseRecord }, 200);
}

function handleDelete(body, e){
  const auth = authorizeWrite(e, body);
  if (!auth.ok) return buildResponse(auth, 403);
  const table = body.table;
  const schema = SCHEMA[table];
  const id = body.id;
  if (!id) return buildResponse({ ok:false, error:'missing_id' }, 400);

  const { sheet, headers } = getSheetAndHeaders(table);
  const idx = findRowByKey(sheet, headers, schema.key, id);
  if (idx <= 0) return buildResponse({ ok:false, error:'not_found' }, 404);

  const isActiveKey = toSheetKey(table, 'isActive');
  const updatedKey = toSheetKey(table, 'updatedAt');

  if (table === 'users' && headers.includes(isActiveKey) && !body.hard) {
    const current = getRowObject(sheet, headers, idx);
    current[isActiveKey] = false;
    if (headers.includes(updatedKey)) current[updatedKey] = nowStr();
    writeRow(sheet, headers, idx, current);
    return buildResponse({ ok:true, softDeleted:true }, 200);
  } else {
    sheet.deleteRow(idx);
    return buildResponse({ ok:true, deleted:true }, 200);
  }
}

function handleBatchUpsert(body, e){
  const auth = authorizeWrite(e, body);
  if (!auth.ok) return buildResponse(auth, 403);
  const table = body.table;
  const schema = SCHEMA[table];
  const records = Array.isArray(body.records) ? body.records : [];
  if (!records.length) return buildResponse({ ok:false, error:'empty_records' }, 400);

  const { sheet, headers } = getSheetAndHeaders(table);
  let created = 0, updated = 0;

  records.forEach(rawRecord => {
    const clientRecRaw = { ...(rawRecord || {}) };

    if (table === 'users' && clientRecRaw.password) {
      clientRecRaw.passwordHash = encodeHash(String(clientRecRaw.password));
      delete clientRecRaw.password;
    }

    if (table === 'participants') {
      if (!clientRecRaw.createdAt) clientRecRaw.createdAt = nowStr();
      if (!clientRecRaw.lastActiveAt) clientRecRaw.lastActiveAt = clientRecRaw.createdAt;
    }

    if ((table === 'participant_custom_pages' || table === 'participant_custom_schema' || table === 'participant_custom_data') && !clientRecRaw.id) {
      clientRecRaw.id = Utilities.getUuid();
    }

    const provisional = validateRecord(table, toSheetRecord(table, clientRecRaw));
    const id = provisional[schema.key];
    if (!id) return;

    const idx = findRowByKey(sheet, headers, schema.key, id);
    if (idx > 0) {
      const currentSheet = getRowObject(sheet, headers, idx);
      const currentClient = fromSheetRecord(table, currentSheet);
      let mergedClient = { ...currentClient, ...clientRecRaw };

      if (table === 'users') {
        if (mergedClient.role !== 'admin') mergedClient.role = 'user';
        if (mergedClient.isActive === undefined) mergedClient.isActive = true;
      }

      if (table === 'participants') {
        if (!mergedClient.createdAt) mergedClient.createdAt = currentClient.createdAt || nowStr();
        if (!mergedClient.lastActiveAt) mergedClient.lastActiveAt = mergedClient.createdAt;
      }

      if (table === 'participant_custom_pages') {
        mergedClient = normalizeCustomPageRecord(mergedClient, auth.actor, currentClient);
      }

      if (table === 'participant_custom_schema') {
        mergedClient = normalizeCustomSchemaRecord(mergedClient, auth.actor, currentClient);
        if (mergedClient.pageId === '') mergedClient.pageId = null;
      }

      if (table === 'participant_custom_data') {
        mergedClient = normalizeCustomDataRecord(mergedClient, auth.actor, currentClient);
        if (!mergedClient.code) throw new Error('missing_participant_code');
        if (!mergedClient.fieldId) throw new Error('missing_field_id');
      }

      const mergedSheet = validateRecord(table, toSheetRecord(table, mergedClient));
      const updatedKey = toSheetKey(table, 'updatedAt');
      if (headers.includes(updatedKey)) mergedSheet[updatedKey] = nowStr();
      writeRow(sheet, headers, idx, mergedSheet);
      updated++;
    } else {
      let newClient = clientRecRaw;
      if (table === 'participant_custom_pages') {
        newClient = normalizeCustomPageRecord(newClient, auth.actor, null);
      }
      if (table === 'participant_custom_schema') {
        newClient = normalizeCustomSchemaRecord(newClient, auth.actor, null);
        if (newClient.pageId === '') newClient.pageId = null;
      }
      if (table === 'participant_custom_data') {
        newClient = normalizeCustomDataRecord(newClient, auth.actor, null);
        if (!newClient.code) throw new Error('missing_participant_code');
        if (!newClient.fieldId) throw new Error('missing_field_id');
      }
      let newSheet = validateRecord(table, toSheetRecord(table, newClient));
      const createdKey = toSheetKey(table, 'createdAt');
      if (headers.includes(createdKey) && !newSheet[createdKey]) newSheet[createdKey] = nowStr();
      const updatedKey = toSheetKey(table, 'updatedAt');
      if (headers.includes(updatedKey)) newSheet[updatedKey] = nowStr();
      appendRow(sheet, headers, newSheet);
      created++;
    }
  });

  return buildResponse({ ok:true, created, updated, total: created+updated }, 200);
}

/***** ================= SHEET HELPERS ================= *****/

function readAll(table){ return readTable(table).rows; }
function readTable(table){
  const { sheet, headers } = getSheetAndHeaders(table);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { headers, rows: [] };
  const range = sheet.getRange(2, 1, lastRow-1, headers.length);
  const values = range.getValues();
  const rows = values
    .map(row => rowToObj(headers, row))
    .filter(r => !isRowEmpty(r))
    .map(record => fromSheetRecord(table, record));
  return { headers, rows };
}
function getSheetAndHeaders(table){
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(table);
  if (!sheet) throw new Error('sheet_not_found:'+table);
  let headers = (sheet.getRange(1,1,1, sheet.getLastColumn()).getValues()[0] || [])
    .map(value => String(value ?? '').trim());
  headers = ensureCurrentHeaders(table, sheet, headers);
  return { sheet, headers };
}
function rowToObj(headers, row){
  const o = {};
  for (let i=0;i<headers.length;i++) o[headers[i]] = normalizeCell(row[i]);
  return o;
}
function getRowObject(sheet, headers, idx){
  const row = sheet.getRange(idx, 1, 1, headers.length).getValues()[0];
  return rowToObj(headers, row);
}
function writeRow(sheet, headers, rowIndex, obj){
  const row = headers.map(h => (h in obj ? toCell(obj[h]) : ''));
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
}
function appendRow(sheet, headers, obj){
  const row = headers.map(h => (h in obj ? toCell(obj[h]) : ''));
  sheet.appendRow(row);
}
function findRowByKey(sheet, headers, keyName, keyVal){
  const keyIdx = headers.indexOf(keyName);
  if (keyIdx < 0) throw new Error('key_not_in_headers:'+keyName);
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const col = keyIdx + 1;
  const rng = sheet.getRange(2, col, last-1);
  const vals = rng.getValues();
  for (let i=0;i<vals.length;i++){
    if (String(vals[i][0]) === String(keyVal)) return i + 2;
  }
  return -1;
}

/***** ================= VALIDATION/SERIALIZATION ================= *****/

function validateRecord(table, rec){
  const { headers, validators } = SCHEMA[table];
  const out = {};
  headers.forEach(h => {
    if (rec[h] === undefined) return;
    const vfn = validators?.[h];
    out[h] = vfn ? vfn(rec[h]) : rec[h];
  });
  return out;
}
function validatePatch(table, patch){
  const { headers, validators } = SCHEMA[table];
  const out = {};
  Object.keys(patch).forEach(h => {
    if (!headers.includes(h)) return;
    const vfn = validators?.[h];
    out[h] = vfn ? vfn(patch[h]) : patch[h];
  });
  return out;
}

function str(v, max){ v = (v==null?'':String(v)).trim(); return v.length>max ? v.slice(0,max) : v; }
function int(v){ v = parseInt(v,10); return isFinite(v)? v : 0; }
function bool(v){ return String(v)==='true' || v===true || v===1 || String(v)==='1'; }
function dateOrNow(v){ return (v ? toDateStr(v) : nowStr()); }
function jsonText(v, max){
  if (typeof v === 'string') {
    try { JSON.parse(v); } catch { v = JSON.stringify({ raw:v }); }
    return str(v, max);
  }
  try { return str(JSON.stringify(v), max); }
  catch { return 'null'; }
}
function toDateStr(d){
  if (d instanceof Date) return fmtDate(d);
  const t = (typeof d === 'number') ? new Date(d) : new Date(String(d));
  return isNaN(+t) ? nowStr() : fmtDate(t);
}
function nowStr(){ return fmtDate(new Date()); }
function fmtDate(d){
  const pad = (n)=> (n<10?'0':'')+n;
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}
function normalizeCell(v){
  if (v instanceof Date) return fmtDate(v);
  if (typeof v === 'boolean') return v;
  if (v === '') return '';
  return v;
}
function toCell(v){ return (v instanceof Date) ? v : v; }
function isRowEmpty(o){ 
  return Object.values(o).every(v => {
    if (v == null || v === '') return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    if (typeof v === 'boolean') return false; // checkbox false é válido
    return false;
  });
}

/***** ================= SECURITY (CORS, SECRET, NONCE, CAPTCHA, RL) ================= *****/

function validateApiSecret(e){
  const secret = API_SECRET();
  if (!secret) return true;
  const p = e.parameter || {};
  const qOK = p.secret && String(p.secret) === secret;
  const hdr = e?.headers || {};
  const k = hdr['x-api-key'] || hdr['X-Api-Key'] || '';
  return qOK || String(k) === secret;
}

/**
 * Constrói a resposta HTTP com suporte adequado a CORS
 * IMPORTANTE: Google Apps Script não suporta .setHeader()
 * Use apenas .setMimeType() e retorne texto JSON
 */
function buildResponse(payload, status){
  payload = payload || {};
  payload.status = status;
  
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // NOTA: Não há como adicionar headers customizados em Google Apps Script
  // O CORS deve ser configurado no deployment como "Web app" com acesso "Anyone"
  // e o frontend deve fazer requisições adequadas
  
  return output;
}

function getClientIp(e){
  const h = e?.headers || {};
  return h['x-forwarded-for'] || h['X-Forwarded-For'] || h['x-real-ip'] || 'anon';
}
function hitLimit(key, maxPerMin){
  const c = CacheService.getScriptCache();
  const v = parseInt(c.get(key) || '0', 10) + 1;
  c.put(key, String(v), 60);
  return v > maxPerMin;
}
function newNonce(){
  const n = Utilities.getUuid();
  CacheService.getScriptCache().put('nonce:'+n, '1', 120);
  return n;
}
function consumeNonce(n){
  if (!n) return false;
  const c = CacheService.getScriptCache();
  const v = c.get('nonce:'+n);
  if (!v) return false;
  c.remove('nonce:'+n);
  return true;
}
function requiresNonce(action){
  return ['create','update','upsert','delete','batch_upsert','auth_change_password'].indexOf(action) >= 0;
}
function requiresCaptcha(action){
  return ['auth_login','auth_password_reset_request','create','update','upsert','delete','batch_upsert'].indexOf(action) >= 0;
}
function verifyRecaptcha(token){
  try{
    if (!token) return false;
    const secret = RECAPTCHA_SECRET();
    if (!secret) return true;
    const resp = UrlFetchApp.fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'post',
      payload: { secret: secret, response: token }
    });
    const data = JSON.parse(resp.getContentText());
    return !!(data.success && (data.score == null || data.score >= 0.7));
  }catch(err){ return false; }
}

/***** ================= SANITIZE USERS ================= *****/

function sanitizeUsers(rows){ return rows.map(sanitizeUser); }
function sanitizeUser(u){ const { passwordHash, ...safe } = u || {}; return safe; }

/***** ================= UTIL EXTRA: garantir cabeçalho/validações (opcional) ================= *****/
// Rode 1x para ajustar cabeçalho/validações sem apagar dados
function ensureSchemaNonDestructive(){
  const ss = SpreadsheetApp.getActive();
  Object.entries(SCHEMA).forEach(([name, meta]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = meta.headers;

    // coloca cabeçalho na linha 1 (sem limpar dados)
    sh.getRange(1,1,1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange('1:1').setFontWeight('bold').setBackground('#f1f3f4').setWrap(true);

    // datas
    const dateCols = headers
      .map((h,i)=> (/(criadoEm|atualizadoEm|ultimaAtividade)/.test(h) ? i+1 : null))
      .filter(Boolean);
    dateCols.forEach(col => sh.getRange(2, col, Math.max(1, sh.getMaxRows()-1), 1).setNumberFormat("yyyy-MM-dd HH:mm:ss"));

    // users: validação de role + checkbox isActive
    if (name === 'users') {
      const roleCol = headers.indexOf('perfil') + 1;
      if (roleCol > 0) {
        const rule = SpreadsheetApp.newDataValidation().requireValueInList(['admin','user'], true).build();
        sh.getRange(2, roleCol, Math.max(1, sh.getMaxRows()-1), 1).setDataValidation(rule);
      }
      const activeCol = headers.indexOf('ativo') + 1;
      if (activeCol > 0) {
        const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
        sh.getRange(2, activeCol, Math.max(1, sh.getMaxRows()-1), 1).setDataValidation(rule);
      }
    }
  });
}

/***** ================= GET BY ID ================= *****/

function getById(table, id){
  const { sheet, headers } = getSheetAndHeaders(table);
  const idx = findRowByKey(sheet, headers, SCHEMA[table].key, id);
  if (idx <= 0) return null;
  const record = getRowObject(sheet, headers, idx);
  return fromSheetRecord(table, record);
}
