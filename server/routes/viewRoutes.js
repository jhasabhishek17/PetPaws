/**
 * Web Page View Router (EJS Templating Engine - Wanderlust Style)
 * 
 * Renders full-stack HTML pages with server-side EJS templates.
 * Provides views for homepage marketplace, pet details, add listing, orders tracking,
 * vet directory, grooming services, support center, login, and registration.
 */

const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const VetProfile = require('../models/VetProfile');
const GroomingService = require('../models/GroomingService');
const Order = require('../models/Order');
const { loadData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requireRole } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

/**
 * GET / - EJS Home Marketplace View
 */
router.get('/', asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  let pets = [];

  if (isMongoConnected()) {
    let query = { status: 'active', stock: { $gt: 0 } };
    if (category && category !== 'All') {
      query.category = new RegExp(`^${category}$`, 'i');
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { breed: { $regex: search, $options: 'i' } }
      ];
    }
    const docs = await Pet.find(query).sort({ createdAt: -1 });
    pets = docs.map(normalizeItem);
  } else {
    const db = loadData();
    pets = db.pets.filter(p => p.status === 'active' && p.stock > 0);
    if (category && category !== 'All') {
      pets = pets.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      pets = pets.filter(p => p.title.toLowerCase().includes(q) || p.breed.toLowerCase().includes(q));
    }
  }

  res.render('pets/index', {
    title: 'PetPaws - Verified Pet Marketplace & Care',
    pets,
    category: category || 'All',
    search: search || ''
  });
}));

/**
 * GET /pets/new - Add Pet Listing Form View (Seller Only)
 */
router.get('/pets/new', protect, requireRole('seller'), (req, res) => {
  res.render('pets/new', { title: 'List a Pet - PetPaws' });
});

/**
 * GET /pets/:id - Pet Details View
 */
router.get('/pets/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  let pet = null;

  if (isMongoConnected()) {
    const doc = await Pet.findOne({
      $or: [{ custom_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });
    pet = normalizeItem(doc);
  } else {
    const db = loadData();
    pet = db.pets.find(p => p.id === id);
  }

  if (!pet) {
    return res.status(404).render('pets/index', {
      title: 'Pet Not Found',
      pets: [],
      category: 'All',
      search: '',
      error: 'Pet listing not found'
    });
  }

  res.render('pets/show', { title: `${pet.title} - PetPaws`, pet });
}));

/**
 * GET /vets - Veterinarians Directory View
 */
router.get('/vets', asyncHandler(async (req, res) => {
  let vets = [];
  if (isMongoConnected()) {
    const docs = await VetProfile.find();
    vets = docs.map(normalizeItem);
  } else {
    const db = loadData();
    vets = db.vet_profiles;
  }

  res.render('vets/index', { title: 'Veterinarians Directory - PetPaws', vets });
}));

/**
 * GET /grooming - Grooming & Spa Services View
 */
router.get('/grooming', asyncHandler(async (req, res) => {
  let services = [];
  if (isMongoConnected()) {
    const docs = await GroomingService.find();
    services = docs.map(normalizeItem);
  } else {
    const db = loadData();
    services = db.grooming_services;
  }

  res.render('grooming/index', { title: 'Pet Grooming & Spa Services - PetPaws', services });
}));

/**
 * GET /orders - Orders & Tracking View (Authenticated Only)
 */
router.get('/orders', protect, asyncHandler(async (req, res) => {
  let orders = [];
  if (isMongoConnected()) {
    const docs = await Order.find({ buyer_id: req.user.id }).sort({ createdAt: -1 });
    orders = docs.map(normalizeItem);
  } else {
    const db = loadData();
    orders = db.orders.filter(o => o.buyer_id === req.user.id);
  }

  res.render('orders/index', { title: 'My Orders & Tracking - PetPaws', orders });
}));

/**
 * GET /support - Customer Support View
 */
router.get('/support', (req, res) => {
  res.render('support/index', { title: 'Customer Support 24/7 - PetPaws' });
});

/**
 * GET /login - Login Page View
 */
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login - PetPaws' });
});

/**
 * GET /register - Register Page View
 */
router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Register Account - PetPaws' });
});

module.exports = router;
