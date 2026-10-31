const mongoose = require('mongoose');
const Pet = require('../models/Pet');
const Product = require('../models/Product');
const VetProfile = require('../models/VetProfile');
const { loadData, saveData, isMongoConnected } = require('../db');
const { findDocByAnyId } = require('../utils/dbHelpers');
const ExpressError = require('../utils/ExpressError');
const {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  deleteFromCloudinary
} = require('../config/cloudinary');
const { ALLOWED_VIDEO_TYPES } = require('../middleware/uploadMiddleware');

/**
 * Check if a Cloudinary public_id is still referenced by any other pet listing or vet profile.
 * Prevents deleting a Cloudinary asset that is shared/used elsewhere.
 */
const isPublicIdUsedElsewhere = async (publicId, { excludePetId = null, excludeVetId = null } = {}) => {
  if (!publicId || typeof publicId !== 'string') return false;

  if (isMongoConnected()) {
    const petQuery = {
      $or: [
        { image_public_id: publicId },
        { video_public_id: publicId },
        { 'media.public_id': publicId }
      ]
    };
    // Leave out the pet being edited/deleted, otherwise its own reference would always count as "in use".
    if (excludePetId) {
      petQuery.custom_id = { $ne: String(excludePetId) };
      if (mongoose.Types.ObjectId.isValid(excludePetId)) {
        petQuery._id = { $ne: excludePetId };
      }
    }
    const otherPet = await Pet.findOne(petQuery);
    if (otherPet) {
      return true;
    }

    const vetQuery = { image_public_id: publicId };
    if (excludeVetId) {
      vetQuery.custom_id = { $ne: String(excludeVetId) };
      if (mongoose.Types.ObjectId.isValid(excludeVetId)) {
        vetQuery._id = { $ne: excludeVetId };
      }
    }
    const otherVet = await VetProfile.findOne(vetQuery);
    if (otherVet) {
      return true;
    }

    const otherProduct = await Product.findOne({
      $or: [
        { image_public_id: publicId },
        { 'media.public_id': publicId }
      ]
    });
    if (otherProduct) {
      return true;
    }
    return false;
  }

  if (process.env.NODE_ENV !== 'production') {
    const db = loadData();
    const otherPet = (db.pets || []).find(
      (p) =>
        p.id !== excludePetId &&
        p.custom_id !== excludePetId &&
        (p.image_public_id === publicId ||
          p.video_public_id === publicId ||
          (Array.isArray(p.media) && p.media.some((m) => m.public_id === publicId)))
    );
    if (otherPet) return true;

    const otherVet = (db.vet_profiles || []).find(
      (v) => v.id !== excludeVetId && v.image_public_id === publicId
    );
    if (otherVet) return true;
  }

  return false;
};

/**
 * Helper to verify that a public_id either belongs to a pet/profile owned by userId
 * or is an unattached upload in the petpaws folder.
 */
const verifyPublicIdOwnership = async (publicId, userId) => {
  if (!publicId || typeof publicId !== 'string') return false;
  const baseFolder = (process.env.CLOUDINARY_FOLDER || 'petpaws').replace(/\/$/, '');
  // Only touch assets inside our own Cloudinary folder, so a request can't target unrelated files.
  if (!publicId.startsWith(`${baseFolder}/`)) {
    throw new ExpressError('Invalid media identifier', 403);
  }

  if (isMongoConnected()) {
    // The same asset can be linked to more than one pet; if any of them belongs to another seller, refuse.
    const linkedPets = await Pet.find({
      $or: [
        { image_public_id: publicId },
        { video_public_id: publicId },
        { 'media.public_id': publicId }
      ]
    });
    const unauthorizedPet = linkedPets.find((p) => p.seller_id !== userId);
    if (unauthorizedPet) {
      throw new ExpressError("Not authorized to modify media for another seller's listing", 403);
    }

    const linkedVet = await VetProfile.findOne({ image_public_id: publicId });
    if (linkedVet && linkedVet.user_id !== userId && linkedVet.custom_id !== userId) {
      throw new ExpressError("Not authorized to modify another veterinarian's profile media", 403);
    }

    const linkedProducts = await Product.find({
      $or: [
        { image_public_id: publicId },
        { 'media.public_id': publicId }
      ]
    });
    const unauthorizedProduct = linkedProducts.find((p) => p.seller_id !== userId);
    if (unauthorizedProduct) {
      throw new ExpressError("Not authorized to modify media for another vendor's product", 403);
    }
  } else if (process.env.NODE_ENV !== 'production') {
    const db = loadData();
    const linkedPets = (db.pets || []).filter(
      (p) =>
        p.image_public_id === publicId ||
        p.video_public_id === publicId ||
        (Array.isArray(p.media) && p.media.some((m) => m.public_id === publicId))
    );
    const unauthorizedPet = linkedPets.find((p) => p.seller_id !== userId);
    if (unauthorizedPet) {
      throw new ExpressError("Not authorized to modify media for another seller's listing", 403);
    }
  }

  return true;
};

