import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Truck, 
  FileText,
  QrCode,
  ArrowRight
} from 'lucide-react';

/**
 * CheckoutModal Component
 * Handles payment processing with UPI, Netbanking, and Card options.
 * Decrements stock on completion, unlists if stock hits zero, and generates tracking & invoice.
 */
export default function CheckoutModal({ pet, currentUser, onClose, onOrderPlaced }) {
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // UPI, NetBanking, Card
  const [upiId, setUpiId] = useState(currentUser?.upi_id || 'buyer@upi');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [shippingAddress, setShippingAddress] = useState(currentUser?.address || '742 Evergreen Terrace, Springfield');
  const [buyerPhone, setBuyerPhone] = useState(currentUser?.phone || '+1 (555) 234-5678');
  
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [error, setError] = useState('');

  if (!pet) return null;

  const tax = Math.round(pet.price * 0.08);
  const totalAmount = pet.price + tax;

  // Handle Checkout submission
  const handleConfirmPurchase = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: currentUser?.id || 'u-buyer-1',
          buyer_name: currentUser?.name || 'Alex Morgan',
          buyer_email: currentUser?.email || 'buyer@petpaws.com',
          buyer_phone: buyerPhone,
          shipping_address: shippingAddress,
          pet_id: pet.id,
          payment_method: paymentMethod
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Checkout failed');
      }

      setOrderSuccess(data.order);
      onOrderPlaced(data.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Secure Pet Booking Checkout</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Success State */}
        {orderSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-black text-slate-900 font-display">Booking Confirmed!</h3>
            <p className="text-slate-600 text-xs sm:text-sm max-w-sm mx-auto">
              Your pet purchase order <strong className="text-slate-900">{orderSuccess.id}</strong> has been successfully booked. Stock updated automatically.
            </p>

            {/* Tracking Code Box */}
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 block mb-1">
                Live Pet Transport Tracking Code
              </span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {orderSuccess.tracking_code}
              </span>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  onClose();
                  // Trigger redirect to orders view
                }}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2"
              >
                <Truck className="w-4 h-4" />
                <span>Track Order & Invoice</span>
              </button>
            </div>
          </div>
        ) : (
          /* Checkout Form */
          <form onSubmit={handleConfirmPurchase} className="p-6 space-y-5">
            
            {/* Pet Item Summary */}
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <img
                src={pet.image_url}
                alt={pet.title}
                className="w-14 h-14 rounded-xl object-cover"
              />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">{pet.title}</h4>
                <p className="text-xs text-slate-500">{pet.breed} • {pet.category}</p>
              </div>
              <span className="text-base font-black text-slate-900">${pet.price}</span>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl">
                {error}
              </div>
            )}

            {/* Shipping Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery Address
              </label>
              <input
                type="text"
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Payment Method Selector Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 transition-all ${
                    paymentMethod === 'UPI' 
                      ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-sm' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('NetBanking')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 transition-all ${
                    paymentMethod === 'NetBanking' 
                      ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-sm' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>NetBanking</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Card')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 transition-all ${
                    paymentMethod === 'Card' 
                      ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-sm' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Debit/Credit</span>
                </button>
              </div>
            </div>

            {/* Dynamic Payment Details */}
            {paymentMethod === 'UPI' && (
              <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center">
                    <QrCode className="w-4 h-4 mr-1 text-orange-600" /> Instant UPI Payment
                  </span>
                  <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded font-bold">GPay / PhonePe / Paytm</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Enter your UPI ID</label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="name@upi"
                    className="w-full px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'NetBanking' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Choose Bank for NetBanking</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India">State Bank of India (SBI)</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                </select>
              </div>
            )}

            {paymentMethod === 'Card' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Card Details</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="Card Number"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            )}

            {/* Price Breakdown */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Pet Subtotal:</span>
                <span>${pet.price}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Veterinary & Transport Tax (8%):</span>
                <span>${tax}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="text-orange-600">${totalAmount}</span>
              </div>
            </div>

            {/* Confirm Payment Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Processing Payment...</span>
              ) : (
                <>
                  <span>Pay ${totalAmount} & Complete Order</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}
