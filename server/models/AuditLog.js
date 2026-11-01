/**
 * AuditLog Mongoose Model
 *
 * Tracks security-sensitive administrative and multi-tenant actions such as
 * vendor approval/suspension, product moderation, subscription changes, and
 * role updates.
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  custom_id: {
    type: String,
    unique: true,
    index: true
  },
  actor_user_id: {
    type: String,
    required: true,
    index: true
  },
  actor_name: {
    type: String,
    default: ''
  },
  actor_role: {
    type: String,
    default: ''
  },
  business_id: {
    type: String,
    default: '',
    index: true
  },
  action: {
    type: String,
    required: true
  },
  target_type: {
    type: String,
    default: ''
  },
  target_id: {
    type: String,
    default: ''
  },
  details: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
