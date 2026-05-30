const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  text: { type: String, required: true }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  time: { type: String, required: true },
  activity: { type: String, required: true }
}, { _id: false });

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: 'Participant' }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, default: 'upcoming' },
  slotsFilled: { type: Number, default: 0 },
  slotsTotal: { type: Number, required: true },
  price: { type: Number, required: true },
  rules: [ruleSchema],
  schedule: [scheduleSchema],
  participants: [participantSchema],
  organizedBy: { type: String, required: true },
  contact: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
