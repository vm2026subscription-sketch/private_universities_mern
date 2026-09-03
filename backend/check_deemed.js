const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const connectDB = require('./src/config/db');
const University = require('./src/models/University');

async function check() {
  await connectDB();

  // Check all universities that SHOULD be deemed (famous ones)
  const famousDeemed = [
    'nmims', 'narsee monjee', 'dy patil', 'd y patil', 'symbiosis',
    'birla', 'bits', 'manipal', 'amity', 'christ', 'jamia hamdard',
    'ashoka', 'op jindal', 'nalsar', 'symbiosis skills',
    'srinivas', 'dayananda sagar'
  ];

  console.log('--- Universities that might be deemed ---');
  for (const term of famousDeemed) {
    const unis = await University.find({
      name: { $regex: term, $options: 'i' },
      type: { $ne: 'deemed' }
    }).select('name state city type').lean();
    if (unis.length > 0) {
      unis.forEach(u => console.log(`  ${u.name} (${u.state}) — type: ${u.type}`));
    }
  }

  // Check total by type
  const byType = await University.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
  console.log('\nBy type:', JSON.stringify(byType));

  await mongoose.disconnect();
}
check();
