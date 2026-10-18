/**
 * Grooming & Care Services Controller
 * 
 * Manages available pet care packages (grooming, spa, training) and booking requests.
 * Supports dual persistence: Mongoose (MongoDB) & JSON file fallback.
 */

const GroomingService = require('../models/GroomingService');
const GroomingBooking = require('../models/GroomingBooking');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId } = require('../utils/dbHelpers');
const ExpressError = require('../utils/ExpressError');

/**
 * Get available grooming & care services
 * GET /api/services
 */
const getServices = async (req, res) => {
  if (isMongoConnected()) {
    const services = await GroomingService.find();
    return res.json({ success: true, services: services.map(normalizeItem) });
  }

  const db = loadData();
  res.json({ success: true, services: db.grooming_services });
};

/**
 * Book a grooming session or training package
 * POST /api/services/book
 */
const bookService = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to book a service', 401);
  }
  const { service_id, booking_date, time_slot } = req.body;
  const buyer_id = req.user.id;
  const buyer_name = req.user.name;

  if (!service_id || !booking_date || !time_slot) {
    throw new ExpressError('Service ID, date, and time slot are required', 400);
  }

  const customId = `grm-${Date.now()}`;

  // MongoDB Branch
  if (isMongoConnected()) {
    const srv = await findDocByAnyId(GroomingService, service_id);
    if (!srv) throw new ExpressError('Service not found', 404);

    const booking = await GroomingBooking.create({
      custom_id: customId,
      buyer_id,
      buyer_name: buyer_name || 'Verified Pet Owner',
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
  if (!srv) throw new ExpressError('Service not found', 404);

  const booking = {
    id: customId,
    buyer_id,
    buyer_name: buyer_name || 'Verified Pet Owner',
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

/**
 * Get scheduled grooming & training bookings for the authenticated user
 * GET /api/services/bookings
 */
const getBookings = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to view bookings', 401);
  }
  const { buyerId } = req.query;
  if (buyerId && buyerId !== req.user.id) {
    throw new ExpressError('Not authorized to view another user\'s bookings', 403);
  }

  if (isMongoConnected()) {
    const bookings = await GroomingBooking.find({ buyer_id: req.user.id }).sort({ createdAt: -1 });
    return res.json({ success: true, bookings: bookings.map(normalizeItem) });
  }

  const db = loadData();
  const bookings = (db.grooming_bookings || []).filter(b => b.buyer_id === req.user.id);
  res.json({ success: true, bookings });
};

/**
 * Cancel a grooming or spa booking (Buyer only)
 * PUT /api/services/bookings/:id/cancel
 */
const cancelBooking = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to cancel a booking', 401);
  }

  const { id } = req.params;

  // MongoDB Branch
  if (isMongoConnected()) {
    const booking = await findDocByAnyId(GroomingBooking, id);
    if (!booking) throw new ExpressError('Booking not found', 404);

    if (booking.buyer_id !== req.user.id) {
      throw new ExpressError('Not authorized to cancel this booking', 403);
    }
    if (booking.status === 'Cancelled') {
      throw new ExpressError('Booking is already cancelled', 400);
    }
    if (booking.status === 'Completed') {
      throw new ExpressError('Completed bookings cannot be cancelled', 400);
    }

    booking.status = 'Cancelled';
    await booking.save();

    return res.json({
      success: true,
      booking: normalizeItem(booking),
      message: 'Booking cancelled successfully.'
    });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const idx = (db.grooming_bookings || []).findIndex(b => b.id === id);
  if (idx === -1) throw new ExpressError('Booking not found', 404);

  const booking = db.grooming_bookings[idx];
  if (booking.buyer_id !== req.user.id) {
    throw new ExpressError('Not authorized to cancel this booking', 403);
  }
  if (booking.status === 'Cancelled') {
    throw new ExpressError('Booking is already cancelled', 400);
  }
  if (booking.status === 'Completed') {
    throw new ExpressError('Completed bookings cannot be cancelled', 400);
  }

  booking.status = 'Cancelled';
  saveData(db);

  res.json({
    success: true,
    booking,
    message: 'Booking cancelled successfully.'
  });
};

module.exports = {
  getServices,
  bookService,
  getBookings,
  cancelBooking
};
