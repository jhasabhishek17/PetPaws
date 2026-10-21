const multer = require('multer');
const ExpressError = require('../utils/ExpressError');

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime'
]);

const MAX_IMAGE_SIZE_BYTES = Number(process.env.MAX_IMAGE_UPLOAD_MB || 10) * 1024 * 1024; // 10 MB default
const MAX_VIDEO_SIZE_BYTES = Number(process.env.MAX_VIDEO_UPLOAD_MB || 50) * 1024 * 1024; // 50 MB default
const MAX_UPLOAD_FILES = Number(process.env.MAX_UPLOAD_FILES || 6); // Up to 6 files per upload request

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (ALLOWED_IMAGE_TYPES.has(mime) || ALLOWED_VIDEO_TYPES.has(mime)) {
    return cb(null, true);
  }
  return cb(
    new ExpressError(
      'Unsupported file format. Allowed formats: JPG, PNG, WebP, GIF, AVIF (images) and MP4, WebM, MOV (videos).',
      400
    ),
    false
  );
};

const rawUpload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE_BYTES,
    files: MAX_UPLOAD_FILES
  },
  fileFilter
});

/**
 * Middleware that parses single or multiple media files ('file', 'files', or 'media')
 * when Content-Type is multipart/form-data, and validates type-specific size limits.
 * Non-multipart requests (e.g. application/json) pass through untouched.
 */
const handleMediaUpload = (req, res, next) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    req.uploadedFiles = [];
    return next();
  }

  const acceptFields = rawUpload.fields([
    { name: 'file', maxCount: MAX_UPLOAD_FILES },
    { name: 'files', maxCount: MAX_UPLOAD_FILES },
    { name: 'media', maxCount: MAX_UPLOAD_FILES }
  ]);

  acceptFields(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new ExpressError(
              `File is too large. Maximum allowed size is ${Math.round(MAX_VIDEO_SIZE_BYTES / (1024 * 1024))}MB for videos and ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB for images.`,
              400
            )
          );
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            new ExpressError(
              `Too many files selected. You can upload up to ${MAX_UPLOAD_FILES} files at a time.`,
              400
            )
          );
        }
        return next(new ExpressError(`Upload error: ${err.message}`, 400));
      }
      return next(err);
    }

    const fileMap = req.files || {};
    const collected = [
      ...(fileMap.file || []),
      ...(fileMap.files || []),
      ...(fileMap.media || [])
    ];

    if (collected.length > MAX_UPLOAD_FILES) {
      return next(
        new ExpressError(
          `Too many files selected. Maximum allowed is ${MAX_UPLOAD_FILES} files per upload.`,
          400
        )
      );
    }

    for (const file of collected) {
      const mime = (file.mimetype || '').toLowerCase();
      const isImage = ALLOWED_IMAGE_TYPES.has(mime);
      if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
        return next(
          new ExpressError(
            `Image "${file.originalname}" exceeds maximum size of ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.`,
            400
          )
        );
      }
    }

    req.uploadedFiles = collected;
    if (collected.length > 0 && !req.file) {
      req.file = collected[0];
    }

    next();
  });
};

module.exports = {
  handleMediaUpload,
  handleSingleMediaUpload: handleMediaUpload,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  MAX_UPLOAD_FILES
};
