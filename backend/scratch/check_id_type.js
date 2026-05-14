require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const course = await Course.findOne({ universityId: { $exists: true } });
  if (course) {
    console.log('Type of universityId:', typeof course.universityId);
    console.log('Is instance of ObjectId:', course.universityId instanceof mongoose.Types.ObjectId);
    console.log('Value:', course.universityId);
  } else {
    console.log('No course found');
  }
  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
