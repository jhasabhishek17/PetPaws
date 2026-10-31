/**
 * Authentication Controller
 *
 * Manages user accounts, login authentication, user registration, wishlists,
 * and seller/shopkeeper payout settings.
 * Supports dual persistence: Mongoose (MongoDB / MongoDB Atlas) & JSON file fallback.
 *
 * Security improvements:
 * - Passwords are hashed with bcryptjs (cost=10) on registration.
 * - Login uses bcrypt.compare; falls back to plain comparison for local non-production demo seeds.
 * - JWT issued on both login and register; password never returned in response.
 * - updatePayout reads userId from req.user (JWT) — not from req.body.
 */

const User = require('../models/User');
const Pet = require('../models/Pet');
const Product = require('../models/Product');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { ensureUserBusiness } = require('../middleware/tenantMiddleware');
const ExpressError = require('../utils/ExpressError');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');
const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Helper: sign a JWT for a user object
// ---------------------------------------------------------------------------
const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const findUserDoc = async (userId) => {
  return User.findOne({
    $or: [{ custom_id: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }]
  });
};

const isCompatibleRoleLogin = (requestedRole, actualRole) => {
  if (!requestedRole || requestedRole === actualRole) return true;
  if (actualRole === 'admin') return true;
  if ((requestedRole === 'seller' && actualRole === 'shopkeeper') || (requestedRole === 'shopkeeper' && actualRole === 'seller')) {
    return true;
  }
  return false;
};

/**
 * Log in an existing user
 * POST /api/auth/login
 */
const loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    throw new ExpressError('Please provide email and password', 400);
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (process.env.NODE_ENV === 'production' && normalizedEmail.endsWith('@petpaws.demo')) {
    throw new ExpressError('Demo accounts are disabled in production', 403);
  }

  // MongoDB / Atlas Persistence Branch
  if (isMongoConnected()) {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) throw new ExpressError('Invalid email or password', 401);

    let isMatch = false;
    if (user.password && user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else if (process.env.NODE_ENV !== 'production') {
      isMatch = user.password === password;
    }
    if (!isMatch) throw new ExpressError('Invalid email or password', 401);

    if (!isCompatibleRoleLogin(role, user.role)) {
      throw new ExpressError(`Account exists as ${user.role}. Please log in as ${user.role}.`, 403);
    }

    const normalized = normalizeItem(user);
    if (!Array.isArray(normalized.wishlist)) normalized.wishlist = [];
    if (!Array.isArray(normalized.product_wishlist)) normalized.product_wishlist = [];
    return res.json({ success: true, token: signToken(normalized), user: normalized });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) throw new ExpressError('Invalid email or password', 401);

  let isMatch = false;
  if (user.password && user.password.startsWith('$2')) {
    isMatch = await bcrypt.compare(password, user.password);
  } else {
    isMatch = user.password === password;
  }
  if (!isMatch) throw new ExpressError('Invalid email or password', 401);

  if (!isCompatibleRoleLogin(role, user.role)) {
    throw new ExpressError(`Account exists as ${user.role}. Please log in as ${user.role}.`, 403);
  }

  const safeUser = {
    ...user,
    wishlist: Array.isArray(user.wishlist) ? user.wishlist : [],
    product_wishlist: Array.isArray(user.product_wishlist) ? user.product_wishlist : []
  };
  delete safeUser.password;
  return res.json({ success: true, token: signToken(safeUser), user: safeUser });
};

/**
 * Register a new user account
 * POST /api/auth/register
 */
const registerUser = async (req, res) => {
  const { name, email, password, role, phone, address, business_name } = req.body;

  if (!name || !email || !password) {
    throw new ExpressError('Name, email, and password are required', 400);
  }
  if (password.length < 6) {
    throw new ExpressError('Password must be at least 6 characters', 400);
  }
  if (String(role || '').toLowerCase().trim() === 'admin') {
    throw new ExpressError('Platform Admin accounts cannot be publicly registered', 403);
  }

  const validRoles = ['buyer', 'seller', 'shopkeeper', 'vet', 'groomer'];
  const assignedRole = validRoles.includes(role) ? role : 'buyer';
  const hashedPassword = await bcrypt.hash(password, 10);
  const customId = `u-${assignedRole}-${Date.now()}`;

  // MongoDB / Atlas Persistence Branch
  if (isMongoConnected()) {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) throw new ExpressError('Email already registered', 400);

    const newUser = await User.create({
      custom_id: customId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: assignedRole,
      phone: phone || '',
      address: address || '',
      wishlist: [],
      product_wishlist: []
    });

    const normalized = normalizeItem(newUser);
    if (['seller', 'shopkeeper', 'vet', 'groomer'].includes(assignedRole)) {
      await ensureUserBusiness({
        ...normalized,
        name: business_name ? business_name.trim() : normalized.name
      });
    }
    return res.status(201).json({ success: true, token: signToken(normalized), user: normalized });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) throw new ExpressError('Email already registered', 400);

  const newUser = {
    id: customId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: assignedRole,
    phone: phone || '',
    address: address || '',
    wishlist: [],
    product_wishlist: [],
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);
  saveData(db);

  const safeUser = { ...newUser };
  delete safeUser.password;
  if (['seller', 'shopkeeper', 'vet', 'groomer'].includes(assignedRole)) {
    await ensureUserBusiness({
      ...safeUser,
      name: business_name ? business_name.trim() : safeUser.name
    });
  }
  return res.status(201).json({ success: true, token: signToken(safeUser), user: safeUser });
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  const userId = req.user.id;
  if (isMongoConnected()) {
    const user = await findUserDoc(userId);
    if (!user) throw new ExpressError('User not found', 404);
    const normalized = normalizeItem(user);
    if (!Array.isArray(normalized.wishlist)) normalized.wishlist = [];
    if (!Array.isArray(normalized.product_wishlist)) normalized.product_wishlist = [];
    return res.json({ success: true, user: normalized });
  }
  const db = loadData();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new ExpressError('User not found', 404);
  const safeUser = {
    ...user,
    wishlist: Array.isArray(user.wishlist) ? user.wishlist : [],
    product_wishlist: Array.isArray(user.product_wishlist) ? user.product_wishlist : []
  };
  delete safeUser.password;
  res.json({ success: true, user: safeUser });
};

