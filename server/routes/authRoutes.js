/**
 * Authentication Express Router
 * 
 * Maps HTTP authentication routes (/api/auth) to authController methods.
 * Uses asyncHandler for async error propagation.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');

// User Login Endpoint
router.post('/login', asyncHandler(authController.loginUser));

// User Registration Endpoint
router.post('/register', asyncHandler(authController.registerUser));

// Seller Payout Settings Update Endpoint
router.put('/update-payout', asyncHandler(authController.updatePayout));

module.exports = router;
