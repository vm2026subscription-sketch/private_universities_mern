require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

console.log('Attempting to connect to MongoDB Atlas...');

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
}).then(() => {
  console.log('Successfully connected to MongoDB!');
  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
