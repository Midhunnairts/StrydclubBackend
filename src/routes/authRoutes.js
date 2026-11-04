const express = require('express');
const { sendOtp, verifyOtp, verifyWidgetToken } = require('../controllers/authController');
const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/verify-widget-token', verifyWidgetToken);

module.exports = router;
