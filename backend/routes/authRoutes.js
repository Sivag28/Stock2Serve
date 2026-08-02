// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

router.post(
  '/register',
  uploadMiddleware.single('profilePhoto'),
  authController.register
);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authMiddleware, authController.getMe);
router.put('/fcm-token', authMiddleware, authController.registerFcmToken);
router.delete('/fcm-token', authMiddleware, authController.removeFcmToken);
router.put(
  '/consumer/profile',
  authMiddleware,
  uploadMiddleware.single('profilePhoto'),
  authController.updateConsumerProfile
);

module.exports = router;
