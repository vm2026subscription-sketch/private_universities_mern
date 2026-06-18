const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('../src/config/db');
const User = require('../src/models/User');

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    let adminUser = await User.findOne({ email: 'admin@vidyarthimitra.com' });
    if (!adminUser) {
      console.log('Creating admin@vidyarthimitra.com...');
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@vidyarthimitra.com',
        password: 'password123',
        role: 'superadmin',
        isEmailVerified: true
      });
      console.log('Admin created successfully:', adminUser.email, 'with password: password123');
    } else {
      console.log('Admin admin@vidyarthimitra.com already exists. Updating password to password123...');
      adminUser.password = 'password123';
      adminUser.role = 'superadmin';
      await adminUser.save();
      console.log('Updated password to password123');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
