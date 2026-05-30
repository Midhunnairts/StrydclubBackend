const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkeyforstrydclubauthtokens', {
    expiresIn: '30d'
  });
};

const sendOtp = async (req, res) => {
  const { channel, value } = req.body;
  if (!value) {
    return res.status(400).json({ success: false, message: 'Please provide email or phone number' });
  }

  console.log(`[OTP] Sending 6-digit mock OTP to ${value} via ${channel}`);
  return res.status(200).json({ success: true, message: 'OTP sent successfully' });
};

const verifyOtp = async (req, res) => {
  const { channel, value, code } = req.body;
  if (!value || !code) {
    return res.status(400).json({ success: false, message: 'Please provide credentials and OTP code' });
  }

  if (code.length !== 6) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code format' });
  }

  try {
    let user;
    if (channel === 'email') {
      user = await User.findOne({ email: value });
      if (!user) {
        user = await User.create({
          name: value.split('@')[0],
          email: value,
          phone: `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          favoriteSports: ['Running', 'Football'],
          memberSince: 'January 2026',
          totalEvents: 0,
          eventsWon: 0,
          sportsPlayed: 0
        });
      }
    } else {
      user = await User.findOne({ phone: value });
      if (!user) {
        user = await User.create({
          name: `Athlete_${value.slice(-4)}`,
          email: `athlete_${value.slice(-4)}@strydclub.com`,
          phone: value,
          favoriteSports: ['Running'],
          memberSince: 'January 2026',
          totalEvents: 0,
          eventsWon: 0,
          sportsPlayed: 0
        });
      }
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        favoriteSports: user.favoriteSports,
        memberSince: user.memberSince,
        totalEvents: user.totalEvents,
        eventsWon: user.eventsWon,
        sportsPlayed: user.sportsPlayed
      }
    });
  } catch (error) {
    console.error(`Auth verify error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during auth verification' });
  }
};

module.exports = { sendOtp, verifyOtp };
