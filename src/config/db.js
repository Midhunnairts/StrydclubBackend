const mongoose = require('mongoose');

// Global cache for serverless environments (e.g. Vercel)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const syncUserIndexes = async () => {
  try {
    const User = require('../models/User');
    const indexes = await User.collection.indexes();
    for (const idx of indexes) {
      if ((idx.name === 'email_1' || idx.name === 'phone_1') && !idx.sparse) {
        await User.collection.dropIndex(idx.name);
        console.log(`Dropped non-sparse legacy index: ${idx.name}`);
      }
    }
    await User.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await User.collection.createIndex({ phone: 1 }, { unique: true, sparse: true });
  } catch (idxErr) {
    console.warn('Index sync warning:', idxErr.message);
  }
};

const connectDB = async () => {
  // If already connected, reuse connection immediately
  if (cached.conn || mongoose.connection.readyState >= 1) {
    return cached.conn || mongoose.connection;
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/strydclub';
    cached.promise = mongoose
      .connect(uri)
      .then(async (conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await syncUserIndexes();
        return conn;
      })
      .catch((err) => {
        cached.promise = null;
        console.error(`Error connecting to database: ${err.message}`);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
};

module.exports = connectDB;
