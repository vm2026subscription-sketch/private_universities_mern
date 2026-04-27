const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const University = require('../backend/src/models/University');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const counts = await University.aggregate([
      { $group: { _id: '$state', count: { $sum: 1 } } }
    ]);
    
    console.log('University counts by state:');
    console.log(JSON.stringify(counts, null, 2));
    
    const totalCourses = await mongoose.model('Course').countDocuments();
    console.log('Total Courses:', totalCourses);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
