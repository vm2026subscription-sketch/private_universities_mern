/**
 * Inspect both foreign Excel files to understand exact data structure
 */
const path = require('path');
const xlsx = require('xlsx');

const FILE1 = path.resolve(__dirname, 'data/Foreign Univeristies Application Details.xlsx');
const FILE2 = path.resolve(__dirname, 'data/extracted_clean/Private universities data/soham/Foreign_Universities_India_Seat_Intake_2024_25 (1).xlsx');

function inspect(file) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FILE: ${path.basename(file)}`);
  const wb = xlsx.readFile(file);
  for (const sheetName of wb.SheetNames) {
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', header: 1 });
    console.log(`\n  Sheet: "${sheetName}" (${rows.length} rows)`);
    // Print first 15 rows raw
    rows.slice(0, 15).forEach((row, i) => {
      const nonEmpty = row.filter(c => String(c).trim() !== '');
      if (nonEmpty.length > 0) console.log(`    Row ${i}: ${JSON.stringify(row.slice(0, 10))}`);
    });
  }
}

inspect(FILE1);
inspect(FILE2);
