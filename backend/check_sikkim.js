const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const col = db.collection('universities');

  // Check Sikkim universities - 49 seems way too high
  const sikkim = await col.find({state:'Sikkim'}, {projection:{name:1,type:1}}).sort({name:1}).toArray();
  console.log('--- Sikkim (' + sikkim.length + ') ---');
  sikkim.forEach(u => console.log(' ', u.name, '[' + u.type + ']'));

  await mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
