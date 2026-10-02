/**
 * Authentication Controller
 * 
 * Manages user accounts, login authentication, user registration, and seller payout settings.
 * Supports dual persistence: Mongoose (MongoDB / MongoDB Atlas) & JSON file fallback.
 */

const User = require('../models/User');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const ExpressError = require('../utils/ExpressError');
const mongoose = require('mongoose');

/**
 * Log in an existing user
 * POST /api/auth/login
 */
const loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    throw new ExpressError('Please provide email and password', 400);
  }

  // MongoDB / Atlas Persistence Branch
  if (isMongoConnected()) {
    const user = await User.findOne({ email: email.toLowerCase(), password });
    if (!user) {
      throw new ExpressError('Invalid email or password', 401);
    }
    if (role && user.role !== role) {
      throw new ExpressError(`Account exists as ${user.role}. Please log in as ${user.role}.`, 403);
    }
    return res.json({ success: true, user: normalizeItem(user) });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) {
    throw new ExpressError('Invalid email or password', 401);
  }
  if (role && user.role !== role) {
    throw new ExpressError(`Account exists as ${user.role}. Please log in as ${user.role}.`, 403);
  }

  res.json({ success: true, user });
};

/**
 * Register a new user account
 * POST /api/auth/register
 */
const registerUser = async (req, res) => {
  const { name, email, password, role, phone, address, upi_id, bank_name, bank_account, ifsc_code } = req.body;

  if (!name || !email || !password) {
    throw new ExpressError('Name, email, and password are required', 400);
  }

  const customId = `u-${role || 'buyer'}-${Date.now()}`;

  // MongoDB / Atlas Persistence Branch
  if (isMongoConnected()) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ExpressError('Email already registered', 400);
    }

    const newUser = await User.create({
      custom_id: customId,
      name,
      email,
      password,
      role: role || 'buyer',
      phone: phone || '',
      address: address || '',
      upi_id: upi_id || '',
      bank_name: bank_name || '',
      bank_account: bank_account || '',
      ifsc_code: ifsc_code || ''
    });

    return res.status(201).json({ success: true, user: normalizeItem(newUser) });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new ExpressError('Email already registered', 400);
  }

  const newUser = {
    id: customId,
    name,
    email,
    password,
    role: role || 'buyer',
    phone: phone || '',
    address: address || '',
    upi_id: upi_id || '',
    bank_name: bank_name || '',
    bank_account: bank_account || '',
    ifsc_code: ifsc_code || '',
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);
  saveData(db);
  res.status(201).json({ success: true, user: newUser });
};

/**
 * Update Seller/User Payout & Bank details
 * PUT /api/auth/update-payout
 */
const updatePayout = async (req, res) => {
  const { userId, upi_id, bank_name, bank_account, ifsc_code } = req.body;

  if (!userId) {
    throw new ExpressError('User ID is required', 400);
  }

  // MongoDB / Atlas Persistence Branch
  if (isMongoConnected()) {
    const updatedUser = await User.findOneAndUpdate(
      { $or: [{ custom_id: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }] },
      { upi_id, bank_name, bank_account, ifsc_code },
      { new: true }
    );
    if (!updatedUser) {
      throw new ExpressError('User not found', 404);
    }
    return res.json({ success: true, user: normalizeItem(updatedUser), message: 'Payout settings updated successfully' });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) {
    throw new ExpressError('User not found', 404);
  }

  db.users[uIndex].upi_id = upi_id;
  db.users[uIndex].bank_name = bank_name;
  db.users[uIndex].bank_account = bank_account;
  db.users[uIndex].ifsc_code = ifsc_code;

  saveData(db);
  res.json({ success: true, user: db.users[uIndex], message: 'Payout settings updated successfully' });
};

module.exports = {
  loginUser,
  registerUser,
  updatePayout
};
