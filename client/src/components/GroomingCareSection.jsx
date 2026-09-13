import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Sparkles, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  BookOpen, 
  Heart, 
  ShieldCheck,
  X
} from 'lucide-react';

/**
 * GroomingCareSection Component
 * Offers professional pet spa grooming, dog obedience training, 
 * and educational pet care guides.
 */
export default function GroomingCareSection({ currentUser }) {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [bookingDate, setBookingDate] = useState('2026-09-18');
  const [bookingSlot, setBookingSlot] = useState('02:00 PM');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        if (data.success) setServices(data.services);
      });
  }, []);

  const handleBookService = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/services/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: currentUser?.id || 'u-buyer-1',
          buyer_name: currentUser?.name || 'Alex Morgan',
          service_id: selectedService.id,
          booking_date: bookingDate,
          time_slot: bookingSlot
        })
      });

      const data = await res.json();
      if (data.success) {
        setBookingSuccess(data.booking);
      }
    } catch (err) {
      alert("Failed to book service session.");
    }
  };

  const careTips = [
    { title: 'Nutritional Guidelines for Kittens & Cats', desc: 'Ensure high-protein taurine-rich wet food and fresh filtered water fountains for optimal feline renal health.', tag: 'Cats' },
    { title: 'Puppy Socialization & Leash Training', desc: 'Introduce positive reinforcement reward treats during early 8 to 16 week puppy development windows.', tag: 'Dogs' },
    { title: 'Aquarium Water Chemistry & Temperature', desc: 'Maintain pH levels between 6.8-7.5 and perform 20% weekly water changes for freshwater fishes.', tag: 'Fishes' },
    { title: 'Rabbit Diet & Hay Requirement', desc: 'Unlimited Timothy hay should comprise 80% of a rabbit\'s daily diet to maintain healthy gastrointestinal motility.', tag: 'Rabbits' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 font-display">Pet Grooming, Training & Care Hub</h1>
        <p className="text-slate-500 text-sm mt-1">
          Professional spa grooming packages, obedience training programs, and expert care guides
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {services.map((srv) => (
          <div key={srv.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
            <div className="relative h-48 overflow-hidden">
              <img src={srv.image_url} alt={srv.title} className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                {srv.category}
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{srv.title}</h3>
                <p className="text-xs text-slate-500 flex items-center mb-3">
                  <Clock className="w-3.5 h-3.5 mr-1 text-orange-500" /> Duration: {srv.duration}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{srv.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xl font-black text-slate-900 font-display">${srv.price}</span>
                <button
                  onClick={() => {
                    setSelectedService(srv);
                    setBookingSuccess(null);
                  }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow transition-all"
                >
                  Book Session
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Care Guides Section */}
      <div className="bg-slate-900 rounded-3xl text-white p-8 mb-8">
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="w-6 h-6 text-orange-400" />
          <h2 className="text-2xl font-bold font-display">Pet Care & Maintenance Advice</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {careTips.map((tip, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur p-5 rounded-2xl border border-white/10">
              <span className="px-2.5 py-0.5 bg-orange-500/30 text-orange-300 text-[10px] font-bold uppercase rounded-full mb-2 inline-block">
                {tip.tag}
              </span>
              <h4 className="text-sm font-bold text-white mb-1">{tip.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Service Booking Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Book {selectedService.title}</h3>
              <button onClick={() => setSelectedService(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-6 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-xl font-bold text-slate-900">Session Confirmed!</h4>
                <p className="text-xs text-slate-600">
                  Booked for <strong>{bookingSuccess.booking_date}</strong> at <strong>{bookingSuccess.time_slot}</strong>.
                </p>
                <button onClick={() => setSelectedService(null)} className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookService} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Date</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Time Slot</label>
                  <select
                    value={bookingSlot}
                    onChange={(e) => setBookingSlot(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-orange-500 text-white font-bold text-xs rounded-xl shadow"
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
