const Listing = require('../models/Listing');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

const NEARBY_RADIUS_METERS = 10 * 1000;

const validCoordinate = (value, min, max) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max;
};

exports.getActiveListings = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
      return res.status(400).json({
        success: false,
        message: 'A valid latitude and longitude are required to find nearby offers.',
      });
    }

    const nearbyMerchants = await User.find({
      role: 'merchant',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(longitude), Number(latitude)],
          },
          $maxDistance: NEARBY_RADIUS_METERS,
        },
      },
    }).select('_id');

    const listings = await Listing.find({
      status: 'active',
      availableStatus: true,
      quantity: { $gt: 0 },
      expiryTime: { $gt: new Date() },
      merchantId: { $in: nearbyMerchants.map((merchant) => merchant._id) },
    })
      .populate('merchantId', 'shopName businessCategory shopAddress city latitude longitude')
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
