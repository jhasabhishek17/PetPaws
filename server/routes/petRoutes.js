/**
 * Pet Marketplace Express Router
 * 
 * Maps HTTP pet marketplace routes (/api/pets) to petController methods.
 * Demonstrates clean modular route design using router.route() chains.
 */

const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, optionalAuth, requireRole } = require('../middleware/authMiddleware');

// Seller-only inventory endpoint (returns all listings owned by the authenticated seller)
router.get('/seller/inventory', protect, requireRole('seller'), asyncHandler(petController.getSellerInventory));

// Root /api/pets endpoints: GET (Fetch all pets), POST (Create pet — seller only)
router.route('/')
  .get(optionalAuth, asyncHandler(petController.getPets))
  .post(protect, requireRole('seller'), asyncHandler(petController.createPet));

// Single item /api/pets/:id endpoints: GET (Details), PUT (Update — owner seller only), DELETE (Remove — owner seller only)
router.route('/:id')
  .get(optionalAuth, asyncHandler(petController.getPetById))
  .put(protect, requireRole('seller'), asyncHandler(petController.updatePet))
  .delete(protect, requireRole('seller'), asyncHandler(petController.deletePet));

module.exports = router;
