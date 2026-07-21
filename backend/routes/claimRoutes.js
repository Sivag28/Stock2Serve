const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { createClaim, getMyClaims, expireClaim, verifyPickup } = require('../controllers/claimController');

router.post('/', auth, createClaim);
router.get('/my', auth, getMyClaims);
router.post('/:id/expire', auth, expireClaim);
router.post('/verify', auth, verifyPickup);

module.exports = router;
