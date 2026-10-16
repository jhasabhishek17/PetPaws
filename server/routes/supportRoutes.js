/**
 * Customer Support Express Router
 * 
 * Maps HTTP support ticketing routes (/api/support) to supportController methods.
 */

const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const asyncHandler = require('../middleware/asyncHandler');

// Support Ticket Routes
router.route('/tickets')
  .get(asyncHandler(supportController.getTickets))
  .post(asyncHandler(supportController.createTicket));

module.exports = router;
