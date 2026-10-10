const express = require('express');
const { 
  getEvents, 
  getEventBySlug, 
  registerForEvent, 
  createEvent, 
  cancelRegistration, 
  createCashfreeOrder, 
  verifyCashfreePayment,
  handleCashfreeWebhook,
  getPublicStats
} = require('../controllers/eventController');
const { protect, optionalProtect } = require('../middleware/auth');
const router = express.Router();

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
  }
};

router.get('/', getEvents);
router.get('/stats', getPublicStats);
router.post('/cashfree-webhook', handleCashfreeWebhook);
router.post('/webhook', handleCashfreeWebhook);
router.post('/', protect, isAdmin, createEvent);
router.get('/:slug', getEventBySlug);
router.post('/:slug/register', protect, registerForEvent);
router.post('/:slug/cancel', protect, cancelRegistration);
router.post('/:slug/cashfree-order', protect, createCashfreeOrder);
router.post('/:slug/verify-cashfree', optionalProtect, verifyCashfreePayment);
// Backward compatibility
router.post('/:slug/create-order', protect, createCashfreeOrder);
router.post('/:slug/verify-payment', optionalProtect, verifyCashfreePayment);

module.exports = router;
