const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

async function run() {
  await connectDB();
  const states = await University.distinct('state');
  console.log('States:', states);
  for (const s of states) {
    const unis = await University.find({ state: s });
    let totalCourses = 0;
    for (const u of unis) {
      const cc = await Course.countDocuments({ universityId: u._id });
      totalCourses += cc;
    }
    console.log(`State: ${s} | Universities: ${unis.length} | Course Docs linked: ${totalCourses}`);
  }
  mongoose.connection.close();
}

run();