/**
 * Helper to verify that a public_id either belongs to a pet/profile owned by userId
 * or is an unattached upload in the petpaws folder, and safely delete it if not used elsewhere.
 */
const verifyAndCleanupPublicId = async (
  publicId,
  resourceType,
  userId,
  { excludePetId = null, excludeVetId = null } = {}
) => {
  if (!publicId || typeof publicId !== 'string') return false;
  await verifyPublicIdOwnership(publicId, userId);

  const usedElsewhere = await isPublicIdUsedElsewhere(publicId, { excludePetId, excludeVetId });
  if (!usedElsewhere) {
    await deleteFromCloudinary(publicId, resourceType);
  }
  return true;
};

/**
 * Upload an array of Multer file objects to Cloudinary with automatic rollback if any file in the batch fails.
 */
const uploadFilesBatchToCloudinary = async (files, { context = 'pets', user }) => {
  const uploadedItems = [];
  try {
    for (const file of files) {
      const mime = (file.mimetype || '').toLowerCase();
      const isVideo = ALLOWED_VIDEO_TYPES.has(mime);
      const resourceType = isVideo ? 'video' : 'image';

      const result = await uploadBufferToCloudinary(file.buffer, {
        subFolder: context,
        resource_type: resourceType,
        tags: [`user:${user?.id || 'anonymous'}`, `role:${user?.role || 'user'}`]
      });

      uploadedItems.push({
        url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type || resourceType,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration || null,
        original_name: file.originalname
      });
    }
    return uploadedItems;
  } catch (err) {
    // Roll back any already-uploaded files in this batch to avoid orphan assets
    for (const item of uploadedItems) {
      await deleteFromCloudinary(item.public_id, item.resource_type);
    }
    throw err;
  }
};

/**
 * POST /api/upload
 * Uploads one or multiple image/video files to Cloudinary.
 * Requires authentication (seller for pet listings, or vet for profile photo).
 */
const uploadMedia = async (req, res) => {
  const files =
    Array.isArray(req.uploadedFiles) && req.uploadedFiles.length > 0
      ? req.uploadedFiles
      : req.file
      ? [req.file]
      : [];

  if (files.length === 0) {
    throw new ExpressError('Please select at least one image or video file to upload.', 400);
  }

  // 'context' decides the Cloudinary subfolder: vet profile photos, product media, or pet listing media.
  const rawContext = String(req.body?.context || '').trim().toLowerCase();
  const context =
    rawContext === 'profile' || rawContext === 'profiles'
      ? 'profiles'
      : rawContext === 'product' || rawContext === 'products'
      ? 'products'
      : 'pets';

  // Enforce role-based upload permissions per media context.
  if (context === 'pets' && !['seller', 'admin'].includes(req.user?.role)) {
    throw new ExpressError('Only authenticated seller accounts can upload pet listing media.', 403);
  }
  if (context === 'products' && !['seller', 'shopkeeper', 'admin'].includes(req.user?.role)) {
    throw new ExpressError('Only authenticated shopkeeper or seller accounts can upload product media.', 403);
  }
  if (context === 'profiles' && !['vet', 'admin'].includes(req.user?.role)) {
    throw new ExpressError('Only authenticated veterinarian accounts can upload profile photos.', 403);
  }

  if (!isCloudinaryConfigured()) {
    throw new ExpressError(
      'Cloudinary is not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      503
    );
  }

  // When replacing a photo, the client sends the old asset's id. Verify ownership BEFORE
  // uploading new files so unauthorized requests never leave orphaned uploads in Cloudinary.
  const oldPublicId = typeof req.body?.old_public_id === 'string' ? req.body.old_public_id.trim() : '';
  const oldResourceType = req.body?.old_resource_type === 'video' ? 'video' : 'image';

  if (oldPublicId) {
    await verifyPublicIdOwnership(oldPublicId, req.user.id);
  }

  const uploadedItems = await uploadFilesBatchToCloudinary(files, {
    context,
    user: req.user
  });

  const primary = uploadedItems[0];

  if (oldPublicId && oldPublicId !== primary.public_id) {
    try {
      await verifyAndCleanupPublicId(oldPublicId, oldResourceType, req.user.id);
    } catch (cleanupErr) {
      console.warn('Warning: failed to clean up previous Cloudinary asset:', cleanupErr.message);
    }
  }

  return res.status(201).json({
    success: true,
    url: primary.url,
    public_id: primary.public_id,
    resource_type: primary.resource_type,
    format: primary.format,
    bytes: primary.bytes,
    width: primary.width,
    height: primary.height,
    duration: primary.duration,
    files: uploadedItems
  });
};

