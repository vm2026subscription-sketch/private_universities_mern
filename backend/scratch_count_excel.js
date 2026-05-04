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
const uniqueUniversities = new Set();
let countWithUnknownState = 0;

const UNI_MAPPINGS = {
  name: ['University Name', 'University_Name', 'Name of University', 'Name', 'universityname'],
  state: ['State', 'Province']
};

function getValue(row, keys) {
  const rowKeys = Object.keys(row);
  for (const key of keys) {
    const foundKey = rowKeys.find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) return row[foundKey];
  }
  return null;
}

for (const file of files) {
  try {
    const workbook = xlsx.readFile(file);
    const uniSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('university') || n.toLowerCase().includes('overview')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[uniSheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      if (rawData[i].some(cell => cell && cell.toString().toLowerCase().includes('name'))) {
        headerRowIndex = i;
        break;
      }
    }
    const uniData = xlsx.utils.sheet_to_json(sheet, { range: headerRowIndex });
    for (const row of uniData) {
      const name = getValue(row, UNI_MAPPINGS.name);
      if (name) {
        uniqueUniversities.add(name.toString().trim());
      }
    }
  } catch (e) {
  }
}
console.log('Total unique universities in excel:', uniqueUniversities.size);
