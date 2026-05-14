require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');
const University = require('../src/models/University');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const courses = await Course.find().limit(100);
  let orphaned = 0;
  for (const course of courses) {
    const uni = await University.findById(course.universityId);
    if (!uni) orphaned++;
  }
  console.log('Orphaned courses in first 100:', orphaned);
  
  // Total orphans
  const allUniIds = await University.find().distinct('_id');
  const orphanCount = await Course.countDocuments({ universityId: { $nin: allUniIds } });
  console.log('Total orphaned courses:', orphanCount);
  console.log('Total courses:', await Course.countDocuments());
  
  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
