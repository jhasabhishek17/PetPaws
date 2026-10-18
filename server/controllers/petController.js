/**
 * Pet Marketplace Controller
 * 
 * Manages pet listings, filtering by category/search, detail retrieval, creation, updates, and deletion.
 * Supports dual persistence: Mongoose (MongoDB) & JSON file fallback.
 */

const Pet = require('../models/Pet');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId } = require('../utils/dbHelpers');
const ExpressError = require('../utils/ExpressError');

const ALLOWED_PET_FIELDS = [
  'title', 'category', 'price', 'age', 'breed', 'gender',
  'health_status', 'description', 'image_url', 'stock', 'status'
];

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

  const { title, category, price, age, breed, gender, health_status, description, image_url, stock } = req.body;

  if (!title || price === undefined || price === '') {
    throw new ExpressError('Pet title and price are required', 400);
  }

  const seller_id = req.user.id;
  const seller_name = req.user.name || 'Verified Seller';
  const parsedStock = stock !== undefined && stock !== '' ? Math.max(0, Number(stock)) : 1;
  const parsedStatus = parsedStock > 0 ? 'active' : 'sold';
  const customId = `pet-${Date.now()}`;

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
    image_url: image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    stock: parsedStock,
    status: parsedStatus
  };

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
  res.status(201).json({ success: true, pet: newPet, message: 'Pet listed successfully!' });
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
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => ALLOWED_PET_FIELDS.includes(key))
  );

  // MongoDB Branch
  if (isMongoConnected()) {
    const existing = await findDocByAnyId(Pet, id);
    if (!existing) throw new ExpressError('Pet listing not found', 404);
    if (existing.seller_id !== req.user.id) {
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

  if (db.pets[petIndex].seller_id !== req.user.id) {
    throw new ExpressError('Not authorized: only the listing owner can edit this listing', 403);
  }

  const nextStock = updates.stock !== undefined ? Math.max(0, Number(updates.stock)) : db.pets[petIndex].stock;
  let nextStatus = updates.status || db.pets[petIndex].status;
  if (updates.stock !== undefined) {
    if (nextStock === 0) nextStatus = 'sold';
    else if (db.pets[petIndex].status === 'sold' && !updates.status) nextStatus = 'active';
  }

  db.pets[petIndex] = {
    ...db.pets[petIndex],
    ...updates,
    price: updates.price !== undefined ? Math.max(0, Number(updates.price)) : db.pets[petIndex].price,
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
    await Pet.deleteOne({ _id: target._id });
    return res.json({ success: true, message: 'Pet listing deleted successfully' });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const petIndex = db.pets.findIndex(p => p.id === id);
  if (petIndex === -1) throw new ExpressError('Pet listing not found', 404);

  if (db.pets[petIndex].seller_id !== req.user.id) {
    throw new ExpressError('Not authorized: only the listing owner can delete this listing', 403);
  }

  db.pets.splice(petIndex, 1);
  saveData(db);
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
