const mongoose = require('mongoose');
require('dotenv').config({path: './backend/.env'});

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Course = mongoose.model('Course', new mongoose.Schema({name: String, category: String}));
  
  const targetCourses = ['BA', 'MA', 'LLM', 'LLB', 'D.Pharm', 'BA LLB', 'B.A.', 'M.A.', 'D. Pharma', 'LL.B.'];
  const results = await Course.find({ name: { $in: targetCourses } });
  
  console.log('Sample course data:');
  results.forEach(c => {
    console.log(`ID: ${c._id}, Name: "${c.name}", Category: ${c.category}`);
  });
  
  process.exit(0);
}

check();
