const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const DATA_DIR = path.resolve(__dirname, 'data');

function getAllExcelFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllExcelFiles(fullPath, files);
    } else if (item.endsWith('.xlsx') && !item.startsWith('~')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getAllExcelFiles(DATA_DIR);

files.forEach(file => {
  try {
    const workbook = xlsx.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Find first non-empty row to see headers
    let headers = [];
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      if (rawData[i] && rawData[i].length > 2) {
        headers = rawData[i];
        break;
      }
    }
    
    console.log(`FILE: ${path.relative(DATA_DIR, file)}`);
    console.log(`HEADERS: ${JSON.stringify(headers)}`);
    console.log('---');
  } catch (e) {
    console.log(`ERROR reading ${file}: ${e.message}`);
  }
});
