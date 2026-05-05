const mongoose = require('mongoose');
const University = require('./src/models/University');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const res = await University.updateMany({ 'stats.avgFees': '5.00 L' }, { $unset: { 'stats.avgFees': 1 } });
  console.log('Cleared random fees:', res.modifiedCount);
  process.exit(0);
});
