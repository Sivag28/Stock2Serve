const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  createListing,
  getListings,
  updateListing,
  deleteListing,
  getDashboardStats,
} = require('../controllers/merchantController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/profile', auth, getProfile);
router.put('/profile', auth, upload.single('profilePhoto'), updateProfile);

router.post('/listing', auth, upload.single('image'), createListing);
router.get('/listings', auth, getListings);
router.put('/listing/:id', auth, upload.single('image'), updateListing);
router.delete('/listing/:id', auth, deleteListing);
router.get('/dashboard-stats', auth, getDashboardStats);

module.exports = router;