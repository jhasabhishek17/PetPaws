import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Heart,
  Calendar,
  User,
  Truck,
  Clock,
  CheckCircle2,
  Stethoscope,
  Scissors,
  Trash2,
  Eye,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Save,
  XCircle
} from 'lucide-react';
import { apiGet, apiPut } from '../utils/auth';

/**
 * BuyerDashboard Component
 * Role-specific dashboard for authenticated buyers:
 * - My Orders & Live Delivery Status
 * - Saved Wishlist Items (also used when activeTab === 'wishlist')
 * - Scheduled Vet Appointments & Spa Grooming Bookings
 * - Buyer Account & Delivery Profile Settings
 */
export default function BuyerDashboard({
  currentUser,
  initialSection = 'overview',
  wishlistPets = [],
  onToggleWishlist,
  onSelectPet,
  onBuyPetRequest,
  onNavigate,
  onUserUpdated,
  onAddToast
}) {
  const [section, setSection] = useState(initialSection); // 'overview' | 'orders' | 'wishlist' | 'appointments' | 'account'
  const [orders, setOrders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Account profile form state
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [upiId, setUpiId] = useState(currentUser?.upi_id || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (currentUser?.role === 'buyer') {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setAddress(currentUser.address || '');
      setUpiId(currentUser.upi_id || '');
      fetchBuyerData();
    }
  }, [currentUser]);

  const fetchBuyerData = async () => {
    setLoading(true);
    try {
      const [ordRes, aptRes, bkgRes] = await Promise.all([
        apiGet('/api/orders'),
        apiGet('/api/vets/appointments'),
        apiGet('/api/services/bookings')
      ]);
      if (ordRes.success) setOrders(ordRes.orders || []);
      if (aptRes.success) setAppointments(aptRes.appointments || []);
      if (bkgRes.success) setBookings(bkgRes.bookings || []);
    } catch (err) {
      console.error('Error loading buyer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const data = await apiPut('/api/auth/profile', {
        name,
        phone,
        address,
        upi_id: upiId
      });
      if (data.success && data.user) {
        onUserUpdated?.(data.user);
        onAddToast?.('Account details updated successfully!', 'success');
      } else {
        onAddToast?.(data.message || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      onAddToast?.('Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!orderId) return;
    const confirmed = window.confirm(`Are you sure you want to cancel order ${orderId}? Your payment will be refunded and the pet will be restocked.`);
    if (!confirmed) return;

    try {
      const data = await apiPut(`/api/orders/${orderId}/cancel`, {});
      if (data.success) {
        onAddToast?.(data.message || 'Order cancelled successfully.', 'success');
        fetchBuyerData();
      } else {
        onAddToast?.(data.message || 'Failed to cancel order.', 'error');
      }
    } catch (err) {
      onAddToast?.('An error occurred while cancelling order.', 'error');
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
        fetchBuyerData();
      } else {
        onAddToast?.(data.message || 'Failed to cancel appointment.', 'error');
      }
    } catch (err) {
      onAddToast?.('An error occurred while cancelling appointment.', 'error');
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
        fetchBuyerData();
      } else {
        onAddToast?.(data.message || 'Failed to cancel booking.', 'error');
      }
    } catch (err) {
      onAddToast?.('An error occurred while cancelling booking.', 'error');
    }
  };

  if (!currentUser || currentUser.role !== 'buyer') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-10 shadow-aesthetic">
          <h2 className="text-2xl font-black text-[#231F20] font-display mb-2">Buyer Dashboard Access Only</h2>
          <p className="text-sm text-[#65605B] mb-6">
            Please sign in with a Buyer account to view your orders, saved wishlist, and scheduled pet care appointments.
          </p>
          <button
            onClick={() => onNavigate?.('marketplace')}
            className="px-6 py-2.5 bg-[#E07A5F] text-white font-bold text-xs rounded-full"
          >
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#FFF3E6] via-[#FAF6F0] to-[#E2EFE8] rounded-3xl border border-[#EFE9DF] p-6 sm:p-8 mb-8 shadow-aesthetic flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white text-[#E07A5F] border border-[#F4C4B7] rounded-full text-xs font-extrabold mb-2">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Buyer Portal • ID: {currentUser.id}</span>
          </span>
          <h1 className="text-3xl font-black text-[#231F20] font-display">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#65605B] mt-1">
            Manage your pet orders, saved wishlist, veterinary consultations, spa bookings, and delivery settings.
          </p>
        </div>

        {/* Navigation Pills */}
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-[#EFE9DF] shadow-sm">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'orders', label: `Orders (${orders.length})` },
            { id: 'wishlist', label: `Wishlist (${wishlistPets.length})` },
            { id: 'appointments', label: `Care Schedule (${appointments.length + bookings.length})` },
            { id: 'account', label: 'Account Details' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                section === tab.id
                  ? 'bg-[#E07A5F] text-white shadow-sm'
                  : 'text-[#4A4344] hover:bg-[#FAF6F0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <button
          onClick={() => setSection('orders')}
          className="bg-white p-5 rounded-3xl border border-[#EFE9DF] shadow-sm text-left hover:border-[#E07A5F] transition-all flex items-center space-x-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FFF5F0] text-[#E07A5F] flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C847C]">Pet Orders</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">{orders.length}</h3>
          </div>
        </button>

        <button
          onClick={() => setSection('wishlist')}
          className="bg-white p-5 rounded-3xl border border-[#EFE9DF] shadow-sm text-left hover:border-[#E07A5F] transition-all flex items-center space-x-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
            <Heart className="w-6 h-6 fill-red-500" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C847C]">Saved Wishlist</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">{wishlistPets.length} Pets</h3>
          </div>
        </button>

        <button
          onClick={() => setSection('appointments')}
          className="bg-white p-5 rounded-3xl border border-[#EFE9DF] shadow-sm text-left hover:border-[#52796F] transition-all flex items-center space-x-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#EAEFE9] text-[#52796F] flex items-center justify-center">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C847C]">Vet Appointments</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">{appointments.length}</h3>
          </div>
        </button>

        <button
          onClick={() => setSection('appointments')}
          className="bg-white p-5 rounded-3xl border border-[#EFE9DF] shadow-sm text-left hover:border-[#F4A261] transition-all flex items-center space-x-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FFF8EB] text-[#D97706] flex items-center justify-center">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C847C]">Spa Bookings</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">{bookings.length}</h3>
          </div>
        </button>
      </div>

      {/*WISHLIST SECTION */}
      {(section === 'wishlist' || section === 'overview') && (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-[#231F20] font-display flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <span>Saved Wishlist ({wishlistPets.length})</span>
              </h2>
              <p className="text-xs text-[#65605B] mt-0.5">
                Pets you have saved for adoption. Click any pet to inspect full medical records or proceed to checkout.
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('marketplace')}
              className="px-4 py-2 bg-[#FAF6F0] hover:bg-[#F3ECE0] text-[#231F20] border border-[#E6DCCF] rounded-xl text-xs font-extrabold"
            >
              Browse More Pets
            </button>
          </div>

          {wishlistPets.length === 0 ? (
            <div className="text-center py-10 bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF]">
              <Heart className="w-10 h-10 text-[#8C847C] mx-auto mb-2" />
              <h3 className="text-sm font-extrabold text-[#231F20]">Your Wishlist is Empty</h3>
              <p className="text-xs text-[#65605B] mt-1 mb-4">
                Tap the heart icon on any pet listing in the Marketplace to save it here.
              </p>
              <button
                onClick={() => onNavigate?.('marketplace')}
                className="px-5 py-2.5 bg-[#E07A5F] text-white text-xs font-extrabold rounded-full shadow-sm"
              >
                Explore Pet Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistPets.map((pet) => (
                <div
                  key={pet.id}
                  onClick={() => onSelectPet?.(pet)}
                  className="bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF] overflow-hidden hover:border-[#E07A5F] transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="relative h-48 bg-white overflow-hidden">
                    <img
                      src={pet.image_url}
                      alt={pet.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 bg-[#231F20]/80 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      {pet.category}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove from wishlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist?.(pet.id);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 text-red-500 hover:bg-red-50 flex items-center justify-center shadow"
                      title="Remove from Wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-base font-extrabold text-[#231F20] group-hover:text-[#E07A5F] line-clamp-1">
                          {pet.title}
                        </h3>
                        <span className="text-base font-black text-[#231F20] font-display">${pet.price}</span>
                      </div>
                      <p className="text-xs text-[#65605B] mb-2">
                        Breed: <strong>{pet.breed}</strong> • Age: <strong>{pet.age}</strong>
                      </p>
                      <p className="text-[11px] text-[#4A4344] bg-white px-2.5 py-1 rounded-lg border border-[#E6DCCF] mb-3">
                        Owner: <strong>{pet.seller_name || 'Verified Breeder'}</strong> • ID: <span className="font-mono">{pet.seller_id}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E6DCCF]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPet?.(pet);
                        }}
                        className="px-3 py-1.5 bg-white border border-[#E6DCCF] text-[#4A4344] text-xs font-bold rounded-xl hover:bg-[#F3ECE0]"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        disabled={pet.stock === 0 || pet.status === 'sold'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuyPetRequest?.(pet);
                        }}
                        className="px-4 py-1.5 bg-[#E07A5F] hover:bg-[#D0654A] disabled:opacity-50 text-white text-xs font-extrabold rounded-xl flex items-center space-x-1"
                      >
                        <span>{pet.stock === 0 || pet.status === 'sold' ? 'Sold Out' : 'Adopt Now'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS SECTION */}
      {(section === 'orders' || section === 'overview') && (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-[#231F20] font-display flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#52796F]" />
                <span>My Pet Orders ({orders.length})</span>
              </h2>
              <p className="text-xs text-[#65605B] mt-0.5">
                Private order history and live transport tracking for {currentUser.name}.
              </p>
            </div>
            {orders.length > 0 && (
              <button
                onClick={() => onNavigate?.('orders')}
                className="px-4 py-2 bg-[#52796F] text-white rounded-xl text-xs font-extrabold hover:bg-[#3A5A40]"
              >
                Open Live Radar & Invoices
              </button>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-8 bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF]">
              <p className="text-xs font-bold text-[#65605B]">You have not placed any pet orders yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DCCF] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3.5">
                    {ord.pet_image && (
                      <img src={ord.pet_image} alt={ord.pet_title} className="w-14 h-14 rounded-xl object-cover" />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-extrabold text-[#231F20]">{ord.pet_title}</h4>
                        <span className="text-[11px] font-mono text-[#65605B]">({ord.id})</span>
                      </div>
                      <p className="text-xs text-[#65605B]">
                        Seller: <strong>{ord.seller_name}</strong> • Tracking: <span className="font-mono font-bold text-[#231F20]">{ord.tracking_code}</span>
                      </p>
                      <p className="text-[11px] text-[#65605B]">
                        Destination: {ord.shipping_address}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                    <div className="text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-block mb-1 border ${
                        ord.tracking_status === 'Cancelled'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : ord.tracking_status === 'Delivered'
                          ? 'bg-[#EAEFE9] text-[#2A5C4A] border-[#D1E7DD]'
                          : 'bg-[#FFF5F0] text-[#E07A5F] border-[#F4C4B7]'
                      }`}>
                        {ord.tracking_status}
                      </span>
                      <p className="text-sm font-black text-[#231F20] font-display">${ord.total_amount}</p>
                    </div>
                    {ord.tracking_status !== 'Delivered' && ord.tracking_status !== 'Cancelled' && (
                      <button
                        onClick={() => handleCancelOrder(ord.id)}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 text-xs font-extrabold rounded-xl flex items-center space-x-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        <span>Cancel</span>
                      </button>
                    )}
                    <button
                      onClick={() => onNavigate?.('orders')}
                      className="px-3.5 py-2 bg-white border border-[#E6DCCF] hover:border-[#E07A5F] text-xs font-extrabold text-[#231F20] rounded-xl"
                    >
                      Track
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPOINTMENTS & GROOMING SECTION */}
      {(section === 'appointments' || section === 'overview') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#231F20] font-display flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#52796F]" />
                <span>Vet Consultations ({appointments.length})</span>
              </h3>
              <button
                onClick={() => onNavigate?.('vets')}
                className="text-xs font-extrabold text-[#52796F] hover:underline"
              >
                + Book Vet
              </button>
            </div>
            {appointments.length === 0 ? (
              <p className="text-xs text-[#65605B] py-6 text-center bg-[#FAF6F0] rounded-2xl">
                No scheduled veterinary consultations yet.
              </p>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div key={apt.id} className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E6DCCF] flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-[#231F20]">{apt.vet_name}</p>
                      <p className="text-[11px] text-[#65605B]">Pet: {apt.pet_name} • {apt.type}</p>
                      <p className="text-[11px] font-bold text-[#52796F] mt-0.5">{apt.appointment_date} at {apt.time_slot}</p>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        apt.status === 'Cancelled'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : apt.status === 'Completed'
                          ? 'bg-[#F3ECE0] text-[#4A4344] border-[#E6DCCF]'
                          : 'bg-[#EAEFE9] text-[#2A5C4A] border-[#D1E7DD]'
                      }`}>
                        {apt.status}
                      </span>
                      {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                        <button
                          onClick={() => handleCancelAppointment(apt.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
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

          <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#231F20] font-display flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#E07A5F]" />
                <span>Grooming & Spa Bookings ({bookings.length})</span>
              </h3>
              <button
                onClick={() => onNavigate?.('grooming')}
                className="text-xs font-extrabold text-[#E07A5F] hover:underline"
              >
                + Book Spa
              </button>
            </div>
            {bookings.length === 0 ? (
              <p className="text-xs text-[#65605B] py-6 text-center bg-[#FAF6F0] rounded-2xl">
                No grooming or training sessions booked yet.
              </p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E6DCCF] flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-[#231F20]">{b.service_title}</p>
                      <p className="text-[11px] font-bold text-[#E07A5F] mt-0.5">{b.booking_date} at {b.time_slot}</p>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
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
                          className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
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
        </div>
      )}

      {/* ACCOUNT DETAILS SECTION */}
      {(section === 'account' || section === 'overview') && (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 sm:p-8 shadow-aesthetic max-w-2xl">
          <h3 className="text-lg font-extrabold text-[#231F20] font-display mb-1 flex items-center gap-2">
            <User className="w-5 h-5 text-[#E07A5F]" />
            <span>Buyer Account & Delivery Details</span>
          </h3>
          <p className="text-xs text-[#65605B] mb-5">
            Keep your contact and shipping address updated for climate-controlled pet deliveries.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Email Address (Verified)</label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full px-3.5 py-2.5 bg-[#F3ECE0] border border-[#E6DCCF] rounded-xl text-xs text-[#65605B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Default UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A4344] mb-1">Default Delivery Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, city, state, zip"
                className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 bg-[#231F20] hover:bg-[#E07A5F] text-white font-extrabold text-xs rounded-xl transition-all flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Save Account Details'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
