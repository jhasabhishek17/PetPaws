/**
 * Orders & Tracking Controller
 * 
 * Handles order checkout simulation, stock decrementing, payment processing,
 * order history queries, and live order package tracking status lookup.
 * Supports dual persistence: Mongoose (MongoDB / MongoDB Atlas) & JSON file fallback.
 */

const Order = require('../models/Order');
const Pet = require('../models/Pet');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const ExpressError = require('../utils/ExpressError');
const mongoose = require('mongoose');

/**
 * Process order checkout for a pet
 * POST /api/orders/checkout
 */
const createCheckoutOrder = async (req, res) => {
  const { buyer_id, buyer_name, buyer_email, buyer_phone, shipping_address, pet_id, payment_method } = req.body;

  if (!pet_id) {
    throw new ExpressError('Pet ID is required for checkout', 400);
  }

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const pet = await Pet.findOne({
      $or: [{ custom_id: pet_id }, { _id: mongoose.Types.ObjectId.isValid(pet_id) ? pet_id : null }]
    });

    if (!pet || pet.stock <= 0 || pet.status !== 'active') {
      throw new ExpressError('Sorry, this pet is no longer available!', 400);
    }

    pet.stock -= 1;
    if (pet.stock === 0) pet.status = 'sold';
    await pet.save();

    const tax = Math.round(pet.price * 0.08);
    const total_amount = pet.price + tax;
    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingCode = `TRACK-PET-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = await Order.create({
      custom_id: orderId,
      buyer_id: buyer_id || 'u-buyer-1',
      buyer_name: buyer_name || 'Alex Morgan',
      buyer_email: buyer_email || 'buyer@petpaws.com',
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
  if (!pet || pet.stock <= 0 || pet.status !== 'active') {
    throw new ExpressError('Sorry, this pet is no longer available!', 400);
  }

  pet.stock -= 1;
  if (pet.stock === 0) pet.status = 'sold';

  const tax = Math.round(pet.price * 0.08);
  const total_amount = pet.price + tax;
  const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const trackingCode = `TRACK-PET-${Math.floor(100000 + Math.random() * 900000)}`;

  const newOrder = {
    id: orderId,
    buyer_id: buyer_id || 'u-buyer-1',
    buyer_name: buyer_name || 'Alex Morgan',
    buyer_email: buyer_email || 'buyer@petpaws.com',
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
 * Get list of orders for buyer or seller
 * GET /api/orders
 */
const getOrders = async (req, res) => {
  const { buyerId, sellerId } = req.query;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    let query = {};
    if (buyerId) query.buyer_id = buyerId;
    else if (sellerId) query.seller_id = sellerId;

    const orders = await Order.find(query).sort({ createdAt: -1 });
    const normalizedOrders = orders.map(normalizeItem);
    return res.json({ success: true, orders: normalizedOrders });
  }

  // Fallback JSON File Branch
  const db = loadData();
  let orders = db.orders;
  if (buyerId) orders = orders.filter(o => o.buyer_id === buyerId);
  else if (sellerId) orders = orders.filter(o => o.seller_id === sellerId);

  res.json({ success: true, orders });
};

/**
 * Live order tracking status lookup
 * GET /api/orders/track/:code
 */
const getTrackOrder = async (req, res) => {
  const { code } = req.params;

  if (!code) {
    throw new ExpressError('Tracking code or order ID required', 400);
  }

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const order = await Order.findOne({
      $or: [
        { tracking_code: code },
        { custom_id: code },
        { _id: mongoose.Types.ObjectId.isValid(code) ? code : null }
      ]
    });

    if (!order) {
      throw new ExpressError('No tracking record found for this code', 404);
    }
    return res.json({ success: true, order: normalizeItem(order) });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const order = db.orders.find(o => o.tracking_code === code || o.id === code);
  if (!order) {
    throw new ExpressError('No tracking record found for this code', 404);
  }

  res.json({ success: true, order });
};

module.exports = {
  createCheckoutOrder,
  getOrders,
  getTrackOrder
};
