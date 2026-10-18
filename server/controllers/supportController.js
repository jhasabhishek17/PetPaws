/**
 * Customer Support Controller
 * 
 * Manages customer support ticketing system and user issue reporting.
 * Supports dual persistence: Mongoose (MongoDB / MongoDB Atlas) & JSON file fallback.
 */

const SupportTicket = require('../models/SupportTicket');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const ExpressError = require('../utils/ExpressError');

/**
 * Get customer support tickets for authenticated user
 * GET /api/support/tickets
 */
const getTickets = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to view support tickets', 401);
  }

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const tickets = await SupportTicket.find({ user_id: req.user.id }).sort({ createdAt: -1 });
    const normalizedTickets = tickets.map(normalizeItem);
    return res.json({ success: true, tickets: normalizedTickets });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const tickets = db.support_tickets.filter(t => t.user_id === req.user.id);

  res.json({ success: true, tickets });
};

/**
 * Submit a new customer support ticket
 * POST /api/support/tickets
 */
const createTicket = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to submit a support ticket', 401);
  }

  const { subject, message, priority } = req.body;

  if (!subject || !message) {
    throw new ExpressError('Subject and message are required', 400);
  }

  const customId = `TCK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const ticket = await SupportTicket.create({
      custom_id: customId,
      user_id: req.user.id,
      user_name: req.user.name,
      user_email: req.user.email,
      subject,
      message,
      priority: priority || 'Medium',
      status: 'In Progress',
      response: 'Thank you for reaching out. Our customer care team is reviewing your ticket and will respond shortly.'
    });

    return res.status(201).json({
      success: true,
      ticket: normalizeItem(ticket),
      message: `Support ticket submitted successfully. Ticket ID: ${customId}`
    });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const ticket = {
    id: customId,
    user_id: req.user.id,
    user_name: req.user.name,
    user_email: req.user.email,
    subject,
    message,
    priority: priority || 'Medium',
    status: 'In Progress',
    response: 'Thank you for reaching out. Our customer care team is reviewing your ticket and will respond shortly.',
    created_at: new Date().toISOString()
  };

  db.support_tickets.unshift(ticket);
  saveData(db);
  res.status(201).json({
    success: true,
    ticket,
    message: `Support ticket submitted successfully. Ticket ID: ${customId}`
  });
};

module.exports = {
  getTickets,
  createTicket
};
