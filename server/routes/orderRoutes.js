/**
 * Orders & Tracking Express Router
 * 
 * Maps HTTP order & package tracking routes (/api/orders) to orderController methods.
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

// Checkout Endpoint (protected)
router.post('/checkout', protect, asyncHandler(orderController.createCheckoutOrder));

// Fetch Orders Endpoint (strictly protected; returns only authenticated user's orders)
router.get('/', protect, asyncHandler(orderController.getOrders));

// Package Tracking Endpoint (strictly protected; only the user who placed the order can view)
router.get('/track/:code', protect, asyncHandler(orderController.getTrackOrder));

// Cancel Order Endpoint (strictly protected, buyer or seller only)
router.put('/:id/cancel', protect, asyncHandler(orderController.cancelOrder));

// Update Order Delivery Status (protected, seller of the pet only)
router.put('/:id/status', protect, requireRole('seller'), asyncHandler(orderController.updateOrderStatus));

module.exports = router;
