const express = require('express');
const { getEvents, getEventBySlug, registerForEvent, createPaymentOrder, verifyPayment } = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', getEvents);
router.get('/:slug', getEventBySlug);
router.post('/:slug/register', protect, registerForEvent);
router.post('/:slug/create-order', protect, createPaymentOrder);
router.post('/:slug/verify-payment', protect, verifyPayment);

module.exports = router;
