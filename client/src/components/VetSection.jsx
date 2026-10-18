import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Calendar,
  Clock,
  MapPin,
  Star,
  CheckCircle2,
  X,
  Award,
  Video,
  HeartPulse,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../utils/auth';
import PawBackdrop from './PawBackdrop';
import { AnimatedDog } from './PetIllustration';
import { PetCardSkeleton } from './PawLoader';

/**
 * VetSection Component
 * Directory of verified veterinarians with experience, consultation fee,
 * and direct appointment meeting scheduling dialogs.
 */
export default function VetSection({ currentUser, onRequireAuth, onAddToast }) {
  const [vets, setVets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedVet, setSelectedVet] = useState(null);
  const [loading, setLoading] = useState(true);

  // Appointment Form state
  const [petName, setPetName] = useState('Biscuit (Golden Retriever)');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];
  const [appointmentDate, setAppointmentDate] = useState(defaultDate);
  const [selectedSlot, setSelectedSlot] = useState('11:00 AM');
  const [consultationType, setConsultationType] = useState('General Checkup');
  const [notes, setNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    fetchVetsAndAppointments();
  }, [currentUser]);

  const fetchVetsAndAppointments = async () => {
    setLoading(true);
    try {
      const vetsRes = await apiGet('/api/vets');
      if (vetsRes.success) setVets(vetsRes.vets || []);

      if (currentUser) {
        const aptsRes = await apiGet('/api/vets/appointments');
        if (aptsRes.success) setAppointments(aptsRes.appointments || []);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('Error loading vet data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Schedule click with Guest protection
  const handleScheduleClick = (vet) => {
    const openModal = () => {
      setSelectedVet(vet);
      setSelectedSlot(vet.available_slots?.[0] || '10:00 AM');
      setBookingSuccess(null);
    };
    if (onRequireAuth) {
      onRequireAuth(`Please log in or register to schedule an appointment with ${vet.name}.`, openModal);
    } else {
      openModal();
    }
  };

  // Handle Scheduling Meeting
  const handleScheduleAppointment = async (e) => {
    e.preventDefault();
    try {
      const data = await apiPost('/api/vets/appointments', {
        vet_id: selectedVet.id,
        pet_name: petName,
        appointment_date: appointmentDate,
        time_slot: selectedSlot,
        type: consultationType,
        notes: notes
      });

      if (data.success) {
        setBookingSuccess(data.appointment);
        onAddToast?.(`Appointment scheduled with ${selectedVet.name}!`, 'success');
        fetchVetsAndAppointments();
      } else {
        onAddToast?.(data.message || 'Failed to schedule appointment', 'error');
      }
    } catch (err) {
      onAddToast?.('Failed to schedule appointment. Please try again.', 'error');
    }
  };

  const handleCancelAppointment = async (aptId) => {
    if (!aptId) return;
    const confirmed = window.confirm('Are you sure you want to cancel this veterinary consultation?');
    if (!confirmed) return;

    try {
      const data = await apiPut(`/api/vets/appointments/${aptId}/cancel`, {});
      if (data.success) {
        onAddToast?.(data.message || 'Appointment cancelled successfully.', 'success');
        fetchVetsAndAppointments();
      } else {
        onAddToast?.(data.message || 'Failed to cancel appointment.', 'error');
      }
    } catch (err) {
      onAddToast?.('An error occurred while cancelling appointment.', 'error');
    }
  };

  const statusBadge = (status) => {
    if (status === 'Cancelled') return 'bg-red-50 text-red-700 border-red-200';
    if (status === 'Confirmed') return 'bg-[#EAEFE9] text-[#2A5C4A] border-[#D1E7DD]';
    if (status === 'Completed') return 'bg-[#F3ECE0] text-[#4A4344] border-[#E6DCCF]';
    return 'bg-[#FFF5F0] text-[#E07A5F] border-[#F4C4B7]';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#E2EFE8] via-[#FAF6F0] to-[#FFF3E6] border border-[#D1E7DD] p-6 sm:p-10 mb-10 shadow-aesthetic">
        <PawBackdrop tone="text-[#52796F]/15" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <span className="inline-flex items-center space-x-2 px-3.5 py-1 bg-white/90 text-[#2A5C4A] border border-[#D1E7DD] rounded-full text-xs font-extrabold shadow-sm">
              <Stethoscope className="w-3.5 h-3.5 text-[#52796F]" />
              <span>24/7 Vet Telehealth & Clinic Consultations</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#231F20] font-display leading-tight">
              Compassionate Veterinary Care, <span className="text-[#52796F]">Whenever You Need It</span>
            </h1>
            <p className="text-[#65605B] text-sm sm:text-base max-w-2xl leading-relaxed">
              Book 1-on-1 video telehealth or in-clinic visits with board-certified veterinarians specializing in puppies, felines, nutrition, dentistry, and exotic companions.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-extrabold text-[#4A4344]">
              <span className="flex items-center gap-1.5"><Video className="w-4 h-4 text-[#E07A5F]" /> Instant HD Telehealth</span>
              <span className="flex items-center gap-1.5"><HeartPulse className="w-4 h-4 text-[#52796F]" /> Preventive & Emergency Triage</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#2A5C4A]" /> Digital Prescriptions Included</span>
            </div>
          </div>
          <div className="lg:col-span-4 flex justify-center">
            <AnimatedDog className="w-40 h-36 animate-floatY" />
          </div>
        </div>
      </div>

      {/* Scheduled Appointments Banner (visible only when logged in) */}
      {currentUser && appointments.length > 0 && (
        <div className="mb-10 bg-white border border-[#EFE9DF] rounded-3xl p-6 shadow-aesthetic">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-[#231F20] font-display flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-[#52796F]" />
              <span>Your Scheduled Veterinary Appointments ({appointments.length})</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.map((apt) => (
              <div key={apt.id} className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#E6DCCF] card-lift flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-[#231F20]">{apt.vet_name}</span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${statusBadge(apt.status)}`}>
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#4A4344] font-semibold">Pet: <strong className="text-[#231F20]">{apt.pet_name}</strong></p>
                  <p className="text-[11px] text-[#65605B] mt-0.5">Visit: {apt.type}</p>
                  <p className="text-xs text-[#52796F] font-bold mt-2 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" /> {apt.appointment_date} • {apt.time_slot}
                  </p>
                </div>
                {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                  <div className="pt-3 mt-3 border-t border-[#E6DCCF] flex justify-end">
                    <button
                      onClick={() => handleCancelAppointment(apt.id)}
                      className="px-2.5 py-1 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel Visit</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vet Directory Cards Grid */}
      {loading ? (
        <PetCardSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vets.map((vet, idx) => (
            <div
              key={vet.id}
              style={{ animationDelay: `${idx * 80}ms` }}
              className="bg-white rounded-3xl border border-[#EFE9DF] overflow-hidden shadow-aesthetic card-lift animate-riseIn flex flex-col justify-between p-6"
            >
              <div>
                {/* Profile Header */}
                <div className="flex items-start space-x-4 mb-4">
                  <img src={vet.image_url} alt={vet.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-[#EFE9DF] shadow-sm" />
                  <div>
                    <h3 className="text-lg font-extrabold text-[#231F20] font-display">{vet.name}</h3>
                    <p className="text-xs text-[#E07A5F] font-bold">{vet.specialization}</p>
                    <div className="flex items-center space-x-2 text-xs text-[#65605B] mt-1.5">
                      <span className="flex items-center text-[#F4A261] font-extrabold">
                        <Star className="w-3.5 h-3.5 fill-[#F4A261] mr-1" /> {vet.rating} ({vet.reviews_count || 120})
                      </span>
                      <span>•</span>
                      <span className="font-semibold">{vet.experience} Exp</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#65605B] leading-relaxed mb-4">
                  {vet.bio}
                </p>

                <div className="p-3.5 bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF] text-xs space-y-1.5 mb-4">
                  <div className="flex items-center text-[#231F20] font-semibold">
                    <Award className="w-4 h-4 mr-2 text-[#52796F] flex-shrink-0" />
                    <span className="truncate">{vet.qualifications}</span>
                  </div>
                  <div className="flex items-center text-[#65605B]">
                    <MapPin className="w-4 h-4 mr-2 text-[#E07A5F] flex-shrink-0" />
                    <span className="truncate">{vet.clinic_address}</span>
                  </div>
                </div>

                {/* Available Time Slots Preview */}
                {vet.available_slots && (
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C847C] block mb-1.5">Available Today & Tomorrow</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vet.available_slots.map((slot) => (
                        <span key={slot} className="px-2.5 py-1 bg-[#EAEFE9] text-[#2A5C4A] rounded-lg text-[11px] font-bold">
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-[#EFE9DF] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#8C847C] font-bold uppercase block">Consultation Fee</span>
                  <span className="text-xl font-black text-[#231F20] font-display">${vet.consultation_fee} <span className="text-xs font-semibold text-[#65605B]">/ visit</span></span>
                </div>

                <button
                  onClick={() => handleScheduleClick(vet)}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#52796F] to-[#3A5A40] hover:from-[#3A5A40] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#52796F]/25 transition-all flex items-center space-x-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Meeting</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointment Scheduling Modal */}
      {selectedVet && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231F20]/50 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-aesthetic max-w-md w-full overflow-hidden border border-[#EFE9DF]">
            <div className="bg-[#243D36] p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Stethoscope className="w-5 h-5 text-[#F4A261]" />
                <h3 className="text-base font-bold text-white">Schedule Consultation Meeting</h3>
              </div>
              <button onClick={() => setSelectedVet(null)} aria-label="Close" className="text-[#C5DFD2] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-6 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-[#52796F] mx-auto" />
                <h4 className="text-xl font-bold text-[#231F20]">Meeting Scheduled!</h4>
                <p className="text-xs text-[#65605B]">
                  Your appointment with <strong className="text-[#231F20]">{selectedVet.name}</strong> is confirmed for{' '}
                  <strong>{bookingSuccess.appointment_date}</strong> at <strong>{bookingSuccess.time_slot}</strong>.
                </p>
                <button onClick={() => setSelectedVet(null)} className="w-full py-2.5 bg-[#231F20] text-white text-xs font-bold rounded-xl">
                  Close & Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleScheduleAppointment} className="p-6 space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF]">
                  <img src={selectedVet.image_url} alt={selectedVet.name} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <p className="text-xs font-bold text-[#231F20]">{selectedVet.name}</p>
                    <p className="text-[11px] text-[#65605B]">${selectedVet.consultation_fee} per consultation</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Pet Name & Breed</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Biscuit (Golden Retriever)"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#4A4344] mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4344] mb-1">Time Slot</label>
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-bold"
                    >
                      {selectedVet.available_slots && selectedVet.available_slots.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Consultation Type</label>
                  <select
                    value={consultationType}
                    onChange={(e) => setConsultationType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-bold"
                  >
                    <option value="General Checkup">General Checkup</option>
                    <option value="Puppy Vaccination">Puppy / Kitten Vaccination</option>
                    <option value="Nutrition & Diet">Nutrition & Diet Plan</option>
                    <option value="Dental Check">Dental Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Notes / Symptoms</label>
                  <textarea
                    rows="2"
                    placeholder="Describe pet health condition or question..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#E07A5F]/20 transition-all"
                >
                  Confirm & Schedule Meeting (${selectedVet.consultation_fee})
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
