/**
 * Orders & Tracking Controller
 * 
 * Handles order checkout simulation, stock decrementing, payment processing,
 * order history queries, status updates, and cancellation with inventory restocking.
 * Supports dual persistence: Mongoose (MongoDB) & JSON file fallback.
 */

const Order = require('../models/Order');
const Pet = require('../models/Pet');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId } = require('../utils/dbHelpers');
const ExpressError = require('../utils/ExpressError');
const mongoose = require('mongoose');

// Shared helpers for checkout calculations
const calculateOrderTotals = (price) => {
  const tax = Math.round(price * 0.08);
  return { tax, total_amount: price + tax };
};

const generateOrderIds = () => ({
  orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
  trackingCode: `TRACK-PET-${Math.floor(100000 + Math.random() * 900000)}`
});

/**
 * Process order checkout for a pet
 * POST /api/orders/checkout
 */
const createCheckoutOrder = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to place an order', 401);
  }

  const { buyer_name, buyer_email, buyer_phone, shipping_address, pet_id, payment_method } = req.body;
  const buyer_id = req.user.id;

  if (!pet_id) {
    throw new ExpressError('Pet ID is required for checkout', 400);
  }

  // MongoDB Branch
  if (isMongoConnected()) {
    const pet = await findDocByAnyId(Pet, pet_id);

    if (!pet) throw new ExpressError('Pet listing not found', 404);
    if (pet.seller_id === req.user.id) {
      throw new ExpressError('Sellers cannot order their own listings', 403);
    }
    if (pet.stock <= 0 || pet.status !== 'active') {
      throw new ExpressError('Sorry, this pet is no longer available!', 400);
    }

    pet.stock -= 1;
    if (pet.stock === 0) pet.status = 'sold';
    await pet.save();

    const { tax, total_amount } = calculateOrderTotals(pet.price);
    const { orderId, trackingCode } = generateOrderIds();

    const newOrder = await Order.create({
      custom_id: orderId,
      buyer_id,
      buyer_name: req.user.name || buyer_name || 'Verified Buyer',
      buyer_email: req.user.email || buyer_email || '',
      buyer_phone: buyer_phone || '+1 (555) 234-5678',
      shipping_address: shipping_address || '123 Main Street, City',
      pet_id: pet.custom_id || pet._id.toString(),
      pet_title: pet.title,
      pet_category: pet.category,
      pet_image: pet.image_url,
      seller_id: pet.seller_id,
      seller_name: pet.seller_name,
      price: pet.price,
      tax,
      total_amount,
      payment_method: payment_method || 'UPI',
      payment_status: 'Completed',
      tracking_code: trackingCode,
      tracking_status: 'Order Placed',
      estimated_delivery: 'Within 2-3 Business Days'
    });

    return res.status(201).json({ success: true, order: normalizeItem(newOrder), message: 'Order placed successfully!' });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const pet = db.pets.find(p => p.id === pet_id);
  if (!pet) throw new ExpressError('Pet listing not found', 404);
  if (pet.seller_id === req.user.id) {
    throw new ExpressError('Sellers cannot order their own listings', 403);
  }
  if (pet.stock <= 0 || pet.status !== 'active') {
    throw new ExpressError('Sorry, this pet is no longer available!', 400);
  }

  pet.stock -= 1;
  if (pet.stock === 0) pet.status = 'sold';

  const { tax, total_amount } = calculateOrderTotals(pet.price);
  const { orderId, trackingCode } = generateOrderIds();

  const newOrder = {
    id: orderId,
    buyer_id,
    buyer_name: req.user.name || buyer_name || 'Verified Buyer',
    buyer_email: req.user.email || buyer_email || '',
    buyer_phone: buyer_phone || '+1 (555) 234-5678',
    shipping_address: shipping_address || '123 Main Street, City',
    pet_id: pet.id,
    pet_title: pet.title,
    pet_category: pet.category,
    pet_image: pet.image_url,
    seller_id: pet.seller_id,
    seller_name: pet.seller_name,
    price: pet.price,
    tax,
    total_amount,
    payment_method: payment_method || 'UPI',
    payment_status: 'Completed',
    tracking_code: trackingCode,
    tracking_status: 'Order Placed',
    estimated_delivery: 'Within 2-3 Business Days',
    created_at: new Date().toISOString()
  };

  db.orders.unshift(newOrder);
  saveData(db);
  res.status(201).json({ success: true, order: newOrder, message: 'Order placed successfully!' });
};

/**
 * Get list of orders for the authenticated buyer or seller
 * GET /api/orders
 */
const getOrders = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to view orders', 401);
  }

  const { buyerId: queryBuyerId, sellerId: querySellerId } = req.query;

  if (queryBuyerId && queryBuyerId !== req.user.id) {
    throw new ExpressError('Not authorized to view another user\'s orders', 403);
  }

  if (querySellerId) {
    if (req.user.role !== 'seller' || querySellerId !== req.user.id) {
      throw new ExpressError('Not authorized to view seller order records', 403);
    }
  }

  const filterBySeller = Boolean(querySellerId && req.user.role === 'seller');

  // MongoDB Branch
  if (isMongoConnected()) {
    const query = filterBySeller
      ? { seller_id: req.user.id }
      : { buyer_id: req.user.id };

    const orders = await Order.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, orders: orders.map(normalizeItem) });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const orders = filterBySeller
    ? db.orders.filter(o => o.seller_id === req.user.id)
    : db.orders.filter(o => o.buyer_id === req.user.id);

  res.json({ success: true, orders });
};

