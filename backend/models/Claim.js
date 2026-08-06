const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  consumerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: { type: Number, default: 1, min: 1 },
  pickupToken: { type: String, required: true, unique: true, uppercase: true, trim: true },
  // These are copied from the listing when the reservation is made. Keeping a
  // snapshot prevents later listing edits from changing an issued token.
  pickupWindowStart: { type: Date, default: null },
  pickupWindowEnd: { type: Date, default: null },
  tokenExpiresAt: { type: Date, default: null },
  // Prevent the scheduled job from sending the same 30-minute reminder more
  // than once, including after a server restart.
  pickupReminderSentAt: { type: Date, default: null },
  emailStatus: { type: String, enum: ['pending', 'sent', 'skipped', 'failed'], default: 'pending' },
  emailSentAt: { type: Date, default: null },
  emailError: { type: String, default: null },
  status: { type: String, enum: ['claimed', 'collected', 'cancelled', 'expired'], default: 'claimed' },
  collectedAt: { type: Date, default: null },
}, { timestamps: true });

// Serves each consumer's claim history, newest claim first.
claimSchema.index({ consumerId: 1, createdAt: -1 });

// Serves merchant dashboard and claim-history queries for the merchant's listings.
claimSchema.index({ listingId: 1, createdAt: -1 });

// Serves both recurring claim jobs: claimed-claim expiry checks and the
// 30-minute pickup-reminder lookup. status is also the prefix for expiry checks.
claimSchema.index({ status: 1, pickupReminderSentAt: 1, tokenExpiresAt: 1 });

// Serves the recent-claims match at the start of the trending aggregation.
claimSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Claim', claimSchema);
