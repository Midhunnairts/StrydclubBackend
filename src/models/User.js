const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  email: { type: String, default: null, sparse: true },
  phone: { type: String, default: null, sparse: true },
  location: { type: String, default: '' },
  bio: { type: String, default: '' },
  username: { type: String, default: '' },
  points: { type: Number, default: 0 },
  rank: { type: String, default: '' },
  isProfileComplete: { type: Boolean, default: false },
  loginChannel: { type: String, enum: ['phone', 'email'], default: 'phone' },
  avatarUrl: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  favoriteSports: [{ type: String }],
  memberSince: { type: String, default: 'January 2026' },
  totalEvents: { type: Number, default: 0 },
  eventsWon: { type: Number, default: 0 },
  sportsPlayed: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
