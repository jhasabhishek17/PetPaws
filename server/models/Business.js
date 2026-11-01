/**
 * Business (Tenant) Mongoose Model
 *
 * Represents an independent tenant organization on the PetPaws SaaS platform:
 * - Pet Shop / Multi-Vendor Product Retailer ('pet_shop')
 * - Ethical Pet Breeder ('breeder')
 * - Veterinary Clinic ('vet_clinic')
 * - Grooming Salon & Training Studio ('grooming_salon')
 *
 * Enforces tenant isolation, vendor verification, subscription plan limits,
 * and administrative suspension controls.
 */

const mongoose = require('mongoose');

const featureLimitsSchema = new mongoose.Schema({
  max_products: { type: Number, default: 10 },
  max_pets: { type: Number, default: 5 },
  max_services: { type: Number, default: 5 },
  max_team_members: { type: Number, default: 1 },
  analytics_enabled: { type: Boolean, default: false },
  priority_support: { type: Boolean, default: false },
  commission_rate: { type: Number, default: 10 } // Platform marketplace commission %
}, { _id: false });

const businessSchema = new mongoose.Schema({
  custom_id: {
    type: String,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  business_type: {
    type: String,
    enum: ['pet_shop', 'breeder', 'vet_clinic', 'grooming_salon'],
    default: 'pet_shop'
  },
  owner_user_id: {
    type: String,
    required: true,
    index: true
  },
  owner_name: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  logo_url: {
    type: String,
    default: ''
  },
  contact_email: {
    type: String,
    default: ''
  },
  contact_phone: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  registration_number: {
    type: String,
    default: ''
  },
  gst_or_tax_id: {
    type: String,
    default: ''
  },
  verification_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'approved'
  },
  verification_notes: {
    type: String,
    default: ''
  },
  subscription_plan: {
    type: String,
    enum: ['free', 'starter', 'growth', 'pro'],
    default: 'free'
  },
  billing_cycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  subscription_status: {
    type: String,
    enum: ['active', 'trialing', 'past_due', 'cancelled', 'expired'],
    default: 'active'
  },
  trial_ends_at: {
    type: String,
    default: ''
  },
  current_period_start: {
    type: String,
    default: ''
  },
  current_period_end: {
    type: String,
    default: ''
  },
  feature_limits: {
    type: featureLimitsSchema,
    default: () => ({
      max_products: 10,
      max_pets: 5,
      max_services: 5,
      max_team_members: 1,
      analytics_enabled: false,
      priority_support: false,
      commission_rate: 10
    })
  },
  payout_details: {
    upi_id: { type: String, default: '' },
    bank_name: { type: String, default: '' },
    bank_account: { type: String, default: '' },
    ifsc_code: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Business', businessSchema);
