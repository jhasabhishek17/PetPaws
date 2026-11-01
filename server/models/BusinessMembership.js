/**
 * BusinessMembership Mongoose Model
 *
 * Links an authenticated User account to a Business tenant with a specific
 * business-level role ('owner', 'manager', 'staff', 'vet', 'groomer') and
 * granular permissions. Allows one user to belong to multiple businesses or
 * one business to have multiple authorized staff members.
 */

const mongoose = require('mongoose');

const businessMembershipSchema = new mongoose.Schema({
  custom_id: {
    type: String,
    unique: true,
    index: true
  },
  business_id: {
    type: String,
    required: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  user_name: {
    type: String,
    default: ''
  },
  user_email: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['owner', 'manager', 'staff', 'vet', 'groomer'],
    default: 'owner'
  },
  permissions: {
    type: [String],
    default: ['manage_products', 'manage_orders', 'manage_pets', 'manage_services', 'view_analytics', 'manage_billing', 'manage_settings']
  },
  status: {
    type: String,
    enum: ['active', 'invited', 'revoked'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BusinessMembership', businessMembershipSchema);
