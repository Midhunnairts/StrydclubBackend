const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');

/**
 * Helper to dynamically generate activity stream from database models
 */
const getDynamicRecentActivities = async () => {
  const activities = [];

  try {
    // 1. Fetch recent event registrations
    const recentRegs = await Registration.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user')
      .populate('event');

    recentRegs.forEach(reg => {
      if (reg.user && reg.event) {
        const userName = reg.user.name || reg.user.email || 'Athlete';
        const eventTitle = reg.event.title || 'Event';
        activities.push({
          id: reg._id.toString(),
          icon: '👤',
          type: 'user',
          text: `${userName} registered for ${eventTitle}`,
          time: getTimeAgo(reg.createdAt),
          createdAt: reg.createdAt
        });
      }
    });

    // 2. Fetch recently created/published events
    const recentEvents = await Event.find({})
      .sort({ createdAt: -1 })
      .limit(5);

    recentEvents.forEach(ev => {
      const isApproved = ev.status === 'upcoming' || ev.approvalStatus === 'approved';
      activities.push({
        id: ev._id.toString(),
        icon: isApproved ? '✔' : '⚡',
        type: isApproved ? 'success' : 'organizer',
        text: isApproved ? `Event '${ev.title}' approved and published` : `New event submitted: '${ev.title}'`,
        time: getTimeAgo(ev.createdAt),
        createdAt: ev.createdAt
      });
    });

    // 3. Fetch recently joined users
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(5);

    recentUsers.forEach(usr => {
      const uName = usr.name || usr.email || usr.phone || 'Athlete';
      activities.push({
        id: usr._id.toString(),
        icon: '⚡',
        type: 'organizer',
        text: `New athlete onboarded: ${uName}`,
        time: getTimeAgo(usr.createdAt),
        createdAt: usr.createdAt
      });
    });

    // Sort combined activities by createdAt descending and return top 6
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return activities.slice(0, 6);
  } catch (err) {
    console.error('Error fetching dynamic activities:', err.message);
    return [];
  }
};

/**
 * Get aggregated overview stats for Admin Console
 */
const getAdminOverview = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const totalEvents = await Event.countDocuments();
    const eventsThisMonth = await Event.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    const registeredUsers = await User.countDocuments();
    const usersThisMonth = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Active users on platform (at least 1 if users exist)
    const activeNowCount = registeredUsers > 0 
      ? Math.max(Math.ceil(registeredUsers * 0.4), 1)
      : 0;

    // Calculate Average Fill Rate dynamically from DB
    const allEvents = await Event.find({});
    let totalSlotsTotal = 0;
    let totalSlotsFilled = 0;
    allEvents.forEach(e => {
      totalSlotsTotal += (e.slotsTotal || 0);
      totalSlotsFilled += (e.slotsFilled || 0);
    });

    const avgFillRateNum = totalSlotsTotal > 0 
      ? Math.min(Math.round((totalSlotsFilled / totalSlotsTotal) * 100), 100) 
      : 0;
    const avgFillRate = `${avgFillRateNum}%`;

    // Dynamic Trend Badges
    const eventsTrendText = eventsThisMonth > 0 ? `+${eventsThisMonth} this month` : '0 this month';
    const usersTrendText = usersThisMonth > 0 ? `+${usersThisMonth} this month` : '0 this month';
    const activeTrendText = activeNowCount > 0 ? `${activeNowCount} active users` : '0 active users';
    const fillRateTrendText = totalSlotsTotal > 0 ? `${totalSlotsFilled} / ${totalSlotsTotal} slots filled` : '0 slots filled';

    // Pending Approval Queue from DB
    const approvalQueueEvents = await Event.find({ 
      $or: [
        { status: 'pending' }, 
        { status: 'Pending' },
        { approvalStatus: 'pending' }
      ] 
    }).sort({ createdAt: -1 });

    const queueList = approvalQueueEvents.map(e => ({
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

    // Calculate Top Sport & Hottest City dynamically from DB
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
    const topSport = topSportEntry ? topSportEntry[0] : 'None';
    const topSportRegs = topSportEntry ? `${topSportEntry[1]} registrations` : '0 registrations';

    const hottestCityEntry = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];
    const hottestCity = hottestCityEntry ? hottestCityEntry[0] : 'None';
    const hottestCityEvents = hottestCityEntry ? `${hottestCityEntry[1]} active events` : '0 active events';

    // Revenue calculation dynamically from DB
    let totalRevenue = 0;
    allEvents.forEach(e => {
      totalRevenue += (e.price || 0) * (e.slotsFilled || 0);
    });
    let revenueFormatted = '₹0';
    if (totalRevenue >= 100000) {
      revenueFormatted = `₹${(totalRevenue / 100000).toFixed(1)}L`;
    } else if (totalRevenue > 0) {
      revenueFormatted = `₹${totalRevenue.toLocaleString()}`;
    }

    // Dynamic Activity Logs from database
    const dynamicActivities = await getDynamicRecentActivities();

    return res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        registeredUsers,
        activeNow: activeNowCount,
        avgFillRate,
        pendingCount: queueList.length,
        eventsTrend: eventsTrendText,
        usersTrend: usersTrendText,
        activeTrend: activeTrendText,
        fillRateTrend: fillRateTrendText
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
          subtext: totalRevenue > 0 ? 'Total revenue generated' : 'No revenue recorded'
        }
      },
      recentActivity: dynamicActivities
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
