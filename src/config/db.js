const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/strydclub');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Ensure sparse unique indexes on User collection to prevent E11000 null duplicate errors
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
  } catch (error) {
    console.error(`Error connecting to database: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
