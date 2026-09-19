const mongoose = require('mongoose');

const vetAppointmentSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true },
  buyer_id: { type: String, required: true },
  buyer_name: { type: String, required: true },
  vet_id: { type: String, required: true },
  vet_name: { type: String, required: true },
  pet_name: { type: String, required: true },
  appointment_date: { type: String, required: true },
  time_slot: { type: String, required: true },
  type: { type: String, default: 'General Consultation' },
  status: { type: String, default: 'Confirmed' },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('VetAppointment', vetAppointmentSchema);
