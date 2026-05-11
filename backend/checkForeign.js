const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const col = db.collection('universities');
  
  const all = await col.find({type:'foreign'}, {projection:{name:1,state:1,city:1,website:1,'links.admissionLink':1}}).toArray();
  console.log('All foreign universities (' + all.length + '):');
  all.forEach(u => console.log(' ', JSON.stringify({name:u.name, state:u.state, city:u.city})));
  await mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
