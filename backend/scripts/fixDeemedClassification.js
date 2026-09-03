/**
 * Migration script: Fix misclassified deemed universities
 * 
 * Many deemed universities were labeled as "private" because Excel files
 * use "State Private University" instead of "Deemed University".
 * This script checks university names against the UGC deemed list
 * and updates the type field accordingly.
 * 
 * Usage: node fixDeemedClassification.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { DEEMED_UNIVERSITIES } = require('../src/utils/deemedUniversities');

const University = require('../src/models/University');

function isDeemedUniversity(name) {
  const lower = (name || '').toLowerCase();
  return DEEMED_UNIVERSITIES.some(d => lower.includes(d.toLowerCase()));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  // Find all universities that are currently classified as private
  const privateUnis = await University.find({ type: 'private' });
  console.log(`Found ${privateUnis.length} private universities to check.\n`);

  const toUpdate = [];
  for (const uni of privateUnis) {
    if (isDeemedUniversity(uni.name)) {
      toUpdate.push(uni);
    }
  }

  console.log(`Found ${toUpdate.length} universities to reclassify as "deemed":\n`);
  toUpdate.forEach((u, i) => console.log(`  ${i + 1}. ${u.name} (${u.state})`));

  if (toUpdate.length === 0) {
    console.log('\nNo universities need reclassification.');
    await mongoose.disconnect();
    return;
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made. Run without --dry-run to apply.');
  } else {
    console.log('\nApplying changes...');
    for (const uni of toUpdate) {
      await University.updateOne(
        { _id: uni._id },
        { $set: { type: 'deemed', institutionKind: 'deemed' } }
      );
    }
    console.log(`Updated ${toUpdate.length} universities.`);
  }

  // Show final counts
  const counts = await University.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\nFinal type distribution:');
  counts.forEach(c => console.log(`  ${c._id || 'null'}: ${c.count}`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
