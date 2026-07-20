// backend/controllers/merchantController.js
const User = require('../models/User');
const Listing = require('../models/Listing');
const Claim = require('../models/Claim');
const path = require('path');
const fs = require('fs');

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
    const user = await User.findById(req.userId).select('-password');
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
    const user = await User.findById(req.userId);
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
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
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
    user.latitude = latitude || user.latitude;
    user.longitude = longitude || user.longitude;
    user.openingTime = openingTime || user.openingTime;
    user.closingTime = closingTime || user.closingTime;

    // Handle profile photo upload
    if (req.file) {
      // Delete old photo if exists
      if (user.profilePhoto) {
        const oldPhotoPath = path.join(__dirname, '..', user.profilePhoto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      user.profilePhoto = '/uploads/profile/' + req.file.filename;
    }

    await user.save();

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;

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
    const user = await User.findById(req.userId);
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
      image: req.file ? '/uploads/listings/' + req.file.filename : null,
      imageData: req.file ? fs.readFileSync(req.file.path) : null,
      imageMimeType: req.file?.mimetype || null,
      status: normalizedAvailableStatus ? 'active' : 'deactivated',
    });

    res.status(201).json({ success: true, message: 'Listing created successfully', listing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get merchant listings
exports.getListings = async (req, res) => {
  try {
    const listings = await Listing.find({ merchantId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, listings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update listing
exports.updateListing = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, merchantId: req.userId });
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
      if (listing.image) {
        const oldPhotoPath = path.join(__dirname, '..', listing.image);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      listing.image = '/uploads/listings/' + req.file.filename;
      listing.imageData = fs.readFileSync(req.file.path);
      listing.imageMimeType = req.file.mimetype;
    }

    await listing.save();
    res.json({ success: true, message: 'Listing updated successfully', listing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete listing
exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, merchantId: req.userId });
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    if (listing.image) {
      const imagePath = path.join(__dirname, '..', listing.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await listing.deleteOne();
    res.json({ success: true, message: 'Listing deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const listings = await Listing.find({ merchantId: req.userId });
    const claims = await Claim.find({ listingId: { $in: listings.map((item) => item._id) } });
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
