// backend/controllers/authController.js
const User = require('../models/User');
const generateJWT = require('../utils/generateJWT');
const { sendPasswordResetOtp } = require('../utils/emailService');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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
    const existingUser = await User.findOne({ email }).lean();
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
      const uploadedImage = await uploadImage(req.file.buffer, 'stock2serve/profiles');
      userData.profilePhoto = uploadedImage.secure_url;
      userData.profilePhotoPublicId = uploadedImage.public_id;
    }

    const user = new User(userData);
    await user.save();

    // Generate token
    const token = generateJWT(user._id, user.role);
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.fcmTokens;
    delete userObj.profilePhotoPublicId;

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
        // Include the profile fields needed by the frontend, but never return
        // browser FCM registration tokens.
        ...userObj,
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
    delete userObj.fcmTokens;

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
    const user = await User.findById(req.userId).select('-password -fcmTokens').lean();
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
    const user = await User.findById(req.userId).select('+profilePhotoPublicId');
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
      const existingUser = await User.findOne({ email }).lean();
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
    delete updatedUser.fcmTokens;
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

exports.getProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('+profileImageData +profileImageMimeType profilePhoto')
      .lean();
    if (!user?.profilePhoto) return res.status(404).end();

    if (/^https:\/\//i.test(user.profilePhoto)) {
      return res.redirect(user.profilePhoto);
    }

    if (user.profileImageData) {
      res.set('Content-Type', user.profileImageMimeType || 'application/octet-stream');
      return res.send(user.profileImageData);
    }

    const relativeImagePath = user.profilePhoto.replace(/^[/\\]+/, '');
    const localImagePath = path.join(__dirname, '..', relativeImagePath);
    if (fs.existsSync(localImagePath)) return res.sendFile(localImagePath);
    return res.status(404).end();
  } catch (error) {
    return res.status(404).end();
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, message: 'Email address is required.' });

    const user = await User.findOne({ email }).select('+resetOtp +resetOtpExpires');
    if (!user) return res.status(404).json({ success: false, message: 'No account is registered with this email address.' });

    const otp = crypto.randomInt(100000, 1000000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + (10 * 60 * 1000));
    await user.save();

    try {
      await sendPasswordResetOtp({ email: user.email, fullName: user.fullName, otp });
    } catch (emailError) {
      user.resetOtp = undefined;
      user.resetOtpExpires = undefined;
      await user.save();
      console.error('Password reset email error:', emailError);
      return res.status(500).json({ success: false, message: 'Unable to send the reset OTP. Please try again later.' });
    }

    return res.json({ success: true, message: 'A password reset OTP has been sent to your email address.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Unable to process password reset request.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || '').trim();
    const password = String(req.body?.password || '');
    if (!email || !/^\d{6}$/.test(otp) || !password) {
      return res.status(400).json({ success: false, message: 'Email, a valid 6-digit OTP, and new password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const user = await User.findOne({ email }).select('+resetOtp +resetOtpExpires');
    if (!user || !user.resetOtp || user.resetOtp !== otp || !user.resetOtpExpires || user.resetOtpExpires.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'The OTP is invalid or has expired. Please request a new one.' });
    }

    // The User pre-save hook hashes modified passwords with bcrypt before persisting.
    user.password = password;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Unable to reset password. Please try again later.' });
  }
};

// FCM tokens belong to the authenticated browser/device, not to a request
// body user id. Only consumers receive consumer offer and pickup alerts.
exports.registerFcmToken = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) return res.status(400).json({ success: false, message: 'An FCM token is required.' });

    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role !== 'consumer') return res.status(403).json({ success: false, message: 'Only consumers can enable these notifications.' });

    await User.updateOne({ _id: user._id }, { $addToSet: { fcmTokens: token } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeFcmToken = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (token) await User.updateOne({ _id: req.userId }, { $pull: { fcmTokens: token } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
