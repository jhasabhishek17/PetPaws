import React, { useState, useEffect } from 'react';
import { Scissors, Sparkles, Calendar, Clock, CheckCircle2, BookOpen, ShieldCheck, X, XCircle } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../utils/auth';
import PawBackdrop from './PawBackdrop';
import { AnimatedCat } from './PetIllustration';
import { PetCardSkeleton } from './PawLoader';

/**
 * GroomingCareSection Component
 * Offers professional pet spa grooming, dog obedience training,
 * scheduled bookings overview, and educational pet care guides.
 */
export default function GroomingCareSection({ currentUser, onRequireAuth, onAddToast }) {
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const tomorrow = new Date(Date.now() + 86400000);
  const [bookingDate, setBookingDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState('02:00 PM');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    fetchServicesAndBookings();
  }, [currentUser]);

  const fetchServicesAndBookings = async () => {
    setLoading(true);
    try {
      const srvData = await apiGet('/api/services');
      if (srvData.success) setServices(srvData.services || []);

      if (currentUser) {
        const bkgData = await apiGet('/api/services/bookings');
        if (bkgData.success) setBookings(bkgData.bookings || []);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Error loading grooming services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (srv) => {
    const openModal = () => {
      setSelectedService(srv);
      setBookingSuccess(null);
    };
    if (onRequireAuth) {
      onRequireAuth(`Please log in or create an account to book the ${srv.title} session.`, openModal);
    } else {
      openModal();
    }
  };

  const handleBookService = async (e) => {
    e.preventDefault();
    try {
      const data = await apiPost('/api/services/book', {
        service_id: selectedService.id,
        booking_date: bookingDate,
        time_slot: bookingSlot
      });

      if (data.success) {
        setBookingSuccess(data.booking);
        onAddToast?.(`${selectedService.title} session booked!`, 'success');
        fetchServicesAndBookings();
      } else {
        onAddToast?.(data.message || 'Failed to book service.', 'error');
      }
    } catch (err) {
      onAddToast?.('Failed to book service session. Please try again.', 'error');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!bookingId) return;
    const confirmed = window.confirm('Are you sure you want to cancel this spa & grooming session?');
    if (!confirmed) return;

    try {
      const data = await apiPut(`/api/services/bookings/${bookingId}/cancel`, {});
      if (data.success) {
        onAddToast?.(data.message || 'Booking cancelled successfully.', 'success');
        fetchServicesAndBookings();
      } else {
        onAddToast?.(data.message || 'Failed to cancel booking.', 'error');
      }
    } catch (err) {
      onAddToast?.('An error occurred while cancelling booking.', 'error');
    }
  };

  const careTips = [
    { title: 'Nutritional Guidelines for Kittens & Cats', desc: 'Ensure high-protein taurine-rich wet food and fresh filtered water fountains for optimal feline renal health.', tag: 'Cats', emoji: '🐱' },
    { title: 'Puppy Socialization & Leash Training', desc: 'Introduce positive reinforcement reward treats during early 8 to 16 week puppy development windows.', tag: 'Dogs', emoji: '🐶' },
    { title: 'Aquarium Water Chemistry & Temperature', desc: 'Maintain pH levels between 6.8-7.5 and perform 20% weekly water changes for freshwater fishes.', tag: 'Fishes', emoji: '🐠' },
    { title: 'Rabbit Diet & Hay Requirement', desc: 'Unlimited Timothy hay should comprise 80% of a rabbit\'s daily diet to maintain healthy gastrointestinal motility.', tag: 'Rabbits', emoji: '🐰' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#FFF3E6] via-[#FAF6F0] to-[#E2EFE8] border border-[#F4C4B7] p-6 sm:p-10 mb-10 shadow-aesthetic">
        <PawBackdrop tone="text-[#E07A5F]/15" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <span className="inline-flex items-center space-x-2 px-3.5 py-1 bg-white/90 text-[#E07A5F] border border-[#F4C4B7] rounded-full text-xs font-extrabold shadow-sm">
              <Scissors className="w-3.5 h-3.5 text-[#E07A5F]" />
              <span>Organic Spa Grooming • Obedience Training • Daycare</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#231F20] font-display leading-tight">
              Luxury Pet Spa, Grooming & <span className="text-[#E07A5F]">Positive Training</span>
            </h1>
            <p className="text-[#65605B] text-sm sm:text-base max-w-2xl leading-relaxed">
              Treat your companion to warm organic hydrobaths, low-stress feline grooming, puppy obedience classes, and supervised play days.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-extrabold text-[#4A4344]">
              <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#F4A261]" /> Hypoallergenic Botanical Shampoos</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#52796F]" /> Certified Fear-Free Stylists</span>
            </div>
          </div>
          <div className="lg:col-span-4 flex justify-center">
            <AnimatedCat className="w-40 h-36 animate-floatY" />
          </div>
        </div>
      </div>

      {/* Scheduled Grooming Bookings Banner (visible only when logged in) */}
      {currentUser && bookings.length > 0 && (
        <div className="mb-10 bg-white border border-[#EFE9DF] rounded-3xl p-6 shadow-aesthetic">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-[#231F20] font-display flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-[#E07A5F]" />
              <span>Your Grooming & Training Bookings ({bookings.length})</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#E6DCCF] card-lift flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-extrabold text-[#231F20] block">
                    {b.service_title} {b.pet_name ? `• ${b.pet_name}` : ''}
                  </span>
                  <span className="text-xs text-[#52796F] font-bold mt-1 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" /> {b.booking_date} • {b.time_slot}
                  </span>
                  {b.notes && (
                    <span className="text-[11px] text-[#65605B] mt-1 block">{b.notes}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${
                    b.status === 'Cancelled'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : b.status === 'Completed'
                      ? 'bg-[#EAEFE9] text-[#2A5C4A] border-[#D1E7DD]'
                      : 'bg-[#FFF5F0] text-[#E07A5F] border-[#F4C4B7]'
                  }`}>
                    {b.status}
                  </span>
                  {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      className="px-2.5 py-1 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Grid */}
      {loading ? (
        <PetCardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {services.map((srv, idx) => (
            <div
              key={srv.id}
              style={{ animationDelay: `${idx * 70}ms` }}
              className="bg-white rounded-3xl border border-[#EFE9DF] overflow-hidden shadow-aesthetic card-lift animate-riseIn flex flex-col justify-between group"
            >
              <div className="relative h-48 overflow-hidden bg-[#FAF6F0]">
                <img src={srv.image_url} alt={srv.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-[#231F20]/85 backdrop-blur text-white text-[11px] font-bold px-3 py-1 rounded-full">
                  {srv.category}
                </div>
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-extrabold text-[#231F20] flex items-center shadow-sm">
                  <Clock className="w-3 h-3 mr-1 text-[#E07A5F]" /> {srv.duration}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#231F20] font-display mb-2 group-hover:text-[#E07A5F] transition-colors">{srv.title}</h3>
                  <p className="text-xs text-[#65605B] leading-relaxed mb-4">{srv.description}</p>
                </div>

                <div className="pt-4 border-t border-[#EFE9DF] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#8C847C] block">Package Price</span>
                    <span className="text-xl font-black text-[#231F20] font-display">${srv.price}</span>
                  </div>
                  <button
                    onClick={() => handleBookClick(srv)}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all"
                  >
                    Book Session
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Care Guides Section */}
      <div className="bg-[#243D36] rounded-3xl text-white p-8 mb-8 shadow-aesthetic relative overflow-hidden">
        <PawBackdrop tone="text-white/10" />
        <div className="relative z-10">
          <div className="flex items-center space-x-2.5 mb-6">
            <BookOpen className="w-6 h-6 text-[#F4A261]" />
            <h2 className="text-2xl font-black font-display text-white">Holistic Pet Care & Nutrition Guides</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {careTips.map((tip, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur p-5 rounded-2xl border border-white/15 hover:bg-white/15 transition-colors">
                <span className="px-3 py-0.5 bg-[#F4A261]/25 text-[#F6C06B] text-[11px] font-extrabold uppercase rounded-full mb-2 inline-flex items-center gap-1">
                  <span>{tip.emoji}</span> {tip.tag}
                </span>
                <h4 className="text-sm font-extrabold text-white mb-1">{tip.title}</h4>
                <p className="text-xs text-[#C5DFD2] leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Booking Modal */}
      {selectedService && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231F20]/50 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-aesthetic max-w-md w-full overflow-hidden border border-[#EFE9DF]">
            <div className="bg-[#243D36] p-5 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Book {selectedService.title}</h3>
              <button onClick={() => setSelectedService(null)} aria-label="Close" className="text-[#C5DFD2] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-6 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-[#52796F] mx-auto" />
                <h4 className="text-xl font-bold text-[#231F20]">Session Confirmed!</h4>
                <p className="text-xs text-[#65605B]">
                  Booked for <strong>{bookingSuccess.booking_date}</strong> at <strong>{bookingSuccess.time_slot}</strong>.
                </p>
                <button onClick={() => setSelectedService(null)} className="w-full py-2.5 bg-[#231F20] text-white text-xs font-bold rounded-xl">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookService} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Select Date</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Select Time Slot</label>
                  <select
                    value={bookingSlot}
                    onChange={(e) => setBookingSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-bold"
                  >
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#E07A5F]/20"
                >
                  Confirm Booking (${selectedService.price})
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
