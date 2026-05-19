const path = require('path');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');

function cleanUniName(name) {
  if (!name) return '';
  let cleaned = name.toString();
  // Strip suffix like " — Course-wise Seat Intake" or " - Course-wise Seat Intake"
  cleaned = cleaned.split(/—|-/)[0].trim();
  // Strip " (Deemed to be University)" or " (Deemed University)" or " (University)"
  cleaned = cleaned.replace(/\s*\(Deemed\s+to\s+be\s+University\)/gi, '');
  cleaned = cleaned.replace(/\s*\(Deemed\s+University\)/gi, '');
  cleaned = cleaned.replace(/\s*\(University\)/gi, '');
  cleaned = cleaned.replace(/\s*\(IED\)\s+India/gi, ' (IED) India');
  return cleaned.trim();
}

async function run() {
  await connectDB();
  console.log('Connected to MongoDB');

  const dir = 'c:\\Users\\ankur\\Downloads\\vm_private_universities\\private_universities_mern\\backend\\data\\extracted_clean\\Private universities data\\soham\\';
  const files = [
    'AP_Universities_Seat_Intake_2024.xlsx',
    'Delhi_UGC_Deemed_Universities_Seat_Intake_2024.xlsx',
    'Karnataka_Universities_Detailed_Seat_Intake.xlsx',
    'TN_Deemed_Universities_Seat_Intake_2024 (1).xlsx'
  ];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const workbook = xlsx.readFile(filePath);
    console.log(`\n======================================`);
    console.log(`File: ${file}`);
    
    for (let sIdx = 1; sIdx < workbook.SheetNames.length; sIdx++) {
      const sheetName = workbook.SheetNames[sIdx];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (rows.length === 0) continue;

      const rawName = rows[0][0]?.trim();
      const cleanedName = cleanUniName(rawName);

      // Search DB
      let dbUni = await University.findOne({ name: cleanedName });
      if (!dbUni) {
        // Try loose search by matching case-insensitively or regex
        dbUni = await University.findOne({ name: { $regex: new RegExp('^' + cleanedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') } });
      }
      if (!dbUni) {
        // Try searching containing the cleaned name
        dbUni = await University.findOne({ name: { $regex: new RegExp(cleanedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') } });
      }

      console.log(`Excel: "${rawName}" -> Cleaned: "${cleanedName}" -> Match in DB: ${dbUni ? dbUni.name : '❌ NOT FOUND'}`);
    }
  }

  mongoose.connection.close();
}

run();
