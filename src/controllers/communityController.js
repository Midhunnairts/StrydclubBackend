const User = require('../models/User');

const getLeaderboard = async (req, res) => {
  try {
    // Find all users sorted by totalEvents and eventsWon
    const users = await User.find({})
      .sort({ totalEvents: -1, eventsWon: -1 })
      .limit(10);

    // Map database users to leaderboard format
    let leaderboard = users.map((user, index) => {
      // Calculate XP score
      const xpPoints = ((user.totalEvents || 0) * 150) + ((user.eventsWon || 0) * 500);
      const uName = user.name || user.email || user.phone || 'Athlete';
      return {
        id: user._id,
        rank: index + 1,
        name: uName,
        sport: user.favoriteSports && user.favoriteSports.length > 0 ? user.favoriteSports[0] : 'Sports',
        points: `${xpPoints.toLocaleString()} XP`,
        eventsCount: `${user.totalEvents || 0} Events`,
        winsCount: user.eventsWon || 0,
        initials: uName.split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2)
      };
    });

    // Fallback static data if there are less than 3 users in the database
    if (leaderboard.length < 3) {
      const fallbackData = [
      ];
      // Append fallbacks to make it a nice list of 5 entries
      leaderboard = [...leaderboard, ...fallbackData].slice(0, 5);
      // Re-adjust ranks
      leaderboard.forEach((item, index) => {
        item.rank = index + 1;
      });
    }

    return res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    console.error(`Get leaderboard error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving leaderboard' });
  }
};

module.exports = { getLeaderboard };
