/**
 * Grooming & Care Services Controller
 * 
 * Manages available pet care packages (grooming, spa, training) and booking requests.
 * Supports dual persistence: Mongoose (MongoDB / MongoDB Atlas) & JSON file fallback.
 */

const GroomingService = require('../models/GroomingService');
const GroomingBooking = require('../models/GroomingBooking');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const ExpressError = require('../utils/ExpressError');
const mongoose = require('mongoose');

/**
 * Get available grooming & care services
 * GET /api/services
 */
const getServices = async (req, res) => {
  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const services = await GroomingService.find();
    const normalizedServices = services.map(normalizeItem);
    return res.json({ success: true, services: normalizedServices });
  }

  // Fallback JSON File Branch
  const db = loadData();
  res.json({ success: true, services: db.grooming_services });
};

/**
 * Book a grooming session or training package
 * POST /api/services/book
 */
const bookService = async (req, res) => {
  const { buyer_id, buyer_name, service_id, booking_date, time_slot } = req.body;

  if (!service_id || !booking_date || !time_slot) {
    throw new ExpressError('Service ID, date, and time slot are required', 400);
  }

  const customId = `grm-${Date.now()}`;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const srv = await GroomingService.findOne({
      $or: [{ custom_id: service_id }, { id: service_id }, { _id: mongoose.Types.ObjectId.isValid(service_id) ? service_id : null }]
    });

    if (!srv) {
      throw new ExpressError('Service not found', 404);
    }

    const booking = await GroomingBooking.create({
      custom_id: customId,
      buyer_id: buyer_id || 'u-buyer-1',
      buyer_name: buyer_name || 'Alex Morgan',
      service_id: srv.custom_id || srv.id || srv._id.toString(),
      service_title: srv.title,
      booking_date,
      time_slot,
      status: 'Scheduled'
    });

    return res.status(201).json({
      success: true,
      booking: normalizeItem(booking),
      message: `${srv.title} session booked successfully!`
    });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const srv = db.grooming_services.find(s => s.id === service_id);
  if (!srv) {
    throw new ExpressError('Service not found', 404);
  }

  const booking = {
    id: customId,
    buyer_id: buyer_id || 'u-buyer-1',
    buyer_name: buyer_name || 'Alex Morgan',
    service_id: srv.id,
    service_title: srv.title,
    booking_date,
    time_slot,
    status: 'Scheduled',
    created_at: new Date().toISOString()
  };

  db.grooming_bookings.unshift(booking);
  saveData(db);
  res.status(201).json({ success: true, booking, message: `${srv.title} session booked successfully!` });
};

module.exports = {
  getServices,
  bookService
};
