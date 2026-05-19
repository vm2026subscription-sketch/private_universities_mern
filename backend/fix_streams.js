/**
 * Fix missing streams: Agriculture, Hotel Management, Media, Fisheries, Yoga, etc.
 * Re-parse all courses that landed in "Others" or got wrong stream
 */
require('dotenv').config();
const mongoose = require('mongoose');

const EXTRA_STREAM_PATTERNS = [
  // Agriculture
  [/\bAgri(culture|cultural)?\b/i, 'B.Sc Agriculture', 'Agriculture', 'UG'],
  [/\bHorticulture\b/i, 'B.Sc Horticulture', 'Agriculture', 'UG'],
  [/\bForestry\b/i, 'B.Sc Forestry', 'Agriculture', 'UG'],
  [/\bVeterinary\b/i, 'B.V.Sc', 'Agriculture', 'UG'],
  [/\bDairy\s*(Science|Tech)/i, 'B.Sc Dairy Science', 'Agriculture', 'UG'],
  [/\bFisheries?(\s*Science)?\b/i, 'Fisheries Science', 'Agriculture', 'UG'],
  [/\bAquaculture\b/i, 'Aquaculture', 'Agriculture', 'UG'],
  [/\bFood\s*(Science|Technology|Processing)\b/i, 'Food Technology', 'Agriculture', 'UG'],
  [/\bB\.?\s*F\.?\s*Sc\b/i, 'Fisheries Science', 'Agriculture', 'UG'],
  [/\bM\.?\s*F\.?\s*Sc\b/i, 'Fisheries Science', 'Agriculture', 'PG'],
  [/\bB\.?\s*V\.?\s*Sc\b/i, 'B.V.Sc', 'Agriculture', 'UG'],
  [/\bM\.?\s*Sc\.?\s*(Agri|Agriculture)/i, 'M.Sc Agriculture', 'Agriculture', 'PG'],
  [/\bB\.?\s*Sc\.?\s*(Agri|Agriculture)/i, 'B.Sc Agriculture', 'Agriculture', 'UG'],

  // Hotel Management / Hospitality
  [/\bHotel\s*Management\b/i, 'Hotel Management', 'Hotel Management', 'UG'],
  [/\bHospitality\b/i, 'Hospitality Management', 'Hotel Management', 'UG'],
  [/\bCatering\b/i, 'Catering Technology', 'Hotel Management', 'UG'],
  [/\bB\.?\s*Sc\.?\s*Hospitality\b/i, 'B.Sc Hospitality', 'Hotel Management', 'UG'],
  [/\bBHM\b/i, 'BHM', 'Hotel Management', 'UG'],
  [/\bMHM\b/i, 'MHM', 'Hotel Management', 'PG'],
  [/\bB\.?\s*Sc\.?\s*(Hotel|Culinary)/i, 'B.Sc Hotel Management', 'Hotel Management', 'UG'],

  // Media & Mass Communication
  [/\bMass\s*Comm(unication)?\b/i, 'Mass Communication', 'Media & Mass Communication', 'UG'],
  [/\bJournalism\b/i, 'Journalism', 'Media & Mass Communication', 'UG'],
  [/\bBJMC\b/i, 'BJMC', 'Media & Mass Communication', 'UG'],
  [/\bMJMC\b/i, 'MJMC', 'Media & Mass Communication', 'PG'],
  [/\bMedia\s*(Management|Studies|Science)?\b/i, 'Media Studies', 'Media & Mass Communication', 'UG'],
  [/\bPublic\s*Relations\b/i, 'Public Relations', 'Media & Mass Communication', 'UG'],
  [/\bAdvertising\b/i, 'Advertising', 'Media & Mass Communication', 'UG'],
  [/\bFilm\s*(Production|Making|Studies)\b/i, 'Film Studies', 'Media & Mass Communication', 'UG'],
  [/\bAnimation\b/i, 'Animation', 'Media & Mass Communication', 'UG'],
  [/\bB\.?\s*A\.?\s*\(?\s*Journalism\b/i, 'Journalism', 'Media & Mass Communication', 'UG'],

  // Yoga / Naturopathy
  [/\bYoga\b/i, 'Yoga & Naturopathy', 'Medical', 'UG'],
  [/\bNaturopathy\b/i, 'Naturopathy', 'Medical', 'UG'],

  // Performing Arts / Fine Arts
  [/\bPerforming\s*Arts?\b/i, 'Performing Arts', 'Arts', 'UG'],
  [/\bBPA\b/i, 'BPA', 'Arts', 'UG'],
  [/\bMPA\b/i, 'MPA', 'Arts', 'PG'],
  [/\bMusic\b/i, 'Music', 'Arts', 'UG'],
  [/\bDance\b/i, 'Dance', 'Arts', 'UG'],
  [/\bTheatre\b/i, 'Theatre', 'Arts', 'UG'],
  [/\bVisual\s*Arts?\b/i, 'Visual Arts', 'Arts', 'UG'],

  // Sports Science / Physical Education
  [/\bSports?\s*Science\b/i, 'Sports Science', 'Education', 'UG'],
  [/\bPhysical\s*Education\b/i, 'Physical Education', 'Education', 'UG'],
  [/\bB\.?\s*P\.?\s*Ed\b/i, 'B.P.Ed', 'Education', 'UG'],
  [/\bM\.?\s*P\.?\s*Ed\b/i, 'M.P.Ed', 'Education', 'PG'],

  // Library Science
  [/\bLibrary\s*(Science|&\s*Inf)/i, 'Library Science', 'Arts', 'UG'],
  [/\bB\.?\s*Lib\b/i, 'B.Lib', 'Arts', 'UG'],
  [/\bM\.?\s*Lib\b/i, 'M.Lib', 'Arts', 'PG'],

  // Public Health
  [/\bPublic\s*Health\b/i, 'Public Health', 'Medical', 'UG'],

  // Fashion
  [/\bFashion\s*(Design|Technology|Management)\b/i, 'Fashion Design', 'Design', 'UG'],
  [/\bTextile\s*(Design|Technology)?\b/i, 'Textile Design', 'Design', 'UG'],
  [/\bLeather\s*Technology\b/i, 'Leather Technology', 'Engineering', 'UG'],

  // Interior Design
  [/\bInterior\s*Design\b/i, 'Interior Design', 'Design', 'UG'],

  // Social Work
  [/\bBSW\b/i, 'BSW', 'Social Work', 'UG'],
  [/\bMSW\b/i, 'MSW', 'Social Work', 'PG'],
  [/\bSocial\s*Work\b/i, 'Social Work', 'Social Work', 'UG'],

  // Commerce variants
  [/\bAccounting\s*(&|and)\s*Finance\b/i, 'Accounting & Finance', 'Commerce', 'UG'],
  [/\bBAF\b/i, 'BAF', 'Commerce', 'UG'],
];

async function fixMissingStreams() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const db = mongoose.connection.client.db('vidyarthi-mitra');
  const courses = db.collection('courses');

  // Fix all courses — re-check patterns with priority for Agriculture/Hotel/Media
  // Process courses currently in "Others" stream OR incorrectly assigned Science for Agriculture
  const toFix = await courses.find({
    $or: [
      { stream: 'Others' },
      { stream: 'Science', name: { $regex: /agri|horti|forest|veterinary|dairy|fisheri/i } },
      { stream: 'Science', name: { $regex: /hotel|hospitality|catering|culinary/i } },
    ]
  }).toArray();
  
  console.log(`Found ${toFix.length} courses to re-check`);

  let fixed = 0;
  for (const course of toFix) {
    const name = course.name || '';
    
    for (const [regex, baseCourse, stream, category] of EXTRA_STREAM_PATTERNS) {
      if (regex.test(name)) {
        // Extract specialization
        let spec = name.replace(regex, '').trim();
        spec = spec.replace(/^[\s\-–:,\(\)]+/, '').replace(/[\(\)]+$/, '').replace(/^\(/, '').replace(/\)$/, '').trim();
        if (!spec || spec.length < 2) spec = 'General';
        
        await courses.updateOne({ _id: course._id }, { $set: {
          baseCourse,
          stream,
          category,
          specializationName: spec,
        }});
        fixed++;
        break;
      }
    }
  }
  console.log(`Fixed ${fixed} courses`);

  // Final stream counts
  const streams = await courses.aggregate([
    { $group: { _id: '$stream', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\n=== STREAM DISTRIBUTION ===');
  streams.forEach(s => console.log(`  ${s._id}: ${s.count}`));

  process.exit(0);
}

fixMissingStreams().catch(e => { console.error(e); process.exit(1); });
