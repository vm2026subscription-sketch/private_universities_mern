const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const connectDB = require('../backend/src/config/db');
const User = require('../backend/src/models/User');

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    const users = await User.find({}, 'name email role status');
    console.log('Users in database:', users);

    const adminUser = users.find(u => u.role === 'admin' || u.role === 'superadmin');
    if (!adminUser) {
      console.log('No admin user found. Creating one...');
      const newAdmin = await User.create({
        name: 'Admin User',
        email: 'admin@vidyarthimitra.com',
        password: 'password123',
        role: 'superadmin',
        isEmailVerified: true
      });
      console.log('Admin created successfully:', newAdmin.email, 'with password: password123');
    } else {
      console.log('Found existing admin:', adminUser.email, 'role:', adminUser.role);
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
