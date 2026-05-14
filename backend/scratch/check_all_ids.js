require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const count = await Course.countDocuments({ universityId: { $not: { $type: 'objectId' } } });
  console.log('Courses with non-ObjectId universityId:', count);
  
  if (count > 0) {
    const sample = await Course.findOne({ universityId: { $not: { $type: 'objectId' } } });
    console.log('Sample non-ObjectId universityId:', sample.universityId, typeof sample.universityId);
  }

  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
