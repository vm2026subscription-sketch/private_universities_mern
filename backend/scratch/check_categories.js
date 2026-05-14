const mongoose = require('mongoose');
require('dotenv').config({path: './backend/.env'});

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Course = mongoose.model('Course', new mongoose.Schema({name: String, category: String}));
  
  const targetCourses = ['BCA', 'MCA', 'B.Com', 'M.Com', 'BA', 'MA'];
  const results = await Course.find({ name: { $in: targetCourses } }).limit(20);
  
  console.log('Sample course data:');
  results.forEach(c => {
    console.log(`Name: ${c.name}, Category: ${c.category}`);
  });
  
  const categoryStats = await Course.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  console.log('\nCategory Stats:');
  console.log(categoryStats);
  
  process.exit(0);
}

check();
