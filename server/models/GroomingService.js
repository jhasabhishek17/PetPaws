/**
 * Grooming & Care Service Mongoose Model
 * 
 * Defines spa, grooming, dental, and training service packages.
 */

const mongoose = require('mongoose');

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
  status: { type: String, default: 'active' }
}, {
  timestamps: true
});

module.exports = mongoose.model('GroomingService', groomingServiceSchema);
