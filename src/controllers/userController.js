const User = require('../models/User');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

const getUserDashboard = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const registrations = await Registration.find({ user: userId }).populate('event');

    const registered = [];
    const past = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    registrations.forEach(reg => {
      if (reg.event) {
        const eventDate = new Date(reg.event.date);
        const isPastEvent = (!isNaN(eventDate.getTime()) && eventDate < now) ||
                            reg.event.status === 'Completed' ||
                            reg.event.status === 'completed' ||
                            reg.event.status === 'Event Completed' ||
                            Boolean(reg.result);

        if (isPastEvent) {
          past.push({
            id: reg.event._id,
            slug: reg.event.slug,
            title: reg.event.title,
            category: reg.event.category,
            date: reg.event.date,
            result: reg.result || (reg.won ? 'Winner' : 'Completed'),
            won: Boolean(reg.won)
          });
        } else {
          registered.push({
            id: reg.event._id,
            slug: reg.event.slug,
            title: reg.event.title,
            category: reg.event.category,
            date: reg.event.date,
            time: reg.event.time,
            location: reg.event.location,
            status: reg.status || 'Confirmed'
          });
        }
      }
    });


    const winRateVal = user.totalEvents > 0 ? `${((user.eventsWon / user.totalEvents) * 100).toFixed(0)}%` : '0%';

    return res.status(200).json({
      success: true,
      stats: {
        eventsWon: user.eventsWon,
        totalEvents: user.totalEvents,
        winRate: winRateVal,
        upcomingCount: registered.length
      },
      registeredEvents: registered,
      pastParticipation: past,
      profileStats: {
        totalEvents: user.totalEvents,
        eventsWon: user.eventsWon,
        sportsPlayed: user.sportsPlayed,
        memberSince: user.memberSince,
        favoriteSports: user.favoriteSports
      }
    });
  } catch (error) {
    console.error(`Get user dashboard error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving user dashboard' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location || '',
        isProfileComplete: Boolean(user.isProfileComplete && user.name && (user.loginChannel === 'phone' ? user.email : user.phone)),
        loginChannel: user.loginChannel || 'phone',
        role: user.role || 'user',
        favoriteSports: user.favoriteSports,
        memberSince: user.memberSince,
        totalEvents: user.totalEvents,
        eventsWon: user.eventsWon,
        sportsPlayed: user.sportsPlayed
      }
    });
  } catch (error) {
    console.error(`Get user profile error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving user profile' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, location, email, phone, favoriteSports } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name !== undefined) user.name = name.trim();
    if (location !== undefined) user.location = location.trim();
    
    if (email !== undefined && email.trim()) {
      user.email = email.toLowerCase().trim();
    }
    
    if (phone !== undefined && phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) {
        user.phone = `+91${digits}`;
      } else {
        user.phone = phone.trim();
      }
    }

    if (Array.isArray(favoriteSports)) {
      user.favoriteSports = favoriteSports;
    }

    user.isProfileComplete = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        isProfileComplete: true,
        loginChannel: user.loginChannel,
        role: user.role || 'user',
        favoriteSports: user.favoriteSports,
        memberSince: user.memberSince,
        totalEvents: user.totalEvents,
        eventsWon: user.eventsWon,
        sportsPlayed: user.sportsPlayed
      }
    });
  } catch (error) {
    console.error(`Update user profile error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message || 'Server error updating profile' });
  }
};

const getPublicUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        location: user.location || '',
        favoriteSports: user.favoriteSports,
        memberSince: user.memberSince,
        totalEvents: user.totalEvents,
        eventsWon: user.eventsWon,
        sportsPlayed: user.sportsPlayed
      }
    });
  } catch (error) {
    console.error(`Get public user profile error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving public user profile' });
  }
};

module.exports = { getUserDashboard, getUserProfile, updateUserProfile, getPublicUserProfile };
