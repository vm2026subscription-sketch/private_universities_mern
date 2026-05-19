const path = require('path');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

function cleanField(val) {
  if (!val) return null;
  const str = val.toString().trim();
  if (
    str === '' ||
    str === '—' ||
    str === '–' ||
    str === 'Not Available' ||
    str === 'TBD' ||
    str === 'Proposed' ||
    str === 'Planned' ||
    str === 'N/A' ||
    str === 'N/A (Foreign University)'
  ) {
    return null;
  }
  return str;
}

function extractNumericFee(feeStr) {
  if (!feeStr) return null;
  const cleaned = feeStr.toString().replace(/,/g, '');
  // First look for a rupee sign followed by a number
  const rupeeMatch = cleaned.match(/₹\s*(\d+)/);
  if (rupeeMatch) {
    return parseInt(rupeeMatch[1], 10);
  }
  // Otherwise look for any numeric value in "per year" or general number
  const numMatch = cleaned.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  return null;
}

async function run() {
  try {
    await connectDB();
    console.log('[seed-intake] Connected to MongoDB');

    const workbook = xlsx.readFile('c:\\Users\\ankur\\Downloads\\vm_private_universities\\private_universities_mern\\backend\\data\\extracted_clean\\Private universities data\\soham\\Foreign_Universities_India_Seat_Intake_2024_25 (1).xlsx');
    console.log('[seed-intake] Excel file loaded. Total sheets:', workbook.SheetNames.length);

    // Delete existing courses for all foreign universities to avoid duplicates
    const foreignUnis = await University.find({ type: 'foreign' });
    const foreignUniIds = foreignUnis.map(u => u._id);
    const deleteCoursesRes = await Course.deleteMany({ universityId: { $in: foreignUniIds } });
    console.log(`[seed-intake] Deleted ${deleteCoursesRes.deletedCount} existing courses for foreign universities`);

    // Reset courses array on all foreign universities
    for (const u of foreignUnis) {
      u.courses = [];
      await u.save();
    }
    console.log(`[seed-intake] Reset courses array for all 16 foreign universities`);

    let seededUnisCount = 0;
    let seededCoursesCount = 0;

    // Loop through university sheets (Sheet 1 to 16)
    for (let sIdx = 1; sIdx < workbook.SheetNames.length; sIdx++) {
      const sheetName = workbook.SheetNames[sIdx];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length === 0) continue;

      const excelUniName = rows[0][0]?.trim();
      const metaStr = rows[1][0] || '';

      // Parse metadata string
      const meta = {};
      metaStr.split('|').forEach(part => {
        const parts = part.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(':').trim();
          meta[key] = val;
        }
      });

      // Find the university in the DB by exact name
      let dbUni = await University.findOne({ name: excelUniName });
      if (!dbUni) {
        // Try loose matching by slug or partial name
        const slug = slugify(excelUniName, { lower: true, strict: true });
        dbUni = await University.findOne({ slug });
      }

      if (!dbUni) {
        console.warn(`[seed-intake] WARNING: University not found in DB: "${excelUniName}". Skipping.`);
        continue;
      }

      // Parse fields from rows 2 to 7
      let address = null;
      let email = null;
      let phone = null;
      let ugcStatus = null;
      let typeStr = null;

      for (let r = 2; r < 8; r++) {
        if (!rows[r]) continue;
        const key = rows[r][0]?.toString().trim().toLowerCase();
        const val = rows[r][1]?.toString().trim();
        if (key === 'address:') address = cleanField(val);
        if (key === 'email:') email = cleanField(val);
        if (key === 'phone:') phone = cleanField(val);
        if (key === 'ugc status:') ugcStatus = cleanField(val);
        if (key === 'type:') typeStr = cleanField(val);
      }

      // Parse established year from meta or default
      let establishedYear = null;
      if (meta['established']) {
        const year = parseInt(meta['established'], 10);
        if (!isNaN(year)) establishedYear = year;
      }

      // Parse seats row
      let totalUgSeats = null;
      let totalPgSeats = null;
      let totalPhdSeats = null;
      let grandTotalSeats = null;

      const seatsRow = rows[7]?.[0] || '';
      if (seatsRow.startsWith('▶')) {
        seatsRow.split('|').forEach(part => {
          const cleanPart = part.replace('▶', '').trim();
          const parts = cleanPart.split(':');
          if (parts.length >= 2) {
            const key = parts[0].trim().toLowerCase();
            const val = parts[1].trim();
            const num = parseInt(val.replace(/,/g, ''), 10);
            if (!isNaN(num)) {
              if (key.includes('ug')) totalUgSeats = num;
              else if (key.includes('pg')) totalPgSeats = num;
              else if (key.includes('phd')) totalPhdSeats = num;
              else if (key.includes('grand')) grandTotalSeats = num;
            }
          }
        });
      }

      // Update DB University fields
      dbUni.establishedYear = establishedYear || dbUni.establishedYear;
      dbUni.website = cleanField(meta['website']) || dbUni.website;
      dbUni.address = address || dbUni.address;
      dbUni.email = email || dbUni.email;
      dbUni.phone = phone || dbUni.phone;
      dbUni.type = 'foreign';

      // Set UGC approval
      if (ugcStatus && (ugcStatus.toLowerCase().includes('approved') || ugcStatus.toLowerCase().includes('operational'))) {
        dbUni.approvals = dbUni.approvals || {};
        dbUni.approvals.ugc = true;
      }

      // Update description or append UGC status for transparency
      if (ugcStatus) {
        dbUni.admissions = dbUni.admissions || {};
        dbUni.admissions.counsellingInfo = `UGC Status: ${ugcStatus}`;
      }

      // Update stats
      dbUni.stats = dbUni.stats || {};
      if (grandTotalSeats) {
        dbUni.stats.totalStudents = grandTotalSeats;
      }
      
      // Parse courses starting from row 8
      const parsedCourses = [];
      for (let r = 8; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;
        const isNum = typeof row[0] === 'number' || (row[0] && !isNaN(row[0]) && row[0].toString().trim() !== '');
        if (isNum) {
          const cName = row[1]?.toString().trim();
          const cLevel = cleanField(row[2]);
          const cDuration = cleanField(row[3]);
          const cSeats = parseInt(row[4]?.toString().replace(/,/g, ''), 10);
          const cAdmissionBasis = cleanField(row[5]);
          const cFeesStr = cleanField(row[6]);
          const cRemarks = cleanField(row[7]);

          if (cName) {
            // Determine category and stream dynamically
            let category = 'others';
            let stream = 'Others';

            const nameLower = cName.toLowerCase();
            if (
              nameLower.includes('mba') ||
              nameLower.includes('business') ||
              nameLower.includes('management') ||
              nameLower.includes('finance') ||
              nameLower.includes('fintech') ||
              nameLower.includes('analytics') ||
              nameLower.includes('accounting') ||
              nameLower.includes('commerce')
            ) {
              category = 'management';
              stream = 'Management';
            } else if (
              nameLower.includes('b.tech') ||
              nameLower.includes('m.tech') ||
              nameLower.includes('engineering') ||
              nameLower.includes('cyber') ||
              nameLower.includes('computing') ||
              nameLower.includes('data science') ||
              nameLower.includes('information') ||
              nameLower.includes('software') ||
              nameLower.includes('computer') ||
              nameLower.includes('science') ||
              nameLower.includes('stem')
            ) {
              category = 'engineering';
              stream = 'Engineering';
            } else if (
              nameLower.includes('design') ||
              nameLower.includes('fashion') ||
              nameLower.includes('art') ||
              nameLower.includes('liberal')
            ) {
              category = 'design';
              stream = 'Design';
            }

            parsedCourses.push({
              name: cName,
              level: cLevel,
              duration: cDuration || 'N/A',
              seats: isNaN(cSeats) ? null : cSeats,
              admissionBasis: cAdmissionBasis,
              fees: cFeesStr,
              remarks: cRemarks,
              category,
              stream
            });
          }
        }
      }

      // Save each course to the database and link it
      const courseIds = [];
      for (const pc of parsedCourses) {
        const cDoc = await Course.create({
          universityId: dbUni._id,
          name: pc.name,
          slug: slugify(pc.name, { lower: true, strict: true }),
          category: pc.category,
          stream: pc.stream,
          duration: pc.duration,
          totalSeats: pc.seats,
          feesPerYear: extractNumericFee(pc.fees),
          eligibility: pc.admissionBasis || undefined,
          specializationName: pc.remarks || undefined
        });
        courseIds.push(cDoc._id);
        seededCoursesCount++;
      }

      dbUni.courses = courseIds;
      dbUni.stats.totalCoursesCount = courseIds.length;

      await dbUni.save();
      seededUnisCount++;
      console.log(`[seed-intake] Successfully updated university: "${dbUni.name}" with ${courseIds.length} courses.`);
    }

    console.log(`\n[seed-intake] SEEDING COMPLETED SUCCESSFULLY!`);
    console.log(`[seed-intake] Updated Universities: ${seededUnisCount}`);
    console.log(`[seed-intake] Seeded Course Records: ${seededCoursesCount}`);

    mongoose.connection.close();
  } catch (err) {
    console.error('[seed-intake] Fatal error:', err);
    process.exit(1);
  }
}

run();
