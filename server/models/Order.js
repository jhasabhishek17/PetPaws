/**
 * Order & Tracking Mongoose Model
 * 
 * Records pet purchase transactions, buyer information, price breakdowns,
 * simulated payment statuses, tracking codes, and live transport updates.
 */

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order ID string (e.g. ORD-849201)
  custom_id: { 
    type: String, 
    unique: true, 
    index: true 
  },
  // Buyer Details
  buyer_id: { type: String, required: true },
  buyer_name: { type: String, required: true },
  buyer_email: { type: String, required: true },
  buyer_phone: { type: String, default: '' },
  shipping_address: { type: String, required: true },
  
  // Purchased Pet Details
  pet_id: { type: String, required: true },
  pet_title: { type: String, required: true },
  pet_category: { type: String, default: 'Dogs' },
  pet_image: { type: String, default: '' },
  
  // Seller Details
  seller_id: { type: String, required: true },
  seller_name: { type: String, default: 'Verified Seller' },
  
  // Financial breakdown
  price: { type: Number, required: true },
  tax: { type: Number, required: true },
  total_amount: { type: Number, required: true },
  
  // Payment Status (UPI, Card, NetBanking)
  payment_method: { type: String, default: 'UPI' },
  payment_status: { type: String, default: 'Completed' },
  
  // Package Transport Tracking
  tracking_code: { type: String, required: true, unique: true, index: true },
  tracking_status: { type: String, default: 'Order Placed' },
  estimated_delivery: { type: String, default: 'Within 2-3 Business Days' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
