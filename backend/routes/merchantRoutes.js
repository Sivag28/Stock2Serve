const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/merchantController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/profile', auth, getProfile);
router.put('/profile', auth, upload.single('profilePhoto'), updateProfile);

module.exports = router;