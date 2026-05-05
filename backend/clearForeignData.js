const mongoose = require('mongoose');
const University = require('./src/models/University');
const Course = require('./src/models/Course');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const foreignUnis = await University.find({ type: 'foreign' });
  const foreignUniIds = foreignUnis.map(u => u._id);
  
  await Course.deleteMany({ universityId: { $in: foreignUniIds } });
  const res = await University.deleteMany({ type: 'foreign' });
  
  console.log('Deleted existing foreign universities:', res.deletedCount);
  process.exit(0);
});
