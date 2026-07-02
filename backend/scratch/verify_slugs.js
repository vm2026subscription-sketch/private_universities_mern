require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../src/models/Course');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");
  
  const distinctStreams = await Course.distinct('stream');
  console.log("Distinct streams in DB:", distinctStreams);
  
  const streamStats = await Course.aggregate([
    { $group: { _id: '$stream', count: { $sum: 1 } } }
  ]);
  console.log("Stream stats in DB:", streamStats);
  
  await mongoose.connection.close();
}
run();
