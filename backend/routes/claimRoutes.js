const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { createClaim, getMyClaims, verifyPickup } = require('../controllers/claimController');

router.post('/', auth, createClaim);
router.get('/my', auth, getMyClaims);
router.post('/verify', auth, verifyPickup);

module.exports = router;
