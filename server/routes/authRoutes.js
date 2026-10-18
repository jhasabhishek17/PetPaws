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
const rateLimit = require('express-rate-limit');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Rate limiter for login attempts to mitigate brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// User Login Endpoint
router.post('/login', loginLimiter, asyncHandler(authController.loginUser));

// User Registration Endpoint
router.post('/register', asyncHandler(authController.registerUser));

// Current User Profile Endpoints
router.get('/me', protect, asyncHandler(authController.getMe));
router.put('/profile', protect, asyncHandler(authController.updateProfile));

// Seller Payout Settings Update Endpoint (protected, seller only)
router.put('/update-payout', protect, requireRole('seller'), asyncHandler(authController.updatePayout));

// Buyer Wishlist Endpoints (protected, buyer only)
router.get('/wishlist', protect, requireRole('buyer'), asyncHandler(authController.getWishlist));
router.post('/wishlist/:petId', protect, requireRole('buyer'), asyncHandler(authController.toggleWishlistItem));
router.delete('/wishlist/:petId', protect, requireRole('buyer'), asyncHandler(authController.removeWishlistItem));

module.exports = router;
