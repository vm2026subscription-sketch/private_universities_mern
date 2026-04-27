const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

const DATA_DIR = path.resolve(__dirname, '../data');

// Mapping for varied column names
const UNI_MAPPINGS = {
  name: ['University Name', 'University_Name', 'Name of University', 'Name'],
  state: ['State', 'Province'],
  city: ['City', 'Town'],
  type: ['University Type', 'Type'],
  establishedYear: ['Year of Establishment', 'Est Year', 'Established'],
  website: ['Official Website', 'Website', 'URL'],
  phone: ['Phone', 'Contact Number', 'Contact'],
  email: ['Contact Email', 'Email'],
  address: ['Full Address', 'Address']
};

const COURSE_MAPPINGS = {
  name: ['Course Name', 'Course', 'Program'],
  category: ['Degree Level', 'Level', 'Category'],
  duration: ['Duration', 'Period'],
  feesPerYear: ['Fee Per Year (INR)', 'Annual Fee', 'Fees'],
  specialization: ['Specialization', 'Branch', 'Stream'],
  totalSeats: ['Total Seats', 'Seats'],
  entranceExams: ['Entrance Exam Required', 'Entrance Exams', 'Exams'],
  eligibility: ['Eligibility Criteria', 'Eligibility']
};

function getValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return null;
}

async function processFile(filePath) {
  console.log(`[import] Processing: ${path.basename(filePath)}`);
  try {
    const workbook = xlsx.readFile(filePath);
    
    // 1. Process Universities
    const uniSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('university') || n.toLowerCase().includes('overview')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[uniSheetName];
    
    // Find the actual header row (sometimes there are title rows at the top)
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      if (rawData[i].some(cell => cell && cell.toString().toLowerCase().includes('name'))) {
        headerRowIndex = i;
        break;
      }
    }

    const uniData = xlsx.utils.sheet_to_json(sheet, { range: headerRowIndex });
    
    const uniMap = new Map(); // Name -> DB ID

    for (const row of uniData) {
      const name = getValue(row, UNI_MAPPINGS.name);
      if (!name) continue;

      const state = getValue(row, UNI_MAPPINGS.state);
      if (!state) continue; // Skip if no state

      const uniFields = {
        name: name.trim(),
        slug: slugify(name.trim(), { lower: true, strict: true }),
        state: state.trim(),
        city: (getValue(row, UNI_MAPPINGS.city) || 'Unknown').toString().trim(),
        type: (getValue(row, UNI_MAPPINGS.type) || 'private').toString().toLowerCase().includes('deemed') ? 'deemed' : 'private',
        establishedYear: parseInt(getValue(row, UNI_MAPPINGS.establishedYear)) || 2000,
        website: getValue(row, UNI_MAPPINGS.website),
        phone: getValue(row, UNI_MAPPINGS.phone),
        email: getValue(row, UNI_MAPPINGS.email),
        address: getValue(row, UNI_MAPPINGS.address),
      };

      try {
        const uni = await University.findOneAndUpdate(
          { name: uniFields.name },
          { $set: uniFields },
          { upsert: true, new: true }
        );
        uniMap.set(uniFields.name, uni._id);
      } catch (err) {
        if (err.code === 11000) {
          // If slug duplicate, try adding city to slug
          uniFields.slug += `-${slugify(uniFields.city, { lower: true })}`;
          const uni = await University.findOneAndUpdate(
            { name: uniFields.name },
            { $set: uniFields },
            { upsert: true, new: true }
          );
          uniMap.set(uniFields.name, uni._id);
        } else throw err;
      }
    }

    // 2. Process Courses
    const courseSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('course')) || workbook.SheetNames[1];
    if (courseSheetName && workbook.Sheets[courseSheetName]) {
      const cSheet = workbook.Sheets[courseSheetName];
      const cRawData = xlsx.utils.sheet_to_json(cSheet, { header: 1 });
      let cHeaderIndex = 0;
      for (let i = 0; i < Math.min(cRawData.length, 10); i++) {
        if (cRawData[i].some(cell => cell && cell.toString().toLowerCase().includes('name'))) {
          cHeaderIndex = i;
          break;
        }
      }

      const courseData = xlsx.utils.sheet_to_json(cSheet, { range: cHeaderIndex });
      const coursesToInsert = [];

      for (const row of courseData) {
        const uniName = getValue(row, UNI_MAPPINGS.name);
        const uniId = uniMap.get(uniName);
        if (!uniId) continue;

        const name = getValue(row, COURSE_MAPPINGS.name);
        if (!name) continue;

        let level = (getValue(row, COURSE_MAPPINGS.category) || '').toString().toUpperCase();
        const courseName = name.trim();

        if (level.includes('UNDER') || level.includes('BACHELOR') || level.startsWith('B.') || courseName.startsWith('B.') || courseName.includes('Bachelor')) level = 'UG';
        else if (level.includes('POST') || level.includes('MASTER') || level.startsWith('M.') || courseName.startsWith('M.') || courseName.includes('Master')) level = 'PG';
        else if (level.includes('PHD') || level.includes('DOCTOR') || level.startsWith('PH') || courseName.includes('Ph.D') || courseName.includes('Doctor')) level = 'PhD';
        else if (level.includes('DIPLOMA') || courseName.includes('Diploma')) level = 'Diploma';
        else level = 'UG'; // Default to UG if totally unknown

        const feesStr = getValue(row, COURSE_MAPPINGS.feesPerYear)?.toString() || "0";
        const fees = parseInt(feesStr.replace(/[^0-9]/g, '')) || 0;
        const exams = getValue(row, COURSE_MAPPINGS.entranceExams);

        coursesToInsert.push({
          universityId: uniId,
          name: name.trim(),
          category: level,
          duration: parseInt(getValue(row, COURSE_MAPPINGS.duration)) || 3,
          feesPerYear: fees,
          totalSeats: parseInt(getValue(row, COURSE_MAPPINGS.totalSeats)) || 60,
          entranceExams: exams ? exams.toString().split(',').map(e => e.trim()) : [],
          eligibility: getValue(row, COURSE_MAPPINGS.eligibility),
          specializations: []
        });
      }

      if (coursesToInsert.length > 0) {
        await Course.insertMany(coursesToInsert, { ordered: false }).catch(e => {});
        console.log(`[import]   Processed ${coursesToInsert.length} course entries`);
      }
    }
  } catch (err) {
    console.error(`[import] Error processing ${path.basename(filePath)}:`, err.message);
  }
}


function getAllExcelFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllExcelFiles(fullPath, files);
    } else if (item.endsWith('.xlsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function bulkImport() {
  try {
    await connectDB();
    console.log('[import] Connected to MongoDB');

    // Wipe existing data for a clean start
    await University.deleteMany({});
    await Course.deleteMany({});
    console.log('[import] Cleared existing data');

    const allFiles = getAllExcelFiles(DATA_DIR);
    console.log(`[import] Found ${allFiles.length} Excel files`);

    for (const file of allFiles) {
      await processFile(file);
    }

    // Final count
    const uniCount = await University.countDocuments();
    const courseCount = await Course.countDocuments();
    console.log(`\n[import] SUCCESS! Total: ${uniCount} Universities, ${courseCount} Courses`);

    process.exit(0);
  } catch (err) {
    console.error('[import] Fatal error:', err);
    process.exit(1);
  }
}

bulkImport();