/**
 * Update authenticated user profile details (name, phone, address, upi_id)
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, phone, address, upi_id } = req.body;
  const updates = {};
  if (name !== undefined && name.trim()) updates.name = name.trim();
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (address !== undefined) updates.address = String(address).trim();
  if (upi_id !== undefined) updates.upi_id = String(upi_id).trim();

  if (isMongoConnected()) {
    const updatedUser = await User.findOneAndUpdate(
      { $or: [{ custom_id: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }] },
      { $set: updates },
      { new: true }
    );
    if (!updatedUser) throw new ExpressError('User not found', 404);
    return res.json({ success: true, user: normalizeItem(updatedUser), message: 'Account details updated successfully' });
  }

  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) throw new ExpressError('User not found', 404);
  Object.assign(db.users[uIndex], updates);
  saveData(db);
  const safeUser = { ...db.users[uIndex] };
  delete safeUser.password;
  res.json({ success: true, user: safeUser, message: 'Account details updated successfully' });
};

/**
 * Update Seller / Shopkeeper Payout & Bank details
 * PUT /api/auth/update-payout
 */
const updatePayout = async (req, res) => {
  if (!req.user || !['seller', 'shopkeeper', 'admin'].includes(req.user.role)) {
    throw new ExpressError('Only authenticated seller or shopkeeper accounts can configure payout settings', 403);
  }
  const userId = req.user.id;
  const { upi_id, bank_name, bank_account, ifsc_code } = req.body;

  if (isMongoConnected()) {
    const updatedUser = await User.findOneAndUpdate(
      { $or: [{ custom_id: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }] },
      { upi_id, bank_name, bank_account, ifsc_code },
      { new: true }
    );
    if (!updatedUser) throw new ExpressError('User not found', 404);
    return res.json({ success: true, user: normalizeItem(updatedUser), message: 'Payout settings updated successfully' });
  }

  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) throw new ExpressError('User not found', 404);

  Object.assign(db.users[uIndex], { upi_id, bank_name, bank_account, ifsc_code });
  saveData(db);

  const safeUser = { ...db.users[uIndex] };
  delete safeUser.password;
  res.json({ success: true, user: safeUser, message: 'Payout settings updated successfully' });
};

/**
 * Get authenticated buyer's saved wishlist items (both pets and products)
 * GET /api/auth/wishlist & GET /api/wishlist
 */
const getWishlist = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to access wishlist', 401);
  }
  const userId = req.user.id;

  if (isMongoConnected()) {
    const user = await findUserDoc(userId);
    if (!user) throw new ExpressError('User not found', 404);
    const wishlistIds = Array.isArray(user.wishlist) ? user.wishlist : [];
    const productWishlistIds = Array.isArray(user.product_wishlist) ? user.product_wishlist : [];
    const pets = wishlistIds.length
      ? await Pet.find({ custom_id: { $in: wishlistIds } })
      : [];
    const products = productWishlistIds.length
      ? await Product.find({ custom_id: { $in: productWishlistIds } })
      : [];
    return res.json({
      success: true,
      wishlist: wishlistIds,
      wishlistIds,
      pets: pets.map(normalizeItem),
      productWishlistIds,
      products: products.map(normalizeItem)
    });
  }

  const db = loadData();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new ExpressError('User not found', 404);
  const wishlistIds = Array.isArray(user.wishlist) ? user.wishlist : [];
  const productWishlistIds = Array.isArray(user.product_wishlist) ? user.product_wishlist : [];
  const pets = db.pets.filter(p => wishlistIds.includes(p.id));
  const products = (db.products || []).filter(p => productWishlistIds.includes(p.id));
  res.json({ success: true, wishlist: wishlistIds, wishlistIds, pets, productWishlistIds, products });
};

