/**
 * Customer Support Controller
 * 
 * Manages customer support ticketing system, user issue reporting,
 * conversation reply history, and Platform Admin moderation/replies.
 * Supports dual persistence: Mongoose (MongoDB / MongoDB Atlas) & JSON file fallback.
 */

const SupportTicket = require('../models/SupportTicket');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId, escapeRegex } = require('../utils/dbHelpers');
const { recordAuditLog } = require('../middleware/tenantMiddleware');
const {
  isEmailProviderConfigured,
  sendSupportTicketCreatedEmail,
  sendSupportTicketReplyEmail
} = require('../utils/emailService');
const ExpressError = require('../utils/ExpressError');

const VALID_STATUSES = {
  'open': 'Open',
  'in progress': 'In Progress',
  'resolved': 'Resolved',
  'closed': 'Closed'
};

const VALID_PRIORITIES = {
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'urgent': 'Urgent'
};

const DISALLOWED_UPDATE_FIELDS = [
  'user_id',
  'user_email',
  'user_name',
  '_id',
  'custom_id',
  'id',
  'role',
  'subject',
  'message',
  'createdAt',
  'updatedAt'
];

/**
 * Format ticket object to guarantee backward-compatible response fields.
 */
const sanitizeTicketOutput = (ticket) => {
  if (!ticket) return null;
  const item = typeof ticket.toObject === 'function' ? ticket.toObject() : { ...ticket };
  return {
    ...normalizeItem(item),
    response: item.response || '',
    responses: Array.isArray(item.responses) ? item.responses : []
  };
};

/**
 * Get customer support tickets.
 * - Platform Admin: retrieves all tickets with optional filtering (status, priority, search).
 * - Customer / non-admin: strictly retrieves only their own tickets.
 * GET /api/support/tickets
 */
const getTickets = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to view support tickets', 401);
  }

  const isAdmin = req.user.role === 'admin';

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    if (isAdmin) {
      const filter = {};
      if (req.query.status) {
        const canonical = VALID_STATUSES[req.query.status.trim().toLowerCase()];
        filter.status = canonical || new RegExp(`^${escapeRegex(req.query.status.trim())}$`, 'i');
      }
      if (req.query.priority) {
        const canonical = VALID_PRIORITIES[req.query.priority.trim().toLowerCase()];
        filter.priority = canonical || new RegExp(`^${escapeRegex(req.query.priority.trim())}$`, 'i');
      }
      if (req.query.search || req.query.q) {
        const term = (req.query.search || req.query.q).trim();
        const sRegex = new RegExp(escapeRegex(term), 'i');
        filter.$or = [
          { custom_id: sRegex },
          { subject: sRegex },
          { user_name: sRegex },
          { user_email: sRegex },
          { message: sRegex }
        ];
      }

      const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 });
      const normalizedTickets = tickets.map(sanitizeTicketOutput);
      return res.json({
        success: true,
        count: normalizedTickets.length,
        tickets: normalizedTickets
      });
    }

    const tickets = await SupportTicket.find({ user_id: req.user.id }).sort({ createdAt: -1 });
    const normalizedTickets = tickets.map(sanitizeTicketOutput);
    return res.json({ success: true, tickets: normalizedTickets });
  }

  // Fallback JSON File Branch
  const db = loadData();
  let tickets = Array.isArray(db.support_tickets) ? [...db.support_tickets] : [];

  if (isAdmin) {
    if (req.query.status) {
      const st = req.query.status.trim().toLowerCase();
      tickets = tickets.filter(t => (t.status || '').toLowerCase() === st);
    }
    if (req.query.priority) {
      const pr = req.query.priority.trim().toLowerCase();
      tickets = tickets.filter(t => (t.priority || '').toLowerCase() === pr);
    }
    if (req.query.search || req.query.q) {
      const term = (req.query.search || req.query.q).trim().toLowerCase();
      tickets = tickets.filter(t => {
        const cid = (t.custom_id || t.id || '').toLowerCase();
        const sub = (t.subject || '').toLowerCase();
        const uname = (t.user_name || '').toLowerCase();
        const uemail = (t.user_email || '').toLowerCase();
        const msg = (t.message || '').toLowerCase();
        return (
          cid.includes(term) ||
          sub.includes(term) ||
          uname.includes(term) ||
          uemail.includes(term) ||
          msg.includes(term)
        );
      });
    }

    const sanitized = tickets.map(sanitizeTicketOutput);
    return res.json({
      success: true,
      count: sanitized.length,
      tickets: sanitized
    });
  }

  const userTickets = tickets.filter(t => t.user_id === req.user.id).map(sanitizeTicketOutput);
  return res.json({ success: true, tickets: userTickets });
};

