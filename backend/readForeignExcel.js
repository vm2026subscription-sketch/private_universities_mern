const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'data', 'Foreign Univeristies Application Details.xlsx'));
console.log('Sheets:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  console.log('\n=== Sheet:', sheetName, '===');
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('Rows:', data.length);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    data.forEach((row, i) => {
      console.log('\nRow', i + 1, ':', JSON.stringify(row, null, 2));
    });
  }
});
