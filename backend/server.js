// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
});

// Controllers use this shared instance to notify every open consumer feed.
app.set('io', io);

io.on('connection', (socket) => {
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
});

// Middleware
app.use(cors());
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

    // Claims expire even if the consumer leaves the My Claims page open.
    // Each affected consumer receives a private status update immediately.
    const expireClaims = async () => {
      const Claim = require('./models/Claim');
      const expiredCandidates = await Claim.find({ status: 'claimed' })
        .populate('listingId', 'expiryTime');
      const now = Date.now();
      await Promise.all(expiredCandidates.map(async (claim) => {
        if (claim.listingId?.expiryTime?.getTime() <= now) {
          claim.status = 'expired';
          await claim.save();
          io.to(`consumer:${claim.consumerId}`).emit('claim-updated', {
            claimId: String(claim._id),
            status: 'expired',
          });
        }
      }));
    };
    expireClaims().catch((error) => console.error('Claim expiry check failed:', error));
    setInterval(() => expireClaims().catch((error) => console.error('Claim expiry check failed:', error)), 30 * 1000);
  })
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
