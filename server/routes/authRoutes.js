/**
 * Authentication Express Router
 *
 * Maps HTTP authentication routes (/api/auth) to authController methods.
 * Uses asyncHandler for async error propagation and express-rate-limit
 * for registration, login, verification resend, and password reset endpoints.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');
const rateLimit = require('express-rate-limit');
const { protect, requireRole } = require('../middleware/authMiddleware');

const buildRateLimitHandler = (defaultMessage) => (req, res) => {
  const resetTime = req.rateLimit && req.rateLimit.resetTime ? new Date(req.rateLimit.resetTime).getTime() : 0;
  const retryAfterSec = resetTime > Date.now() ? Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)) : 60;
  res.set('Retry-After', String(retryAfterSec));
  return res.status(429).json({
    success: false,
    statusCode: 429,
    code: 'OTP_IP_RATE_LIMIT',
    retry_after_seconds: retryAfterSec,
    cooldown_seconds: retryAfterSec,
    message: defaultMessage
  });
};

// Rate limiter for login attempts to mitigate brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler('Too many login attempts. Please try again later.')
});

// Shared IP rate limiter across all OTP-sending endpoints (/register, /resend-otp, /resend-verification, /forgot-password)
// Persistent per-email (60s cooldown, 3/hour, 5/24h) and persistent per-IP limits are enforced in otpRateLimiter.js
const otpDispatchIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.OTP_DISPATCH_IP_LIMIT_MAX || (process.env.EMAIL_TRANSPORT === 'test' ? 500 : 60)),
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler(
    'Too many OTP requests from this network connection. Please wait a few minutes before requesting another code.'
  )
});

// Rate limiter for email & password-reset OTP verification checks
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler('Too many OTP verification requests. Please try again later.')
});

// Rate limiter for password reset submission
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler('Too many password reset requests. Please try again later.')
});

// User Login & Registration Endpoints
router.post('/login', loginLimiter, asyncHandler(authController.loginUser));
router.post('/register', otpDispatchIpLimiter, asyncHandler(authController.registerUser));

// Email OTP Verification & Resend Endpoints
router.post('/verify-otp', verificationLimiter, asyncHandler(authController.verifyEmail));
router.get('/verify-email', verificationLimiter, asyncHandler(authController.verifyEmail));
router.post('/verify-email', verificationLimiter, asyncHandler(authController.verifyEmail));
router.post('/resend-otp', otpDispatchIpLimiter, asyncHandler(authController.resendVerificationEmail));
router.post('/resend-verification', otpDispatchIpLimiter, asyncHandler(authController.resendVerificationEmail));

// Password Recovery OTP & Reset Endpoints
router.post('/forgot-password', otpDispatchIpLimiter, asyncHandler(authController.forgotPassword));
router.post('/verify-reset-otp', verificationLimiter, asyncHandler(authController.verifyResetToken));
router.get('/verify-reset-token', verificationLimiter, asyncHandler(authController.verifyResetToken));
router.post('/verify-reset-token', verificationLimiter, asyncHandler(authController.verifyResetToken));
router.post('/reset-password', passwordResetLimiter, asyncHandler(authController.resetPassword));

// Current User Profile Endpoints (protected)
router.get('/me', protect, asyncHandler(authController.getMe));
router.put('/profile', protect, asyncHandler(authController.updateProfile));

// Seller / Shopkeeper Payout Settings Update Endpoint (protected)
router.put(
  '/update-payout',
  protect,
  requireRole('seller', 'shopkeeper', 'admin'),
  asyncHandler(authController.updatePayout)
);

// Buyer Wishlist Endpoints (protected)
router.get('/wishlist', protect, asyncHandler(authController.getWishlist));
router.post('/wishlist/:petId', protect, requireRole('buyer'), asyncHandler(authController.toggleWishlistItem));
router.delete('/wishlist/:petId', protect, requireRole('buyer'), asyncHandler(authController.removeWishlistItem));
router.post('/product-wishlist/:productId', protect, asyncHandler(authController.toggleProductWishlistItem));

module.exports = router;
