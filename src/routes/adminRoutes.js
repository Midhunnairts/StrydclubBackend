const express = require('express');
const {
  getAdminOverview,
  approveEvent,
  rejectEvent,
  getAdminEvents,
  getAdminUsers,
  toggleUserRole,
  deleteEvent,
  updateEvent
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
  }
};

router.get('/overview', protect, isAdmin, getAdminOverview);
router.get('/events', protect, isAdmin, getAdminEvents);
router.post('/events/:id/approve', protect, isAdmin, approveEvent);
router.post('/events/:id/reject', protect, isAdmin, rejectEvent);
router.put('/events/:id', protect, isAdmin, updateEvent);
router.delete('/events/:id', protect, isAdmin, deleteEvent);
router.get('/users', protect, isAdmin, getAdminUsers);
router.post('/users/:id/role', protect, isAdmin, toggleUserRole);

module.exports = router;
