const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true },
  seller_id: { type: String, required: true },
  seller_name: { type: String, default: 'Verified Seller' },
  title: { type: String, required: true },
  category: { type: String, required: true, default: 'Dogs' },
  price: { type: Number, required: true, default: 0 },
  age: { type: String, default: 'Young' },
  breed: { type: String, default: 'Mixed' },
  gender: { type: String, default: 'Male' },
  health_status: { type: String, default: 'Health Checked & Vaccinated' },
  description: { type: String, default: '' },
  image_url: { type: String, default: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80' },
  stock: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'sold', 'unlisted'], default: 'active' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Pet', petSchema);
