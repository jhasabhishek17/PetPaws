const { v2: cloudinary } = require('cloudinary');
const ExpressError = require('../utils/ExpressError');

// Placeholder text from the example env file; these count as "not configured".
const PLACEHOLDER_VALUES = new Set([
  '',
  'your_cloud_name',
  'your_cloudinary_cloud_name',
  'your_api_key',
  'your_cloudinary_api_key',
  'your_api_secret',
  'your_cloudinary_api_secret'
]);

const isRealValue = (val) => {
  if (!val || typeof val !== 'string') return false;
  return !PLACEHOLDER_VALUES.has(val.trim().toLowerCase());
};

/**
 * Returns true when valid Cloudinary credentials are present in environment variables
 * (supports either CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET).
 */
const isCloudinaryConfigured = () => {
  if (
    typeof process.env.CLOUDINARY_URL === 'string' &&
    process.env.CLOUDINARY_URL.trim().startsWith('cloudinary://')
  ) {
    return true;
  }
  return (
    isRealValue(process.env.CLOUDINARY_CLOUD_NAME) &&
    isRealValue(process.env.CLOUDINARY_API_KEY) &&
    isRealValue(process.env.CLOUDINARY_API_SECRET)
  );
};

const configureCloudinary = () => {
  if (!isCloudinaryConfigured()) return false;
  if (
    typeof process.env.CLOUDINARY_URL === 'string' &&
    process.env.CLOUDINARY_URL.trim().startsWith('cloudinary://')
  ) {
    cloudinary.config({ secure: true });
    return true;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    secure: true
  });
  return true;
};

/**
 * Upload an in-memory file buffer to Cloudinary via upload_stream.
 */
const uploadBufferToCloudinary = (buffer, options = {}) => {
  if (!configureCloudinary()) {
    throw new ExpressError(
      'Cloudinary media storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server.',
      503
    );
  }

  const baseFolder = (process.env.CLOUDINARY_FOLDER || 'petpaws').replace(/\/$/, '');
  const subFolder = options.subFolder || 'pets';

  // Options passed in by the caller (resource_type, tags...) are spread last, so they override the defaults.
  // subFolder is only used to build 'folder', so it is deleted before the options go to Cloudinary.
  const uploadOptions = {
    folder: `${baseFolder}/${subFolder}`,
    resource_type: options.resource_type || 'auto',
    ...options
  };
  delete uploadOptions.subFolder;

  // upload_stream works with a callback, so wrap it in a Promise to let callers use await.
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(new ExpressError(error.message || 'Cloudinary upload failed', 502));
      }
      resolve(result);
    });
    stream.end(buffer);
  });
};

/**
 * Safely delete an asset from Cloudinary by public_id and resource_type ('image' | 'video').
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId || typeof publicId !== 'string') return { result: 'skipped' };
  if (!configureCloudinary()) return { result: 'unconfigured' };

  const normalizedType = resourceType === 'video' ? 'video' : 'image';
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: normalizedType,
      invalidate: true
    });
  } catch (err) {
    console.warn(`⚠️ Failed to delete Cloudinary asset (${publicId}): ${err.message}`);
    return { result: 'error', error: err.message };
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  configureCloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary
};
