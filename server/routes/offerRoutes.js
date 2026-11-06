/**
 * Promotional Offers & Discounts Routes
 *
 * RESTful endpoints for managing offers across products, pets, vets, and services.
 */

const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

// Public route to inspect an item's offer details
router.get('/:category/:id', asyncHandler(offerController.getOffer));

// Provider routes to manage item offers (role and tenant isolation enforced in controller)
router.put('/:category/:id', protect, asyncHandler(offerController.updateOffer));
router.put('/:category/:id/status', protect, asyncHandler(offerController.toggleOfferStatus));
router.delete('/:category/:id', protect, asyncHandler(offerController.deleteOffer));

module.exports = router;
