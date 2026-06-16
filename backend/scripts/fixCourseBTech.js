// scripts/fixCourseBTech.js
const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('../src/models/Course');

async function fixBTech() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all courses where baseCourse or name contains "B.Tech."
    const courses = await Course.find({
      $or: [
        { baseCourse: { $regex: /B\.Tech\./, $options: 'i' } },
        { name: { $regex: /B\.Tech\./, $options: 'i' } }
      ]
    });

    console.log(`Found ${courses.length} courses with B.Tech.`);

    let updatedCount = 0;
    for (const course of courses) {
      let modified = false;
      if (course.baseCourse && course.baseCourse.includes('B.Tech.')) {
        course.baseCourse = course.baseCourse.replace(/B\.Tech\./gi, 'B.Tech');
        modified = true;
      }
      if (course.name && course.name.includes('B.Tech.')) {
        course.name = course.name.replace(/B\.Tech\./gi, 'B.Tech');
        modified = true;
      }
      if (modified) {
        await course.save();
        updatedCount++;
        console.log(`Updated: ${course.name}`);
      }
    }

    console.log(`✅ Updated ${updatedCount} courses.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixBTech();