const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, default: 'Confirmed' },
  result: { type: String, default: '' },
  won: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Registration', registrationSchema);
