const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  location: { type: String, default: 'Bangalore' },
  bio: { type: String, default: 'Passionate runner & badminton player. Chasing PRs every weekend. 🏃' },
  username: { type: String, default: '' },
  points: { type: Number, default: 840 },
  rank: { type: String, default: '#47' },
  isProfileComplete: { type: Boolean, default: false },
  loginChannel: { type: String, enum: ['phone', 'email'], default: 'phone' },
  avatarUrl: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  favoriteSports: [{ type: String }],
  memberSince: { type: String, default: 'January 2026' },
  totalEvents: { type: Number, default: 12 },
  eventsWon: { type: Number, default: 3 },
  sportsPlayed: { type: Number, default: 3 }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
