/**
 * Pet Marketplace Controller
 * 
 * Manages pet listings, filtering by category/search, detail retrieval, creation, updates, and deletion.
 * Supports dual persistence: Mongoose (MongoDB / MongoDB Atlas) & JSON file fallback.
 */

const Pet = require('../models/Pet');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const ExpressError = require('../utils/ExpressError');
const mongoose = require('mongoose');

/**
 * Get list of pet listings with optional category, search, or seller filter
 * GET /api/pets
 */
const getPets = async (req, res) => {
  const { category, search, sellerId } = req.query;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    let query = {};
    if (sellerId) {
      query.seller_id = sellerId;
    } else {
      query.status = 'active';
      query.stock = { $gt: 0 };
    }

    if (category && category !== 'All') {
      query.category = new RegExp(`^${category}$`, 'i');
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { breed: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
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
    pets = pets.filter(p => p.seller_id === sellerId);
  } else {
    pets = pets.filter(p => p.status === 'active' && p.stock > 0);
  }

  if (category && category !== 'All') {
    pets = pets.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    pets = pets.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.breed.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: pets.length, pets });
};

/**
 * Get a single pet listing by ID
 * GET /api/pets/:id
 */
const getPetById = async (req, res) => {
  const { id } = req.params;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const pet = await Pet.findOne({
      $or: [{ custom_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });

    if (!pet) {
      throw new ExpressError('Pet listing not found', 404);
    }
    return res.json({ success: true, pet: normalizeItem(pet) });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const pet = db.pets.find(p => p.id === id);
  if (!pet) {
    throw new ExpressError('Pet listing not found', 404);
  }
  res.json({ success: true, pet });
};

/**
 * Create a new pet listing
 * POST /api/pets
 */
const createPet = async (req, res) => {
  const { seller_id, seller_name, title, category, price, age, breed, gender, health_status, description, image_url, stock } = req.body;

  if (!title || price === undefined) {
    throw new ExpressError('Pet title and price are required', 400);
  }

  const customId = `pet-${Date.now()}`;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const newPet = await Pet.create({
      custom_id: customId,
      seller_id: seller_id || 'u-seller-1',
      seller_name: seller_name || 'Verified Seller',
      title,
      category: category || 'Dogs',
      price: Number(price) || 0,
      age: age || 'Young',
      breed: breed || 'Mixed',
      gender: gender || 'Male',
      health_status: health_status || 'Health Checked & Vaccinated',
      description: description || '',
      image_url: image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
      stock: Number(stock) || 1,
      status: 'active'
    });

    return res.status(201).json({ success: true, pet: normalizeItem(newPet), message: 'Pet listed successfully!' });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const newPet = {
    id: customId,
    seller_id: seller_id || 'u-seller-1',
    seller_name: seller_name || 'Verified Seller',
    title,
    category: category || 'Dogs',
    price: Number(price) || 0,
    age: age || 'Young',
    breed: breed || 'Mixed',
    gender: gender || 'Male',
    health_status: health_status || 'Health Checked & Vaccinated',
    description: description || '',
    image_url: image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    stock: Number(stock) || 1,
    status: 'active',
    created_at: new Date().toISOString()
  };

  db.pets.unshift(newPet);
  saveData(db);
  res.status(201).json({ success: true, pet: newPet, message: 'Pet listed successfully!' });
};

/**
 * Update an existing pet listing
 * PUT /api/pets/:id
 */
const updatePet = async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.stock !== undefined) {
      updates.stock = Number(updates.stock);
      if (updates.stock === 0) updates.status = 'sold';
    }

    const updatedPet = await Pet.findOneAndUpdate(
      { $or: [{ custom_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] },
      { $set: updates },
      { new: true }
    );

    if (!updatedPet) {
      throw new ExpressError('Pet listing not found', 404);
    }

    return res.json({ success: true, pet: normalizeItem(updatedPet), message: 'Pet updated successfully' });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const petIndex = db.pets.findIndex(p => p.id === id);
  if (petIndex === -1) {
    throw new ExpressError('Pet listing not found', 404);
  }

  db.pets[petIndex] = {
    ...db.pets[petIndex],
    ...updates,
    price: updates.price !== undefined ? Number(updates.price) : db.pets[petIndex].price,
    stock: updates.stock !== undefined ? Number(updates.stock) : db.pets[petIndex].stock,
    status: (updates.stock !== undefined && Number(updates.stock) === 0) ? 'sold' : (updates.status || db.pets[petIndex].status)
  };

  saveData(db);
  res.json({ success: true, pet: db.pets[petIndex], message: 'Pet updated successfully' });
};

/**
 * Delete a pet listing
 * DELETE /api/pets/:id
 */
const deletePet = async (req, res) => {
  const { id } = req.params;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const deleted = await Pet.findOneAndDelete({
      $or: [{ custom_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });

    if (!deleted) {
      throw new ExpressError('Pet listing not found', 404);
    }
    return res.json({ success: true, message: 'Pet listing deleted successfully' });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const petIndex = db.pets.findIndex(p => p.id === id);
  if (petIndex === -1) {
    throw new ExpressError('Pet listing not found', 404);
  }

  db.pets.splice(petIndex, 1);
  saveData(db);
  res.json({ success: true, message: 'Pet listing deleted successfully' });
};

module.exports = {
  getPets,
  getPetById,
  createPet,
  updatePet,
  deletePet
};
