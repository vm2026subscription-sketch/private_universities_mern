const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\ankur\\Downloads\\vm_private_universities\\private_universities_mern\\backend\\data\\extracted_clean\\Private universities data\\soham\\';
const files = [
  'AP_Universities_Seat_Intake_2024.xlsx',
  'Delhi_UGC_Deemed_Universities_Seat_Intake_2024.xlsx',
  'Karnataka_Universities_Detailed_Seat_Intake.xlsx',
  'TN_Deemed_Universities_Seat_Intake_2024 (1).xlsx'
];

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  const workbook = xlsx.readFile(filePath);
  console.log(`\n======================================`);
  console.log(`File: ${file}`);
  console.log(`Sheets count: ${workbook.SheetNames.length}`);
  console.log(`Sheet Names (first 5):`, workbook.SheetNames.slice(0, 5));
  
  if (workbook.SheetNames.length > 1) {
    const sheetName = workbook.SheetNames[1]; // First university sheet (index 1)
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`First University: ${sheetName}`);
    console.log(`Sample rows (first 10):`);
    console.log(rows.slice(0, 10));
  } else {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Sample rows (first 10):`);
    console.log(rows.slice(0, 10));
  }
});
