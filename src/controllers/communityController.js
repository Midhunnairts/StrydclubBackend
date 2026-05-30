const getLeaderboard = (req, res) => {
  const leaderboard = [
    {
      rank: 1,
      name: 'Amit Patel',
      sport: 'Badminton',
      points: '2,850 XP',
      eventsCount: '14 Events',
      initials: 'AP'
    },
    {
      rank: 2,
      name: 'Sneha Reddy',
      sport: 'Running',
      points: '2,640 XP',
      eventsCount: '12 Events',
      initials: 'SR'
    },
    {
      rank: 3,
      name: 'Rahul Sharma',
      sport: 'Football',
      points: '2,420 XP',
      eventsCount: '10 Events',
      initials: 'RS'
    },
    {
      rank: 4,
      name: 'Priya Desai',
      sport: 'Volleyball',
      points: '2,210 XP',
      eventsCount: '9 Events',
      initials: 'PD'
    },
    {
      rank: 5,
      name: 'Vikram Seth',
      sport: 'Badminton',
      points: '1,980 XP',
      eventsCount: '8 Events',
      initials: 'VS'
    }
  ];

  return res.status(200).json({ success: true, leaderboard });
};

module.exports = { getLeaderboard };