/**
 * Add or toggle a pet in the authenticated buyer's wishlist
 * POST /api/auth/wishlist/:petId & POST /api/wishlist/:petId
 */
const toggleWishlistItem = async (req, res) => {
  if (!req.user || req.user.role !== 'buyer') {
    throw new ExpressError('Only authenticated buyer accounts can manage a wishlist', 403);
  }
  const petId = req.params.petId || req.body.petId;
  if (!petId) throw new ExpressError('Pet ID is required', 400);

  const userId = req.user.id;

  if (isMongoConnected()) {
    const user = await findUserDoc(userId);
    if (!user) throw new ExpressError('User not found', 404);
    const current = Array.isArray(user.wishlist) ? [...user.wishlist] : [];
    const idx = current.indexOf(petId);
    let added = false;
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(petId);
      added = true;
    }
    user.wishlist = current;
    await user.save();
    const pets = current.length ? await Pet.find({ custom_id: { $in: current } }) : [];
    return res.json({
      success: true,
      added,
      wishlist: user.wishlist,
      wishlistIds: user.wishlist,
      pets: pets.map(normalizeItem),
      message: added ? 'Added to your wishlist' : 'Removed from your wishlist'
    });
  }

  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) throw new ExpressError('User not found', 404);
  const current = Array.isArray(db.users[uIndex].wishlist) ? [...db.users[uIndex].wishlist] : [];
  const idx = current.indexOf(petId);
  let added = false;
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(petId);
    added = true;
  }
  db.users[uIndex].wishlist = current;
  saveData(db);
  const pets = db.pets.filter(p => current.includes(p.id));
  res.json({
    success: true,
    added,
    wishlist: current,
    wishlistIds: current,
    pets,
    message: added ? 'Added to your wishlist' : 'Removed from your wishlist'
  });
};

/**
 * Remove a pet from the authenticated buyer's wishlist
 * DELETE /api/auth/wishlist/:petId & DELETE /api/wishlist/:petId
 */
const removeWishlistItem = async (req, res) => {
  if (!req.user || req.user.role !== 'buyer') {
    throw new ExpressError('Only authenticated buyer accounts can manage a wishlist', 403);
  }
  const { petId } = req.params;
  const userId = req.user.id;

  if (isMongoConnected()) {
    const user = await findUserDoc(userId);
    if (!user) throw new ExpressError('User not found', 404);
    user.wishlist = (user.wishlist || []).filter(id => id !== petId);
    await user.save();
    const pets = user.wishlist.length ? await Pet.find({ custom_id: { $in: user.wishlist } }) : [];
    return res.json({
      success: true,
      wishlist: user.wishlist,
      wishlistIds: user.wishlist,
      pets: pets.map(normalizeItem),
      message: 'Removed from your wishlist'
    });
  }

  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) throw new ExpressError('User not found', 404);
  db.users[uIndex].wishlist = (db.users[uIndex].wishlist || []).filter(id => id !== petId);
  saveData(db);
  const pets = db.pets.filter(p => db.users[uIndex].wishlist.includes(p.id));
  res.json({
    success: true,
    wishlist: db.users[uIndex].wishlist,
    wishlistIds: db.users[uIndex].wishlist,
    pets,
    message: 'Removed from your wishlist'
  });
};

/**
 * Toggle a physical product in the authenticated user's product wishlist
 * POST /api/auth/product-wishlist/:productId
 */
const toggleProductWishlistItem = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to save products to your wishlist', 401);
  }
  const productId = req.params.productId || req.body.productId;
  if (!productId) throw new ExpressError('Product ID is required', 400);

  const userId = req.user.id;

  if (isMongoConnected()) {
    const user = await findUserDoc(userId);
    if (!user) throw new ExpressError('User not found', 404);
    const current = Array.isArray(user.product_wishlist) ? [...user.product_wishlist] : [];
    const idx = current.indexOf(productId);
    let added = false;
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(productId);
      added = true;
    }
    user.product_wishlist = current;
    await user.save();
    const products = current.length ? await Product.find({ custom_id: { $in: current } }) : [];
    return res.json({
      success: true,
      added,
      productWishlistIds: user.product_wishlist,
      products: products.map(normalizeItem),
      message: added ? 'Product saved to wishlist' : 'Product removed from wishlist'
    });
  }

  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) throw new ExpressError('User not found', 404);
  const current = Array.isArray(db.users[uIndex].product_wishlist) ? [...db.users[uIndex].product_wishlist] : [];
  const idx = current.indexOf(productId);
  let added = false;
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(productId);
    added = true;
  }
  db.users[uIndex].product_wishlist = current;
  saveData(db);
  const products = (db.products || []).filter(p => current.includes(p.id));
  res.json({
    success: true,
    added,
    productWishlistIds: current,
    products,
    message: added ? 'Product saved to wishlist' : 'Product removed from wishlist'
  });
};

module.exports = {
  loginUser,
  registerUser,
  getMe,
  updateProfile,
  updatePayout,
  getWishlist,
  toggleWishlistItem,
  removeWishlistItem,
  toggleProductWishlistItem
};
