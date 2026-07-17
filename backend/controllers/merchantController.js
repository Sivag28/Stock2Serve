// backend/controllers/merchantController.js
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

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