const express = require('express');
const { sendOtp, verifyOtp, verifyWidgetToken, getMsg91Status } = require('../controllers/authController');
const router = express.Router();

router.get('/msg91-status', getMsg91Status);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/verify-widget-token', verifyWidgetToken);

module.exports = router;
