const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');

async function run() {
  await connectDB();
  
  const unmatched = [
    "K.L.E. Academy of Higher Education & Research",
    "Sri Devraj Urs Academy of Higher Education & Research",
    "Sri Siddhartha Academy of Higher Education",
    "Swami Vivekananda Yoga Anusandhana Samsthana"
  ];
  
  for (const name of unmatched) {
    const words = name.replace(/[&,()]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    console.log(`\nUnmatched: "${name}"`);
    console.log(`Words:`, words);
    // Find in DB
    const query = { name: { $regex: new RegExp(words[0], 'i') } };
    const matches = await University.find(query).select('name');
    console.log(`Matches containing "${words[0]}":`, matches.map(m => m.name));
  }
  
  mongoose.connection.close();
}

run();
