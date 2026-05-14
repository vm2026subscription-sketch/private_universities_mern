const mongoose = require('mongoose');
require('dotenv').config();

const CourseSchema = new mongoose.Schema({
  name: String,
  baseCourse: String,
  specializationName: String
});

const Course = mongoose.model('Course', CourseSchema);

const BASE_COURSES = [
  'B.Tech', 'M.Tech', 'B.E.', 'M.E.', 'MBA', 'BBA', 'BCA', 'MCA', 'B.Sc', 'M.Sc', 
  'B.Com', 'M.Com', 'BA', 'MA', 'B.A.', 'M.A.', 'LLB', 'LLM', 'MBBS', 'BDS', 
  'B.Pharm', 'M.Pharm', 'B.Arch', 'M.Arch', 'B.Ed', 'M.Ed', 'Ph.D', 'Diploma', 
  'PGDM', 'BMS', 'MMS', 'BFA', 'MFA', 'B.Voc', 'M.Voc', 'BAMS', 'BHMS', 'BUMS', 
  'BPT', 'MPT', 'LL.B', 'LL.M'
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const allCourses = await Course.find({});
  console.log(`Processing ${allCourses.length} courses...`);

  let updatedCount = 0;
  const bulkOps = [];

  // Order by length descending to match B.Tech before BA
  const sortedBases = [...BASE_COURSES].sort((a, b) => b.length - a.length);
  const baseRegex = new RegExp(`^(${sortedBases.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(\\b|\\s|\\.)`, 'i');

  for (const course of allCourses) {
    const name = course.name;
    let base = '';
    let spec = '';

    const match = name.match(baseRegex);
    if (match) {
      base = match[1];
      let cleanBase = base.toUpperCase().replace(/\./g, '').trim();
      
      if (cleanBase === 'BE') cleanBase = 'B.Tech';
      if (cleanBase === 'ME') cleanBase = 'M.Tech';
      if (cleanBase === 'B.A') cleanBase = 'BA';
      if (cleanBase === 'M.A') cleanBase = 'MA';
      
      let remaining = name.substring(match[0].length).trim();
      spec = remaining.replace(/^(in|–|-|:|\s|\(|\)|\.)+/i, '').replace(/\)+$/, '').trim();
      
      if (!spec) spec = 'General';

      if (course.baseCourse !== cleanBase || course.specializationName !== spec) {
        bulkOps.push({
          updateOne: {
            filter: { _id: course._id },
            update: { $set: { baseCourse: cleanBase, specializationName: spec } }
          }
        });
        updatedCount++;
      }
    } else {
      // Handle cases like "Bachelor of Arts"
      if (name.toLowerCase().startsWith('bachelor of arts')) {
        base = 'BA';
        spec = name.substring(16).replace(/^(in|–|-|:|\s|\(|\)|\.)+/i, '').trim() || 'General';
      } else if (name.toLowerCase().startsWith('master of arts')) {
        base = 'MA';
        spec = name.substring(14).replace(/^(in|–|-|:|\s|\(|\)|\.)+/i, '').trim() || 'General';
      } else if (name.toLowerCase().startsWith('bachelor of technology')) {
        base = 'B.Tech';
        spec = name.substring(22).replace(/^(in|–|-|:|\s|\(|\)|\.)+/i, '').trim() || 'General';
      } else {
        base = name;
        spec = 'General';
      }

      if (course.baseCourse !== base || course.specializationName !== spec) {
        bulkOps.push({
          updateOne: {
            filter: { _id: course._id },
            update: { $set: { baseCourse: base, specializationName: spec } }
          }
        });
        updatedCount++;
      }
    }

    if (bulkOps.length >= 500) {
      await Course.bulkWrite(bulkOps);
      bulkOps.length = 0;
      console.log(`Updated ${updatedCount} courses so far...`);
    }
  }

  if (bulkOps.length > 0) {
    await Course.bulkWrite(bulkOps);
  }

  console.log(`Migration complete. Total updated: ${updatedCount}`);
  
  const sample = await Course.find({ baseCourse: 'BA' }).limit(5);
  console.log('Sample BA groups:', sample.map(s => ({ name: s.name, base: s.baseCourse, spec: s.specializationName })));

  await mongoose.disconnect();
}

run();
