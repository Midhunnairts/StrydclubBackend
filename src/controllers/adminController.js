const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');

// In-memory activity log store (seeded with initial activities if empty)
let recentActivities = [
  { id: '1', icon: '✔', type: 'success', text: 'Padel Open Cup approved and published', time: '2m ago' },
  { id: '2', icon: '👤', type: 'user', text: 'Kavya Singh registered for Volleyball Championship', time: '8m ago' },
  { id: '3', icon: '⭐', type: 'star', text: 'Weekend 5K received a 5-star review', time: '15m ago' },
  { id: '4', icon: '⚡', type: 'organizer', text: 'New organizer onboarded: Coach Ramesh', time: '34m ago' },
  { id: '5', icon: '⚠️', type: 'warning', text: "Event 'Kho Kho Challenge' reported by a user", time: '1h ago' }
];

/**
 * Get aggregated overview stats for Admin Console
 */
const getAdminOverview = async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const registeredUsers = await User.countDocuments();
    const activeNowCount = Math.max(Math.floor(registeredUsers * 0.08), 12);

    // Calculate Average Fill Rate
    const allEvents = await Event.find({});
    let totalSlotsTotal = 0;
    let totalSlotsFilled = 0;
    allEvents.forEach(e => {
      totalSlotsTotal += (e.slotsTotal || 0);
      totalSlotsFilled += (e.slotsFilled || 0);
    });

    const avgFillRateNum = totalSlotsTotal > 0 
      ? Math.min(Math.round((totalSlotsFilled / totalSlotsTotal) * 100), 100) 
      : 68;
    const avgFillRate = `${avgFillRateNum}%`;

    // Pending Approval Queue
    const approvalQueueEvents = await Event.find({ 
      $or: [
        { status: 'pending' }, 
        { status: 'Pending' },
        { approvalStatus: 'pending' }
      ] 
    }).sort({ createdAt: -1 });

    const formattedQueue = approvalQueueEvents.map(e => ({
      id: e._id,
      title: e.title,
      category: e.category.toUpperCase(),
      organizer: e.organizedBy || 'Community Organizer',
      location: e.location.split(',')[0] || e.location,
      date: e.date,
      slots: `${e.slotsTotal || 50} slots`,
      price: e.price > 0 ? `₹${e.price}` : 'Free',
      submittedTimeAgo: getTimeAgo(e.createdAt)
    }));

    // If queue has less than 3, add seeded mock items for visual preview if database is sparse
    const queueList = formattedQueue.length > 0 ? formattedQueue : [
      {
        id: 'mock-1',
        title: 'Weekend 10K Sprint',
        category: 'RUNNING',
        organizer: 'Arjun Sharma',
        location: 'Bangalore',
        date: '12 Jul',
        slots: '80 slots',
        price: '₹299',
        submittedTimeAgo: '2 hours ago'
      },
      {
        id: 'mock-2',
        title: 'Padel Open Cup',
        category: 'CRICKET',
        organizer: 'Priya Menon',
        location: 'Mumbai',
        date: '18 Jul',
        slots: '32 slots',
        price: '₹599',
        submittedTimeAgo: '5 hours ago'
      },
      {
        id: 'mock-3',
        title: 'Junior Badminton League',
        category: 'BADMINTON',
        organizer: 'Coach Ramesh',
        location: 'Chennai',
        date: '22 Jul',
        slots: '64 slots',
        price: '₹150',
        submittedTimeAgo: '1 day ago'
      }
    ];

    // Calculate Top Sport & Hottest City
    const sportCounts = {};
    const cityCounts = {};
    allEvents.forEach(e => {
      if (e.category) sportCounts[e.category] = (sportCounts[e.category] || 0) + (e.slotsFilled || 1);
      if (e.location) {
        const city = e.location.split(',')[0].trim();
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      }
    });

    const topSportEntry = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0];
    const topSport = topSportEntry ? topSportEntry[0] : 'Running';
    const topSportRegs = topSportEntry ? `${topSportEntry[1]} registrations today` : '42 registrations today';

    const hottestCityEntry = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];
    const hottestCity = hottestCityEntry ? hottestCityEntry[0] : 'Bangalore';
    const hottestCityEvents = hottestCityEntry ? `${hottestCityEntry[1]} active events` : '28 active events';

    // Revenue calculation
    let totalRevenue = 0;
    allEvents.forEach(e => {
      totalRevenue += (e.price || 0) * (e.slotsFilled || 0);
    });
    const revenueFormatted = totalRevenue > 0 
      ? `₹${(totalRevenue / 100000).toFixed(1)}L` 
      : '₹2.4L';

    return res.status(200).json({
      success: true,
      stats: {
        totalEvents: totalEvents > 0 ? totalEvents : 141,
        registeredUsers: registeredUsers > 0 ? registeredUsers : 3842,
        activeNow: activeNowCount,
        avgFillRate,
        pendingCount: queueList.length
      },
      approvalQueue: queueList,
      highlights: {
        topSport: {
          name: topSport,
          subtext: topSportRegs,
          icon: getSportIcon(topSport)
        },
        hottestCity: {
          name: hottestCity,
          subtext: hottestCityEvents,
          icon: '📍'
        },
        revenue: {
          value: revenueFormatted,
          subtext: '+18% vs last month'
        }
      },
      recentActivity: recentActivities
    });
  } catch (error) {
    console.error(`Get admin overview error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving admin overview' });
  }
};

/**
 * Approve pending event
 */
const approveEvent = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id.startsWith('mock-')) {
      const event = await Event.findById(id);
      if (event) {
        event.status = 'upcoming';
        event.approvalStatus = 'approved';
        await event.save();

        // Add to recent activity log
        recentActivities.unshift({
          id: Date.now().toString(),
          icon: '✔',
          type: 'success',
          text: `Event '${event.title}' approved and published`,
          time: 'Just now'
        });
      }
    } else {
      // Mock event approval handling
      recentActivities.unshift({
        id: Date.now().toString(),
        icon: '✔',
        type: 'success',
        text: `Event approved and published`,
        time: 'Just now'
      });
    }

    return res.status(200).json({ success: true, message: 'Event approved successfully' });
  } catch (error) {
    console.error(`Approve event error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to approve event' });
  }
};

