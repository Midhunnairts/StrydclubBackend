const express = require('express');
const router = express.Router();
const { submitContactMessage, getContactMessages } = require('../controllers/contactController');
const { protect } = require('../middleware/auth');

router.post('/submit', submitContactMessage);
router.get('/messages', protect, getContactMessages);

module.exports = router;
