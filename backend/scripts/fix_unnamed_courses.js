/**
 * fix_unnamed_courses.js
 * ---------------------
 * Finds every Course document whose `name` is empty/null/missing and:
 *   1. Builds a meaningful name from baseCourse + specializationName + category
 *   2. Updates the record in place
 *   3. Reports a summary
 *
 * Run: node backend/scripts/fix_unnamed_courses.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');

const buildName = (doc) => {
  // Try to compose a meaningful name from available fields
  const parts = [];
  if (doc.baseCourse)         parts.push(doc.baseCourse.trim());
  if (doc.specializationName) parts.push(`(${doc.specializationName.trim()})`);
  if (!parts.length && doc.category) parts.push(doc.category.trim());
  if (!parts.length && doc.stream)   parts.push(doc.stream.trim());
  return parts.length ? parts.join(' ') : 'General Program';
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Find all courses where name is missing, null, or blank
  const bad = await Course.find({
    $or: [
      { name: { $exists: false } },
      { name: null },
      { name: '' },
    ],
  }).lean();

  console.log(`🔍 Found ${bad.length} courses with missing names.\n`);

  if (bad.length === 0) {
    console.log('Nothing to fix. All courses already have names.');
    await mongoose.disconnect();
    return;
  }

  let fixed = 0;
  let failed = 0;

  for (const doc of bad) {
    const newName = buildName(doc);
    try {
      await Course.findByIdAndUpdate(doc._id, { $set: { name: newName } });
      console.log(`  ✔ Fixed [${doc._id}] → "${newName}"`);
      fixed++;
    } catch (err) {
      console.error(`  ✘ Failed [${doc._id}]: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${fixed} fixed, ${failed} failed out of ${bad.length} total.`);
  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