/**
 * Live order tracking status lookup (strictly visible only to the user who placed the order)
 * GET /api/orders/track/:code
 */
const getTrackOrder = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to track orders', 401);
  }

  const { code } = req.params;
  if (!code) throw new ExpressError('Tracking code or order ID required', 400);

  // MongoDB Branch
  if (isMongoConnected()) {
    const order = await Order.findOne({
      $or: [
        { tracking_code: code },
        { custom_id: code },
        { _id: mongoose.Types.ObjectId.isValid(code) ? code : null }
      ]
    });

    if (!order) throw new ExpressError('No tracking record found for this code', 404);
    if (order.buyer_id !== req.user.id) {
      throw new ExpressError('Not authorized to view this order', 403);
    }
    return res.json({ success: true, order: normalizeItem(order) });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const order = db.orders.find(o => o.tracking_code === code || o.id === code);
  if (!order) throw new ExpressError('No tracking record found for this code', 404);
  if (order.buyer_id !== req.user.id) {
    throw new ExpressError('Not authorized to view this order', 403);
  }

  res.json({ success: true, order });
};

/**
 * Update order tracking status (Owner Seller Only)
 * PUT /api/orders/:id/status
 */
const updateOrderStatus = async (req, res) => {
  if (!req.user || req.user.role !== 'seller') {
    throw new ExpressError('Only authenticated sellers can update order delivery status', 403);
  }

  const { id } = req.params;
  const { tracking_status } = req.body;
  const VALID_STATUSES = ['Order Placed', 'Health Check Completed', 'In Transit', 'Out for Delivery', 'Delivered'];
  if (!VALID_STATUSES.includes(tracking_status)) {
    throw new ExpressError('Invalid tracking status', 400);
  }

  if (isMongoConnected()) {
    const order = await findDocByAnyId(Order, id);
    if (!order) throw new ExpressError('Order not found', 404);
    if (order.seller_id !== req.user.id) {
      throw new ExpressError('Not authorized to update this order', 403);
    }
    order.tracking_status = tracking_status;
    if (tracking_status === 'Delivered') order.estimated_delivery = 'Delivered';
    await order.save();
    return res.json({ success: true, order: normalizeItem(order), message: `Order status updated to ${tracking_status}` });
  }

  const db = loadData();
  const idx = db.orders.findIndex(o => o.id === id);
  if (idx === -1) throw new ExpressError('Order not found', 404);
  if (db.orders[idx].seller_id !== req.user.id) {
    throw new ExpressError('Not authorized to update this order', 403);
  }
  db.orders[idx].tracking_status = tracking_status;
  if (tracking_status === 'Delivered') db.orders[idx].estimated_delivery = 'Delivered';
  saveData(db);
  res.json({ success: true, order: db.orders[idx], message: `Order status updated to ${tracking_status}` });
};

/**
 * Cancel an order (Buyer who placed it, or Seller of the pet)
 * PUT /api/orders/:id/cancel
 */
const cancelOrder = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to cancel an order', 401);
  }

  const { id } = req.params;

  // MongoDB Branch
  if (isMongoConnected()) {
    const order = await findDocByAnyId(Order, id);
    if (!order) throw new ExpressError('Order not found', 404);

    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
      throw new ExpressError('Not authorized to cancel this order', 403);
    }
    if (order.tracking_status === 'Cancelled') {
      throw new ExpressError('Order is already cancelled', 400);
    }
    if (order.tracking_status === 'Delivered') {
      throw new ExpressError('Delivered orders cannot be cancelled', 400);
    }

    order.tracking_status = 'Cancelled';
    order.payment_status = 'Refunded';
    order.estimated_delivery = 'Order Cancelled';
    await order.save();

    // Restock pet listing so it is available again
    if (order.pet_id) {
      await Pet.updateOne(
        { $or: [{ custom_id: order.pet_id }, { _id: mongoose.Types.ObjectId.isValid(order.pet_id) ? order.pet_id : null }] },
        { $inc: { stock: 1 }, $set: { status: 'active' } }
      );
    }

    return res.json({
      success: true,
      order: normalizeItem(order),
      message: 'Order cancelled successfully. Refund initiated and listing restocked.'
    });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const idx = db.orders.findIndex(o => o.id === id);
  if (idx === -1) throw new ExpressError('Order not found', 404);

  const order = db.orders[idx];
  if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
    throw new ExpressError('Not authorized to cancel this order', 403);
  }
  if (order.tracking_status === 'Cancelled') {
    throw new ExpressError('Order is already cancelled', 400);
  }
  if (order.tracking_status === 'Delivered') {
    throw new ExpressError('Delivered orders cannot be cancelled', 400);
  }

  order.tracking_status = 'Cancelled';
  order.payment_status = 'Refunded';
  order.estimated_delivery = 'Order Cancelled';

  const pet = db.pets.find(p => p.id === order.pet_id);
  if (pet) {
    pet.stock = (pet.stock || 0) + 1;
    pet.status = 'active';
  }

  saveData(db);
  res.json({
    success: true,
    order,
    message: 'Order cancelled successfully. Refund initiated and listing restocked.'
  });
};

module.exports = {
  createCheckoutOrder,
  getOrders,
  getTrackOrder,
  updateOrderStatus,
  cancelOrder
};
