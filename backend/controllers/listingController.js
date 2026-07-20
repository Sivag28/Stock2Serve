const Listing = require('../models/Listing');
const fs = require('fs');
const path = require('path');

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

// Listing image files are stored in MongoDB as well as the local uploads
// folder. Serving through this endpoint makes them available from every app
// server that uses the same database.
exports.getListingImage = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).select('+imageData +imageMimeType image');
    if (!listing?.image) return res.status(404).end();

    if (listing.imageData) {
      res.set('Content-Type', listing.imageMimeType || 'application/octet-stream');
      return res.send(listing.imageData);
    }

    const relativeImagePath = listing.image.replace(/^[/\\]+/, '');
    const localImagePath = path.join(__dirname, '..', relativeImagePath);
    if (fs.existsSync(localImagePath)) return res.sendFile(localImagePath);
    return res.status(404).end();
  } catch (error) {
    return res.status(404).end();
  }
};
