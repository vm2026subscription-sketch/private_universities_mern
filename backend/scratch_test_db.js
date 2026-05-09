const mongoose = require('mongoose');

const uri = "mongodb://Atharva:Vidyarthi123@ac-hrfsaua-shard-00-00.vpgdsga.mongodb.net:27017,ac-hrfsaua-shard-00-01.vpgdsga.mongodb.net:27017,ac-hrfsaua-shard-00-02.vpgdsga.mongodb.net:27017/vidyarthi-mitra?ssl=true&replicaSet=atlas-ujt6qf-shard-0&authSource=admin&retryWrites=true&w=majority";

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
