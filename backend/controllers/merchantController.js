// backend/controllers/merchantController.js
const User = require('../models/User');
const Listing = require('../models/Listing');
const Claim = require('../models/Claim');
const { notifyNearbyConsumersAboutListing } = require('../utils/notifications');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const { isPickupWindowActive } = require('../utils/claimTiming');

const parseIndianExpiryTime = ({ calendar, tokenexpiryTime, expiryTime }) => {
  const hasCalendarDate = /^\d{4}-\d{2}-\d{2}$/.test(String(calendar || ''));
  const hasTime = /^\d{2}:\d{2}$/.test(String(tokenexpiryTime || ''));
  const value = hasCalendarDate && hasTime
    ? `${calendar}T${tokenexpiryTime}:00+05:30`
    : expiryTime;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Get merchant profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update merchant profile
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('+profilePhotoPublicId');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user is a merchant
    if (user.role !== 'merchant') {
      return res.status(403).json({ success: false, message: 'Access denied. Only merchants can update this profile.' });
    }

    const {
      fullName,
      email,
      mobileNumber,
      shopName,
      businessCategory,
      shopAddress,
      city,
      pincode,
      latitude,
      longitude,
      openingTime,
      closingTime
    } = req.body;

    // Check if email is being changed and already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email }).lean();
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    const nextLatitude = latitude === undefined || latitude === '' ? Number(user.latitude) : Number(latitude);
    const nextLongitude = longitude === undefined || longitude === '' ? Number(user.longitude) : Number(longitude);
    if (!Number.isFinite(nextLatitude) || nextLatitude < -90 || nextLatitude > 90
      || !Number.isFinite(nextLongitude) || nextLongitude < -180 || nextLongitude > 180) {
      return res.status(400).json({ success: false, message: 'A valid latitude and longitude are required.' });
    }

    // Update fields
    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.mobileNumber = mobileNumber || user.mobileNumber;
    user.shopName = shopName || user.shopName;
    user.businessCategory = businessCategory || user.businessCategory;
    user.shopAddress = shopAddress || user.shopAddress;
    user.city = city || user.city;
    user.pincode = pincode || user.pincode;
    user.latitude = nextLatitude;
    user.longitude = nextLongitude;
    user.location = { type: 'Point', coordinates: [nextLongitude, nextLatitude] };
    user.openingTime = openingTime || user.openingTime;
    user.closingTime = closingTime || user.closingTime;

    // Handle profile photo upload
    if (req.file) {
      const uploadedImage = await uploadImage(req.file.buffer, 'stock2serve/profiles');
      const oldPhotoPublicId = user.profilePhotoPublicId;
      user.profilePhoto = uploadedImage.secure_url;
      user.profilePhotoPublicId = uploadedImage.public_id;
      user.profileImageData = undefined;
      user.profileImageMimeType = undefined;

      await user.save();
      deleteImage(oldPhotoPublicId)
        .catch((error) => console.error('Previous Cloudinary profile image cleanup failed:', error));
    }

    if (!req.file) await user.save();

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;
    delete updatedUser.profilePhotoPublicId;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create listing
exports.createListing = async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user || user.role !== 'merchant') {
      return res.status(403).json({ success: false, message: 'Only merchants can create listings' });
    }

    const {
      foodName,
      description,
      category,
      originalPrice,
      discountedPrice,
      quantity,
      foodType,
      pickupStart,
      pickupEnd,
      calendar,
      tokenexpiryTime,
      expiryTime,
      availableStatus,
    } = req.body;

    const parsedExpiryTime = parseIndianExpiryTime({ calendar, tokenexpiryTime, expiryTime });

    if (!foodName || !category || !originalPrice || !discountedPrice || !quantity || !pickupStart || !pickupEnd || !parsedExpiryTime) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
    }

    const normalizedAvailableStatus = availableStatus === 'false' ? false : true;
    const uploadedImage = req.file
      ? await uploadImage(req.file.buffer, 'stock2serve/listings')
      : null;

    const listing = await Listing.create({
      merchantId: user._id,
      shopId: user._id,
      foodName,
      description,
      category,
      originalPrice: Number(originalPrice),
      discountedPrice: Number(discountedPrice),
      quantity: Number(quantity),
      foodType,
      pickupStart,
      pickupEnd,
      expiryTime: parsedExpiryTime,
      availableStatus: normalizedAvailableStatus,
      image: uploadedImage?.secure_url || null,
      imagePublicId: uploadedImage?.public_id || null,
      status: normalizedAvailableStatus ? 'active' : 'deactivated',
    });

    // The consumer feed needs the merchant fields that are normally supplied
    // by getActiveListings, so populate them before broadcasting.
    const listingForConsumers = await Listing.findById(listing._id)
      .populate('merchantId', 'shopName businessCategory shopAddress city latitude longitude')
      .lean();
    if (listingForConsumers.status === 'active'
      && listingForConsumers.availableStatus
      && listingForConsumers.quantity > 0
      && isPickupWindowActive(listingForConsumers)) {
      req.app.get('io').emit('listing-created', listingForConsumers);
      // Socket.IO remains the foreground channel. FCM is only sent to nearby
      // consumers who do not currently have a live authenticated socket.
      notifyNearbyConsumersAboutListing(req.app.get('io'), listingForConsumers)
        .catch((error) => console.error('New listing FCM notification failed:', error));
    }

    const listingResponse = listing.toObject();
    delete listingResponse.imagePublicId;
    res.status(201).json({ success: true, message: 'Listing created successfully', listing: listingResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get merchant listings
exports.getListings = async (req, res) => {
  try {
    const listings = await Listing.find({ merchantId: req.userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, listings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update listing
exports.updateListing = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, merchantId: req.userId }).select('+imagePublicId');
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const {
      foodName,
      description,
      category,
      originalPrice,
      discountedPrice,
      quantity,
      foodType,
      pickupStart,
      pickupEnd,
      calendar,
      tokenexpiryTime,
      expiryTime,
      availableStatus,
      status,
    } = req.body;

    listing.foodName = foodName || listing.foodName;
    listing.description = description || listing.description;
    listing.category = category || listing.category;
    listing.originalPrice = originalPrice !== undefined ? Number(originalPrice) : listing.originalPrice;
    listing.discountedPrice = discountedPrice !== undefined ? Number(discountedPrice) : listing.discountedPrice;
    listing.quantity = quantity !== undefined ? Number(quantity) : listing.quantity;
    listing.foodType = foodType || listing.foodType;
    listing.pickupStart = pickupStart || listing.pickupStart;
    listing.pickupEnd = pickupEnd || listing.pickupEnd;
    const parsedExpiryTime = parseIndianExpiryTime({ calendar, tokenexpiryTime, expiryTime });
    if ((calendar || tokenexpiryTime || expiryTime) && !parsedExpiryTime) {
      return res.status(400).json({ success: false, message: 'Please provide a valid calendar date and token expiry time' });
    }
    listing.expiryTime = parsedExpiryTime || listing.expiryTime;
    const normalizedAvailableStatus = availableStatus === undefined ? listing.availableStatus : availableStatus === 'false' ? false : true;
    listing.availableStatus = normalizedAvailableStatus;
    listing.status = status || (normalizedAvailableStatus ? 'active' : 'deactivated');

    if (req.file) {
      const uploadedImage = await uploadImage(req.file.buffer, 'stock2serve/listings');
      const oldImagePublicId = listing.imagePublicId;
      listing.image = uploadedImage.secure_url;
      listing.imagePublicId = uploadedImage.public_id;
      listing.imageData = undefined;
      listing.imageMimeType = undefined;

      await listing.save();
      deleteImage(oldImagePublicId)
        .catch((error) => console.error('Previous Cloudinary listing image cleanup failed:', error));
    }

    if (!req.file) await listing.save();
    const listingForConsumers = await Listing.findById(listing._id)
      .populate('merchantId', 'shopName businessCategory shopAddress city latitude longitude')
      .lean();

    // Edits and re-activations are meaningful changes for nearby consumers.
    // Socket.IO remains the visible-app channel and FCM covers background apps.
    if (listingForConsumers.status === 'active'
      && listingForConsumers.availableStatus
      && listingForConsumers.quantity > 0
      && isPickupWindowActive(listingForConsumers)) {
      req.app.get('io').emit('listing-updated', listingForConsumers);
      notifyNearbyConsumersAboutListing(req.app.get('io'), listingForConsumers, {
        title: 'Nearby Food Offer Updated',
        body: 'A nearby merchant has updated a surplus food offer. Go and view nearby offers.',
        type: 'listing-updated',
      }).catch((error) => console.error('Listing update FCM notification failed:', error));
    }
    const listingResponse = listing.toObject();
    delete listingResponse.imagePublicId;
    res.json({ success: true, message: 'Listing updated successfully', listing: listingResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete listing
exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, merchantId: req.userId }).select('+imagePublicId');
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const imagePublicId = listing.imagePublicId;
    await listing.deleteOne();
    deleteImage(imagePublicId)
      .catch((error) => console.error('Cloudinary listing image cleanup failed:', error));
    res.json({ success: true, message: 'Listing deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const listings = await Listing.find({ merchantId: req.userId }).lean();
    const claims = await Claim.find({ listingId: { $in: listings.map((item) => item._id) } }).lean();
    const activeListings = listings.filter((item) => item.status === 'active' && item.availableStatus).length;
    const expiredListings = listings.filter((item) => item.status === 'expired').length;
    const totalQuantity = listings.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const revenueRecovered = listings.reduce((sum, item) => sum + Math.max(0, (item.originalPrice - item.discountedPrice) * Math.max(0, item.quantity)), 0);

    res.json({
      success: true,
      stats: {
        activeListings,
        orders: claims.filter((claim) => claim.status === 'claimed').length,
        completedOrders: claims.filter((claim) => claim.status === 'collected').length,
        revenueRecovered,
        foodSaved: totalQuantity,
        expiredListings,
        recentListings: listings.slice(0, 5),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClaimHistory = async (req, res) => {
  try {
    if (req.userRole !== 'merchant') return res.status(403).json({ success: false, message: 'Only merchants can view claim history.' });
    const listings = await Listing.find({ merchantId: req.userId }).select('_id').lean();
    const claims = await Claim.find({ listingId: { $in: listings.map((listing) => listing._id) } })
      .populate('consumerId', 'fullName mobileNumber')
      // Older claims predate the per-reservation tokenExpiresAt field, so also
      // return the listing expiry as a backward-compatible display fallback.
      .populate('listingId', 'foodName category discountedPrice expiryTime')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, claims });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
