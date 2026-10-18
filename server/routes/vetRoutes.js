/**
 * Veterinarians Express Router
 * 
 * Maps HTTP veterinarian directory & appointment routes (/api/vets) to vetController methods.
 */

const express = require('express');
const router = express.Router();
const vetController = require('../controllers/vetController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Fetch Vets List (public directory)
router.get('/', asyncHandler(vetController.getVets));

// Vet Portal Profile Routes (vet only)
router.route('/my-profile')
  .get(protect, requireRole('vet'), asyncHandler(vetController.getMyVetProfile))
  .put(protect, requireRole('vet'), asyncHandler(vetController.updateMyVetProfile));

// Appointment Routes (protected)
router.route('/appointments')
  .get(protect, asyncHandler(vetController.getAppointments))
  .post(protect, asyncHandler(vetController.createAppointment));

router.put('/appointments/:id/status', protect, requireRole('vet'), asyncHandler(vetController.updateAppointmentStatus));
router.put('/appointments/:id/cancel', protect, asyncHandler(vetController.cancelAppointment));

module.exports = router;
