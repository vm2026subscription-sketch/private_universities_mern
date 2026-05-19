/**
 * Fix courses: populate baseCourse, stream, and normalize category
 * by parsing the course name field.
 */
require('dotenv').config();
const mongoose = require('mongoose');

// Map course name patterns to baseCourse + stream
const COURSE_PATTERNS = [
  // Engineering / Technology
  { regex: /\bB\.?\s*Tech\b/i, baseCourse: 'B.Tech', stream: 'Engineering', category: 'UG' },
  { regex: /\bM\.?\s*Tech\b/i, baseCourse: 'M.Tech', stream: 'Engineering', category: 'PG' },
  { regex: /\bB\.?\s*E\b\.?(?!\w)/i, baseCourse: 'B.E.', stream: 'Engineering', category: 'UG' },
  { regex: /\bM\.?\s*E\b\.?(?!\w)/i, baseCourse: 'M.E.', stream: 'Engineering', category: 'PG' },
  
  // Management
  { regex: /\bMBA\b/i, baseCourse: 'MBA', stream: 'Management', category: 'PG' },
  { regex: /\bBBA\b/i, baseCourse: 'BBA', stream: 'Management', category: 'UG' },
  { regex: /\bBMS\b/i, baseCourse: 'BMS', stream: 'Management', category: 'UG' },
  { regex: /\bPGDM\b/i, baseCourse: 'PGDM', stream: 'Management', category: 'PG' },

  // Medical / Health
  { regex: /\bMBBS\b/i, baseCourse: 'MBBS', stream: 'Medical', category: 'UG' },
  { regex: /\bBDS\b/i, baseCourse: 'BDS', stream: 'Medical', category: 'UG' },
  { regex: /\bBHMS\b/i, baseCourse: 'BHMS', stream: 'Medical', category: 'UG' },
  { regex: /\bBAMS\b/i, baseCourse: 'BAMS', stream: 'Medical', category: 'UG' },
  { regex: /\bBUMS\b/i, baseCourse: 'BUMS', stream: 'Medical', category: 'UG' },
  { regex: /\bMD\b/i, baseCourse: 'MD', stream: 'Medical', category: 'PG' },
  { regex: /\bMS\b(?!\w)/i, baseCourse: 'MS', stream: 'Medical', category: 'PG' },
  { regex: /\bB\.?\s*Sc\.?\s*Nursing\b/i, baseCourse: 'B.Sc Nursing', stream: 'Medical', category: 'UG' },
  { regex: /\bM\.?\s*Sc\.?\s*Nursing\b/i, baseCourse: 'M.Sc Nursing', stream: 'Medical', category: 'PG' },
  { regex: /\bBPT\b/i, baseCourse: 'BPT', stream: 'Medical', category: 'UG' },
  { regex: /\bMPT\b/i, baseCourse: 'MPT', stream: 'Medical', category: 'PG' },

  // Pharmacy
  { regex: /\bB\.?\s*Pharm\b/i, baseCourse: 'B.Pharm', stream: 'Pharmacy', category: 'UG' },
  { regex: /\bM\.?\s*Pharm\b/i, baseCourse: 'M.Pharm', stream: 'Pharmacy', category: 'PG' },
  { regex: /\bD\.?\s*Pharm\b/i, baseCourse: 'D.Pharm', stream: 'Pharmacy', category: 'Diploma' },
  { regex: /\bPharm\.?\s*D\b/i, baseCourse: 'Pharm.D', stream: 'Pharmacy', category: 'UG' },

  // Law
  { regex: /\bBA\.?\s*LL\.?B\b/i, baseCourse: 'BA LLB', stream: 'Law', category: 'UG' },
  { regex: /\bBBA\.?\s*LL\.?B\b/i, baseCourse: 'BBA LLB', stream: 'Law', category: 'UG' },
  { regex: /\bB\.?Com\.?\s*LL\.?B\b/i, baseCourse: 'B.Com LLB', stream: 'Law', category: 'UG' },
  { regex: /\bLL\.?B\b/i, baseCourse: 'LLB', stream: 'Law', category: 'UG' },
  { regex: /\bLL\.?M\b/i, baseCourse: 'LLM', stream: 'Law', category: 'PG' },

  // Commerce
  { regex: /\bB\.?\s*Com\b/i, baseCourse: 'B.Com', stream: 'Commerce', category: 'UG' },
  { regex: /\bM\.?\s*Com\b/i, baseCourse: 'M.Com', stream: 'Commerce', category: 'PG' },
  { regex: /\bCA\b/i, baseCourse: 'CA', stream: 'Commerce', category: 'UG' },

  // Arts / Humanities
  { regex: /\bBA\b(?!\s*LL)/i, baseCourse: 'BA', stream: 'Arts', category: 'UG' },
  { regex: /\bMA\b(?!\s)/i, baseCourse: 'MA', stream: 'Arts', category: 'PG' },
  { regex: /\bB\.?\s*Fine\s*Arts?\b/i, baseCourse: 'BFA', stream: 'Arts', category: 'UG' },
  { regex: /\bMFA\b/i, baseCourse: 'MFA', stream: 'Arts', category: 'PG' },
  { regex: /\bBFA\b/i, baseCourse: 'BFA', stream: 'Arts', category: 'UG' },

  // Science
  { regex: /\bB\.?\s*Sc\b/i, baseCourse: 'B.Sc', stream: 'Science', category: 'UG' },
  { regex: /\bM\.?\s*Sc\b/i, baseCourse: 'M.Sc', stream: 'Science', category: 'PG' },

  // Computer Applications
  { regex: /\bBCA\b/i, baseCourse: 'BCA', stream: 'IT & Computer Science', category: 'UG' },
  { regex: /\bMCA\b/i, baseCourse: 'MCA', stream: 'IT & Computer Science', category: 'PG' },

  // Design
  { regex: /\bB\.?\s*Des\b/i, baseCourse: 'B.Des', stream: 'Design', category: 'UG' },
  { regex: /\bM\.?\s*Des\b/i, baseCourse: 'M.Des', stream: 'Design', category: 'PG' },

  // Architecture
  { regex: /\bB\.?\s*Arch\b/i, baseCourse: 'B.Arch', stream: 'Architecture', category: 'UG' },
  { regex: /\bM\.?\s*Arch\b/i, baseCourse: 'M.Arch', stream: 'Architecture', category: 'PG' },

  // Education
  { regex: /\bB\.?\s*Ed\b/i, baseCourse: 'B.Ed', stream: 'Education', category: 'UG' },
  { regex: /\bM\.?\s*Ed\b/i, baseCourse: 'M.Ed', stream: 'Education', category: 'PG' },
  { regex: /\bD\.?\s*El\.?\s*Ed\b/i, baseCourse: 'D.El.Ed', stream: 'Education', category: 'Diploma' },

  // Hotel Management
  { regex: /\bBHM\b/i, baseCourse: 'BHM', stream: 'Hotel Management', category: 'UG' },
  { regex: /\bHotel\s*Management\b/i, baseCourse: 'BHM', stream: 'Hotel Management', category: 'UG' },

  // Agriculture
  { regex: /\bB\.?\s*Sc\.?\s*Agri/i, baseCourse: 'B.Sc Agriculture', stream: 'Agriculture', category: 'UG' },
  { regex: /\bM\.?\s*Sc\.?\s*Agri/i, baseCourse: 'M.Sc Agriculture', stream: 'Agriculture', category: 'PG' },

  // Mass Communication / Media
  { regex: /\bBJMC\b/i, baseCourse: 'BJMC', stream: 'Media & Mass Communication', category: 'UG' },
  { regex: /\bMJMC\b/i, baseCourse: 'MJMC', stream: 'Media & Mass Communication', category: 'PG' },
  { regex: /\bMass\s*Comm/i, baseCourse: 'Mass Communication', stream: 'Media & Mass Communication', category: 'UG' },
  { regex: /\bJournalism\b/i, baseCourse: 'Journalism', stream: 'Media & Mass Communication', category: 'UG' },

  // Social Work
  { regex: /\bBSW\b/i, baseCourse: 'BSW', stream: 'Social Work', category: 'UG' },
  { regex: /\bMSW\b/i, baseCourse: 'MSW', stream: 'Social Work', category: 'PG' },

  // PhD / Doctorate
  { regex: /\bPh\.?\s*D\b/i, baseCourse: 'Ph.D', stream: 'Research', category: 'PhD' },
  { regex: /\bDoctor(ate|al)\b/i, baseCourse: 'Ph.D', stream: 'Research', category: 'PhD' },

  // Diploma generic
  { regex: /\bDiploma\b/i, baseCourse: 'Diploma', stream: 'Others', category: 'Diploma' },
  { regex: /\bPolytechnic\b/i, baseCourse: 'Polytechnic', stream: 'Engineering', category: 'Diploma' },
  { regex: /\bCertificate\b/i, baseCourse: 'Certificate', stream: 'Others', category: 'Diploma' },
];

