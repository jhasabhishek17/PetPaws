/**
 * Veterinarians & Appointments Controller
 * 
 * Manages veterinarian profile queries and consultation appointment bookings.
 * Supports dual persistence: Mongoose (MongoDB) & JSON file fallback.
 */

const VetProfile = require('../models/VetProfile');
const VetAppointment = require('../models/VetAppointment');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId } = require('../utils/dbHelpers');
const ExpressError = require('../utils/ExpressError');

const DEFAULT_VET_PROFILE = {
  specialization: 'Small Animal & Preventive Care',
  experience: '5 Years',
  qualifications: 'DVM, Board Certified Veterinarian',
  clinic_address: 'PetPaws Veterinary Wellness Center',
  consultation_fee: 50,
  rating: 4.9,
  reviews_count: 25,
  image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
  bio: 'Dedicated veterinary specialist providing telehealth and in-clinic preventive care.',
  available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  available_slots: ['09:30 AM', '11:00 AM', '02:00 PM', '04:30 PM']
};

/**
 * Helper to find or initialize a VetProfile for an authenticated vet user
 */
const ensureVetProfile = async (user) => {
  if (isMongoConnected()) {
    let profile = await VetProfile.findOne({
      $or: [{ user_id: user.id }, { custom_id: user.id }, { name: user.name }]
    });
    if (!profile) {
      profile = await VetProfile.create({
        custom_id: `vet-${Date.now()}`,
        user_id: user.id,
        name: user.name || 'Licensed Veterinarian',
        ...DEFAULT_VET_PROFILE
      });
    }
    return normalizeItem(profile);
  }

  const db = loadData();
  let profile = db.vet_profiles.find(v => v.user_id === user.id || v.id === user.id || v.name === user.name);
  if (!profile) {
    profile = {
      id: `vet-${Date.now()}`,
      user_id: user.id,
      name: user.name || 'Licensed Veterinarian',
      ...DEFAULT_VET_PROFILE
    };
    db.vet_profiles.push(profile);
    saveData(db);
  }
  return profile;
};

/**
 * Get available veterinarians
 * GET /api/vets
 */
const getVets = async (req, res) => {
  if (isMongoConnected()) {
    const vets = await VetProfile.find();
    return res.json({ success: true, vets: vets.map(normalizeItem) });
  }

  const db = loadData();
  res.json({ success: true, vets: db.vet_profiles });
};

/**
 * Schedule a new veterinarian consultation appointment (Protected)
 * POST /api/vets/appointments
 */
