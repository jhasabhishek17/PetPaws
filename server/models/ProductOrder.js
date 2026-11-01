/**
 * ProductOrder Mongoose Model (Multi-Vendor Pet Products Orders)
 *
 * Stores customer cart checkouts for physical pet products. Supports multiple
 * line items across one or more shopkeepers, variant tracking, server-side
 * tax & commission calculations, order fulfillment statuses, cancellations
 * with automatic stock restoration, and return/refund requests.
 */

const mongoose = require('mongoose');

const orderLineItemSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, default: '' },
  brand: { type: String, default: '' },
  variant_id: { type: String, default: '' },
  variant_label: { type: String, default: 'Standard' },
  quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true, min: 0 },
  line_total: { type: Number, required: true, min: 0 },
  image_url: { type: String, default: '' },
  seller_id: { type: String, required: true },
  seller_name: { type: String, default: '' },
  business_id: { type: String, required: true },
  business_name: { type: String, default: '' },
  item_status: {
    type: String,
    enum: ['Order Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Return Requested', 'Returned'],
    default: 'Order Placed'
  }
}, { _id: false });

const productOrderSchema = new mongoose.Schema({
  custom_id: {
    type: String,
    unique: true,
    index: true
  },
  buyer_id: {
    type: String,
    required: true,
    index: true
  },
  buyer_name: {
    type: String,
    required: true
  },
  buyer_email: {
    type: String,
    required: true
  },
  buyer_phone: {
    type: String,
    required: true
  },
  shipping_address: {
    type: String,
    required: true
  },
  items: {
    type: [orderLineItemSchema],
    required: true
  },
  // Array of distinct seller_ids and business_ids involved in this order for fast tenant filtering
  seller_ids: {
    type: [String],
    index: true,
    default: []
  },
  business_ids: {
    type: [String],
    index: true,
    default: []
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0
  },
  shipping_fee: {
    type: Number,
    default: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  platform_commission: {
    type: Number,
    default: 0
  },
  payment_method: {
    type: String,
    default: 'UPI'
  },
  payment_status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Completed'
  },
  payment_provider_order_id: {
    type: String,
    default: ''
  },
  payment_provider_payment_id: {
    type: String,
    default: ''
  },
  tracking_code: {
    type: String,
    required: true,
    index: true
  },
  tracking_status: {
    type: String,
    enum: ['Order Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Return Requested', 'Returned'],
    default: 'Order Placed'
  },
  estimated_delivery: {
    type: String,
    default: 'Within 2-4 Business Days'
  },
  return_reason: {
    type: String,
    default: ''
  },
  return_status: {
    type: String,
    enum: ['None', 'Requested', 'Approved', 'Rejected', 'Refunded'],
    default: 'None'
  },
  cancelled_at: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProductOrder', productOrderSchema);
