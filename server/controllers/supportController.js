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
 * Get customer support tickets for user
 * GET /api/support/tickets
 */
const getTickets = async (req, res) => {
  const { userId } = req.query;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    let query = {};
    if (userId) query.user_id = userId;

    const tickets = await SupportTicket.find(query).sort({ createdAt: -1 });
    const normalizedTickets = tickets.map(normalizeItem);
    return res.json({ success: true, tickets: normalizedTickets });
  }

  // Fallback JSON File Branch
  const db = loadData();
  let tickets = db.support_tickets;
  if (userId) tickets = tickets.filter(t => t.user_id === userId);

  res.json({ success: true, tickets });
};

/**
 * Submit a new customer support ticket
 * POST /api/support/tickets
 */
const createTicket = async (req, res) => {
  const { user_id, user_name, user_email, subject, message, priority } = req.body;

  if (!subject || !message) {
    throw new ExpressError('Subject and message are required', 400);
  }

  const customId = `TCK-${Math.floor(100 + Math.random() * 900)}`;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const ticket = await SupportTicket.create({
      custom_id: customId,
      user_id: user_id || 'u-buyer-1',
      user_name: user_name || 'Alex Morgan',
      user_email: user_email || 'buyer@petpaws.com',
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
    user_id: user_id || 'u-buyer-1',
    user_name: user_name || 'Alex Morgan',
    user_email: user_email || 'buyer@petpaws.com',
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
