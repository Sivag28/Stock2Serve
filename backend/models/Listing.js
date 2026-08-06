const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  foodName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
    enum: ['bakery', 'cafe', 'restaurant', 'fastfood', 'foodstall', 'homekitchen', 'salad', 'dessert', 'sweetshop', 'juice', 'tiffin', 'mess', 'fruits', 'sandwich', 'tea', 'cloudkitchen', 'supermarket', 'snacks', 'catering', 'other'],
    required: true,
  },
  originalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  discountedPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  image: {
    type: String,
    default: null,
  },
  // Cloudinary's stable asset identifier, used when a listing image changes
  // or the listing is deleted.
  imagePublicId: {
    type: String,
    default: null,
    select: false,
  },
  // Kept in MongoDB so listings created from one development laptop can be
  // displayed by another laptop using the same database.
  imageData: {
    type: Buffer,
    select: false,
    default: null,
  },
  imageMimeType: {
    type: String,
    select: false,
    default: null,
  },
  foodType: {
    type: String,
    enum: ['veg', 'non-veg'],
    default: 'veg',
  },
  pickupStart: {
    type: String,
    required: true,
  },
  pickupEnd: {
    type: String,
    required: true,
  },
  expiryTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'deactivated'],
    default: 'active',
  },
  availableStatus: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Serves the merchant's listings page, which filters by merchant and sorts by
// newest first.
listingSchema.index({ merchantId: 1, createdAt: -1 });

// Serves nearby feed and map queries after nearby merchant IDs are found.
// expiryTime is last because it is both filtered and sorted ascending.
listingSchema.index({ merchantId: 1, status: 1, availableStatus: 1, expiryTime: 1 });

module.exports = mongoose.model('Listing', listingSchema);
