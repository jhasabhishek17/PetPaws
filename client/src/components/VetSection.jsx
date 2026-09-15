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
  MessageSquare,
  Sparkles
} from 'lucide-react';

/**
 * VetSection Component
 * Directory of verified veterinarians with experience, consultation fee, 
 * and direct appointment meeting scheduling dialogs.
 */
export default function VetSection({ currentUser }) {
  const [vets, setVets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedVet, setSelectedVet] = useState(null); // For booking modal
  const [loading, setLoading] = useState(true);

  // Appointment Form state
  const [petName, setPetName] = useState('Max');
  const [appointmentDate, setAppointmentDate] = useState('2026-09-16');
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM');
  const [consultationType, setConsultationType] = useState('General Checkup');
  const [notes, setNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    fetchVetsAndAppointments();
  }, [currentUser]);

  const fetchVetsAndAppointments = async () => {
    setLoading(true);
    try {
      const buyerId = currentUser?.id || 'u-buyer-1';
      const [vetsRes, aptsRes] = await Promise.all([
        fetch('/api/vets'),
        fetch(`/api/vets/appointments?buyerId=${buyerId}`)
      ]);

      const vetsData = await vetsRes.json();
      const aptsData = await aptsRes.json();

      if (vetsData.success) setVets(vetsData.vets);
      if (aptsData.success) setAppointments(aptsData.appointments);
    } catch (err) {
      console.error("Error loading vet data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Scheduling Meeting
  const handleScheduleAppointment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/vets/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: currentUser?.id || 'u-buyer-1',
          buyer_name: currentUser?.name || 'Alex Morgan',
          vet_id: selectedVet.id,
          pet_name: petName,
          appointment_date: appointmentDate,
          time_slot: selectedSlot,
          type: consultationType,
          notes: notes
        })
      });

      const data = await res.json();
      if (data.success) {
        setBookingSuccess(data.appointment);
        fetchVetsAndAppointments();
      }
    } catch (err) {
      alert("Failed to schedule appointment.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-black text-slate-900 font-display">Veterinary Care & Consultation</h1>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center">
              <Stethoscope className="w-3 h-3 mr-1" /> Certified Vets
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Book 1-on-1 direct video or in-person consultation meetings with certified veterinary specialists
          </p>
        </div>
      </div>

      {/* Scheduled Appointments Banner */}
      {appointments.length > 0 && (
        <div className="mb-8 bg-blue-50/70 border border-blue-200 rounded-3xl p-6">
          <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-blue-600" /> Your Scheduled Vet Appointments ({appointments.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.map((apt) => (
              <div key={apt.id} className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">{apt.vet_name}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">Pet: <strong>{apt.pet_name}</strong> ({apt.type})</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" /> {apt.appointment_date} at {apt.time_slot}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vet Directory Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading veterinarians directory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vets.map((vet) => (
            <div
              key={vet.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-6"
            >
              <div>
                {/* Profile Header */}
                <div className="flex items-start space-x-4 mb-4">
                  <img
                    src={vet.image_url}
                    alt={vet.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{vet.name}</h3>
                    <p className="text-xs text-orange-600 font-semibold">{vet.specialization}</p>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" /> {vet.rating}
                      </span>
                      <span>•</span>
                      <span>{vet.experience} Exp</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                  {vet.bio}
                </p>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1 mb-4">
                  <div className="flex items-center text-slate-700">
                    <Award className="w-3.5 h-3.5 mr-1.5 text-blue-600 flex-shrink-0" />
                    <span className="truncate">{vet.qualifications}</span>
                  </div>
                  <div className="flex items-center text-slate-500">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{vet.clinic_address}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Consultation Fee</span>
                  <span className="text-lg font-black text-slate-900 font-display">${vet.consultation_fee} / slot</span>
                </div>

                <button
                  onClick={() => {
                    setSelectedVet(vet);
                    setBookingSuccess(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center space-x-1"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            
            {/* Modal Header */}
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Stethoscope className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold">Schedule Consultation Meeting</h3>
              </div>
              <button onClick={() => setSelectedVet(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-6 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-xl font-bold text-slate-900">Meeting Scheduled!</h4>
                <p className="text-xs text-slate-600">
                  Your appointment with <strong className="text-slate-900">{selectedVet.name}</strong> is confirmed for{' '}
                  <strong>{bookingSuccess.appointment_date}</strong> at <strong>{bookingSuccess.time_slot}</strong>.
                </p>
                <button
                  onClick={() => setSelectedVet(null)}
                  className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
                >
                  Close & Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleScheduleAppointment} className="p-6 space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <img src={selectedVet.image_url} alt={selectedVet.name} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{selectedVet.name}</p>
                    <p className="text-[11px] text-slate-500">${selectedVet.consultation_fee} per consultation</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pet Name & Type</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Max (Golden Retriever)"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {selectedVet.available_slots.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Purpose / Symptoms</label>
                  <textarea
                    rows="2"
                    placeholder="Describe pet health condition or question..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all"
                >
                  Confirm & Schedule Meeting
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
