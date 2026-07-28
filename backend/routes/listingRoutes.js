const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getActiveListings, getTrendingListings, getListingImage } = require('../controllers/listingController');

router.get('/trending', auth, getTrendingListings);
router.get('/:id/image', getListingImage);
router.get('/', auth, getActiveListings);

module.exports = router;
