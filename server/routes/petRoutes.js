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

// Root /api/pets endpoints: GET (Fetch all pets), POST (Create pet)
router.route('/')
  .get(asyncHandler(petController.getPets))
  .post(asyncHandler(petController.createPet));

// Single item /api/pets/:id endpoints: GET (Details), PUT (Update), DELETE (Remove)
router.route('/:id')
  .get(asyncHandler(petController.getPetById))
  .put(asyncHandler(petController.updatePet))
  .delete(asyncHandler(petController.deletePet));

module.exports = router;
