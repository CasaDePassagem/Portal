/**
 * Script para limpar linhas vazias de todas as planilhas
 * 
 * COMO USAR:
 * 1. Cole este código no Google Apps Script (junto com Code.gs)
 * 2. Execute a função cleanAllSheets()
 * 3. Aguarde (pode demorar alguns segundos)
 * 4. Veja os logs para saber quantas linhas foram removidas
 */

function cleanAllSheets() {
  var ss = SpreadsheetApp.getActive();
  var sheetsToClean = ['users', 'topics', 'contents', 'lessons', 'participants'];
  
  Logger.log('========================================');
  Logger.log('LIMPEZA DE LINHAS VAZIAS');
  Logger.log('========================================');
  Logger.log('');
  
  var totalRemoved = 0;
  
  sheetsToClean.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log('⚠️  Planilha "' + sheetName + '" não encontrada');
      return;
    }
    
    var removed = cleanEmptyRowsFromSheet(sheet);
    totalRemoved += removed;
    
    Logger.log('✅ ' + sheetName + ': ' + removed + ' linhas removidas');
  });
  
  Logger.log('');
  Logger.log('========================================');
  Logger.log('✅ TOTAL: ' + totalRemoved + ' linhas vazias removidas');
  Logger.log('========================================');
}

function cleanEmptyRowsFromSheet(sheet) {
  var lastRow = sheet.getLastRow();
  
  // Se só tem cabeçalho, não faz nada
  if (lastRow <= 1) {
    return 0;
  }
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var numCols = headers.length;
  var data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
  
  var rowsToDelete = [];
  
  // Identifica linhas vazias (de baixo para cima para não bagunçar os índices)
  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    var isEmpty = true;
    
    for (var j = 0; j < row.length; j++) {
      var cellValue = row[j];
      
      // Verifica se célula tem valor real
      if (cellValue !== null && cellValue !== '' && cellValue !== undefined) {
        // Se é string, verifica se não é só espaço
        if (typeof cellValue === 'string') {
          if (cellValue.trim() !== '') {
            isEmpty = false;
            break;
          }
        } else {
          // Números, datas, booleans são considerados valores reais
          isEmpty = false;
          break;
        }
      }
    }
    
    if (isEmpty) {
      rowsToDelete.push(i + 2); // +2 porque: +1 para cabeçalho, +1 porque índice começa em 0
    }
  }
  
  // Deleta as linhas vazias (de baixo para cima)
  rowsToDelete.forEach(function(rowIndex) {
    sheet.deleteRow(rowIndex);
  });
  
  return rowsToDelete.length;
}

/**
 * Função para limpar apenas uma planilha específica
 */
function cleanSpecificSheet(sheetName) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log('❌ Planilha "' + sheetName + '" não encontrada');
    return;
  }
  
  Logger.log('========================================');
  Logger.log('LIMPEZA: ' + sheetName);
  Logger.log('========================================');
  
  var removed = cleanEmptyRowsFromSheet(sheet);
  
  Logger.log('✅ ' + removed + ' linhas removidas de "' + sheetName + '"');
  Logger.log('========================================');
}

/**
 * Funções auxiliares para limpar planilhas específicas
 */
function cleanUsersSheet() {
  cleanSpecificSheet('users');
}

function cleanTopicsSheet() {
  cleanSpecificSheet('topics');
}

function cleanContentsSheet() {
  cleanSpecificSheet('contents');
}

function cleanLessonsSheet() {
  cleanSpecificSheet('lessons');
}

function cleanParticipantsSheet() {
  cleanSpecificSheet('participants');
}
