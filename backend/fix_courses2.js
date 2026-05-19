/**
 * Fix remaining unmatched courses with dot-separated names like B.A., M.A., M.B.A, etc.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const EXTRA_PATTERNS = [
  // Dotted variants
  { regex: /\bB\.?\s*A\.?\s*\(/i, baseCourse: 'BA', stream: 'Arts', category: 'UG' },
  { regex: /\bB\.?\s*A\.?\s*$/i, baseCourse: 'BA', stream: 'Arts', category: 'UG' },
  { regex: /\bB\.?\s*A\.?\s+/i, baseCourse: 'BA', stream: 'Arts', category: 'UG' },
  { regex: /\bM\.?\s*A\.?\s*\(/i, baseCourse: 'MA', stream: 'Arts', category: 'PG' },
  { regex: /\bM\.?\s*A\.?\s+/i, baseCourse: 'MA', stream: 'Arts', category: 'PG' },
  { regex: /\bM\.?\s*B\.?\s*A\b/i, baseCourse: 'MBA', stream: 'Management', category: 'PG' },
  { regex: /\bM\.?\s*C\.?\s*A\b/i, baseCourse: 'MCA', stream: 'IT & Computer Science', category: 'PG' },
  { regex: /\bB\.?\s*C\.?\s*A\b.*Honors?\b/i, baseCourse: 'BCA', stream: 'IT & Computer Science', category: 'UG' },
  { regex: /\bB\.?\s*B\.?\s*A\b.*Honors?\b/i, baseCourse: 'BBA', stream: 'Management', category: 'UG' },
  { regex: /\bB\.?\s*Pharma\b/i, baseCourse: 'B.Pharm', stream: 'Pharmacy', category: 'UG' },
  { regex: /\bB\.?\s*H\.?\s*M\.?\s*S\.?\b/i, baseCourse: 'BHMS', stream: 'Medical', category: 'UG' },
  { regex: /\bGNM\b/i, baseCourse: 'GNM', stream: 'Medical', category: 'Diploma' },
  { regex: /\bANM\b/i, baseCourse: 'ANM', stream: 'Medical', category: 'Diploma' },
  { regex: /\bB\.?\s*P\.?\s*Ed\b/i, baseCourse: 'B.P.Ed', stream: 'Education', category: 'UG' },
  { regex: /\bPhysical\s*Education\b/i, baseCourse: 'Physical Education', stream: 'Education', category: 'UG' },
  { regex: /\bBPA\b/i, baseCourse: 'BPA', stream: 'Arts', category: 'UG' },
  { regex: /\bPerforming\s*Arts?\b/i, baseCourse: 'Performing Arts', stream: 'Arts', category: 'UG' },
  { regex: /\bYoga\b/i, baseCourse: 'Yoga & Naturopathy', stream: 'Medical', category: 'UG' },
  { regex: /\bNursing\b/i, baseCourse: 'Nursing', stream: 'Medical', category: 'UG' },
  { regex: /\bFisheries?\b/i, baseCourse: 'Fisheries Science', stream: 'Science', category: 'UG' },
  { regex: /\bVisual\s*Arts?\b/i, baseCourse: 'Visual Arts', stream: 'Arts', category: 'UG' },
  { regex: /\bAccounting\b/i, baseCourse: 'Accounting & Finance', stream: 'Commerce', category: 'UG' },
  { regex: /\bSports?\s*Science\b/i, baseCourse: 'Sports Science', stream: 'Science', category: 'UG' },
  { regex: /\bPublic\s*Health\b/i, baseCourse: 'Public Health', stream: 'Medical', category: 'UG' },
  { regex: /\bSurgery\b/i, baseCourse: 'MS', stream: 'Medical', category: 'PG' },
  { regex: /\bMedicine\b/i, baseCourse: 'MD', stream: 'Medical', category: 'PG' },
  { regex: /\bLib(rary)?\b/i, baseCourse: 'Library Science', stream: 'Arts', category: 'UG' },
  { regex: /\bPGD\w*/i, baseCourse: 'PG Diploma', stream: 'Others', category: 'PG' },
  { regex: /\bBachelor\b/i, baseCourse: 'Bachelor', stream: 'Others', category: 'UG' },
  { regex: /\bMaster\b/i, baseCourse: 'Master', stream: 'Others', category: 'PG' },
];

async function fixRemaining() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const db = mongoose.connection.client.db('vidyarthi-mitra');
  const courses = db.collection('courses');

  const others = await courses.find({ stream: 'Others' }).toArray();
  console.log(`Found ${others.length} courses still in "Others" stream`);

  let fixed = 0;
  for (const course of others) {
    const name = course.name || '';
    for (const pattern of EXTRA_PATTERNS) {
      if (pattern.regex.test(name)) {
        await courses.updateOne(
          { _id: course._id },
          { $set: { baseCourse: pattern.baseCourse, stream: pattern.stream, category: pattern.category } }
        );
        fixed++;
        break;
      }
    }
  }

  console.log(`Fixed ${fixed} more courses`);

  // Final stats
  const streams = await courses.aggregate([
    { $group: { _id: '$stream', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\n=== FINAL STREAM DISTRIBUTION ===');
  streams.forEach(s => console.log(`  ${s._id}: ${s.count}`));

  process.exit(0);
}

fixRemaining().catch(e => { console.error(e); process.exit(1); });
