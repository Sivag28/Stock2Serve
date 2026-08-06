const User = require('../models/User');
const { sendPushNotifications } = require('./firebaseAdmin');

const NEARBY_RADIUS_METERS = 10 * 1000;
const EARTH_RADIUS_METERS = 6378137;

const userHasForegroundSocket = (io, userId) => {
  const socketIds = io.sockets.adapter.rooms.get(`consumer:${userId}`);
  return [...(socketIds || [])].some((socketId) => io.sockets.sockets.get(socketId)?.data?.isForeground);
};

const removeInvalidTokens = async (invalidTokens) => {
  if (invalidTokens.length) await User.updateMany({}, { $pull: { fcmTokens: { $in: invalidTokens } } });
};

const notifyNearbyConsumersAboutListing = async (io, listing, notification = {}) => {
  const longitude = Number(listing.merchantId?.longitude);
  const latitude = Number(listing.merchantId?.latitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  const nearbyConsumers = await User.find({
    role: 'consumer',
    location: {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], NEARBY_RADIUS_METERS / EARTH_RADIUS_METERS],
      },
    },
  }).select('_id fcmTokens').lean();

  const recipients = nearbyConsumers.map((consumer) => ({
    ...consumer,
    isForeground: userHasForegroundSocket(io, consumer._id),
  }));
  const foregroundConsumers = recipients.filter((consumer) => consumer.isForeground);
  foregroundConsumers.forEach((consumer) => {
    io.to(`consumer:${consumer._id}`).emit('nearby-listing', {
      title: notification.title || '🍽️ New Food Available',
      body: notification.body || 'A nearby merchant has added fresh surplus food. Go and view nearby offers.',
      type: notification.type || 'new-food',
      link: '/consumer/feed',
      listingId: String(listing._id),
    });
  });

  const tokens = recipients
    .filter((consumer) => !consumer.isForeground)
    .flatMap((consumer) => consumer.fcmTokens || []);
  console.log('Nearby listing notification recipients:', {
    nearbyConsumers: recipients.length,
    foregroundConsumers: foregroundConsumers.length,
    backgroundTokens: tokens.length,
  });
  const result = await sendPushNotifications(tokens, {
    title: '🍽️ New Food Available',
    body: 'A nearby merchant has added fresh surplus food. Go and view nearby offers.',
    type: 'new-food',
    ...notification,
    link: '/consumer/feed',
    listingId: listing._id,
  });
  await removeInvalidTokens(result.invalidTokens);
};

const notifyPickupReminder = async (io, claim) => {
  const consumer = await User.findById(claim.consumerId).select('_id fcmTokens').lean();
  if (!consumer) return false;

  if (userHasForegroundSocket(io, consumer._id)) {
    io.to(`consumer:${consumer._id}`).emit('pickup-reminder', { claimId: String(claim._id) });
    return true;
  }

  const result = await sendPushNotifications(consumer.fcmTokens, {
    title: '⏰ Pickup Reminder',
    body: 'Your pickup token expires in 30 minutes. Collect your food before it expires.',
    type: 'pickup-reminder',
    link: '/consumer/claims',
    claimId: claim._id,
  });
  await removeInvalidTokens(result.invalidTokens);
  return result.sentCount > 0;
};

module.exports = { notifyNearbyConsumersAboutListing, notifyPickupReminder };
