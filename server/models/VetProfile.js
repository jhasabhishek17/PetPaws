const mongoose = require('mongoose');

const vetProfileSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true },
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
  bio: { type: String, default: '' },
  available_days: [{ type: String }],
  available_slots: [{ type: String }]
}, {
  timestamps: true
});

module.exports = mongoose.model('VetProfile', vetProfileSchema);