/**
 * Get a single support ticket by ID
 * GET /api/support/tickets/:id
 */
const getTicketById = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to view support ticket', 401);
  }

  const { id } = req.params;
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new ExpressError('Support ticket ID is required', 400);
  }
  const cleanId = id.trim();

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const ticket = await findDocByAnyId(SupportTicket, cleanId);
    if (!ticket) {
      throw new ExpressError('Support ticket not found', 404);
    }
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      throw new ExpressError('Access denied. You do not have permission to view this ticket', 403);
    }
    return res.json({ success: true, ticket: sanitizeTicketOutput(ticket) });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const ticket = (db.support_tickets || []).find(t => t.custom_id === cleanId || t.id === cleanId);
  if (!ticket) {
    throw new ExpressError('Support ticket not found', 404);
  }
  if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
    throw new ExpressError('Access denied. You do not have permission to view this ticket', 403);
  }
  return res.json({ success: true, ticket: sanitizeTicketOutput(ticket) });
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

  if (!subject || !String(subject).trim() || !message || !String(message).trim()) {
    throw new ExpressError('Subject and message are required', 400);
  }

  const cleanSubject = String(subject).trim();
  const cleanMessage = String(message).trim();
  if (cleanSubject.length > 250) {
    throw new ExpressError('Subject cannot exceed 250 characters', 400);
  }
  if (cleanMessage.length > 10000) {
    throw new ExpressError('Message cannot exceed 10,000 characters', 400);
  }

  const cleanPriority = priority && typeof priority === 'string'
    ? VALID_PRIORITIES[priority.trim().toLowerCase()] || 'Medium'
    : 'Medium';

  const customId = `TCK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const ticket = await SupportTicket.create({
      custom_id: customId,
      user_id: req.user.id,
      user_name: req.user.name,
      user_email: req.user.email,
      subject: cleanSubject,
      message: cleanMessage,
      priority: cleanPriority,
      status: 'In Progress',
      response: 'Thank you for reaching out. Our customer care team is reviewing your ticket and will respond shortly.',
      responses: []
    });

    // Asynchronously notify support team (non-blocking)
    const supportNotificationRecipient = (process.env.SUPPORT_TEAM_EMAIL || process.env.SUPPORT_EMAIL || '').trim();
    if (supportNotificationRecipient && isEmailProviderConfigured()) {
      sendSupportTicketCreatedEmail({
        to: supportNotificationRecipient,
        ticket: {
          custom_id: customId,
          id: customId,
          user_name: req.user.name,
          user_email: req.user.email,
          subject: cleanSubject,
          message: cleanMessage,
          priority: cleanPriority,
          status: 'In Progress'
        }
      }).catch((err) => {
        console.error(`⚠️ [SupportController] Non-blocking support notification delivery failed: ${err.message}`);
      });
    }

    return res.status(201).json({
      success: true,
      ticket: sanitizeTicketOutput(ticket),
      message: `Support ticket submitted successfully. Ticket ID: ${customId}`
    });
  }

  // Fallback JSON File Branch
  const db = loadData();
  if (!Array.isArray(db.support_tickets)) db.support_tickets = [];
  const ticket = {
    id: customId,
    custom_id: customId,
    user_id: req.user.id,
    user_name: req.user.name,
    user_email: req.user.email,
    subject: cleanSubject,
    message: cleanMessage,
    priority: cleanPriority,
    status: 'In Progress',
    response: 'Thank you for reaching out. Our customer care team is reviewing your ticket and will respond shortly.',
    responses: [],
    created_at: new Date().toISOString()
  };

  db.support_tickets.unshift(ticket);
  saveData(db);

  // Asynchronously notify support team (non-blocking)
  const supportNotificationRecipient = (process.env.SUPPORT_TEAM_EMAIL || process.env.SUPPORT_EMAIL || '').trim();
  if (supportNotificationRecipient && isEmailProviderConfigured()) {
    sendSupportTicketCreatedEmail({
      to: supportNotificationRecipient,
      ticket: {
        custom_id: customId,
        id: customId,
        user_name: req.user.name,
        user_email: req.user.email,
        subject: cleanSubject,
        message: cleanMessage,
        priority: cleanPriority,
        status: 'In Progress'
      }
    }).catch((err) => {
      console.error(`⚠️ [SupportController] Non-blocking support notification delivery failed: ${err.message}`);
    });
  }

  return res.status(201).json({
    success: true,
    ticket: sanitizeTicketOutput(ticket),
    message: `Support ticket submitted successfully. Ticket ID: ${customId}`
  });
};

/**
 * Update a support ticket (Platform Admin only)
 * PUT /api/support/tickets/:id
 * PATCH /api/support/tickets/:id
 */
const updateTicket = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ExpressError('Access denied. Platform Administrator access required', 403);
  }

  const { id } = req.params;
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new ExpressError('Support ticket ID is required', 400);
  }
  const cleanId = id.trim();

  if (!req.body || typeof req.body !== 'object') {
    throw new ExpressError('Request body must be a valid JSON object', 400);
  }

  // Reject tampering with protected/immutable fields
  for (const field of DISALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      throw new ExpressError(`Field "${field}" cannot be modified`, 400);
    }
  }

  const { status, priority, response, reply } = req.body;

  let hasValidField = false;
  let canonicalStatus;
  let canonicalPriority;
  let cleanReply;

  // Validate status
  if (status !== undefined) {
    if (typeof status !== 'string' || !status.trim()) {
      throw new ExpressError('Ticket status cannot be empty', 400);
    }
    canonicalStatus = VALID_STATUSES[status.trim().toLowerCase()];
    if (!canonicalStatus) {
      throw new ExpressError('Invalid ticket status. Supported values: Open, In Progress, Resolved, Closed', 400);
    }
    hasValidField = true;
  }

  // Validate priority
  if (priority !== undefined) {
    if (typeof priority !== 'string' || !priority.trim()) {
      throw new ExpressError('Ticket priority cannot be empty', 400);
    }
    canonicalPriority = VALID_PRIORITIES[priority.trim().toLowerCase()];
    if (!canonicalPriority) {
      throw new ExpressError('Invalid ticket priority. Supported values: Low, Medium, High, Urgent', 400);
    }
    hasValidField = true;
  }

  // Validate reply / response
  const rawReply = reply !== undefined ? reply : response;
  if (rawReply !== undefined) {
    if (typeof rawReply !== 'string') {
      throw new ExpressError('Reply message must be a string', 400);
    }
    cleanReply = rawReply.trim();
    if (!cleanReply) {
      throw new ExpressError('Reply message cannot be empty', 400);
    }
    if (cleanReply.length > 10000) {
      throw new ExpressError('Reply message cannot exceed 10,000 characters', 400);
    }
    hasValidField = true;
  }

  if (!hasValidField) {
    throw new ExpressError('At least one field to update (status, priority, or response/reply) is required', 400);
  }

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const ticket = await findDocByAnyId(SupportTicket, cleanId);
    if (!ticket) {
      throw new ExpressError('Support ticket not found', 404);
    }

    if (canonicalStatus) ticket.status = canonicalStatus;
    if (canonicalPriority) ticket.priority = canonicalPriority;

    if (cleanReply !== undefined) {
      ticket.response = cleanReply;
      if (!Array.isArray(ticket.responses)) {
        ticket.responses = [];
      }
      ticket.responses.push({
        author_id: req.user.id || req.user.custom_id || '',
        author_name: req.user.name || 'Platform Admin',
        author_role: req.user.role || 'admin',
        message: cleanReply,
        created_at: new Date()
      });
    }

    await ticket.save();

    await recordAuditLog({
      actor: req.user,
      action: 'admin.support_ticket_updated',
      target_type: 'SupportTicket',
      target_id: ticket.custom_id || cleanId,
      details: `Updated support ticket ${ticket.custom_id || cleanId} -> status=${ticket.status}, priority=${ticket.priority}`
    }).catch(() => {});

    // Asynchronously notify customer of admin reply (non-blocking)
    if (cleanReply !== undefined && ticket.user_email && isEmailProviderConfigured()) {
      sendSupportTicketReplyEmail({
        to: ticket.user_email,
        customerName: ticket.user_name || 'Valued Customer',
        ticketId: ticket.custom_id || ticket.id || cleanId,
        subject: ticket.subject || 'Support Ticket',
        replyMessage: cleanReply,
        status: ticket.status || 'In Progress',
        priority: ticket.priority || 'Medium'
      }).catch((err) => {
        console.error(`⚠️ [SupportController] Non-blocking customer ticket reply notification failed: ${err.message}`);
      });
    }

    return res.json({
      success: true,
      ticket: sanitizeTicketOutput(ticket),
      message: 'Support ticket updated successfully'
    });
  }

  // Fallback JSON File Branch
  const db = loadData();
  if (!Array.isArray(db.support_tickets)) db.support_tickets = [];
  const idx = db.support_tickets.findIndex(t => t.custom_id === cleanId || t.id === cleanId);
  if (idx === -1) {
    throw new ExpressError('Support ticket not found', 404);
  }

  if (canonicalStatus) db.support_tickets[idx].status = canonicalStatus;
  if (canonicalPriority) db.support_tickets[idx].priority = canonicalPriority;

  if (cleanReply !== undefined) {
    db.support_tickets[idx].response = cleanReply;
    if (!Array.isArray(db.support_tickets[idx].responses)) {
      db.support_tickets[idx].responses = [];
    }
    db.support_tickets[idx].responses.push({
      author_id: req.user.id || req.user.custom_id || '',
      author_name: req.user.name || 'Platform Admin',
      author_role: req.user.role || 'admin',
      message: cleanReply,
      created_at: new Date().toISOString()
    });
  }
  db.support_tickets[idx].updated_at = new Date().toISOString();

  saveData(db);

  await recordAuditLog({
    actor: req.user,
    action: 'admin.support_ticket_updated',
    target_type: 'SupportTicket',
    target_id: db.support_tickets[idx].custom_id || cleanId,
    details: `Updated support ticket ${db.support_tickets[idx].custom_id || cleanId} -> status=${db.support_tickets[idx].status}, priority=${db.support_tickets[idx].priority}`
  }).catch(() => {});

  // Asynchronously notify customer of admin reply (non-blocking)
  const targetEmail = db.support_tickets[idx].user_email;
  if (cleanReply !== undefined && targetEmail && isEmailProviderConfigured()) {
    sendSupportTicketReplyEmail({
      to: targetEmail,
      customerName: db.support_tickets[idx].user_name || 'Valued Customer',
      ticketId: db.support_tickets[idx].custom_id || db.support_tickets[idx].id || cleanId,
      subject: db.support_tickets[idx].subject || 'Support Ticket',
      replyMessage: cleanReply,
      status: db.support_tickets[idx].status || 'In Progress',
      priority: db.support_tickets[idx].priority || 'Medium'
    }).catch((err) => {
      console.error(`⚠️ [SupportController] Non-blocking customer ticket reply notification failed: ${err.message}`);
    });
  }

  return res.json({
    success: true,
    ticket: sanitizeTicketOutput(db.support_tickets[idx]),
    message: 'Support ticket updated successfully'
  });
};

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket
};
