/**
 * Customer Support Ticket Mongoose Model
 * 
 * Stores submitted customer help inquiries, priority levels, status, and support responses.
 */

const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true, index: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  user_email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, default: 'In Progress' },
  response: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
