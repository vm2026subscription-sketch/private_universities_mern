require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const courses = await Course.find({}).limit(10).select('name slug');
  console.log('Sample courses:', JSON.stringify(courses, null, 2));
  
  const withoutSlug = await Course.countDocuments({ slug: { $exists: false } });
  const nullSlug = await Course.countDocuments({ slug: null });
  console.log('Courses without slug field:', withoutSlug);
  console.log('Courses with null slug:', nullSlug);

  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
