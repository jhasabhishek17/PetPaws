/**
 * SubscriptionTransaction Mongoose Model
 *
 * Records SaaS billing events, plan upgrades, payment provider order IDs,
 * cryptographic signature verification status, and idempotency keys to
 * prevent duplicate webhook processing.
 */

const mongoose = require('mongoose');

const subscriptionTransactionSchema = new mongoose.Schema({
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
  business_name: {
    type: String,
    default: ''
  },
  user_id: {
    type: String,
    required: true
  },
  plan_id: {
    type: String,
    enum: ['free', 'starter', 'growth', 'pro'],
    required: true
  },
  plan_name: {
    type: String,
    default: ''
  },
  billing_cycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  payment_provider: {
    type: String,
    enum: ['razorpay', 'sandbox_dev', 'free_tier'],
    default: 'sandbox_dev'
  },
  provider_order_id: {
    type: String,
    default: '',
    index: true
  },
  provider_payment_id: {
    type: String,
    default: ''
  },
  provider_signature: {
    type: String,
    default: ''
  },
  idempotency_key: {
    type: String,
    unique: true,
    sparse: true
  },
  webhook_verified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed', 'refunded'],
    default: 'created'
  },
  period_start: {
    type: String,
    default: ''
  },
  period_end: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SubscriptionTransaction', subscriptionTransactionSchema);
