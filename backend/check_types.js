const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const connectDB = require('./src/config/db');
const University = require('./src/models/University');

async function check() {
  await connectDB();

  // Maharashtra deemed
  const mhDeemed = await University.find({ state: 'Maharashtra', type: 'deemed' }).select('name city type').lean();
  console.log('Maharashtra Deemed (' + mhDeemed.length + '):');
  mhDeemed.forEach(u => console.log('  -', u.name, '(' + u.city + ')'));

  // All deemed
  const allDeemed = await University.find({ type: 'deemed' }).select('name state city').lean();
  console.log('\nAll Deemed (' + allDeemed.length + '):');
  allDeemed.forEach(u => console.log('  -', u.name, '(' + u.state + ', ' + u.city + ')'));

  // All types
  const byType = await University.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
  console.log('\nBy type:', JSON.stringify(byType));

  // All states with counts
  const byState = await University.aggregate([{ $group: { _id: '$state', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  console.log('\nAll states:');
  byState.forEach(s => console.log('  ' + (s._id || 'null') + ': ' + s.count));

  await mongoose.disconnect();
}
check();
