const mongoose = require('mongoose');

const groomingBookingSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true },
  buyer_id: { type: String, required: true },
  buyer_name: { type: String, required: true },
  service_id: { type: String, required: true },
  service_title: { type: String, required: true },
  booking_date: { type: String, required: true },
  time_slot: { type: String, required: true },
  status: { type: String, default: 'Scheduled' }
}, {
  timestamps: true
});

module.exports = mongoose.model('GroomingBooking', groomingBookingSchema);
