const express = require('express');
const { getUserDashboard, getUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/dashboard', protect, getUserDashboard);
router.get('/profile', protect, getUserProfile);

module.exports = router;
