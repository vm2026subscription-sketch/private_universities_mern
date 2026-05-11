const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const col = db.collection('universities');

  // Show remaining Unknown
  const unknowns = await col.find({state:'Unknown'}, {projection:{name:1,type:1,city:1}}).toArray();
  console.log('--- Still Unknown (' + unknowns.length + ') ---');
  unknowns.forEach(u => console.log(' ', u.name, '[' + u.type + ']'));

  // Show final count by state
  const byState = await col.aggregate([
    { $group: { _id: '$state', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('\n--- Universities by State ---');
  byState.forEach(s => console.log(s._id + ':', s.count));

  // Show foreign count
  const foreignUnis = await col.find({type:'foreign'}, {projection:{name:1,state:1}}).toArray();
  console.log('\n--- Foreign Universities (' + foreignUnis.length + ') ---');
  foreignUnis.forEach(u => console.log(' ', u.name, '|', u.state));

  await mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
