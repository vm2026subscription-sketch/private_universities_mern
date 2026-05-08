const mongoose = require('mongoose');
require('dotenv').config();
const University = require('../src/models/University');

async function getIds() {
  await mongoose.connect(process.env.MONGODB_URI);
  const names = ['Thakur', 'Amity', 'SAGE', 'Jindal'];
  const unis = await University.find({ 
    name: { $regex: new RegExp(names.join('|'), 'i') } 
  }, 'name _id');
  console.log(JSON.stringify(unis, null, 2));
  await mongoose.connection.close();
}

getIds().catch(err => {
  console.error(err);
  process.exit(1);
});
