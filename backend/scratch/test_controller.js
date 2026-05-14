require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');
const { getGroupedCourses } = require('../src/controllers/courseController');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const req = { query: {} };
  const res = {
    json: (data) => {
      console.log('SUCCESS:', data.success);
      console.log('DATA_LENGTH:', data.data.length);
      if (data.data.length > 0) {
        console.log('SAMPLE_DATA:', JSON.stringify(data.data[0], null, 2));
      }
      process.exit(0);
    },
    status: (code) => ({
      json: (data) => {
        console.log('ERROR_CODE:', code);
        console.log('ERROR_DATA:', data);
        process.exit(1);
      }
    })
  };
  
  await getGroupedCourses(req, res);
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
