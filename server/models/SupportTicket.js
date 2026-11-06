/**
 * Customer Support Ticket Mongoose Model
 * 
 * Stores submitted customer help inquiries, priority levels, status,
 * support responses, and conversation reply history.
 */

const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  author_id: { type: String, default: '' },
  author_name: { type: String, default: 'PetPaws Support' },
  author_role: { type: String, default: 'admin' },
  message: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, { _id: false });

const supportTicketSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true, index: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  user_email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, default: 'In Progress' },
  // Backward-compatible single response string for legacy consumers
  response: { type: String, default: '' },
  // Full conversation / reply history in chronological order
  responses: { type: [responseSchema], default: [] }
}, {
  timestamps: true
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
