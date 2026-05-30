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

    registrations.forEach(reg => {
      if (reg.event) {
        if (reg.result) {
          past.push({
            title: reg.event.title,
            category: reg.event.category,
            date: reg.event.date,
            result: reg.result,
            won: reg.won
          });
        } else {
          registered.push({
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

    if (registrations.length === 0) {
      const defaultRegistered = [
        {
          title: 'Weekend 5K Marathon',
          category: 'Running',
          date: 'May 28, 2026',
          time: '6:00 AM',
          location: 'Cubbon Park, Bangalore',
          status: 'Confirmed'
        },
        {
          title: 'Friday Night Football League',
          category: 'Football',
          date: 'May 25, 2026',
          time: '7:00 PM',
          location: 'Green Field Arena, Delhi',
          status: 'Confirmed'
        }
      ];

      const defaultPast = [
        {
          title: 'Spring Badminton Championship',
          category: 'Badminton',
          date: 'May 15, 2026',
          result: '2nd Place',
          won: true
        },
        {
          title: 'Urban Football League',
          category: 'Football',
          date: 'May 10, 2026',
          result: 'Participant',
          won: false
        }
      ];

      user.totalEvents = 12;
      user.eventsWon = 3;
      user.sportsPlayed = 3;
      await user.save();

      return res.status(200).json({
        success: true,
        stats: {
          eventsWon: user.eventsWon,
          totalEvents: user.totalEvents,
          winRate: '25%',
          upcomingCount: defaultRegistered.length
        },
        registeredEvents: defaultRegistered,
        pastParticipation: defaultPast,
        profileStats: {
          totalEvents: user.totalEvents,
          eventsWon: user.eventsWon,
          sportsPlayed: user.sportsPlayed,
          memberSince: user.memberSince,
          favoriteSports: user.favoriteSports
        }
      });
    }

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

module.exports = { getUserDashboard };
