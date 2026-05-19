const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

async function run() {
  await connectDB();
  const unis = await University.find({}).populate('courses');
  let unisWithEmptyCoursesArray = 0;
  let unisWithNoCourseDocs = 0;
  
  for (const u of unis) {
    const courseDocsCount = await Course.countDocuments({ universityId: u._id });
    const arrayCount = u.courses ? u.courses.length : 0;
    if (courseDocsCount > 0 && arrayCount === 0) {
      unisWithEmptyCoursesArray++;
      // Sync them!
      const courses = await Course.find({ universityId: u._id });
      u.courses = courses.map(c => c._id);
      await u.save();
    }
    if (courseDocsCount === 0) {
      unisWithNoCourseDocs++;
    }
  }
  
  console.log(`Synced ${unisWithEmptyCoursesArray} universities whose courses array in DB was empty but had Course documents.`);
  console.log(`Universities still without any Course documents: ${unisWithNoCourseDocs}`);
  
  mongoose.connection.close();
}

run();
