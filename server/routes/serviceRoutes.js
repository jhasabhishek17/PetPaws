/**
 * Grooming & Care Services Express Router
 * 
 * Maps HTTP service routes (/api/services) to serviceController methods.
 */

const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const asyncHandler = require('../middleware/asyncHandler');

// Fetch Grooming Services
router.get('/', asyncHandler(serviceController.getServices));

// Book Grooming Session
router.post('/book', asyncHandler(serviceController.bookService));

module.exports = router;
