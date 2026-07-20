const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getActiveListings, getListingImage } = require('../controllers/listingController');

router.get('/:id/image', getListingImage);
router.get('/', auth, getActiveListings);

module.exports = router;
