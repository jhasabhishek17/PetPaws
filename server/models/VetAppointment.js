/**
 * Vet Appointment Consultation Mongoose Model
 * 
 * Stores scheduled veterinarian consultation appointments between pet owners and vets.
 */

const mongoose = require('mongoose');

const vetAppointmentSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true, index: true },
  buyer_id: { type: String, required: true },
  buyer_name: { type: String, required: true },
  vet_id: { type: String, required: true },
  vet_name: { type: String, required: true },
  pet_name: { type: String, required: true },
  appointment_date: { type: String, required: true },
  time_slot: { type: String, required: true },
  type: { type: String, default: 'General Consultation' },
  fee: { type: Number, default: 40 },
  original_fee: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  discount_info: { type: Object, default: null },
  status: { type: String, default: 'Confirmed' },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('VetAppointment', vetAppointmentSchema);
