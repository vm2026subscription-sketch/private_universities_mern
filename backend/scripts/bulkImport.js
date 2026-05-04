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
  name: ['University Name', 'University_Name', 'Name of University', 'Name', 'Name of the University', 'universityname', 'University'],
  state: ['State', 'Province', 'Location', 'City / State'],
  city: ['City', 'Town', 'Location'],
  type: ['University Type', 'Type', 'Status', 'Category'],
  establishedYear: ['Year of Establishment', 'Est Year', 'Established', 'Year', 'Established Year', 'Establishment Year'],
  website: ['Official Website', 'Website', 'URL', 'Official_Website'],
  phone: ['Phone', 'Contact Number', 'Contact', 'Phone No'],
  email: ['Contact Email', 'Email', 'Contact_Email'],
  address: ['Full Address', 'Address']
};

const COURSE_MAPPINGS = {
  name: ['Course Name', 'Course', 'Program', 'Courses Offered', 'Courses Offered (All)', 'Course_Name'],
  category: ['Degree Level', 'Level', 'Category'],
  duration: ['Duration', 'Period', 'Years'],
  feesPerYear: ['Fee Per Year (INR)', 'Annual Fee', 'Fees', 'Fees Structure (INR)', 'Fees_Structure'],
  specialization: ['Specialization', 'Branch', 'Stream'],
  totalSeats: ['Total Seats', 'Seats', 'No. of Seats', 'Seat Intake'],
  entranceExams: ['Entrance Exam Required', 'Entrance Exams', 'Exams', 'Entrance exam'],
  eligibility: ['Eligibility Criteria', 'Eligibility']
};

function extractStateFromFileName(filePath) {
  const lower = path.basename(filePath).toLowerCase();
  const statesMap = [
    ['andaman', 'Andaman and Nicobar Islands'], ['andhra', 'Andhra Pradesh'], ['arunachal', 'Arunachal Pradesh'],
    ['assam', 'Assam'], ['bihar', 'Bihar'], ['chandigarh', 'Chandigarh'], ['chhattisgarh', 'Chhattisgarh'],
    ['cg_', 'Chhattisgarh'], ['dadra', 'Dadra and Nagar Haveli'], ['daman', 'Daman and Diu'], ['delhi', 'Delhi NCR'],
    ['goa', 'Goa'], ['gujarat', 'Gujarat'], ['haryana', 'Haryana'], ['hp_', 'Himachal Pradesh'], ['himachal', 'Himachal Pradesh'],
    ['jammu', 'Jammu and Kashmir'], ['jharkhand', 'Jharkhand'], ['karnataka', 'Karnataka'], ['kerala', 'Kerala'],
    ['ladakh', 'Ladakh'], ['lakshadweep', 'Lakshadweep'], ['madhya', 'Madhya Pradesh'], ['mp_', 'Madhya Pradesh'],
    ['maharashtra', 'Maharashtra'], ['manipur', 'Manipur'], ['meghalaya', 'Meghalaya'], ['mizoram', 'Mizoram'],
    ['nagaland', 'Nagaland'], ['odisha', 'Odisha'], ['puducherry', 'Puducherry'], ['punjab', 'Punjab'],
    ['rajasthan', 'Rajasthan'], ['sikkim', 'Sikkim'], ['tamil', 'Tamil Nadu'], ['tn_', 'Tamil Nadu'],
    ['telangana', 'Telangana'], ['tripura', 'Tripura'], ['uttar', 'Uttar Pradesh'], ['up_', 'Uttar Pradesh'],
    ['uttarakhand', 'Uttarakhand'], ['west_bengal', 'West Bengal'], ['west bengal', 'West Bengal'], ['ap_', 'Andhra Pradesh']
  ];
  for (const [keyword, stateName] of statesMap) {
    if (lower.includes(keyword)) { return stateName; }
  }
  return null;
}


