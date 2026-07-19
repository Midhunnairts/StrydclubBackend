const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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
    const events = await Event.find(filter)
      .select('slug title category date time location status slotsFilled slotsTotal price')
      .sort({ createdAt: -1 });
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
    contact,
    venueUrl
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
      venueUrl: venueUrl || '',
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

const createRazorpayOrder = async (req, res) => {
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

    // Convert price to paise (minimum 100 paise)
    const amount = Math.round(event.price * 100);
    if (amount < 100) {
      return res.status(400).json({ success: false, message: 'Amount must be at least 100 paise' });
    }

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: event._id.toString()
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      return res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
    }

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error(`Create Razorpay order error: ${error.message}`);
    if (error.statusCode === 401) {
      return res.status(401).json({ success: false, message: 'Razorpay authentication failed' });
    }
    return res.status(500).json({ success: false, message: 'Server error during payment order creation' });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  const { slug } = req.params;
  const userId = req.user._id;
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing required payment verification fields' });
  }

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

    // Verify Signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Signature verification failed. Payment is invalid.' });
    }

    // Double check registration to prevent race condition / duplicate registration
    const existingReg = await Registration.findOne({ user: userId, event: event._id });
    if (existingReg) {
      return res.status(400).json({ success: false, message: 'You have already registered for this event' });
    }

    if (event.slotsFilled >= event.slotsTotal) {
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    // Signature matches, create registration!
    await Registration.create({
      user: userId,
      event: event._id,
      status: 'Confirmed',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id
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

    return res.status(200).json({ success: true, message: 'Payment verified and registration successful' });
  } catch (error) {
    console.error(`Verify Razorpay signature error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during payment verification' });
  }
};

module.exports = {
  getEvents,
  getEventBySlug,
  registerForEvent,
  createEvent,
  cancelRegistration,
  createRazorpayOrder,
  verifyRazorpayPayment
};

