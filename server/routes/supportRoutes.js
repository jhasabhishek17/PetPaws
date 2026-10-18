/**
 * Customer Support Express Router
 * 
 * Maps HTTP support ticketing routes (/api/support) to supportController methods.
 */

const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

// Support Ticket Routes (Protected)
router.route('/tickets')
  .get(protect, asyncHandler(supportController.getTickets))
  .post(protect, asyncHandler(supportController.createTicket));

module.exports = router;
