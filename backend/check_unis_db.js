require('dotenv').config();
const mongoose = require('mongoose');
const University = require('./src/models/University');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const u = await University.findOne({ name: 'Pragjyotishpur University' });
  console.log('Pragjyotishpur University in DB:', JSON.stringify(u, null, 2));
  process.exit(0);
}
run();
