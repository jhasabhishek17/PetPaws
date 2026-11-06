/**
 * Veterinarian Profile Mongoose Model
 * 
 * Stores licensed veterinarian credentials, clinic addresses, specialties,
 * consultation fees, experience, ratings, and available appointment time slots.
 */

const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  value: {
    type: Number,
    min: 0,
    default: 0
  },
  start_date: {
    type: String,
    default: ''
  },
  end_date: {
    type: String,
    default: ''
  },
  is_active: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  min_purchase: {
    type: Number,
    default: 0
  },
  max_discount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const vetProfileSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true, index: true },
  user_id: { type: String, required: true },
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  experience: { type: String, default: '5 Years' },
  qualifications: { type: String, default: 'DVM' },
  clinic_address: { type: String, required: true },
  consultation_fee: { type: Number, required: true },
  rating: { type: Number, default: 4.8 },
  reviews_count: { type: Number, default: 50 },
  image_url: { type: String, default: '' },
  image_public_id: { type: String, default: '' },
  bio: { type: String, default: '' },
  available_days: [{ type: String }],
  available_slots: [{ type: String }],
  discount: {
    type: discountSchema,
    default: () => ({ is_active: false, value: 0 })
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VetProfile', vetProfileSchema);
