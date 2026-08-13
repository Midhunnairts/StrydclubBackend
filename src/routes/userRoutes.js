const express = require('express');
const { getUserDashboard, getUserProfile, updateUserProfile, getPublicUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/dashboard', protect, getUserDashboard);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/public/:id', getPublicUserProfile);

module.exports = router;
