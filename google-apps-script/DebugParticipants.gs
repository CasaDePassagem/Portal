/**
 * Script para Debug de Participantes
 * 
 * Como usar:
 * 1. Cole este código no Google Apps Script
 * 2. Execute a função desejada no console
 * 3. Verifique os logs (View > Logs ou Ctrl+Enter)
 */

/**
 * Lista todos os participantes cadastrados
 */
function listAllParticipants() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('participants');
  
  if (!sheet) {
    Logger.log('❌ Planilha "participants" não encontrada!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  Logger.log('📋 Total de participantes: ' + rows.length);
  Logger.log('📊 Colunas: ' + headers.join(', '));
  Logger.log('-----------------------------------');
  
  rows.forEach((row, index) => {
    if (row[0]) { // Se tem código
      Logger.log('Participante #' + (index + 1));
      headers.forEach((header, i) => {
        if (row[i]) {
          Logger.log('  ' + header + ': ' + row[i]);
        }
      });
      Logger.log('---');
    }
  });
}

/**
 * Busca um participante específico por código
 */
function findParticipantByCode() {
  const code = Browser.inputBox('Digite o código do participante (ex: NYU8J8):');
  if (!code) {
    Logger.log('❌ Código não fornecido');
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('participants');
  
  if (!sheet) {
    Logger.log('❌ Planilha "participants" não encontrada!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const codeIndex = headers.indexOf('code');
  const found = rows.find(row => row[codeIndex] === code.toUpperCase());
  
  if (found) {
    Logger.log('✅ Participante encontrado!');
    headers.forEach((header, i) => {
      if (found[i]) {
        Logger.log('  ' + header + ': ' + found[i]);
      }
    });
  } else {
    Logger.log('❌ Participante com código "' + code + '" não encontrado');
  }
}

/**
 * Testa a criação de um participante
 */
function testCreateParticipant() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('participants');
  
  if (!sheet) {
    Logger.log('❌ Planilha "participants" não encontrada!');
    return;
  }
  
  // Gera código de teste
  const testCode = 'TEST' + Math.floor(Math.random() * 100);
  const now = new Date().toISOString();
  
  const newRow = [
    testCode,
    'Participante Teste',
    now,
    now,
    '{}'
  ];
  
  Logger.log('🧪 Criando participante de teste:');
  Logger.log('  Código: ' + testCode);
  Logger.log('  Nome: Participante Teste');
  
  sheet.appendRow(newRow);
  
  Logger.log('✅ Participante de teste criado com sucesso!');
  Logger.log('💡 Você pode acessá-lo com o código: ' + testCode);
}

/**
 * Remove participantes de teste (códigos começando com TEST)
 */
function cleanTestParticipants() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('participants');
  
  if (!sheet) {
    Logger.log('❌ Planilha "participants" não encontrada!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const codeIndex = headers.indexOf('code');
  
  let removed = 0;
  
  // Itera de trás para frente para não afetar os índices
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][codeIndex] && data[i][codeIndex].toString().startsWith('TEST')) {
      sheet.deleteRow(i + 1);
      removed++;
      Logger.log('🗑️ Removido: ' + data[i][codeIndex]);
    }
  }
  
  Logger.log('✅ Total de participantes de teste removidos: ' + removed);
}

/**
 * Verifica a estrutura da planilha de participantes
 */
function checkParticipantsStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('participants');
  
  if (!sheet) {
    Logger.log('❌ Planilha "participants" não encontrada!');
    Logger.log('💡 Crie uma aba chamada "participants" com as colunas:');
    Logger.log('   code | displayName | createdAt | lastActiveAt | lessonProgress');
    return;
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const expectedHeaders = ['code', 'displayName', 'createdAt', 'lastActiveAt', 'lessonProgress'];
  
  Logger.log('✅ Planilha "participants" encontrada!');
  Logger.log('📊 Colunas atuais: ' + headers.join(', '));
  Logger.log('📋 Colunas esperadas: ' + expectedHeaders.join(', '));
  
  const missing = expectedHeaders.filter(h => !headers.includes(h));
  const extra = headers.filter(h => !expectedHeaders.includes(h));
  
  if (missing.length > 0) {
    Logger.log('⚠️ Colunas faltando: ' + missing.join(', '));
  }
  
  if (extra.length > 0) {
    Logger.log('⚠️ Colunas extras: ' + extra.join(', '));
  }
  
  if (missing.length === 0 && extra.length === 0) {
    Logger.log('✅ Estrutura da planilha está correta!');
  }
  
  const rowCount = sheet.getLastRow() - 1; // Exclui header
  Logger.log('📈 Total de linhas (exceto header): ' + rowCount);
}
