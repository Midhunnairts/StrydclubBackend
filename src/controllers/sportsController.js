const Event = require('../models/Event');

const getSports = async (req, res) => {
  const sportsList = [
    { name: 'Running', icon: '🏃', description: 'From 5K sprints to full marathons, join runners pushing their limits.', baseMembers: 2400 },
    { name: 'Badminton', icon: '🏸', description: 'Singles and doubles tournaments for all skill levels.', baseMembers: 1800 },
    { name: 'Football', icon: '⚽', description: 'High-intensity leagues and casual matches for football fans.', baseMembers: 3200 },
    { name: 'Volleyball', icon: '🏐', description: 'Beach and indoor volleyball leagues for teams and individuals.', baseMembers: 1500 },
    { name: 'Pickleball', icon: '🎾', description: 'Fast-growing paddle sport that combines elements of tennis and badminton.', baseMembers: 950 },
    { name: 'Kho Kho', icon: '🎯', description: 'Traditional Indian tag sport played with speed, agility, and teamwork.', baseMembers: 1100 },
    { name: 'Padel', icon: '🏓', description: 'Exciting court sport blending tennis and squash inside glass enclosures.', baseMembers: 650 }
  ];

  try {
    const sportsData = await Promise.all(sportsList.map(async (sport) => {
      // Find all events for this category
      const events = await Event.find({ category: new RegExp(`^${sport.name}$`, 'i') });
      
      // Calculate total events count (fall back to a base number if no events exist)
      const eventsCount = events.length || 3;
      
      // Calculate members count = base members + slots filled
      const slotsFilledSum = events.reduce((sum, e) => sum + (e.slotsFilled || 0), 0);
      const membersCount = sport.baseMembers + slotsFilledSum;
      
      // Find the next upcoming event
      let nextEvent = null;
      if (events.length > 0) {
        // Sort events by date ascending
        const sortedEvents = events.sort((a, b) => new Date(a.date) - new Date(b.date));
        // Find first event that has date in the future or is today
        const upcomingEvent = sortedEvents.find(e => new Date(e.date) >= new Date()) || sortedEvents[0];
        if (upcomingEvent) {
          nextEvent = {
            title: upcomingEvent.title,
            date: upcomingEvent.date,
            time: upcomingEvent.time,
            location: upcomingEvent.location
          };
        }
      }
      
      if (!nextEvent) {
        nextEvent = {
          title: `Upcoming ${sport.name} Match`,
          date: 'TBD',
          time: 'TBD',
          location: 'Strydclub Center'
        };
      }

      return {
        name: sport.name,
        icon: sport.icon,
        description: sport.description,
        eventsCount,
        membersCount,
        nextEvent
      };
    }));

    return res.status(200).json({ success: true, sports: sportsData });
  } catch (error) {
    console.error(`Get sports error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving sports data' });
  }
};

module.exports = { getSports };
