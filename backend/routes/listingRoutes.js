const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getActiveListings } = require('../controllers/listingController');

router.get('/', auth, getActiveListings);

module.exports = router;
