const express = require('express');
const { getEvents, getEventBySlug, registerForEvent, createEvent, cancelRegistration } = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const router = express.Router();

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
  }
};

router.get('/', getEvents);
router.post('/', protect, isAdmin, createEvent);
router.get('/:slug', getEventBySlug);
router.post('/:slug/register', protect, registerForEvent);
router.post('/:slug/cancel', protect, cancelRegistration);

module.exports = router;