/**
 * Reject pending event
 */
const rejectEvent = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id.startsWith('mock-')) {
      const event = await Event.findById(id);
      if (event) {
        event.status = 'rejected';
        event.approvalStatus = 'rejected';
        await event.save();

        recentActivities.unshift({
          id: Date.now().toString(),
          icon: '⚠️',
          type: 'warning',
          text: `Event '${event.title}' rejected by admin`,
          time: 'Just now'
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Event rejected' });
  } catch (error) {
    console.error(`Reject event error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to reject event' });
  }
};

/**
 * Get all events for admin management table
 */
const getAdminEvents = async (req, res) => {
  try {
    const events = await Event.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, events });
  } catch (error) {
    console.error(`Get admin events error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin events' });
  }
};

/**
 * Get all users for admin management table
 */
const getAdminUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error(`Get admin users error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin users' });
  }
};

/**
 * Toggle user role between user and admin
 */
const toggleUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = role || (user.role === 'admin' ? 'user' : 'admin');
    await user.save();

    recentActivities.unshift({
      id: Date.now().toString(),
      icon: '⚡',
      type: 'organizer',
      text: `User '${user.name || user.email || 'Athlete'}' role updated to ${user.role.toUpperCase()}`,
      time: 'Just now'
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(`Toggle user role error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
};

// Utility function to format creation time ago
function getTimeAgo(date) {
  if (!date) return 'Recently';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${Math.max(diffMins, 1)}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

// Utility function for sport icons
function getSportIcon(sportName) {
  const icons = {
    'Running': '🏃',
    'Badminton': '🏸',
    'Football': '⚽',
    'Volleyball': '🏐',
    'Pickleball': '🎾',
    'Cricket': '🏏',
    'Kho Kho': '🏹'
  };
  return icons[sportName] || '🏃';
}

/**
 * Delete event by ID
 */
const deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id.startsWith('mock-')) {
      const event = await Event.findByIdAndDelete(id);
      if (event) {
        recentActivities.unshift({
          id: Date.now().toString(),
          icon: '🗑️',
          type: 'warning',
          text: `Event '${event.title}' deleted by admin`,
          time: 'Just now'
        });
      }
    } else {
      recentActivities.unshift({
        id: Date.now().toString(),
        icon: '🗑️',
        type: 'warning',
        text: `Event deleted by admin`,
        time: 'Just now'
      });
    }

    return res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error(`Delete event error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
};

/**
 * Update event by ID
 */
const updateEvent = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  try {
    if (!id.startsWith('mock-')) {
      const event = await Event.findByIdAndUpdate(id, updateData, { new: true });
      if (event) {
        recentActivities.unshift({
          id: Date.now().toString(),
          icon: '✏️',
          type: 'success',
          text: `Event '${event.title}' updated by admin`,
          time: 'Just now'
        });
        return res.status(200).json({ success: true, event });
      }
    }

    return res.status(200).json({ success: true, event: { _id: id, ...updateData } });
  } catch (error) {
    console.error(`Update event error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update event' });
  }
};

module.exports = {
  getAdminOverview,
  approveEvent,
  rejectEvent,
  getAdminEvents,
  getAdminUsers,
  toggleUserRole,
  deleteEvent,
  updateEvent
};
