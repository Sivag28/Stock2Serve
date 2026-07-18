const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  consumerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: { type: Number, default: 1, min: 1 },
  pickupToken: { type: String, required: true, unique: true, uppercase: true, trim: true },
  status: { type: String, enum: ['claimed', 'collected', 'cancelled'], default: 'claimed' },
  collectedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);
