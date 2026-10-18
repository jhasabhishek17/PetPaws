import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  MapPin,
  DollarSign,
  Award,
  Video,
  HeartPulse,
  ShieldCheck,
  Save
} from 'lucide-react';
import { apiGet, apiPut } from '../utils/auth';

/**
 * VetDashboard Component
 * Dedicated portal for authenticated Veterinarian accounts:
 * - Patient Appointments assigned to this veterinarian (with Confirm / Complete / Cancel actions)
 * - Clinical Profile, Consultation Fee & Available Time Slots editor
 * - Veterinary Telehealth & Clinical Services summary
 */
export default function VetDashboard({ currentUser, onNavigate, onAddToast }) {
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'profile' | 'services'
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile editor fields
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [bio, setBio] = useState('');
  const [slotsText, setSlotsText] = useState('');

  useEffect(() => {
    if (currentUser?.role === 'vet') {
      fetchVetPortalData();
    }
  }, [currentUser]);

  const fetchVetPortalData = async () => {
    setLoading(true);
    try {
      const [profRes, aptRes] = await Promise.all([
        apiGet('/api/vets/my-profile'),
        apiGet('/api/vets/appointments')
      ]);

      if (profRes.success && profRes.vet) {
        const v = profRes.vet;
        setProfile(v);
        setName(v.name || currentUser.name || '');
        setSpecialization(v.specialization || '');
        setExperience(v.experience || '');
        setQualifications(v.qualifications || '');
        setClinicAddress(v.clinic_address || '');
        setConsultationFee(String(v.consultation_fee || 50));
        setBio(v.bio || '');
        setSlotsText((v.available_slots || []).join(', '));
      }
      if (aptRes.success) {
        setAppointments(aptRes.appointments || []);
      }
    } catch (err) {
      console.error('Error loading vet portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (aptId, newStatus) => {
    try {
      const data = await apiPut(`/api/vets/appointments/${aptId}/status`, { status: newStatus });
      if (data.success) {
        onAddToast?.(`Appointment ${aptId} marked as ${newStatus}`, 'success');
        fetchVetPortalData();
      } else {
        onAddToast?.(data.message || 'Failed to update appointment status', 'error');
      }
    } catch (err) {
      onAddToast?.('Failed to update appointment status', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const parsedSlots = slotsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const data = await apiPut('/api/vets/my-profile', {
        name,
        specialization,
        experience,
        qualifications,
        clinic_address: clinicAddress,
        consultation_fee: Number(consultationFee),
        bio,
        available_slots: parsedSlots
      });

      if (data.success && data.vet) {
        setProfile(data.vet);
        onAddToast?.('Veterinarian profile & availability updated!', 'success');
      } else {
        onAddToast?.(data.message || 'Failed to update vet profile', 'error');
      }
    } catch (err) {
      onAddToast?.('Failed to update vet profile', 'error');
    }
  };

  if (!currentUser || currentUser.role !== 'vet') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-10 shadow-aesthetic">
          <h2 className="text-2xl font-black text-[#231F20] font-display mb-2">Veterinarian Portal Access Only</h2>
          <p className="text-sm text-[#65605B] mb-6">
            Only authenticated veterinarian accounts can access the clinical schedule and veterinary practice settings.
          </p>
          <button
            onClick={() => onNavigate?.('vets')}
            className="px-6 py-2.5 bg-[#52796F] text-white font-bold text-xs rounded-full"
          >
            View Public Vet Directory
          </button>
        </div>
      </div>
    );
  }

  const confirmedCount = appointments.filter((a) => a.status === 'Confirmed').length;
  const completedCount = appointments.filter((a) => a.status === 'Completed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#243D36] via-[#3A5A40] to-[#52796F] text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-aesthetic flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {profile?.image_url && (
            <img
              src={profile.image_url}
              alt={profile.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40 shadow"
            />
          )}
          <div>
            <span className="inline-flex items-center space-x-1.5 px-3 py-0.5 bg-white/15 rounded-full text-[11px] font-extrabold mb-1">
              <Stethoscope className="w-3.5 h-3.5 text-[#F4A261]" />
              <span>Veterinary Clinical Portal • {profile?.id || currentUser.id}</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              {profile?.name || currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#C5DFD2]">
              {profile?.specialization || 'Veterinary Specialist'} • {profile?.clinic_address || 'PetPaws Telehealth & Clinic'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/15">
          {[
            { id: 'appointments', label: `Patient Schedule (${appointments.length})` },
            { id: 'profile', label: 'My Vet Profile & Slots' },
            { id: 'services', label: 'Clinical Services' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#243D36] shadow'
                  : 'text-white/85 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EAEFE9] text-[#52796F] flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#8C847C] uppercase tracking-wider">Upcoming Confirmed</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">{confirmedCount} Visits</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF5F0] text-[#E07A5F] flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#8C847C] uppercase tracking-wider">Completed Consultations</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">{completedCount} Visits</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF8EB] text-[#D97706] flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#8C847C] uppercase tracking-wider">Consultation Fee</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">${profile?.consultation_fee || 65} / visit</h3>
          </div>
        </div>
      </div>

      {/* TAB 1: Patient Appointments */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-[#231F20] font-display">Scheduled Patient Appointments</h2>
              <p className="text-xs text-[#65605B]">
                Manage appointments booked with your veterinary practice and update patient consultation status.
              </p>
            </div>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-12 bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF]">
              <Calendar className="w-10 h-10 text-[#8C847C] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#231F20]">No Patient Appointments Yet</p>
              <p className="text-xs text-[#65605B] mt-1">New bookings from pet owners will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#E6DCCF] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-sm font-extrabold text-[#231F20]">{apt.pet_name}</span>
                      <span className="text-xs font-mono text-[#65605B]">({apt.id})</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          apt.status === 'Confirmed'
                            ? 'bg-[#EAEFE9] text-[#2A5C4A]'
                            : apt.status === 'Completed'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#4A4344]">
                      Pet Parent: <strong>{apt.buyer_name}</strong> • Consultation Type: <strong>{apt.type}</strong> • Fee: <strong>${apt.fee}</strong>
                    </p>
                    <p className="text-xs text-[#52796F] font-bold flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" /> {apt.appointment_date} at {apt.time_slot}
                    </p>
                    {apt.notes && (
                      <p className="text-xs text-[#65605B] bg-white px-3 py-1.5 rounded-xl border border-[#E6DCCF] mt-1">
                        Clinical Notes: {apt.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {apt.status !== 'Confirmed' && (
                      <button
                        onClick={() => handleUpdateAppointmentStatus(apt.id, 'Confirmed')}
                        className="px-3 py-1.5 bg-[#EAEFE9] text-[#2A5C4A] hover:bg-[#D1E7DD] rounded-xl text-xs font-extrabold"
                      >
                        Confirm
                      </button>
                    )}
                    {apt.status !== 'Completed' && (
                      <button
                        onClick={() => handleUpdateAppointmentStatus(apt.id, 'Completed')}
                        className="px-3.5 py-1.5 bg-[#52796F] text-white hover:bg-[#3A5A40] rounded-xl text-xs font-extrabold flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </button>
                    )}
                    {apt.status !== 'Cancelled' && (
                      <button
                        onClick={() => handleUpdateAppointmentStatus(apt.id, 'Cancelled')}
                        className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-extrabold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Vet Profile & Availability Editor */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 sm:p-8 shadow-aesthetic max-w-3xl">
          <h2 className="text-xl font-black text-[#231F20] font-display mb-1">
            Clinical Profile & Time Slot Availability
          </h2>
          <p className="text-xs text-[#65605B] mb-6">
            Changes saved here immediately update your public card in the Veterinarians Directory.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Doctor Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Specialization</label>
                <input
                  type="text"
                  required
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Experience</label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="10 Years"
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Consultation Fee ($ USD)</label>
                <input
                  type="number"
                  required
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Qualifications</label>
                <input
                  type="text"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A4344] mb-1">Clinic Address</label>
              <input
                type="text"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A4344] mb-1">
                Available Time Slots (comma-separated)
              </label>
              <input
                type="text"
                value={slotsText}
                onChange={(e) => setSlotsText(e.target.value)}
                placeholder="09:30 AM, 11:30 AM, 03:00 PM, 05:30 PM"
                className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A4344] mb-1">Professional Bio</label>
              <textarea
                rows="3"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-[#52796F] hover:bg-[#3A5A40] text-white font-extrabold text-xs rounded-xl shadow flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Veterinary Profile & Slots</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Clinical Services Overview */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm">
            <Video className="w-8 h-8 text-[#E07A5F] mb-3" />
            <h3 className="text-base font-extrabold text-[#231F20] mb-1">HD Video Telehealth</h3>
            <p className="text-xs text-[#65605B] leading-relaxed">
              Conduct remote puppy/kitten wellness checks, nutrition counseling, and post-adoption triage with pet parents.
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm">
            <HeartPulse className="w-8 h-8 text-[#52796F] mb-3" />
            <h3 className="text-base font-extrabold text-[#231F20] mb-1">Preventive & Vaccine Records</h3>
            <p className="text-xs text-[#65605B] leading-relaxed">
              Verify breeder vaccination schedules, microchip registrations, and pre-transport health clearances.
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm">
            <ShieldCheck className="w-8 h-8 text-[#2A5C4A] mb-3" />
            <h3 className="text-base font-extrabold text-[#231F20] mb-1">Digital Prescriptions</h3>
            <p className="text-xs text-[#65605B] leading-relaxed">
              Issue dietary plans, deworming schedules, and clinical notes directly to PetPaws buyer accounts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
