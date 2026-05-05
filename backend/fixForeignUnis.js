const mongoose = require('mongoose');
const University = require('./src/models/University');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const res = await University.updateMany(
    { name: { $regex: /Deakin|Wollongong|Southampton|Aarhus|Munich|Birmingham|York|Bristol|Liverpool|Aberdeen|Illinois Institute|Victoria University/i } },
    { $set: { type: 'foreign' } }
  );
  console.log('Fixed foreign universities:', res.modifiedCount);
  process.exit(0);
});
