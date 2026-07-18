const Listing = require('../models/Listing');

exports.getActiveListings = async (req, res) => {
  try {
    const listings = await Listing.find({
      status: 'active',
      availableStatus: true,
      quantity: { $gt: 0 },
      expiryTime: { $gt: new Date() },
    })
      .populate('merchantId', 'shopName businessCategory shopAddress city')
      .sort({ expiryTime: 1 });
    res.json({ success: true, listings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
