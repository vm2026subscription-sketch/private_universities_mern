
require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const University = mongoose.model('University', new mongoose.Schema({ name: String }));
    const count = await University.countDocuments();
    console.log(`University count: ${count}`);
    const samples = await University.find().limit(5);
    console.log('Sample names:', samples.map(s => s.name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
