/**
 * Grooming Booking Reservation Mongoose Model
 * 
 * Stores user reservations for pet grooming and spa packages.
 */

const mongoose = require('mongoose');

const groomingBookingSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true, index: true },
  buyer_id: { type: String, required: true },
  buyer_name: { type: String, required: true },
  service_id: { type: String, required: true },
  service_title: { type: String, required: true },
  business_id: { type: String, default: '' },
  provider_id: { type: String, default: '' },
  price: { type: Number, default: 55 },
  booking_date: { type: String, required: true },
  time_slot: { type: String, required: true },
  status: { type: String, default: 'Scheduled' },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('GroomingBooking', groomingBookingSchema);
