require('dotenv').config({path:'c:/Users/ankur/Downloads/vm_private_universities/private_universities_mern/backend/.env'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const count = await mongoose.connection.collection('universities').countDocuments();
  console.log('Total:', count);
  const states = await mongoose.connection.collection('universities').aggregate([
    { $group: { _id: '$state', count: { $sum: 1 } } }
  ]).toArray();
  console.log('States:', states);
  process.exit(0);
});
