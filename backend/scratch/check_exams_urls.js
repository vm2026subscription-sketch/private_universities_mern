const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Exam = require('../src/models/Exam');

async function checkExams() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const exams = await Exam.find({}, 'name shortName officialUrl');
    console.log('--- EXAMS IN DATABASE ---');
    exams.forEach(e => {
      console.log(`Name: ${e.name} | Short: ${e.shortName} | URL: ${e.officialUrl}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkExams();
