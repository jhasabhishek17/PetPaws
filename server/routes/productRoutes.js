/**
 * Multi-Vendor Pet Products Express Router (/api/products)
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { handleMediaUpload } = require('../middleware/uploadMiddleware');

// Public category metadata & storefront browsing
router.get('/categories', asyncHandler(productController.getCategories));
router.get('/', asyncHandler(productController.getProducts));

// Protected vendor inventory endpoint (must come before /:id)
router.get(
  '/vendor/inventory',
  protect,
  requireRole('seller', 'shopkeeper', 'admin'),
  asyncHandler(productController.getVendorInventory)
);

// Public single product detail
router.get('/:id', asyncHandler(productController.getProductById));

// Vendor create, update, archive/delete
router.post(
  '/',
  protect,
  requireRole('seller', 'shopkeeper', 'admin'),
  handleMediaUpload,
  asyncHandler(productController.createProduct)
);
router.put(
  '/:id',
  protect,
  requireRole('seller', 'shopkeeper', 'admin'),
  handleMediaUpload,
  asyncHandler(productController.updateProduct)
);
router.delete(
  '/:id',
  protect,
  requireRole('seller', 'shopkeeper', 'admin'),
  asyncHandler(productController.deleteProduct)
);

// Authenticated customer product report
router.post('/:id/report', protect, asyncHandler(productController.reportProduct));

module.exports = router;
