/**
 * Script para debugar problemas de autenticação
 * 
 * COMO USAR:
 * 1. Cole este código no Google Apps Script (junto com Code.gs)
 * 2. Rode a função testMyPassword() - ela já tem seu email
 * 3. Veja os logs (View > Logs ou Ctrl+Enter)
 */

// ⭐ EXECUTE ESTA FUNÇÃO - já tem seu email configurado
function testMyPassword() {
  var email = 'pedbolson@gmail.com';
  Logger.log('Testando para: ' + email);
  debugPasswordForUser(email);
}

// ⭐ OU EXECUTE ESTA para resetar sua senha
function resetMyPassword() {
  var email = 'pedbolson@gmail.com';
  var password = 'Pedro@123';
  Logger.log('Resetando senha para: ' + email);
  resetPasswordForUser(email, password);
}

function debugPasswordForUser(email) {
  if (!email) {
    Logger.log('❌ Email não fornecido!');
    return;
  }
  
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName('users');
  
  if (!sheet) {
    Logger.log('❌ Planilha "users" não encontrada!');
    return;
  }
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var emailIdx = headers.indexOf('email');
  var hashIdx = headers.indexOf('passwordHash');
  var activeIdx = headers.indexOf('isActive');
  
  Logger.log('========================================');
  Logger.log('DEBUG DE AUTENTICAÇÃO');
  Logger.log('========================================');
  Logger.log('Procurando por email: ' + email);
  Logger.log('');
  
  // Busca o usuário
  var lastRow = sheet.getLastRow();
  var found = false;
  
  for (var i = 2; i <= lastRow; i++) {
    var row = sheet.getRange(i, 1, 1, headers.length).getValues()[0];
    var userEmail = String(row[emailIdx] || '').trim().toLowerCase();
    
    if (userEmail === email.toLowerCase()) {
      found = true;
      var passwordHash = row[hashIdx];
      var isActive = row[activeIdx];
      
      Logger.log('✅ Usuário encontrado na linha ' + i);
      Logger.log('Email: ' + userEmail);
      Logger.log('isActive: ' + isActive);
      Logger.log('Hash na planilha: ' + passwordHash);
      Logger.log('');
      
      // Testa senhas comuns
      var testPasswords = ['Pedro@123', 'pedro@123', 'Pedro123', 'pedro123'];
      
      Logger.log('Testando senhas:');
      for (var p = 0; p < testPasswords.length; p++) {
        var pwd = testPasswords[p];
        var isValid = verifyHash(pwd, passwordHash);
        Logger.log('  ' + pwd + ': ' + (isValid ? '✅ VÁLIDA' : '❌ inválida'));
      }
      
      Logger.log('');
      Logger.log('Formato do hash:');
      var match = /^s:([^$]+)\$h:(.+)$/.exec(String(passwordHash || ''));
      if (match) {
        Logger.log('  ✅ Formato correto (s:SALT$h:HASH)');
        Logger.log('  Salt: ' + match[1]);
        Logger.log('  Hash: ' + match[2].substring(0, 20) + '...');
      } else {
        Logger.log('  ❌ Formato INVÁLIDO! Esperado: s:SALT$h:HASH');
        Logger.log('  Atual: ' + passwordHash);
      }
      
      break;
    }
  }
  
  if (!found) {
    Logger.log('❌ Usuário NÃO encontrado!');
    Logger.log('');
    Logger.log('Emails cadastrados:');
    for (var j = 2; j <= lastRow; j++) {
      var row2 = sheet.getRange(j, 1, 1, headers.length).getValues()[0];
      Logger.log('  - ' + row2[emailIdx]);
    }
  }
}

// Copia as funções de hash do Code.gs
function makeSalt(){ 
  return Utilities.base64Encode(Utilities.getUuid().slice(0,16)); 
}

function hmac(password, saltB64){
  var sig = Utilities.computeHmacSha256Signature(password, saltB64);
  return Utilities.base64Encode(sig);
}

function encodeHash(password){
  var salt = makeSalt();
  return 's:'+salt+'$h:'+hmac(password, salt);
}

function verifyHash(password, passwordHash){
  var m = /^s:([^$]+)\$h:(.+)$/.exec(String(passwordHash||''));
  if (!m) return false;
  var salt = m[1];
  var hash = m[2];
  return hmac(password, salt) === hash;
}

/**
 * Gera um novo hash e atualiza na planilha
 */
function resetPasswordForUser(email, newPassword) {
  if (!email || !newPassword) {
    Logger.log('❌ Email ou senha não fornecidos!');
    return;
  }
  
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName('users');
  
  if (!sheet) {
    Logger.log('❌ Planilha "users" não encontrada!');
    return;
  }
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var emailIdx = headers.indexOf('email');
  var hashIdx = headers.indexOf('passwordHash');
  var updatedIdx = headers.indexOf('updatedAt');
  
  var lastRow = sheet.getLastRow();
  
  for (var i = 2; i <= lastRow; i++) {
    var row = sheet.getRange(i, 1, 1, headers.length).getValues()[0];
    var userEmail = String(row[emailIdx] || '').trim().toLowerCase();
    
    if (userEmail === email.toLowerCase()) {
      var newHash = encodeHash(newPassword);
      
      sheet.getRange(i, hashIdx + 1).setValue(newHash);
      
      if (updatedIdx >= 0) {
        var now = new Date();
        sheet.getRange(i, updatedIdx + 1).setValue(now);
      }
      
      Logger.log('========================================');
      Logger.log('✅ SENHA ATUALIZADA COM SUCESSO!');
      Logger.log('========================================');
      Logger.log('Email: ' + email);
      Logger.log('Nova senha: ' + newPassword);
      Logger.log('Novo hash: ' + newHash);
      Logger.log('');
      Logger.log('Testando login...');
      
      var isValid = verifyHash(newPassword, newHash);
      Logger.log(isValid ? '✅ Login funcionando!' : '❌ ERRO: Login não funciona!');
      
      return;
    }
  }
  
  Logger.log('❌ Usuário não encontrado: ' + email);
}