// Normalize messy category values
function normalizeCategory(cat) {
  if (!cat) return 'UG';
  const c = cat.toLowerCase().trim();
  if (c.includes('phd') || c.includes('doctor') || c.includes('research')) return 'PhD';
  if (c.includes('diploma') || c.includes('certificate')) return 'Diploma';
  if (c.includes('pg') || c === 'postgraduate') return 'PG';
  if (c.includes('ug') || c === 'undergraduate' || c === 'general') return 'UG';
  if (c === 'private') return 'UG'; // "Private" is not a category
  return cat;
}

async function fixCourses() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.client.db('vidyarthi-mitra');
  const courses = db.collection('courses');

  const allCourses = await courses.find({}).toArray();
  console.log(`Processing ${allCourses.length} courses...`);

  let updated = 0;
  let unmatched = 0;
  const unmatchedNames = new Set();

  for (const course of allCourses) {
    const name = course.name || '';
    let baseCourse = null;
    let stream = 'Others';
    let newCategory = normalizeCategory(course.category);

    // Try to match course name to pattern
    for (const pattern of COURSE_PATTERNS) {
      if (pattern.regex.test(name)) {
        baseCourse = pattern.baseCourse;
        stream = pattern.stream;
        // Only override category if it was messy/generic
        if (!course.category || course.category === 'Others' || course.category.includes(',')) {
          newCategory = pattern.category;
        }
        break;
      }
    }

    if (!baseCourse) {
      unmatched++;
      if (unmatchedNames.size < 30) unmatchedNames.add(name);
      // Use the course name itself as baseCourse
      baseCourse = name;
    }

    await courses.updateOne(
      { _id: course._id },
      { $set: { baseCourse, stream, category: newCategory } }
    );
    updated++;

    if (updated % 500 === 0) console.log(`  Updated ${updated}/${allCourses.length}...`);
  }

  console.log(`\nDone! Updated ${updated} courses.`);
  console.log(`Matched: ${updated - unmatched} | Unmatched (used name as baseCourse): ${unmatched}`);

  if (unmatchedNames.size > 0) {
    console.log('\nSample unmatched course names:');
    unmatchedNames.forEach(n => console.log(`  - ${n}`));
  }

  // Verify
  const streams = await courses.aggregate([
    { $group: { _id: '$stream', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\n=== NEW STREAM DISTRIBUTION ===');
  streams.forEach(s => console.log(`  ${s._id}: ${s.count}`));

  process.exit(0);
}

fixCourses().catch(e => { console.error(e); process.exit(1); });
