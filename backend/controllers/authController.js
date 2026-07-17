// backend/controllers/authController.js
const User = require('../models/User');
const generateJWT = require('../utils/generateJWT');
const path = require('path');
const fs = require('fs');

exports.register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      mobileNumber,
      role,
      shopName,
      businessCategory,
      shopAddress,
      city,
      pincode,
      latitude,
      longitude,
      openingTime,
      closingTime,
      address,
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Build user object
    const userData = {
      fullName,
      email,
      password,
      mobileNumber,
      role: role || 'consumer',
    };

    // Add merchant specific fields
    if (role === 'merchant') {
      userData.shopName = shopName;
      userData.businessCategory = businessCategory;
      userData.shopAddress = shopAddress;
      userData.city = city;
      userData.pincode = pincode;
      userData.latitude = latitude;
      userData.longitude = longitude;
      userData.openingTime = openingTime;
      userData.closingTime = closingTime;
    } else {
      userData.address = address;
      userData.city = city;
      userData.pincode = pincode;
      userData.latitude = latitude;
      userData.longitude = longitude;
    }

    // Handle profile photo
    if (req.file) {
      userData.profilePhoto = `/uploads/profile/${req.file.filename}`;
    }

    const user = new User(userData);
    await user.save();

    // Generate token
    const token = generateJWT(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        // Include all user fields for frontend
        ...user.toObject(),
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateJWT(user._id, user.role);

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userObj,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Return the user data directly (not wrapped in success)
    res.json(user);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update consumer profile
exports.updateConsumerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user is a consumer
    if (user.role !== 'consumer') {
      return res.status(403).json({ success: false, message: 'Access denied. Only consumers can update this profile.' });
    }

    const {
      fullName,
      email,
      mobileNumber,
      address,
      city,
      pincode,
      latitude,
      longitude
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
    user.address = address || user.address;
    user.city = city || user.city;
    user.pincode = pincode || user.pincode;
    user.latitude = latitude || user.latitude;
    user.longitude = longitude || user.longitude;

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