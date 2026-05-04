const xlsx = require('xlsx');
const path = require('path');

const file = 'c:\\Users\\ankur\\Downloads\\vm_private_universities\\private_universities_mern\\backend\\data\\extracted_clean\\Private universities data\\Ankur\\Rajasthan Deemed and Private University.xlsx';
const workbook = xlsx.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('RAW DATA (first 10 rows):');
rawData.slice(0, 10).forEach((row, i) => {
  console.log(`Row ${i}: ${JSON.stringify(row)}`);
});
