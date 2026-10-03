/**
 * Veterinarians & Appointments Controller
 * 
 * Manages veterinarian profile queries and consultation appointment bookings.
 * Supports dual persistence: Mongoose (MongoDB / MongoDB Atlas) & JSON file fallback.
 */

const VetProfile = require('../models/VetProfile');
const VetAppointment = require('../models/VetAppointment');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const ExpressError = require('../utils/ExpressError');
const mongoose = require('mongoose');

/**
 * Get list of all verified veterinarians
 * GET /api/vets
 */
const getVets = async (req, res) => {
  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const vets = await VetProfile.find();
    const normalizedVets = vets.map(normalizeItem);
    return res.json({ success: true, vets: normalizedVets });
  }

  // Fallback JSON File Branch
  const db = loadData();
  res.json({ success: true, vets: db.vet_profiles });
};

/**
 * Schedule a new veterinarian consultation appointment
 * POST /api/vets/appointments
 */
const createAppointment = async (req, res) => {
  const { buyer_id, buyer_name, vet_id, pet_name, appointment_date, time_slot, type, notes } = req.body;

  if (!vet_id || !appointment_date || !time_slot) {
    throw new ExpressError('Vet ID, date, and time slot are required', 400);
  }

  const customId = `apt-${Date.now()}`;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    const vet = await VetProfile.findOne({
      $or: [{ custom_id: vet_id }, { id: vet_id }, { _id: mongoose.Types.ObjectId.isValid(vet_id) ? vet_id : null }]
    });

    if (!vet) {
      throw new ExpressError('Veterinarian profile not found', 404);
    }

    const appointment = await VetAppointment.create({
      custom_id: customId,
      buyer_id: buyer_id || 'u-buyer-1',
      buyer_name: buyer_name || 'Alex Morgan',
      vet_id: vet.custom_id || vet.id || vet._id.toString(),
      vet_name: vet.name,
      pet_name: pet_name || 'Pet',
      appointment_date,
      time_slot,
      type: type || 'General Consultation',
      status: 'Confirmed',
      notes: notes || ''
    });

    return res.status(201).json({
      success: true,
      appointment: normalizeItem(appointment),
      message: `Appointment scheduled with ${vet.name}!`
    });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const vet = db.vet_profiles.find(v => v.id === vet_id);
  if (!vet) {
    throw new ExpressError('Veterinarian profile not found', 404);
  }

  const appointment = {
    id: customId,
    buyer_id: buyer_id || 'u-buyer-1',
    buyer_name: buyer_name || 'Alex Morgan',
    vet_id: vet.id,
    vet_name: vet.name,
    pet_name: pet_name || 'Pet',
    appointment_date,
    time_slot,
    type: type || 'General Consultation',
    status: 'Confirmed',
    notes: notes || '',
    created_at: new Date().toISOString()
  };

  db.vet_appointments.unshift(appointment);
  saveData(db);
  res.status(201).json({ success: true, appointment, message: `Appointment scheduled with ${vet.name}!` });
};

/**
 * Get scheduled appointments for a buyer or vet
 * GET /api/vets/appointments
 */
const getAppointments = async (req, res) => {
  const { buyerId, vetId } = req.query;

  // MongoDB / Atlas Branch
  if (isMongoConnected()) {
    let query = {};
    if (buyerId) query.buyer_id = buyerId;
    else if (vetId) query.vet_id = vetId;

    const apts = await VetAppointment.find(query).sort({ createdAt: -1 });
    const normalizedApts = apts.map(normalizeItem);
    return res.json({ success: true, appointments: normalizedApts });
  }

  // Fallback JSON File Branch
  const db = loadData();
  let apts = db.vet_appointments;
  if (buyerId) apts = apts.filter(a => a.buyer_id === buyerId);
  else if (vetId) apts = apts.filter(a => a.vet_id === vetId);

  res.json({ success: true, appointments: apts });
};

module.exports = {
  getVets,
  createAppointment,
  getAppointments
};
