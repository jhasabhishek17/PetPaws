/**
 * Multi-Vendor Product Orders Express Router (/api/product-orders)
 */

const express = require('express');
const router = express.Router();
const productOrderController = require('../controllers/productOrderController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Authenticated tracking lookup by code (buyer, fulfilling seller, or admin)
router.get('/track/:code', protect, asyncHandler(productOrderController.trackProductOrder));

// Authenticated customer / vendor order listing & checkout
router.get('/', protect, asyncHandler(productOrderController.getProductOrders));
router.get('/my-orders', protect, asyncHandler(productOrderController.getProductOrders));
router.post('/initiate', protect, asyncHandler(productOrderController.initiateProductCheckout));
router.post('/checkout', protect, asyncHandler(productOrderController.checkoutCart));

// Vendor status progression
router.put(
  '/:id/status',
  protect,
  requireRole('seller', 'shopkeeper', 'admin'),
  asyncHandler(productOrderController.updateProductOrderStatus)
);

// Order cancellation & return workflows
router.put('/:id/cancel', protect, asyncHandler(productOrderController.cancelProductOrder));
router.put('/:id/return', protect, asyncHandler(productOrderController.handleProductOrderReturn));

module.exports = router;
