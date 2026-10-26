const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database (initial background connect for non-serverless runtimes)
if (process.env.VERCEL !== '1') {
  connectDB().catch((err) => console.error('Initial DB connection error:', err));
}

const app = express();

// Middleware to ensure database connection before handling requests in serverless environments (Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error in request:', err);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// Enable Cross-Origin Resource Sharing (CORS) for Angular Frontend
app.use(cors());

// Parse incoming application/json requests with 10mb payload limit for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const { handleCashfreeWebhook } = require('./src/controllers/eventController');

// Cashfree Webhook Endpoints
app.post('/api/cashfree-webhook', handleCashfreeWebhook);
app.post('/cashfree-webhook', handleCashfreeWebhook);
app.post('/api/webhook', handleCashfreeWebhook);
app.post('/webhook', handleCashfreeWebhook);

// REST Route Modules Mounting
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/events', require('./src/routes/eventRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/community', require('./src/routes/communityRoutes'));
app.use('/api/sports', require('./src/routes/sportsRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/contact', require('./src/routes/contactRoutes'));

// Server Health Endpoint
app.get('/', (req, res) => {
  res.send('STRYDCLUB Backend API is running successfully!');
});

const PORT = process.env.PORT || 5000;

// Only listen directly when running locally or on standalone server
if (process.env.VERCEL !== '1' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export Express app for serverless platforms like Vercel
module.exports = app;
