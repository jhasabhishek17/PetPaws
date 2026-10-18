/**
 * Grooming & Care Services Express Router
 * 
 * Maps HTTP service routes (/api/services) to serviceController methods.
 */

const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

// Fetch Grooming Services (public)
router.get('/', optionalAuth, asyncHandler(serviceController.getServices));

// Fetch Scheduled Grooming Bookings (protected)
router.get('/bookings', protect, asyncHandler(serviceController.getBookings));

// Book Grooming Session (protected)
router.post('/book', protect, asyncHandler(serviceController.bookService));

// Cancel Grooming Booking (protected)
router.put('/bookings/:id/cancel', protect, asyncHandler(serviceController.cancelBooking));

module.exports = router;
