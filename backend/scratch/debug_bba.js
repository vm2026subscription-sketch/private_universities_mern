require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const courses = await Course.find({ baseCourse: 'BBA' }).limit(10);
    console.log('--- BBA Stream Check ---');
    courses.forEach(c => {
      console.log(`Name: ${c.name.padEnd(40)} | Stream: ${c.stream.padEnd(12)}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
