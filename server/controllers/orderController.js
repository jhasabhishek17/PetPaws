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
  if (req.user.role !== 'buyer') {
    throw new ExpressError('Only buyer accounts can place pet orders', 403);
  }

  const { buyer_phone, shipping_address, pet_id, payment_method, payment_details } = req.body;
  const buyer_id = req.user.id;

  if (!pet_id || typeof pet_id !== 'string' || !pet_id.trim()) {
    throw new ExpressError('Pet ID is required for checkout', 400);
  }

  const trimmedAddress = typeof shipping_address === 'string' ? shipping_address.trim() : '';
  if (!trimmedAddress || trimmedAddress.length < 5) {
    throw new ExpressError('A valid delivery address is required for checkout', 400);
  }

  const trimmedPhone = typeof buyer_phone === 'string' ? buyer_phone.trim() : '';
  if (!trimmedPhone || trimmedPhone.replace(/\D/g, '').length < 7) {
    throw new ExpressError('A valid contact phone number is required for checkout', 400);
  }

  const ALLOWED_METHODS = ['UPI', 'NetBanking', 'Card'];
  if (!payment_method || !ALLOWED_METHODS.includes(payment_method)) {
    throw new ExpressError('Valid payment method (UPI, NetBanking, or Card) is required', 400);
  }

  if (payment_method === 'UPI') {
    const upi = typeof payment_details?.upi_id === 'string' ? payment_details.upi_id.trim() : '';
    if (!upi || !/^[\w.-]+@[\w.-]+$/.test(upi)) {
      throw new ExpressError('A valid UPI ID is required for UPI payment', 400);
    }
  } else if (payment_method === 'NetBanking') {
    const bank = typeof payment_details?.bank_name === 'string' ? payment_details.bank_name.trim() : '';
    if (!bank) {
      throw new ExpressError('Bank selection is required for NetBanking payment', 400);
    }
  } else if (payment_method === 'Card') {
    const last4 = typeof payment_details?.card_last4 === 'string' ? payment_details.card_last4.trim() : '';
    if (!/^\d{4}$/.test(last4)) {
      throw new ExpressError('Valid card details are required for card payment', 400);
    }
  }

  // MongoDB Branch
  if (isMongoConnected()) {
    const petLookup = await findDocByAnyId(Pet, pet_id);

    if (!petLookup) throw new ExpressError('Pet listing not found', 404);
    if (petLookup.seller_id === req.user.id) {
      throw new ExpressError('Sellers cannot order their own listings', 403);
    }

    // Atomically decrement stock only if stock > 0 and status === 'active'
    const pet = await Pet.findOneAndUpdate(
      { _id: petLookup._id, stock: { $gt: 0 }, status: 'active' },
      { $inc: { stock: -1 } },
      { new: true }
    );

    if (!pet) {
      throw new ExpressError('Sorry, this pet is no longer available!', 400);
    }

    if (pet.stock === 0 && pet.status !== 'sold') {
      pet.status = 'sold';
      await pet.save();
    }

    const { tax, total_amount } = calculateOrderTotals(pet.price);
    const { orderId, trackingCode } = generateOrderIds();

    const newOrder = await Order.create({
      custom_id: orderId,
      buyer_id,
      buyer_name: req.user.name || 'Verified Buyer',
      buyer_email: req.user.email || '',
      buyer_phone: trimmedPhone,
      shipping_address: trimmedAddress,
      pet_id: pet.custom_id || pet._id.toString(),
      pet_title: pet.title,
      pet_category: pet.category,
      pet_image: pet.image_url,
      seller_id: pet.seller_id,
      seller_name: pet.seller_name,
      price: pet.price,
      tax,
      total_amount,
      payment_method,
      payment_status: 'Simulated Paid',
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
    buyer_name: req.user.name || 'Verified Buyer',
    buyer_email: req.user.email || '',
    buyer_phone: trimmedPhone,
    shipping_address: trimmedAddress,
    pet_id: pet.id,
    pet_title: pet.title,
    pet_category: pet.category,
    pet_image: pet.image_url,
    seller_id: pet.seller_id,
    seller_name: pet.seller_name,
    price: pet.price,
    tax,
    total_amount,
    payment_method,
    payment_status: 'Simulated Paid',
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

  const validateTransition = (currentStatus, nextStatus) => {
    if (currentStatus === 'Cancelled') {
      throw new ExpressError('Cancelled orders cannot be updated', 400);
    }
    if (currentStatus === 'Delivered' && nextStatus !== 'Delivered') {
      throw new ExpressError('Delivered orders cannot be reverted to an earlier status', 400);
    }
    const currentIndex = VALID_STATUSES.indexOf(currentStatus);
    const nextIndex = VALID_STATUSES.indexOf(nextStatus);
    if (currentIndex !== -1 && nextIndex < currentIndex) {
      throw new ExpressError(`Cannot move order backwards from "${currentStatus}" to "${nextStatus}"`, 400);
    }
  };

  if (isMongoConnected()) {
    const order = await findDocByAnyId(Order, id);
    if (!order) throw new ExpressError('Order not found', 404);
    if (order.seller_id !== req.user.id) {
      throw new ExpressError('Not authorized to update this order', 403);
    }
    validateTransition(order.tracking_status, tracking_status);
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
  validateTransition(db.orders[idx].tracking_status, tracking_status);
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
