const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const University = require('./src/models/University');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const stats = await University.aggregate([
    { $group: { _id: '$state', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Universities per State:');
  stats.forEach(s => console.log(`${s._id}: ${s.count}`));
  console.log('\nTotal Universities:', await University.countDocuments());
  process.exit(0);
}

check();
