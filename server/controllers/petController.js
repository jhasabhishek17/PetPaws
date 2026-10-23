/**
 * Pet Marketplace Controller
 * 
 * Manages pet listings, filtering by category/search, detail retrieval, creation, updates, and deletion.
 * Supports dual persistence: Mongoose (MongoDB) & JSON file fallback (dev only),
 * plus single/multi-image and video uploads via Cloudinary.
 */

const Pet = require('../models/Pet');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId } = require('../utils/dbHelpers');
const { deleteFromCloudinary } = require('../config/cloudinary');
const {
  isPublicIdUsedElsewhere,
  uploadFilesBatchToCloudinary
} = require('./uploadController');
const ExpressError = require('../utils/ExpressError');

const DEFAULT_PET_IMAGE = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';

const ALLOWED_PET_FIELDS = [
  'title', 'category', 'price', 'age', 'breed', 'gender',
  'health_status', 'description', 'image_url', 'image_public_id',
  'video_url', 'video_public_id', 'media_type', 'media',
  'stock', 'status'
];

/**
 * Parse media input (which may be a JSON string when submitted via multipart/form-data or an array)
 */
const parseMediaInput = (rawMedia) => {
  if (!rawMedia) return [];
  let list = rawMedia;
  if (typeof rawMedia === 'string') {
    try {
      list = JSON.parse(rawMedia);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const seenUrls = new Set();
  const normalized = [];
  for (const m of list) {
    if (!m || typeof m.url !== 'string' || !m.url.trim()) continue;
    const url = m.url.trim();
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    normalized.push({
      url,
      public_id: typeof m.public_id === 'string' ? m.public_id.trim() : '',
      resource_type: m.resource_type === 'video' ? 'video' : 'image'
    });
  }
  return normalized;
};

/**
 * Synchronize structured media array with top-level image_url, image_public_id, video_url, video_public_id, media_type
 */
const resolvePetMediaFields = ({
  image_url,
  image_public_id,
  video_url,
  video_public_id,
  media_type,
  media,
  directUploads = []
}) => {
  let mediaItems = parseMediaInput(media);

  // Append any files uploaded directly via multipart/form-data on this request
  for (const up of directUploads) {
    if (up && up.url && !mediaItems.some((m) => m.url === up.url)) {
      mediaItems.push({
        url: up.url,
        public_id: up.public_id || '',
        resource_type: up.resource_type === 'video' ? 'video' : 'image'
      });
    }
  }

  // Ensure explicit top-level image_url / video_url are represented in mediaItems
  const trimmedImg = typeof image_url === 'string' ? image_url.trim() : '';
  const trimmedImgId = typeof image_public_id === 'string' ? image_public_id.trim() : '';
  const trimmedVid = typeof video_url === 'string' ? video_url.trim() : '';
  const trimmedVidId = typeof video_public_id === 'string' ? video_public_id.trim() : '';

  if (trimmedImg && !mediaItems.some((m) => m.url === trimmedImg)) {
    mediaItems.unshift({
      url: trimmedImg,
      public_id: trimmedImgId,
      resource_type: 'image'
    });
  }

  if (trimmedVid && !mediaItems.some((m) => m.url === trimmedVid)) {
    mediaItems.push({
      url: trimmedVid,
      public_id: trimmedVidId,
      resource_type: 'video'
    });
  }

  const firstImage = mediaItems.find((m) => m.resource_type === 'image');
  const firstVideo = mediaItems.find((m) => m.resource_type === 'video');

  const resolvedImageUrl = trimmedImg || (firstImage ? firstImage.url : DEFAULT_PET_IMAGE);
  const resolvedImagePublicId = trimmedImgId || (firstImage ? firstImage.public_id : '');
  const resolvedVideoUrl = trimmedVid || (firstVideo ? firstVideo.url : '');
  const resolvedVideoPublicId = trimmedVidId || (firstVideo ? firstVideo.public_id : '');

  // Ensure default image is in mediaItems if mediaItems has no image at all
  if (!mediaItems.some((m) => m.resource_type === 'image') && resolvedImageUrl) {
    mediaItems.unshift({
      url: resolvedImageUrl,
      public_id: resolvedImagePublicId,
      resource_type: 'image'
    });
  }

  // Treated as a video listing if the client says so, or if there is a video but no image at all.
  const resolvedMediaType =
    media_type === 'video' || (resolvedVideoUrl && !trimmedImg && !firstImage) ? 'video' : 'image';

  return {
    image_url: resolvedImageUrl,
    image_public_id: resolvedImagePublicId,
    video_url: resolvedVideoUrl,
    video_public_id: resolvedVideoPublicId,
    media_type: resolvedMediaType,
    media: mediaItems
  };
};

/**
 * Collect map of public_id -> resource_type from a pet record
 */
const collectPublicIdsMap = (pet) => {
  const map = new Map();
  if (!pet) return map;
  if (pet.image_public_id) map.set(pet.image_public_id, 'image');
  if (pet.video_public_id) map.set(pet.video_public_id, 'video');
  if (Array.isArray(pet.media)) {
    for (const item of pet.media) {
      if (item?.public_id) {
        map.set(item.public_id, item.resource_type === 'video' ? 'video' : 'image');
      }
    }
  }
  return map;
};

/**
 * Clean up all Cloudinary assets attached to a pet record that are not referenced elsewhere
 */
const cleanupPetMedia = async (pet) => {
  if (!pet) return;
  // A pet can be identified by custom_id, id (JSON fallback) or the Mongo _id, depending on where the record came from.
  const excludePetId = pet.custom_id || pet.id || (pet._id ? String(pet._id) : null);
  const assetMap = collectPublicIdsMap(pet);
  for (const [publicId, resourceType] of assetMap.entries()) {
    const usedElsewhere = await isPublicIdUsedElsewhere(publicId, { excludePetId });
    if (!usedElsewhere) {
      await deleteFromCloudinary(publicId, resourceType);
    }
  }
};

/**
 * Clean up any Cloudinary assets that were removed when updating a pet record
 */
const cleanupRemovedPetMedia = async (oldPet, newMediaFields) => {
  if (!oldPet) return;
  const excludePetId = oldPet.custom_id || oldPet.id || (oldPet._id ? String(oldPet._id) : null);
  const oldAssets = collectPublicIdsMap(oldPet);
  const newAssets = collectPublicIdsMap(newMediaFields);

  for (const [publicId, resourceType] of oldAssets.entries()) {
    // Only assets dropped by this update are candidates for deletion.
    if (!newAssets.has(publicId)) {
      const usedElsewhere = await isPublicIdUsedElsewhere(publicId, { excludePetId });
      if (!usedElsewhere) {
        await deleteFromCloudinary(publicId, resourceType);
      }
    }
  }
};

/**
 * Get list of pet listings with optional category, search, or seller filter
 * GET /api/pets
 */
const getPets = async (req, res) => {
  const { category, search, sellerId } = req.query;

  if (sellerId !== undefined) {
    if (!req.user) {
      throw new ExpressError('Authentication required to access seller inventory', 401);
    }
    if (req.user.role !== 'seller' || req.user.id !== sellerId) {
      throw new ExpressError('Access denied: you can only view your own seller inventory', 403);
    }
  }

  // MongoDB Branch
  if (isMongoConnected()) {
    let query = {};
    if (sellerId) {
      query.seller_id = req.user.id;
    } else {
      query.status = 'active';
      query.stock = { $gt: 0 };
    }

    if (category && category !== 'All') {
      query.category = new RegExp(`^${category}$`, 'i');
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { title: searchRegex },
        { breed: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
        { seller_name: searchRegex }
      ];
    }

    const pets = await Pet.find(query).sort({ createdAt: -1 });
    const normalizedPets = pets.map(normalizeItem);
    return res.json({ success: true, count: normalizedPets.length, pets: normalizedPets });
  }

  // Fallback JSON File Branch
  const db = loadData();
  let pets = db.pets;

  if (sellerId) {
    pets = pets.filter(p => p.seller_id === req.user.id);
  } else {
    pets = pets.filter(p => p.status === 'active' && p.stock > 0);
  }

  if (category && category !== 'All') {
    pets = pets.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    pets = pets.filter(p => 
      (p.title && p.title.toLowerCase().includes(q)) || 
      (p.breed && p.breed.toLowerCase().includes(q)) || 
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.seller_name && p.seller_name.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, count: pets.length, pets });
};

/**
 * Get authenticated seller's own inventory listings
 * GET /api/pets/seller/inventory
 */
const getSellerInventory = async (req, res) => {
  if (!req.user || req.user.role !== 'seller') {
    throw new ExpressError('Only authenticated seller accounts can access seller inventory', 403);
  }
  const sellerId = req.user.id;

  if (isMongoConnected()) {
    const pets = await Pet.find({ seller_id: sellerId }).sort({ createdAt: -1 });
    const normalizedPets = pets.map(normalizeItem);
    return res.json({ success: true, count: normalizedPets.length, pets: normalizedPets });
  }

  const db = loadData();
  const pets = db.pets.filter(p => p.seller_id === sellerId);
  res.json({ success: true, count: pets.length, pets });
};

/**
 * Get a single pet listing by ID
 * GET /api/pets/:id
 */
const getPetById = async (req, res) => {
  const { id } = req.params;

  if (isMongoConnected()) {
    const pet = await findDocByAnyId(Pet, id);
    if (!pet) throw new ExpressError('Pet listing not found', 404);
    return res.json({ success: true, pet: normalizeItem(pet) });
  }

  const db = loadData();
  const pet = db.pets.find(p => p.id === id);
  if (!pet) throw new ExpressError('Pet listing not found', 404);
  res.json({ success: true, pet });
};

/**
 * Create a new pet listing (Seller Only)
 * POST /api/pets
 */
const createPet = async (req, res) => {
  if (!req.user || req.user.role !== 'seller') {
    throw new ExpressError('Only authenticated seller accounts can create pet listings', 403);
  }

  const {
    title,
    category,
    price,
    age,
    breed,
    gender,
    health_status,
    description,
    image_url,
    image_public_id,
    video_url,
    video_public_id,
    media_type,
    media,
    stock
  } = req.body;

  if (!title || price === undefined || price === '') {
    throw new ExpressError('Pet title and price are required', 400);
  }

  // If multipart files were attached directly to POST /api/pets, upload them first
  let directUploads = [];
  if (Array.isArray(req.uploadedFiles) && req.uploadedFiles.length > 0) {
    directUploads = await uploadFilesBatchToCloudinary(req.uploadedFiles, {
      context: 'pets',
      user: req.user
    });
  }

  // Seller identity comes from the verified token, not the request body, so nobody can list pets as another seller.
  const seller_id = req.user.id;
  const seller_name = req.user.name || 'Verified Seller';
  const parsedStock = stock !== undefined && stock !== '' ? Math.max(0, Number(stock)) : 1;
  // A listing created with zero stock is saved as 'sold' straight away.
  const parsedStatus = parsedStock > 0 ? 'active' : 'sold';
  const customId = `pet-${Date.now()}`;

  const resolvedMedia = resolvePetMediaFields({
    image_url,
    image_public_id,
    video_url,
    video_public_id,
    media_type,
    media,
    directUploads
  });

  const petPayload = {
    seller_id,
    seller_name,
    title: String(title).trim(),
    category: category || 'Dogs',
    price: Math.max(0, Number(price) || 0),
    age: age || 'Young',
    breed: breed || 'Mixed',
    gender: gender || 'Male',
    health_status: health_status || 'Health Checked & Vaccinated',
    description: description || '',
    ...resolvedMedia,
    stock: parsedStock,
    status: parsedStatus
  };

  try {
    if (isMongoConnected()) {
      const newPet = await Pet.create({
        custom_id: customId,
        ...petPayload
      });
      return res.status(201).json({ success: true, pet: normalizeItem(newPet), message: 'Pet listed successfully!' });
    }

    const db = loadData();
    const newPet = {
      id: customId,
      ...petPayload,
      created_at: new Date().toISOString()
    };

    db.pets.unshift(newPet);
    saveData(db);
    return res.status(201).json({ success: true, pet: newPet, message: 'Pet listed successfully!' });
  } catch (err) {
    // If DB creation fails after direct file uploads, clean up those newly uploaded assets
    for (const item of directUploads) {
      await deleteFromCloudinary(item.public_id, item.resource_type);
    }
    throw err;
  }
};

/**
 * Update an existing pet listing (Owner Seller Only)
 * PUT /api/pets/:id
 */
const updatePet = async (req, res) => {
  if (!req.user || req.user.role !== 'seller') {
    throw new ExpressError('Only authenticated seller accounts can edit pet listings', 403);
  }

  const { id } = req.params;
  // Keep only whitelisted fields so a request can't overwrite things like seller_id.
  const updates = Object.fromEntries(
    Object.entries(req.body || {}).filter(([key]) => ALLOWED_PET_FIELDS.includes(key))
  );

  let directUploads = [];
  if (Array.isArray(req.uploadedFiles) && req.uploadedFiles.length > 0) {
    directUploads = await uploadFilesBatchToCloudinary(req.uploadedFiles, {
      context: 'pets',
      user: req.user
    });
  }

  // Media is only recalculated when the request touches it, so a stock-only update leaves the photos alone.
  const hasMediaUpdate =
    directUploads.length > 0 ||
    updates.media !== undefined ||
    updates.image_url !== undefined ||
    updates.image_public_id !== undefined ||
    updates.video_url !== undefined ||
    updates.video_public_id !== undefined ||
    updates.media_type !== undefined;

  // MongoDB Branch
  if (isMongoConnected()) {
    const existing = await findDocByAnyId(Pet, id);
    if (!existing) throw new ExpressError('Pet listing not found', 404);
    if (existing.seller_id !== req.user.id) {
      for (const item of directUploads) {
        await deleteFromCloudinary(item.public_id, item.resource_type);
      }
      throw new ExpressError('Not authorized: only the listing owner can edit this listing', 403);
    }

    if (updates.price !== undefined) updates.price = Math.max(0, Number(updates.price));
    if (updates.stock !== undefined) {
      updates.stock = Math.max(0, Number(updates.stock));
      if (updates.stock === 0) {
        updates.status = 'sold';
      } else if (existing.status === 'sold' && !updates.status) {
        updates.status = 'active';
      }
    }

    if (hasMediaUpdate) {
      const resolvedMedia = resolvePetMediaFields({
        image_url: updates.image_url !== undefined ? updates.image_url : existing.image_url,
        image_public_id: updates.image_public_id !== undefined ? updates.image_public_id : existing.image_public_id,
        video_url: updates.video_url !== undefined ? updates.video_url : existing.video_url,
        video_public_id: updates.video_public_id !== undefined ? updates.video_public_id : existing.video_public_id,
        media_type: updates.media_type !== undefined ? updates.media_type : existing.media_type,
        media: updates.media !== undefined ? updates.media : existing.media,
        directUploads
      });
      await cleanupRemovedPetMedia(existing, resolvedMedia);
      Object.assign(updates, resolvedMedia);
    }

    const updatedPet = await Pet.findOneAndUpdate(
      { _id: existing._id },
      { $set: updates },
      { new: true }
    );

    return res.json({ success: true, pet: normalizeItem(updatedPet), message: 'Pet updated successfully' });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const petIndex = db.pets.findIndex(p => p.id === id);
  if (petIndex === -1) throw new ExpressError('Pet listing not found', 404);

  const existing = db.pets[petIndex];
  if (existing.seller_id !== req.user.id) {
    for (const item of directUploads) {
      await deleteFromCloudinary(item.public_id, item.resource_type);
    }
    throw new ExpressError('Not authorized: only the listing owner can edit this listing', 403);
  }

  const nextStock = updates.stock !== undefined ? Math.max(0, Number(updates.stock)) : existing.stock;
  let nextStatus = updates.status || existing.status;
  if (updates.stock !== undefined) {
    if (nextStock === 0) nextStatus = 'sold';
    else if (existing.status === 'sold' && !updates.status) nextStatus = 'active';
  }

  if (hasMediaUpdate) {
    const resolvedMedia = resolvePetMediaFields({
      image_url: updates.image_url !== undefined ? updates.image_url : existing.image_url,
      image_public_id: updates.image_public_id !== undefined ? updates.image_public_id : existing.image_public_id,
      video_url: updates.video_url !== undefined ? updates.video_url : existing.video_url,
      video_public_id: updates.video_public_id !== undefined ? updates.video_public_id : existing.video_public_id,
      media_type: updates.media_type !== undefined ? updates.media_type : existing.media_type,
      media: updates.media !== undefined ? updates.media : existing.media,
      directUploads
    });
    await cleanupRemovedPetMedia(existing, resolvedMedia);
    Object.assign(updates, resolvedMedia);
  }

  db.pets[petIndex] = {
    ...existing,
    ...updates,
    price: updates.price !== undefined ? Math.max(0, Number(updates.price)) : existing.price,
    stock: nextStock,
    status: nextStatus
  };

  saveData(db);
  res.json({ success: true, pet: db.pets[petIndex], message: 'Pet updated successfully' });
};

/**
 * Delete a pet listing (Owner Seller Only)
 * DELETE /api/pets/:id
 */
const deletePet = async (req, res) => {
  if (!req.user || req.user.role !== 'seller') {
    throw new ExpressError('Only authenticated seller accounts can delete pet listings', 403);
  }

  const { id } = req.params;

  // MongoDB Branch
  if (isMongoConnected()) {
    const target = await findDocByAnyId(Pet, id);
    if (!target) throw new ExpressError('Pet listing not found', 404);
    if (target.seller_id !== req.user.id) {
      throw new ExpressError('Not authorized: only the listing owner can delete this listing', 403);
    }
    // Delete the record first so the "is this file used elsewhere?" check inside cleanupPetMedia
    // doesn't find this pet and skip the Cloudinary deletion.
    await Pet.deleteOne({ _id: target._id });
    await cleanupPetMedia(target);
    return res.json({ success: true, message: 'Pet listing deleted successfully' });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const petIndex = db.pets.findIndex(p => p.id === id);
  if (petIndex === -1) throw new ExpressError('Pet listing not found', 404);

  const target = db.pets[petIndex];
  if (target.seller_id !== req.user.id) {
    throw new ExpressError('Not authorized: only the listing owner can delete this listing', 403);
  }

  db.pets.splice(petIndex, 1);
  saveData(db);
  await cleanupPetMedia(target);
  res.json({ success: true, message: 'Pet listing deleted successfully' });
};

module.exports = {
  getPets,
  getSellerInventory,
  getPetById,
  createPet,
  updatePet,
  deletePet
};
