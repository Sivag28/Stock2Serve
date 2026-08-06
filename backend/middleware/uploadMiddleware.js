// backend/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  // Keep the upload in memory only while it is sent to Cloudinary. This avoids
  // creating files on Render's ephemeral local disk.
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

module.exports = upload;
