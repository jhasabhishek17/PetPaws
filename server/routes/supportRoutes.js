/**
 * Customer Support Express Router
 * 
 * Maps HTTP support ticketing routes (/api/support) to supportController methods.
 * Protects administrative ticket management with `requireRole('admin')`.
 */

const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Support Ticket Routes (Protected)
router.route('/tickets')
  .get(protect, asyncHandler(supportController.getTickets))
  .post(protect, asyncHandler(supportController.createTicket));

router.route('/tickets/:id')
  .get(protect, asyncHandler(supportController.getTicketById))
  .put(protect, requireRole('admin'), asyncHandler(supportController.updateTicket))
  .patch(protect, requireRole('admin'), asyncHandler(supportController.updateTicket));

module.exports = router;
