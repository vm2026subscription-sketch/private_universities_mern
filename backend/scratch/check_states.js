require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const University = require('../src/models/University');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const states = await University.distinct('state');
  console.log('States in DB:', JSON.stringify(states, null, 2));
  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
