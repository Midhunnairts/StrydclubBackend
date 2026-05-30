const express = require('express');
const { getUserDashboard } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/dashboard', protect, getUserDashboard);

module.exports = router;
