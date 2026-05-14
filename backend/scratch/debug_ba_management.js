require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const courses = await Course.find({ baseCourse: { $in: ['BA', 'BBA'] } }).limit(50);
    console.log('--- BA/BBA Stream and Category Check ---');
    courses.forEach(c => {
      console.log(`Name: ${c.name.padEnd(40)} | Base: ${c.baseCourse.padEnd(6)} | Stream: ${c.stream.padEnd(12)} | Cat: ${c.category}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
