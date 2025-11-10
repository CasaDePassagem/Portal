/**
 * Script auxiliar para gerar hash de senha
 * 
 * COMO USAR:
 * 1. Cole este código em um novo arquivo no Google Apps Script
 * 2. Rode a função testGenerateHash()
 * 3. Veja o resultado no log (View > Logs ou Ctrl+Enter)
 * 4. Copie o hash gerado e use na planilha
 */

function testGenerateHash() {
  const password = 'Pedro@123';
  const hash = encodeHash(password);
  
  Logger.log('========================================');
  Logger.log('Senha: ' + password);
  Logger.log('Hash: ' + hash);
  Logger.log('========================================');
  Logger.log('');
  Logger.log('Cole este hash na coluna passwordHash da planilha users:');
  Logger.log(hash);
  
  // Testa se o hash funciona
  const isValid = verifyHash(password, hash);
  Logger.log('');
  Logger.log('Verificação: ' + (isValid ? '✅ Hash válido!' : '❌ Hash inválido!'));
  
  return hash;
}

// Funções de hash (mesmas do Code.gs)
function makeSalt(){ return Utilities.base64Encode(Utilities.getUuid().slice(0,16)); }

function hmac(password, saltB64){
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

/**
 * Função para gerar múltiplos hashes de uma vez
 */
function generateMultipleHashes() {
  const passwords = {
    'admin': 'admin123',
    'user1': 'senha123',
    'test': 'Pedro@123'
  };
  
  Logger.log('========================================');
  Logger.log('GERANDO HASHES PARA MÚLTIPLAS SENHAS');
  Logger.log('========================================');
  
  Object.entries(passwords).forEach(([name, password]) => {
    const hash = encodeHash(password);
    Logger.log('');
    Logger.log(name + ':');
    Logger.log('  Senha: ' + password);
    Logger.log('  Hash:  ' + hash);
  });
}
