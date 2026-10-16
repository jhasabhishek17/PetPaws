/**
 * Orders & Tracking Express Router
 * 
 * Maps HTTP order & package tracking routes (/api/orders) to orderController methods.
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const asyncHandler = require('../middleware/asyncHandler');

// Checkout Endpoint
router.post('/checkout', asyncHandler(orderController.createCheckoutOrder));

// Fetch Orders Endpoint
router.get('/', asyncHandler(orderController.getOrders));

// Package Tracking Endpoint
router.get('/track/:code', asyncHandler(orderController.getTrackOrder));

module.exports = router;
