const express = require('express');
const { getEvents, getEventBySlug, registerForEvent } = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', getEvents);
router.get('/:slug', getEventBySlug);
router.post('/:slug/register', protect, registerForEvent);

module.exports = router;
