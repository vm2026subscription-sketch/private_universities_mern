require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const count = await Course.countDocuments({ name: { $in: [null, ""] } });
  console.log('Courses with null or empty name:', count);
  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
