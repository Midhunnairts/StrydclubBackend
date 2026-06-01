const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  emailOrPhone: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, {
  timestamps: true
});

// TTL index to automatically remove the document when the current time is past expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