function getValue(row, keys) {
  const rowKeys = Object.keys(row);
  const normalizedSearchKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // 1. Try exact or normalized match
  for (const rk of rowKeys) {
    const nrk = rk.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedSearchKeys.includes(nrk)) return row[rk];
  }

  // 2. Try partial match
  for (const rk of rowKeys) {
    const nrk = rk.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nrk === '') continue;
    for (const nsk of normalizedSearchKeys) {
      if (nsk.length > 3 && (nrk.includes(nsk) || nsk.includes(nrk))) return row[rk];
    }
  }
  
  // 3. Fallback for 'name' if we see __EMPTY columns
  if (normalizedSearchKeys.includes('universityname')) {
    const emptyKey = rowKeys.find(k => k.startsWith('__EMPTY') && row[k] && row[k].toString().length > 5);
    if (emptyKey) return row[emptyKey];
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
    let maxScore = -1;
    
    for (let i = 0; i < Math.min(rawData.length, 30); i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row)) continue;
      const rowStr = row.map(c => (c || '').toString().toLowerCase()).join('|');
      let score = 0;
      if (rowStr.includes('university') || rowStr.includes('name')) score++;
      if (rowStr.includes('state') || rowStr.includes('city') || rowStr.includes('address') || rowStr.includes('location')) score++;
      if (rowStr.includes('course') || rowStr.includes('program') || rowStr.includes('fee') || rowStr.includes('establishment')) score++;
      
      const colCount = row.filter(c => c !== null && c !== '').length;
      if (colCount >= 4) {
        if (score > maxScore) {
          maxScore = score;
          headerRowIndex = i;
        }
      }
    }
    
    const foundHeaders = rawData[headerRowIndex];
    // console.log(`[import]   Selected header row at index ${headerRowIndex} with score ${maxScore}`);

    const uniData = xlsx.utils.sheet_to_json(sheet, { range: headerRowIndex });
    
    const uniMap = new Map(); // Name -> DB ID
    let uniCount = 0;
    let skipCount = 0;

    for (const row of uniData) {
      const name = getValue(row, UNI_MAPPINGS.name);
      if (!name) {
        if (skipCount === 0) console.log(`[import]   Sample row keys: ${Object.keys(row).join(', ')}`);
        skipCount++;
        continue;
      }

      let state = getValue(row, UNI_MAPPINGS.state);
      const fileState = extractStateFromFileName(filePath);
      
      const allStates = [
        'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 
        'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi NCR', 'Delhi',
        'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 
        'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 
        'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 
        'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
        'Uttarakhand', 'West Bengal'
      ];

      function cleanState(s) {
        if (!s) return null;
        const lower = s.toString().toLowerCase();
        for (const st of allStates) {
          if (lower.includes(st.toLowerCase())) return st;
        }
        return null;
      }

      let cleanedState = cleanState(state);
      if (!cleanedState) {
        cleanedState = fileState;
      }
      if (!cleanedState) continue; // Skip if no state could be determined

      // Normalize 'Delhi NCR' to 'Delhi' if needed, or keep as is. Let's keep it as is if it's in the list.
      if (cleanedState === 'Delhi') cleanedState = 'Delhi NCR';


      const uniFields = {
        name: name.trim(),
        slug: slugify(name.trim(), { lower: true, strict: true }),
        state: cleanedState.trim(),
        city: (getValue(row, UNI_MAPPINGS.city) || '').toString().trim(),
        type: (getValue(row, UNI_MAPPINGS.type) || 'private').toString().toLowerCase().match(/deemed|deemed to be private|deemed university/) ? 'deemed' : 'private',
        establishedYear: parseInt(getValue(row, UNI_MAPPINGS.establishedYear)) || 2000,
        website: getValue(row, UNI_MAPPINGS.website),
        phone: getValue(row, UNI_MAPPINGS.phone),
        email: getValue(row, UNI_MAPPINGS.email),
        address: getValue(row, UNI_MAPPINGS.address),
      };

      // Extract city from address if city is Unknown/empty
      if ((!uniFields.city || uniFields.city === 'Unknown') && uniFields.address) {
        const parts = uniFields.address.toString().split(',');
        if (parts.length > 0) {
          uniFields.city = parts[0].trim();
        }
      }
      if (!uniFields.city) uniFields.city = 'Unknown';

      try {
        const uni = await University.findOneAndUpdate(
          { name: uniFields.name },
          { $set: uniFields },
          { upsert: true, new: true }
        );
        uniMap.set(uniFields.name, uni._id);
        uniCount++;
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
          uniCount++;
        } else throw err;
      }
    }
    console.log(`[import]   Found ${uniCount} universities (skipped ${skipCount} rows)`);

    // 1.5 Process Courses from Column (if available in main sheet)
    let extraCourseCount = 0;
    for (const row of uniData) {
      const universityName = getValue(row, UNI_MAPPINGS.name);
      const universityId = uniMap.get(universityName);
      if (!universityId) continue;

      const coursesStr = getValue(row, ['Courses Offered', 'Courses', 'Programs', 'Courses Available']);
      if (coursesStr && coursesStr.toString().trim().length > 2) {
        const courseNames = coursesStr.toString().split(/[,|;]|\n/).map(c => c.trim()).filter(c => c.length > 2);
        for (const cName of courseNames) {
          const cSlug = slugify(cName + '-' + universityId, { lower: true, strict: true });
          const course = await Course.findOneAndUpdate(
            { slug: cSlug },
            {
              name: cName,
              slug: cSlug,
              universityId: universityId,
              category: getValue(row, COURSE_MAPPINGS.category) || 'General',
              duration: (getValue(row, COURSE_MAPPINGS.duration) || '3-4 Years').toString(),
              feesPerYear: parseFloat(getValue(row, ['Fees', 'Fee', 'Fees Structure', 'Fees (INR)'])) || 0,
            },
            { upsert: true, new: true }
          );
          await University.findByIdAndUpdate(universityId, { $addToSet: { courses: course._id } });
          extraCourseCount++;
        }
      }
    }
    if (extraCourseCount > 0) console.log(`[import]   Processed ${extraCourseCount} column-based course entries`);

    // 2. Process Courses
    const courseSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('course')) || workbook.SheetNames[1];
    if (courseSheetName && workbook.Sheets[courseSheetName]) {
      const cSheet = workbook.Sheets[courseSheetName];
      // Find header for courses
      const cRawData = xlsx.utils.sheet_to_json(cSheet, { header: 1 });
      let cHeaderIndex = 0;
      let cMaxScore = -1;
      
      for (let i = 0; i < Math.min(cRawData.length, 30); i++) {
        const row = cRawData[i];
        if (!row || !Array.isArray(row)) continue;
        const rowStr = row.map(c => (c || '').toString().toLowerCase()).join('|');
        let score = 0;
        if (rowStr.includes('course') || rowStr.includes('program') || rowStr.includes('name')) score++;
        if (rowStr.includes('fee') || rowStr.includes('duration') || rowStr.includes('level') || rowStr.includes('category')) score++;
        
        const colCount = row.filter(c => c !== null && c !== '').length;
        if (colCount >= 3) {
          if (score > cMaxScore) {
            cMaxScore = score;
            cHeaderIndex = i;
          }
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

        const newCourse = {
          universityId: uniId,
          name: name.trim(),
          category: level,
          duration: parseInt(getValue(row, COURSE_MAPPINGS.duration)) || 3,
          feesPerYear: fees,
          totalSeats: parseInt(getValue(row, COURSE_MAPPINGS.totalSeats)) || 60,
          entranceExams: exams ? exams.toString().split(',').map(e => e.trim()) : [],
          eligibility: getValue(row, COURSE_MAPPINGS.eligibility),
          specializations: []
        };
        const course = await Course.create(newCourse);
        await University.findByIdAndUpdate(uniId, { $addToSet: { courses: course._id } });
        coursesToInsert.push(course);
      }

      if (coursesToInsert.length > 0) {
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
    if (item.toLowerCase().includes('foreign')) {
      console.log(`[import] Skipping foreign universities file: ${item}`);
      continue;
    }
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllExcelFiles(fullPath, files);
    } else if (item.endsWith('.xlsx') && !item.startsWith('~$')) {
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
