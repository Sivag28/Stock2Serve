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

// Both pickup reminders and nearby-listing alerts use the same delivery rule:
// Socket.IO for an open app and FCM for a background or closed app.
const deliverConsumerNotification = async (io, consumers, notification, foregroundEvent) => {
  const recipients = consumers.map((consumer) => ({
    ...consumer,
    isForeground: userHasForegroundSocket(io, consumer._id),
  }));
  const foregroundConsumers = recipients.filter((consumer) => consumer.isForeground);
  foregroundConsumers.forEach((consumer) => {
    io.to(`consumer:${consumer._id}`).emit(foregroundEvent, notification);
  });

  const tokens = recipients
    .filter((consumer) => !consumer.isForeground)
    .flatMap((consumer) => consumer.fcmTokens || []);
  console.log('Consumer notification recipients:', {
    type: notification.type,
    matchedConsumers: recipients.length,
    foregroundConsumers: foregroundConsumers.length,
    backgroundTokens: tokens.length,
  });

  const result = await sendPushNotifications(tokens, notification);
  await removeInvalidTokens(result.invalidTokens);
  return { ...result, foregroundCount: foregroundConsumers.length };
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

  await deliverConsumerNotification(io, nearbyConsumers, {
    title: 'New Food Available',
    body: 'A nearby merchant has added fresh surplus food. Go and view nearby offers.',
    type: 'new-food',
    ...notification,
    link: '/consumer/feed',
    listingId: String(listing._id),
  }, 'nearby-listing');
};

const notifyPickupReminder = async (io, claim) => {
  const consumer = await User.findById(claim.consumerId).select('_id fcmTokens').lean();
  if (!consumer) return false;

  const result = await deliverConsumerNotification(io, [consumer], {
    title: 'Pickup Reminder',
    body: 'Your pickup token expires in 30 minutes. Collect your food before it expires.',
    type: 'pickup-reminder',
    link: '/consumer/claims',
    claimId: String(claim._id),
  }, 'pickup-reminder');
  return result.foregroundCount > 0 || result.sentCount > 0;
};

module.exports = { notifyNearbyConsumersAboutListing, notifyPickupReminder };
