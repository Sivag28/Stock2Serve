const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadImage = (buffer, folder) => new Promise((resolve, reject) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return reject(new Error('Cloudinary credentials are not configured.'));
  }

  const uploadStream = cloudinary.uploader.upload_stream(
    { folder, resource_type: 'image' },
    (error, result) => (error ? reject(error) : resolve(result)),
  );
  uploadStream.end(buffer);
});

const deleteImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
};

module.exports = { uploadImage, deleteImage };
