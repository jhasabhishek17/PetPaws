const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'seller', 'vet'], default: 'buyer' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  upi_id: { type: String, default: '' },
  bank_name: { type: String, default: '' },
  bank_account: { type: String, default: '' },
  ifsc_code: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
