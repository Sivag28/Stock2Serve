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
  status: { type: String, enum: ['claimed', 'collected', 'cancelled', 'expired'], default: 'claimed' },
  collectedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);
