const express = require('express');
const { getEvents, getEventBySlug, registerForEvent, createEvent } = require('../controllers/eventController');
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
router.post('/', protect, createEvent);
router.get('/:slug', getEventBySlug);
router.post('/:slug/register', protect, registerForEvent);

module.exports = router;
