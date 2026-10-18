/**
 * Veterinarians Express Router
 * 
 * Maps HTTP veterinarian directory & appointment routes (/api/vets) to vetController methods.
 */

const express = require('express');
const router = express.Router();
const vetController = require('../controllers/vetController');
const asyncHandler = require('../middleware/asyncHandler');

// Fetch Vets List
router.get('/', asyncHandler(vetController.getVets));

// Appointment Routes
router.route('/appointments')
  .get(asyncHandler(vetController.getAppointments))
  .post(asyncHandler(vetController.createAppointment));

module.exports = router;
