const Event = require('../models/Event');
const Registration = require('../models/Registration');

const getSports = async (req, res) => {
  const sportsList = [
    { name: 'Running', icon: '🏃', description: 'From 5K sprints to full marathons, join runners pushing their limits.' },
    { name: 'Badminton', icon: '🏸', description: 'Singles and doubles tournaments for all skill levels.' },
    { name: 'Football', icon: '⚽', description: 'High-intensity leagues and casual matches for football fans.' },
    { name: 'Volleyball', icon: '🏐', description: 'Beach and indoor volleyball leagues for teams and individuals.' },
    { name: 'Pickleball', icon: '🏓', description: 'Fast-growing paddle sport that combines elements of tennis and badminton.' },
    { name: 'Kho Kho', icon: '🏃‍♂️', description: 'Traditional Indian tag sport played with speed, agility, and teamwork.' },
    { name: 'Cricket', icon: '🏏', description: 'Matches, tournaments, and net practice for cricket enthusiasts.' },
    { name: 'Other', icon: '✨', description: 'Custom hosted events covering a wide variety of exciting sports.' }
  ];

  try {
    const standardCategories = ['Running', 'Badminton', 'Football', 'Volleyball', 'Pickleball', 'Kho Kho', 'Cricket'];

    const sportsData = await Promise.all(sportsList.map(async (sport) => {
      let events;

      if (sport.name.toLowerCase() === 'other') {
        const regexList = standardCategories.map(c => new RegExp(`^${c}$`, 'i'));
        events = await Event.find({ category: { $nin: regexList } });
      } else {
        const regex = new RegExp(`^${sport.name}$`, 'i');
        events = await Event.find({ category: regex });
      }

      const eventsCount = events.length;
      const eventIds = events.map(e => e._id);

      // Find unique registered users for events of this sport category
      const registeredUserIds = eventIds.length > 0
        ? await Registration.find({ event: { $in: eventIds } }).distinct('user')
        : [];

      // Total slots filled across events of this sport category
      const slotsFilledSum = events.reduce((sum, e) => sum + (e.slotsFilled || 0), 0);

      // Members count represents total members registered for events in this sport
      const membersCount = Math.max(registeredUserIds.length, slotsFilledSum);

      // Find next upcoming event
      let nextEvent = null;
      if (events.length > 0) {
        const sortedEvents = events.sort((a, b) => new Date(a.date) - new Date(b.date));
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
