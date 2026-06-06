require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const uri = process.env.MONGODB_URI;

async function check() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');
    const user = await User.findOne({ email: 'ankurs3110@gmail.com' }).select('+password');
    if (!user) {
      console.log('User ankurs3110@gmail.com not found.');
    } else {
      console.log('User Found:');
      console.log('ID:', user._id);
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Status:', user.status);
      console.log('isEmailVerified:', user.isEmailVerified);
      console.log('Password (hashed):', user.password);
      console.log('Full User Object:', JSON.stringify(user, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
