const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');

const getEvents = async (req, res) => {
  const { category, search } = req.query;
  const filter = {};

  if (category && category.toLowerCase() !== 'all') {
    filter.category = new RegExp(`^${category}$`, 'i');
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { title: searchRegex },
      { location: searchRegex },
      { category: searchRegex }
    ];
  }

  try {
    const events = await Event.find(filter).select('slug title category date time location status slotsFilled slotsTotal price');
    return res.status(200).json({ success: true, events });
  } catch (error) {
    console.error(`Get events error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving events' });
  }
};

const getEventBySlug = async (req, res) => {
  const { slug } = req.params;
  try {
    let event;
    if (mongoose.Types.ObjectId.isValid(slug)) {
      event = await Event.findById(slug);
    } else {
      event = await Event.findOne({ slug });
    }
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.status(200).json({ success: true, event });
  } catch (error) {
    console.error(`Get event by slug or ID error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving event details' });
  }
};

const registerForEvent = async (req, res) => {
  const { slug } = req.params;
  const userId = req.user._id;

  try {
    let event;
    if (mongoose.Types.ObjectId.isValid(slug)) {
      event = await Event.findById(slug);
    } else {
      event = await Event.findOne({ slug });
    }
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.slotsFilled >= event.slotsTotal) {
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    const existingReg = await Registration.findOne({ user: userId, event: event._id });
    if (existingReg) {
      return res.status(400).json({ success: false, message: 'You have already registered for this event' });
    }

    await Registration.create({
      user: userId,
      event: event._id,
      status: 'Confirmed'
    });

    event.slotsFilled += 1;
    event.participants.push({ name: req.user.name, role: 'Participant' });
    await event.save();

    const user = await User.findById(userId);
    user.totalEvents += 1;
    
    user.sportsPlayed = Math.max(user.sportsPlayed, 1);
    if (!user.favoriteSports.includes(event.category)) {
      user.favoriteSports.push(event.category);
    }
    await user.save();

    return res.status(200).json({ success: true, message: 'Successfully registered for event' });
  } catch (error) {
    console.error(`Register event error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during event registration' });
  }
};

const createEvent = async (req, res) => {
  const {
    title,
    category,
    description,
    format,
    skillLevel,
    rulesNotes,
    date,
    time,
    endTime,
    registrationCloses,
    location,
    price,
    slotsTotal,
    playersPerTeam,
    prizePool,
    bannerUrl,
    rules,
    schedule,
    organizedBy,
    contact
  } = req.body;

  if (!title || !category || !date || !time || !location || slotsTotal === undefined) {
    return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
  }

  try {
    // Generate a clean URL-friendly slug
    let slug = title.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if the slug already exists to prevent duplicate endpoints
    const existingEvent = await Event.findOne({ slug });
    if (existingEvent) {
      // Append a unique timestamp or random suffix to make it unique
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const newEvent = await Event.create({
      slug,
      title,
      category,
      description,
      format: format || 'Single Match',
      skillLevel: skillLevel || 'Open',
      rulesNotes: rulesNotes || '',
      date,
      time,
      endTime: endTime || '',
      registrationCloses: registrationCloses || '',
      location,
      price: Number(price) || 0,
      slotsTotal: Number(slotsTotal),
      playersPerTeam: Number(playersPerTeam) || 0,
      prizePool: Number(prizePool) || 0,
      bannerUrl: bannerUrl || '',
      slotsFilled: 0,
      rules: rules || [],
      schedule: schedule || [],
      organizedBy: organizedBy || req.user.name || 'Strydclub Admin',
      contact: contact || req.user.phone || ''
    });

    console.log(`[Event Created] Slug: ${newEvent.slug}, Title: ${newEvent.title}`);
    return res.status(201).json({ success: true, event: newEvent });
  } catch (error) {
    console.error(`Create event error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during event creation' });
  }
};

const cancelRegistration = async (req, res) => {
  const { slug } = req.params;
  const userId = req.user._id;

  try {
    let event;
    if (mongoose.Types.ObjectId.isValid(slug)) {
      event = await Event.findById(slug);
    } else {
      event = await Event.findOne({ slug });
    }
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const existingReg = await Registration.findOne({ user: userId, event: event._id });
    if (!existingReg) {
      return res.status(400).json({ success: false, message: 'You are not registered for this event' });
    }

    // Delete registration
    await Registration.deleteOne({ _id: existingReg._id });

    // Decrease slotsFilled
    if (event.slotsFilled > 0) {
      event.slotsFilled -= 1;
    }

    // Remove user from participants list
    event.participants = event.participants.filter(p => p.name !== req.user.name);
    await event.save();

    // Decrease user's total events count
    const user = await User.findById(userId);
    if (user.totalEvents > 0) {
      user.totalEvents -= 1;
    }
    await user.save();

    return res.status(200).json({ success: true, message: 'Successfully cancelled registration' });
  } catch (error) {
    console.error(`Cancel registration error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during cancellation' });
  }
};

module.exports = { getEvents, getEventBySlug, registerForEvent, createEvent, cancelRegistration };

