const mongoose = require('mongoose');

mongoose.connection.on('error', (error) => {
  console.error(`[mongo] Connection error: ${error.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[mongo] MongoDB connection lost.');
});

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to backend/.env before starting the backend.');
  }

  const startedAt = Date.now();

  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  const durationMs = Date.now() - startedAt;

  console.log(
    `[startup] MongoDB connected to ${conn.connection.host}/${conn.connection.name} in ${durationMs}ms`
  );

  return conn;
};

module.exports = connectDB;
