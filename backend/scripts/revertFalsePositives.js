/**
 * Revert false positive deemed classifications
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const University = require('../src/models/University');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const falsePositives = [
    'Arka Jain University',
    'Maharishi Mahesh Yogi Vedic Vishwavidyalaya',
    'Sikkim Professional University'
  ];
  
  for (const name of falsePositives) {
    const result = await University.updateOne(
      { name: { $regex: name, $options: 'i' } },
      { $set: { type: 'private', institutionKind: 'private' } }
    );
    console.log('Reverted:', name, result.modifiedCount ? '(found)' : '(not found)');
  }
  
  const counts = await University.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\nFinal type distribution:');
  counts.forEach(c => console.log(`  ${c._id || 'null'}: ${c.count}`));
  
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
