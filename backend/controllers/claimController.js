const Claim = require('../models/Claim');
const Listing = require('../models/Listing');
const { timingForListing, timingForClaim, isExpired } = require('../utils/claimTiming');

const generatePickupToken = () => `S2S-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

exports.createClaim = async (req, res) => {
  try {
    if (req.userRole !== 'consumer') return res.status(403).json({ success: false, message: 'Only consumers can claim food.' });
    const listingId = req.body.listingId;
    if (!listingId) return res.status(400).json({ success: false, message: 'A food listing is required.' });

    const listing = await Listing.findOneAndUpdate(
      { _id: listingId, status: 'active', availableStatus: true, quantity: { $gt: 0 }, expiryTime: { $gt: new Date() } },
      { $inc: { quantity: -1 } },
      { new: true }
    );
    if (!listing) return res.status(409).json({ success: false, message: 'This item is no longer available.' });

    const listingTiming = timingForListing(listing);
    if (isExpired(listingTiming)) {
      await Listing.findByIdAndUpdate(listing._id, { $inc: { quantity: 1 } });
      return res.status(409).json({ success: false, message: 'The pickup or token window has already expired.' });
    }

    let claim;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        claim = await Claim.create({
          listingId: listing._id,
          consumerId: req.userId,
          pickupToken: generatePickupToken(),
          ...listingTiming,
        });
        break;
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
    if (!claim) {
      await Listing.findByIdAndUpdate(listing._id, { $inc: { quantity: 1 } });
      return res.status(500).json({ success: false, message: 'Unable to create a pickup token. Please try again.' });
    }

    // Every open consumer feed can update its remaining quantity without
    // requesting the full listing collection again.
    req.app.get('io').emit('listing-quantity-updated', {
      listingId: String(listing._id),
      quantity: listing.quantity,
    });

    res.status(201).json({ success: true, message: 'Food claimed successfully.', claim: {
      _id: claim._id, pickupToken: claim.pickupToken, pickupStart: listing.pickupStart,
      pickupEnd: listing.pickupEnd, pickupWindowStart: claim.pickupWindowStart,
      pickupWindowEnd: claim.pickupWindowEnd, tokenExpiresAt: claim.tokenExpiresAt,
      foodName: listing.foodName,
    } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyClaims = async (req, res) => {
  try {
    if (req.userRole !== 'consumer') return res.status(403).json({ success: false, message: 'Only consumers can view claims.' });
    const claims = await Claim.find({ consumerId: req.userId })
      .populate({ path: 'listingId', select: 'foodName image pickupStart pickupEnd expiryTime discountedPrice status merchantId', populate: { path: 'merchantId', select: 'shopName shopAddress city' } })
      .sort({ createdAt: -1 });
    const now = Date.now();
    await Promise.all(claims.map((claim) => {
      if (claim.status === 'claimed' && isExpired(timingForClaim(claim, claim.listingId), now)) {
        claim.status = 'expired';
        return claim.save().then(() => {
          req.app.get('io').to(`consumer:${claim.consumerId}`).emit('claim-updated', {
            claimId: String(claim._id),
            status: 'expired',
          });
        });
      }
      return null;
    }));
    res.json({ success: true, claims });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.expireClaim = async (req, res) => {
  try {
    if (req.userRole !== 'consumer') return res.status(403).json({ success: false, message: 'Only consumers can expire claims.' });
    const claim = await Claim.findOne({ _id: req.params.id, consumerId: req.userId }).populate('listingId', 'pickupStart pickupEnd expiryTime');
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });
    if (claim.status === 'claimed' && isExpired(timingForClaim(claim, claim.listingId))) {
      claim.status = 'expired';
      await claim.save();
      req.app.get('io').to(`consumer:${claim.consumerId}`).emit('claim-updated', { claimId: String(claim._id), status: 'expired' });
    }
    res.json({ success: true, status: claim.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyPickup = async (req, res) => {
  try {
    if (req.userRole !== 'merchant') return res.status(403).json({ success: false, message: 'Only merchants can verify pickups.' });
    const token = String(req.body.token || '').trim().toUpperCase();
    if (!token) return res.status(400).json({ success: false, message: 'A pickup token is required.' });

    const claim = await Claim.findOne({ pickupToken: token }).populate('consumerId', 'fullName');
    if (!claim) return res.status(404).json({ success: false, message: 'No claim was found for this token.' });

    const listing = await Listing.findById(claim.listingId);
    if (!listing || String(listing.merchantId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'This token does not belong to your business.' });
    }
    if (claim.status === 'collected') return res.status(409).json({ success: false, message: 'This pickup has already been collected.' });
    const timing = timingForClaim(claim, listing);
    if (isExpired(timing)) {
      if (claim.status === 'claimed') {
        claim.status = 'expired';
        await claim.save();
        req.app.get('io').to(`consumer:${claim.consumerId._id}`).emit('claim-updated', {
          claimId: String(claim._id),
          status: 'expired',
        });
      }
      return res.status(410).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'This pickup token has expired and can no longer be used.',
        expiryTime: timing.tokenExpiresAt || timing.pickupWindowEnd,
      });
    }
    if (timing.pickupWindowStart && timing.pickupWindowStart.getTime() > Date.now()) {
      return res.status(409).json({ success: false, code: 'PICKUP_NOT_STARTED', message: 'This pickup window has not started yet.' });
    }
    if (claim.status !== 'claimed') return res.status(409).json({ success: false, message: 'This claim is no longer active.' });

    claim.status = 'collected';
    claim.collectedAt = new Date();
    await claim.save();
    req.app.get('io').to(`consumer:${claim.consumerId._id}`).emit('claim-updated', {
      claimId: String(claim._id),
      status: 'collected',
      collectedAt: claim.collectedAt,
    });
    return res.json({ success: true, message: 'Pickup verified and marked as collected.', claim: { listingName: listing.foodName, customerName: claim.consumerId?.fullName || 'Customer' } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
