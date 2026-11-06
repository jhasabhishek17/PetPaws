/**
 * Grooming & Care Service Mongoose Model
 * 
 * Defines spa, grooming, dental, and training service packages.
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

const groomingServiceSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true, index: true },
  business_id: { type: String, default: '' },
  provider_id: { type: String, default: '' },
  provider_name: { type: String, default: 'PetPaws Grooming & Spa Studio' },
  title: { type: String, required: true },
  category: { type: String, default: 'Grooming' },
  price: { type: Number, required: true },
  duration: { type: String, default: '60 Mins' },
  description: { type: String, default: '' },
  image_url: { type: String, default: '' },
  status: { type: String, default: 'active' },
  discount: {
    type: discountSchema,
    default: () => ({ is_active: false, value: 0 })
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GroomingService', groomingServiceSchema);
