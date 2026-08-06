const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getActiveListings, getNearbyMerchants, getTrendingListings, getListingImage, getMerchantWalkingRoute } = require('../controllers/listingController');

router.get('/trending', auth, getTrendingListings);
router.get('/merchants', auth, getNearbyMerchants);
router.get('/merchants/:merchantId/walking-route', auth, getMerchantWalkingRoute);
router.get('/:id/image', getListingImage);
router.get('/', auth, getActiveListings);

module.exports = router;
