require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const University = require('../src/models/University');
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const count = await University.countDocuments();
  console.log('Total universities in DB:', count);
  const byState = await University.aggregate([
    { $group: { _id: '$state', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\nBy state:');
  byState.forEach(s => console.log('  ' + (s._id || 'null') + ': ' + s.count));
  await mongoose.disconnect();
}
main();
