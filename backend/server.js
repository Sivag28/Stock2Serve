// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const { timingForClaim, isExpired } = require('./utils/claimTiming');
const { notifyPickupReminder } = require('./utils/notifications');

dotenv.config();

// Allow only this frontend during local development plus the exact deployed
// frontend URLs configured in CORS_ORIGINS (comma-separated).
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (for example health checks or curl)
    // are not browser CORS requests and can continue normally.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// Controllers use this shared instance to notify every open consumer feed.
app.set('io', io);

io.on('connection', (socket) => {
  // A connected browser can be hidden in the background. The client updates
  // this flag on visibility changes so FCM is still used for hidden tabs.
  socket.data.isForeground = socket.handshake.auth?.foreground === true;
  socket.on('app-visibility', ({ foreground } = {}) => {
    socket.data.isForeground = foreground === true;
  });
  console.log(`Realtime client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Realtime client disconnected: ${socket.id}`));
});

// A socket is placed in a private room for its signed-in user. This lets us
// update a claim without revealing it to any other consumer.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    return next();
  } catch (error) {
    return next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`consumer:${socket.userId}`);
  socket.join(`merchant:${socket.userId}`);
});

// Middleware
// Keep backend-hosted profile and listing images loadable by the separate
// frontend origin while Helmet applies the remaining security headers.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/merchant', require('./routes/merchantRoutes'));
app.use('/api/listings', require('./routes/listingRoutes'));
app.use('/api/claims', require('./routes/claimRoutes'));
// Add other routes as needed

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// Database connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stock2serve')
  .then(() => {
    console.log('Connected to MongoDB');

    // Existing accounts predate the GeoJSON location field. Backfill it from
    // their stored coordinates so both nearby listings and nearby FCM alerts
    // use the same 10 km location rule.
    const User = require('./models/User');
    User.updateMany(
      {
        location: { $exists: false },
        latitude: { $gte: -90, $lte: 90 },
        longitude: { $gte: -180, $lte: 180 },
      },
      [{
        $set: {
          location: {
            type: 'Point',
            coordinates: ['$longitude', '$latitude'],
          },
        },
      }],
      { updatePipeline: true },
    ).catch((error) => console.error('Merchant location backfill failed:', error));

    // Claims expire even if the consumer leaves the My Claims page open.
    // Each affected consumer receives a private status update immediately.
    const expireClaims = async () => {
      const Claim = require('./models/Claim');
      const expiredCandidates = await Claim.find({ status: 'claimed' })
        .populate('listingId', 'pickupStart pickupEnd expiryTime merchantId');
      const now = Date.now();
      await Promise.all(expiredCandidates.map(async (claim) => {
        if (isExpired(timingForClaim(claim, claim.listingId), now)) {
          claim.status = 'expired';
          await claim.save();
          io.to(`consumer:${claim.consumerId}`).emit('claim-updated', {
            claimId: String(claim._id),
            status: 'expired',
          });
          io.to(`merchant:${claim.listingId.merchantId}`).emit('merchant-claim-updated', {
            claimId: String(claim._id),
            status: 'expired',
          });
        }
      }));
    };

    const sendPickupReminders = async () => {
      const Claim = require('./models/Claim');
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + (30 * 60 * 1000));
      const candidates = await Claim.find({
        status: 'claimed',
        pickupReminderSentAt: null,
        tokenExpiresAt: { $gt: now, $lte: thirtyMinutesFromNow },
      }).select('_id consumerId');

      await Promise.all(candidates.map(async (claim) => {
        if (await notifyPickupReminder(io, claim)) {
          claim.pickupReminderSentAt = new Date();
          await claim.save();
        }
      }));
    };
    expireClaims().catch((error) => console.error('Claim expiry check failed:', error));
    sendPickupReminders().catch((error) => console.error('Pickup reminder check failed:', error));
    setInterval(() => expireClaims().catch((error) => console.error('Claim expiry check failed:', error)), 30 * 1000);
    setInterval(() => sendPickupReminders().catch((error) => console.error('Pickup reminder check failed:', error)), 30 * 1000);
  })
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
