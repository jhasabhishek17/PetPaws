const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true },
  buyer_id: { type: String, required: true },
  buyer_name: { type: String, required: true },
  buyer_email: { type: String, required: true },
  buyer_phone: { type: String, default: '' },
  shipping_address: { type: String, required: true },
  pet_id: { type: String, required: true },
  pet_title: { type: String, required: true },
  pet_category: { type: String, default: 'Dogs' },
  pet_image: { type: String, default: '' },
  seller_id: { type: String, required: true },
  seller_name: { type: String, default: 'Verified Seller' },
  price: { type: Number, required: true },
  tax: { type: Number, required: true },
  total_amount: { type: Number, required: true },
  payment_method: { type: String, default: 'UPI' },
  payment_status: { type: String, default: 'Completed' },
  tracking_code: { type: String, required: true, unique: true },
  tracking_status: { type: String, default: 'Order Placed' },
  estimated_delivery: { type: String, default: 'Within 2-3 Business Days' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
