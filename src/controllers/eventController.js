const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay client
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'mockkeysecret';

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret
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
    const event = await Event.findOne({ slug });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.status(200).json({ success: true, event });
  } catch (error) {
    console.error(`Get event by slug error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving event details' });
  }
};

const registerForEvent = async (req, res) => {
  const { slug } = req.params;
  const userId = req.user._id;

  try {
    const event = await Event.findOne({ slug });
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

const createPaymentOrder = async (req, res) => {
  const { slug } = req.params;
  const userId = req.user._id;

  try {
    const event = await Event.findOne({ slug });
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

    const price = event.price || 0;
    if (price === 0) {
      return res.status(400).json({ success: false, message: 'This event is free. Please register directly.' });
    }

    // Create a Razorpay Order
    const options = {
      amount: price * 100, // amount in paisa
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };

    const order = await razorpay.orders.create(options);
    console.log(`[Razorpay] Created order ${order.id} for event ${event.title} (Amount: INR ${price})`);

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: razorpayKeyId
      }
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};

const verifyPayment = async (req, res) => {
  const { slug } = req.params;
  const userId = req.user._id;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing payment details for verification' });
  }

  try {
    const event = await Event.findOne({ slug });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Verify payment signature
    const hmac = crypto.createHmac('sha256', razorpayKeySecret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn('[Razorpay WARNING] Payment signature verification failed!');
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    // Sig matches! Proceed to register user
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

    console.log(`[Razorpay] Successfully verified payment ${razorpay_payment_id} and registered user ${req.user.name} for event ${event.title}.`);
    return res.status(200).json({ success: true, message: 'Payment verified and registration confirmed!' });
  } catch (error) {
    console.error('Razorpay signature verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
};

module.exports = { getEvents, getEventBySlug, registerForEvent, createPaymentOrder, verifyPayment };