const createAppointment = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to schedule an appointment', 401);
  }

  const { vet_id, pet_name, appointment_date, time_slot, type, notes } = req.body;
  const buyer_id = req.user.id;
  const buyer_name = req.user.name;

  const trimmedPetName = typeof pet_name === 'string' ? pet_name.trim() : '';
  if (!vet_id || !appointment_date || !time_slot || !trimmedPetName) {
    throw new ExpressError('Vet ID, pet name, date, and time slot are required', 400);
  }

  const customId = `apt-${Date.now()}`;

  // MongoDB Branch
  if (isMongoConnected()) {
    const vet = await findDocByAnyId(VetProfile, vet_id);
    if (!vet) throw new ExpressError('Veterinarian profile not found', 404);

    const appointment = await VetAppointment.create({
      custom_id: customId,
      buyer_id,
      buyer_name: buyer_name || 'Verified Pet Owner',
      vet_id: vet.custom_id || vet.id || vet._id.toString(),
      vet_name: vet.name,
      pet_name: trimmedPetName,
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
  if (!vet) throw new ExpressError('Veterinarian profile not found', 404);

  const appointment = {
    id: customId,
    buyer_id,
    buyer_name: buyer_name || 'Verified Pet Owner',
    vet_id: vet.id,
    vet_name: vet.name,
    pet_name: trimmedPetName,
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
 * Get scheduled appointments for the authenticated buyer or vet
 * GET /api/vets/appointments
 */
const getAppointments = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to view appointments', 401);
  }

  const { buyerId, vetId } = req.query;

  if (isMongoConnected()) {
    let query = {};
    if (req.user.role === 'vet') {
      const profile = await ensureVetProfile(req.user);
      query.$or = [{ vet_id: profile.id }, { vet_id: req.user.id }, { vet_name: profile.name }];
    } else {
      if (buyerId && buyerId !== req.user.id) {
        throw new ExpressError('Not authorized to view another user\'s appointments', 403);
      }
      query.buyer_id = req.user.id;
    }

    const apts = await VetAppointment.find(query).sort({ appointment_date: 1 });
    return res.json({ success: true, appointments: apts.map(normalizeItem) });
  }

  const db = loadData();
  if (req.user.role === 'vet') {
    const profile = await ensureVetProfile(req.user);
    const apts = (db.vet_appointments || []).filter(a => a.vet_id === profile.id || a.vet_id === req.user.id || a.vet_name === profile.name);
    return res.json({ success: true, appointments: apts });
  }

  const apts = (db.vet_appointments || []).filter(a => a.buyer_id === req.user.id);
  res.json({ success: true, appointments: apts });
};

/**
 * Get authenticated veterinarian's own profile & appointments
 * GET /api/vets/my-profile
 */
const getMyVetProfile = async (req, res) => {
  if (!req.user || req.user.role !== 'vet') {
    throw new ExpressError('Only authenticated veterinarian accounts can access the Vet Portal', 403);
  }
  const profile = await ensureVetProfile(req.user);
  res.json({ success: true, vet: profile, profile });
};

/**
 * Update authenticated veterinarian's profile
 * PUT /api/vets/my-profile
 */
const updateMyVetProfile = async (req, res) => {
  if (!req.user || req.user.role !== 'vet') {
    throw new ExpressError('Only authenticated veterinarian accounts can update their profile', 403);
  }

  const profile = await ensureVetProfile(req.user);
  const ALLOWED = ['name', 'specialization', 'experience', 'qualifications', 'clinic_address', 'consultation_fee', 'bio', 'image_url', 'image_public_id', 'available_days', 'available_slots'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
  if (updates.consultation_fee !== undefined) updates.consultation_fee = Math.max(0, Number(updates.consultation_fee));

  if (isMongoConnected()) {
    const updated = await VetProfile.findOneAndUpdate(
      { custom_id: profile.id },
      { $set: updates },
      { new: true }
    );
    const normalized = normalizeItem(updated);
    return res.json({ success: true, vet: normalized, profile: normalized, message: 'Veterinary profile updated successfully' });
  }

  const db = loadData();
  const idx = db.vet_profiles.findIndex(v => v.id === profile.id);
  if (idx !== -1) {
    db.vet_profiles[idx] = { ...db.vet_profiles[idx], ...updates };
    saveData(db);
    return res.json({ success: true, vet: db.vet_profiles[idx], profile: db.vet_profiles[idx], message: 'Veterinary profile updated successfully' });
  }
  throw new ExpressError('Vet profile not found', 404);
};

/**
 * Update appointment status / notes (Authenticated Vet Only)
 * PUT /api/vets/appointments/:id/status
 */
const updateAppointmentStatus = async (req, res) => {
  if (!req.user || req.user.role !== 'vet') {
    throw new ExpressError('Only authenticated veterinarians can update appointment status', 403);
  }

  const { id } = req.params;
  const { status, notes } = req.body;
  const profile = await ensureVetProfile(req.user);

  if (isMongoConnected()) {
    const apt = await findDocByAnyId(VetAppointment, id);
    if (!apt) throw new ExpressError('Appointment not found', 404);
    if (apt.vet_id !== profile.id && apt.vet_id !== req.user.id) {
      throw new ExpressError('Not authorized to modify another veterinarian\'s appointment', 403);
    }
    if (status) apt.status = status;
    if (notes !== undefined) apt.notes = notes;
    await apt.save();
    return res.json({ success: true, appointment: normalizeItem(apt), message: 'Appointment updated' });
  }

  const db = loadData();
  const idx = db.vet_appointments.findIndex(a => a.id === id);
  if (idx === -1) throw new ExpressError('Appointment not found', 404);
  if (db.vet_appointments[idx].vet_id !== profile.id && db.vet_appointments[idx].vet_id !== req.user.id) {
    throw new ExpressError('Not authorized to modify another veterinarian\'s appointment', 403);
  }
  if (status) db.vet_appointments[idx].status = status;
  if (notes !== undefined) db.vet_appointments[idx].notes = notes;
  saveData(db);
  res.json({ success: true, appointment: db.vet_appointments[idx], message: 'Appointment updated' });
};

/**
 * Cancel a veterinary consultation appointment (Buyer who booked it, or the assigned Vet)
 * PUT /api/vets/appointments/:id/cancel
 */
const cancelAppointment = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to cancel an appointment', 401);
  }

  const { id } = req.params;

  // MongoDB Branch
  if (isMongoConnected()) {
    const apt = await findDocByAnyId(VetAppointment, id);
    if (!apt) throw new ExpressError('Appointment not found', 404);

    const isOwnerBuyer = apt.buyer_id === req.user.id;
    const isAssignedVet = apt.vet_id === req.user.id;
    let isMatchingVetProfile = false;
    if (req.user.role === 'vet') {
      const profile = await ensureVetProfile(req.user);
      if (profile && (apt.vet_id === profile.id || apt.vet_name === profile.name)) {
        isMatchingVetProfile = true;
      }
    }

    if (!isOwnerBuyer && !isAssignedVet && !isMatchingVetProfile) {
      throw new ExpressError('Not authorized to cancel this appointment', 403);
    }
    if (apt.status === 'Cancelled') {
      throw new ExpressError('Appointment is already cancelled', 400);
    }
    if (apt.status === 'Completed') {
      throw new ExpressError('Completed appointments cannot be cancelled', 400);
    }

    apt.status = 'Cancelled';
    await apt.save();

    return res.json({
      success: true,
      appointment: normalizeItem(apt),
      message: 'Veterinary appointment cancelled successfully'
    });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const idx = db.vet_appointments.findIndex(a => a.id === id);
  if (idx === -1) throw new ExpressError('Appointment not found', 404);

  const apt = db.vet_appointments[idx];
  const isOwnerBuyer = apt.buyer_id === req.user.id;
  const isAssignedVet = apt.vet_id === req.user.id;
  let isMatchingVetProfile = false;
  if (req.user.role === 'vet') {
    const profile = await ensureVetProfile(req.user);
    if (profile && (apt.vet_id === profile.id || apt.vet_name === profile.name)) {
      isMatchingVetProfile = true;
    }
  }

  if (!isOwnerBuyer && !isAssignedVet && !isMatchingVetProfile) {
    throw new ExpressError('Not authorized to cancel this appointment', 403);
  }
  if (apt.status === 'Cancelled') {
    throw new ExpressError('Appointment is already cancelled', 400);
  }
  if (apt.status === 'Completed') {
    throw new ExpressError('Completed appointments cannot be cancelled', 400);
  }

  db.vet_appointments[idx].status = 'Cancelled';
  saveData(db);

  res.json({
    success: true,
    appointment: db.vet_appointments[idx],
    message: 'Veterinary appointment cancelled successfully'
  });
};

module.exports = {
  getVets,
  createAppointment,
  getAppointments,
  getMyVetProfile,
  updateMyVetProfile,
  updateAppointmentStatus,
  cancelAppointment
};
