const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Enable Cross-Origin Resource Sharing (CORS) for Angular Frontend
app.use(cors());

// Parse incoming application/json requests
app.use(express.json());

// REST Route Modules Mounting
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/events', require('./src/routes/eventRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/community', require('./src/routes/communityRoutes'));
app.use('/api/sports', require('./src/routes/sportsRoutes'));

// Server Health Endpoint
app.get('/', (req, res) => {
  res.send('STRYDCLUB Backend API is running successfully!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
