/**
 * Grooming & Care Service Mongoose Model
 * 
 * Defines spa, grooming, dental, and training service packages.
 */

const mongoose = require('mongoose');

const groomingServiceSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true, index: true },
  title: { type: String, required: true },
  category: { type: String, default: 'Grooming' },
  price: { type: Number, required: true },
  duration: { type: String, default: '60 Mins' },
  description: { type: String, default: '' },
  image_url: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('GroomingService', groomingServiceSchema);
