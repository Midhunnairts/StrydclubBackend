const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Otp = require('../models/Otp');

dotenv.config();

const wipeConnection = async (uri, label) => {
  try {
    console.log(`Connecting to ${label} (${uri})...`);
    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
    console.log(`Connected to ${label}!`);

    const UserCol = conn.model('User', User.schema);
    const EventCol = conn.model('Event', Event.schema);
    const RegCol = conn.model('Registration', Registration.schema);
    const OtpCol = conn.model('Otp', Otp.schema);

    const userRes = await UserCol.deleteMany({});
    const eventRes = await EventCol.deleteMany({});
    const regRes = await RegCol.deleteMany({});
    const otpRes = await OtpCol.deleteMany({});

    console.log(`- Deleted Users: ${userRes.deletedCount}`);
    console.log(`- Deleted Events: ${eventRes.deletedCount}`);
    console.log(`- Deleted Registrations: ${regRes.deletedCount}`);
    console.log(`- Deleted OTPs: ${otpRes.deletedCount}`);

    // Also check all other collections/databases in this connection
    const admin = conn.db.admin();
    try {
      const dbs = await admin.listDatabases();
      for (let dbInfo of dbs.databases) {
        if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;
        const targetDb = conn.client.db(dbInfo.name);
        const collections = await targetDb.listCollections().toArray();
        for (let col of collections) {
          const res = await targetDb.collection(col.name).deleteMany({});
          if (res.deletedCount > 0) {
            console.log(`  * Wiped DB [${dbInfo.name}] collection [${col.name}]: ${res.deletedCount} items`);
          }
        }
      }
    } catch (e) {
      // ignore listDatabases if insufficient permissions
    }

    await conn.close();
  } catch (err) {
    console.log(`Skip ${label}: ${err.message}`);
  }
};

const clearAllDatabases = async () => {
  console.log('--- Wiping All Database Collections ---');
  if (process.env.MONGODB_URI) {
    await wipeConnection(process.env.MONGODB_URI, 'Remote MongoDB (.env)');
  }
  await wipeConnection('mongodb://127.0.0.1:27017/strydclub', 'Local MongoDB (strydclub)');
  await wipeConnection('mongodb://127.0.0.1:27017/event-manager', 'Local MongoDB (event-manager)');
  console.log('--- Wipe Completed! ---');
  process.exit(0);
};

clearAllDatabases();
