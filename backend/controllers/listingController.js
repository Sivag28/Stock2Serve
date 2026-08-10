const Listing = require('../models/Listing');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { getWalkingRoute } = require('../config/openRouteService');

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
    }).select('_id').lean();

    const listings = await Listing.find({
      status: 'active',
      availableStatus: true,
      quantity: { $gt: 0 },
      expiryTime: { $gt: new Date() },
      merchantId: { $in: nearbyMerchants.map((merchant) => merchant._id) },
    })
      .populate('merchantId', 'shopName businessCategory shopAddress city latitude longitude')
      .sort({ expiryTime: 1 })
      .lean();
    res.json({ success: true, listings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMerchantWalkingRoute = async (req, res) => {
  try {
    if (req.userRole !== 'consumer') {
      return res.status(403).json({ success: false, message: 'Only consumers can request walking routes.' });
    }

    const { latitude, longitude } = req.query;
    if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
      return res.status(400).json({ success: false, message: 'A valid latitude and longitude are required.' });
    }

    const merchant = await User.findOne({ _id: req.params.merchantId, role: 'merchant' })
      .select('latitude longitude')
      .lean();
    if (!merchant || !validCoordinate(merchant.latitude, -90, 90) || !validCoordinate(merchant.longitude, -180, 180)) {
      return res.status(404).json({ success: false, message: 'Merchant location is unavailable.' });
    }

    const route = await getWalkingRoute({
      origin: { latitude: Number(latitude), longitude: Number(longitude) },
      destination: { latitude: merchant.latitude, longitude: merchant.longitude },
    });
    return res.json({ success: true, route });
  } catch (error) {
    console.error('Walking route error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status === 503 ? error.message : 'Unable to find a walking route right now.',
    });
  }
};

// A map marker represents a merchant, rather than an individual food item.
// Keep this query beside the feed query so both surfaces apply exactly the
// same active/available/nearby rules against MongoDB.
exports.getNearbyMerchants = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
      return res.status(400).json({ success: false, message: 'A valid latitude and longitude are required.' });
    }

    const nearbyMerchants = await User.find({
      role: 'merchant',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
          $maxDistance: NEARBY_RADIUS_METERS,
        },
      },
    }).select('shopName businessCategory shopAddress city latitude longitude profilePhoto openingTime closingTime').lean();

    const merchantIds = nearbyMerchants.map((merchant) => merchant._id);
    const listings = await Listing.find({
      merchantId: { $in: merchantIds }, status: 'active', availableStatus: true,
      quantity: { $gt: 0 }, expiryTime: { $gt: new Date() },
    }).select('merchantId foodName quantity foodType pickupStart pickupEnd expiryTime').lean();

    const byMerchant = new Map();
    listings.forEach((listing) => {
      const key = String(listing.merchantId);
      const current = byMerchant.get(key) || { totalMeals: 0, foodItems: [], foodTypes: new Set(), pickupStarts: [], pickupEnds: [], nextExpiry: null };
      current.totalMeals += listing.quantity;
      current.foodItems.push({ name: listing.foodName, quantity: listing.quantity });
      current.foodTypes.add(listing.foodType);
      current.pickupStarts.push(listing.pickupStart);
      current.pickupEnds.push(listing.pickupEnd);
      if (!current.nextExpiry || listing.expiryTime < current.nextExpiry) current.nextExpiry = listing.expiryTime;
      byMerchant.set(key, current);
    });

    const merchants = nearbyMerchants.map((merchant) => {
      const availability = byMerchant.get(String(merchant._id));
      if (!availability) return null;
      return {
        _id: merchant._id,
        name: merchant.shopName || 'Local merchant',
        category: merchant.businessCategory || 'other',
        address: merchant.shopAddress || merchant.city || '',
        latitude: merchant.latitude,
        longitude: merchant.longitude,
        profilePhoto: merchant.profilePhoto,
        openingTime: merchant.openingTime,
        closingTime: merchant.closingTime,
        totalMeals: availability.totalMeals,
        foodItems: availability.foodItems,
        foodTypes: [...availability.foodTypes],
        pickupStart: availability.pickupStarts.sort()[0],
        pickupEnd: availability.pickupEnds.sort().slice(-1)[0],
        nextExpiry: availability.nextExpiry,
      };
    }).filter(Boolean);
    res.json({ success: true, merchants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTrendingListings = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
      return res.status(400).json({
        success: false,
        message: 'A valid latitude and longitude are required to find trending offers.',
      });
    }

    const nearbyMerchants = await User.find({
      role: 'merchant',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
          $maxDistance: NEARBY_RADIUS_METERS,
        },
      },
    }).select('_id').lean();

    const tenMinutesAgo = new Date(Date.now() - (10 * 60 * 1000));
    const merchantIds = nearbyMerchants.map((merchant) => merchant._id);
    const trending = await require('../models/Claim').aggregate([
      { $match: { createdAt: { $gte: tenMinutesAgo } } },
      { $lookup: { from: 'listings', localField: 'listingId', foreignField: '_id', as: 'listing' } },
      { $unwind: '$listing' },
      {
        $match: {
          'listing.merchantId': { $in: merchantIds },
          'listing.status': 'active',
          'listing.availableStatus': true,
          'listing.quantity': { $gt: 0 },
          'listing.expiryTime': { $gt: new Date() },
        },
      },
      { $lookup: { from: 'users', localField: 'listing.merchantId', foreignField: '_id', as: 'merchant' } },
      { $unwind: '$merchant' },
      {
        $group: {
          _id: '$listing._id',
          foodName: { $first: '$listing.foodName' },
          shopName: { $first: '$merchant.shopName' },
          shopAddress: { $first: '$merchant.shopAddress' },
          city: { $first: '$merchant.city' },
          claimCount: { $sum: 1 },
        },
      },
      { $sort: { claimCount: -1, foodName: 1 } },
      { $limit: 3 },
      { $project: { _id: 1, foodName: 1, shopName: 1, shopAddress: 1, city: 1, claimCount: 1 } },
    ]);

    res.json({ success: true, trending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// New images are redirected to Cloudinary. The MongoDB and local-upload
// fallbacks keep every image created before this deployment available.
exports.getListingImage = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).select('+imageData +imageMimeType image').lean();
    if (!listing?.image) return res.status(404).end();

    if (/^https:\/\//i.test(listing.image)) {
      return res.redirect(listing.image);
    }

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
