const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  text: { type: String, required: true }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  time: { type: String, required: true },
  activity: { type: String, required: true }
}, { _id: false });

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  role: { type: String, default: 'Participant' },
  surfingSlot: { type: Number },
  surfingSlotTime: { type: String, default: '' }
}, { _id: false });

const surfingSlotSchema = new mongoose.Schema({
  slotNumber: { type: Number },
  time: { type: String, default: '' },
  endTime: { type: String, default: '' },
  maxAttendees: { type: Number, default: 10 },
  slotsFilled: { type: Number, default: 0 }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  endTime: { type: String, default: '' },
  registrationCloses: { type: String, default: '' },
  location: { type: String, required: true },
  venueUrl: { type: String, default: '' },
  format: { type: String, default: 'Single Match' },
  skillLevel: { type: String, default: 'Open' },
  rulesNotes: { type: String, default: '' },
  status: { type: String, default: 'upcoming' },
  slotsFilled: { type: Number, default: 0 },
  slotsTotal: { type: Number, required: true },
  price: { type: Number, required: true },
  playersPerTeam: { type: Number, default: 0 },
  prizePool: { type: Number, default: 0 },
  bannerUrl: { type: String, default: '' },
  rules: [ruleSchema],
  schedule: [scheduleSchema],
  surfingSlots: [surfingSlotSchema],
  participants: [participantSchema],
  organizedBy: { type: String, required: true },
  contact: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