/**
 * DELETE /api/upload
 * Deletes an uploaded image or video from Cloudinary and optionally detaches it from a pet listing.
 */
const deleteMedia = async (req, res) => {
  const { public_id, resource_type = 'image', pet_id } = req.body || {};
  if (!public_id || typeof public_id !== 'string') {
    throw new ExpressError('public_id is required to delete media', 400);
  }

  const trimmedId = public_id.trim();

  // If a pet_id was provided, first verify ownership and detach the asset from the pet record
  if (pet_id) {
    const fallbackPlaceholder = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';
    if (isMongoConnected()) {
      const pet = await findDocByAnyId(Pet, pet_id);
      if (pet) {
        if (pet.seller_id !== req.user.id) {
          throw new ExpressError('Not authorized to modify this listing', 403);
        }
        if (Array.isArray(pet.media)) {
          pet.media = pet.media.filter((m) => m.public_id !== trimmedId);
        }
        if (pet.image_public_id === trimmedId) {
          const nextImage = (pet.media || []).find((m) => m.resource_type === 'image');
          pet.image_public_id = nextImage ? nextImage.public_id : '';
          pet.image_url = nextImage ? nextImage.url : fallbackPlaceholder;
        }
        if (pet.video_public_id === trimmedId) {
          const nextVideo = (pet.media || []).find((m) => m.resource_type === 'video');
          pet.video_public_id = nextVideo ? nextVideo.public_id : '';
          pet.video_url = nextVideo ? nextVideo.url : '';
          if (!nextVideo && pet.media_type === 'video') pet.media_type = 'image';
        }
        await pet.save();
      }
    } else {
      const db = loadData();
      const idx = (db.pets || []).findIndex((p) => p.id === pet_id || p.custom_id === pet_id);
      if (idx !== -1) {
        const pet = db.pets[idx];
        if (pet.seller_id !== req.user.id) {
          throw new ExpressError('Not authorized to modify this listing', 403);
        }
        if (Array.isArray(pet.media)) {
          pet.media = pet.media.filter((m) => m.public_id !== trimmedId);
        }
        if (pet.image_public_id === trimmedId) {
          const nextImage = (pet.media || []).find((m) => m.resource_type === 'image');
          pet.image_public_id = nextImage ? nextImage.public_id : '';
          pet.image_url = nextImage ? nextImage.url : fallbackPlaceholder;
        }
        if (pet.video_public_id === trimmedId) {
          const nextVideo = (pet.media || []).find((m) => m.resource_type === 'video');
          pet.video_public_id = nextVideo ? nextVideo.public_id : '';
          pet.video_url = nextVideo ? nextVideo.url : '';
          if (!nextVideo && pet.media_type === 'video') pet.media_type = 'image';
        }
        saveData(db);
      }
    }
  }

  // Remove the file from Cloudinary only if no other listing still references it.
  await verifyAndCleanupPublicId(trimmedId, resource_type, req.user.id, {
    excludePetId: pet_id || null
  });

  return res.json({
    success: true,
    message: 'Media removed successfully'
  });
};

module.exports = {
  uploadMedia,
  deleteMedia,
  verifyAndCleanupPublicId,
  isPublicIdUsedElsewhere,
  uploadFilesBatchToCloudinary
};
