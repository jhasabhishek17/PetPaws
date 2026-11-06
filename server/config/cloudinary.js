const path = require('path');
const dotenv = require('dotenv');

// Ensure server/.env is loaded before reading Cloudinary credentials, regardless of CWD.
const ENV_FILE_PATH = path.join(__dirname, '../.env');
dotenv.config({ path: ENV_FILE_PATH });

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

const sanitizeEnvValue = (val) => {
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/^['"]|['"]$/g, '').trim();
};

const isRealValue = (val) => {
  const cleaned = sanitizeEnvValue(val);
  if (!cleaned) return false;
  return !PLACEHOLDER_VALUES.has(cleaned.toLowerCase());
};

/**
 * Reads and normalizes CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.
 * If variables are missing in process.env (e.g., .env was updated while the dev server was running),
 * reloads server/.env once before checking.
 */
const getCloudinaryCredentials = () => {
  if (
    !isRealValue(process.env.CLOUDINARY_CLOUD_NAME) ||
    !isRealValue(process.env.CLOUDINARY_API_KEY) ||
    !isRealValue(process.env.CLOUDINARY_API_SECRET)
  ) {
    dotenv.config({ path: ENV_FILE_PATH });
  }

  const cloudName = sanitizeEnvValue(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = sanitizeEnvValue(process.env.CLOUDINARY_API_KEY);
  const apiSecret = sanitizeEnvValue(process.env.CLOUDINARY_API_SECRET);

  return {
    cloudName: isRealValue(cloudName) ? cloudName : '',
    apiKey: isRealValue(apiKey) ? apiKey : '',
    apiSecret: isRealValue(apiSecret) ? apiSecret : ''
  };
};

/**
 * Returns true when valid Cloudinary credentials are present in environment variables
 * (CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET, or CLOUDINARY_URL).
 */
const isCloudinaryConfigured = () => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
  if (cloudName && apiKey && apiSecret) {
    return true;
  }
  if (
    typeof process.env.CLOUDINARY_URL === 'string' &&
    sanitizeEnvValue(process.env.CLOUDINARY_URL).startsWith('cloudinary://')
  ) {
    return true;
  }
  return false;
};

/**
 * Configures the Cloudinary v2 SDK using environment variables.
 * Never logs or exposes secret values.
 */
const configureCloudinary = () => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return true;
  }

  if (
    typeof process.env.CLOUDINARY_URL === 'string' &&
    sanitizeEnvValue(process.env.CLOUDINARY_URL).startsWith('cloudinary://')
  ) {
    cloudinary.config({ secure: true });
    return true;
  }

  return false;
};

/**
 * Validates that Cloudinary is configured; throws a 503 ExpressError if credentials are missing.
 */
const assertCloudinaryConfigured = () => {
  if (!configureCloudinary()) {
    throw new ExpressError(
      'Cloudinary is not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      503
    );
  }
};

// Initialize Cloudinary configuration on module load if credentials are present.
configureCloudinary();

/**
 * Upload an in-memory file buffer to Cloudinary via upload_stream.
 */
const uploadBufferToCloudinary = (buffer, options = {}) => {
  assertCloudinaryConfigured();

  const baseFolder = (sanitizeEnvValue(process.env.CLOUDINARY_FOLDER) || 'petpaws').replace(/\/$/, '');
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
  assertCloudinaryConfigured,
  uploadBufferToCloudinary,
  deleteFromCloudinary
};
