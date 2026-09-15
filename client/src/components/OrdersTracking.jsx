import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  FileText, 
  Printer, 
  ShieldCheck, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

/**
 * OrdersTracking Component
 * Displays live tracking status for pet orders, delivery progress timeline, 
 * and printable/downloadable itemized tax invoice.
 */
export default function OrdersTracking({ currentUser }) {
  const [orders, setOrders] = useState([]);
  const [searchTrackingCode, setSearchTrackingCode] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch orders on mount
  useEffect(() => {
    fetchOrders();
  }, [currentUser]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const buyerId = currentUser?.id || 'u-buyer-1';
      const res = await fetch(`/api/orders?buyerId=${buyerId}`);
      const data = await res.json();
      if (data.success && data.orders.length > 0) {
        setOrders(data.orders);
        setActiveOrder(data.orders[0]); // default to first order
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Search tracking code
  const handleSearchTracking = async (e) => {
    e.preventDefault();
    if (!searchTrackingCode.trim()) return;

    try {
      const res = await fetch(`/api/orders/track/${searchTrackingCode.trim()}`);
      const data = await res.json();
      if (data.success && data.order) {
        setActiveOrder(data.order);
      } else {
        alert("No tracking record found for this tracking code.");
      }
    } catch (err) {
      alert("Error searching tracking code.");
    }
  };

  // Trigger browser print window for invoice
  const handlePrintInvoice = () => {
    window.print();
  };

  // Status timeline steps definition
  const trackingSteps = [
    { label: 'Order Placed', desc: 'Booking confirmed & paid' },
    { label: 'Health Check Completed', desc: 'Vet inspection passed' },
    { label: 'In Transit', desc: 'Live climate controlled transport' },
    { label: 'Out for Delivery', desc: 'Driver near your location' },
    { label: 'Delivered', desc: 'Safely handed over to buyer' }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'Order Placed': return 0;
      case 'Health Check Completed': return 1;
      case 'In Transit': return 2;
      case 'Out for Delivery': return 3;
      case 'Delivered': return 4;
      default: return 2;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      
      {/* Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 font-display">
            Pet Order Tracking & Billing
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time climate transport tracking & official tax invoice receipts
          </p>
        </div>

        {/* Tracking Code Lookup Input */}
        <form onSubmit={handleSearchTracking} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Enter Tracking Code (e.g. TRACK-PET-882910)"
              value={searchTrackingCode}
              onChange={(e) => setSearchTrackingCode(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold w-64 focus:outline-none focus:border-orange-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow"
          >
            Track
          </button>
        </form>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">Loading tracking data...</div>
      ) : !activeOrder ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Truck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Orders Found</h3>
          <p className="text-slate-500 text-xs mt-1">Purchase a pet from the marketplace to track your live order!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Live Tracking Timeline & Order Cards */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Tracking Timeline Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
                    Live Transport Status
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 font-display">
                    {activeOrder.pet_title}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block">Tracking Number</span>
                  <span className="text-sm font-mono font-bold text-slate-900">{activeOrder.tracking_code}</span>
                </div>
              </div>

              {/* Progress Timeline Bar */}
              <div className="relative py-4">
                <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0" />
                
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                  {trackingSteps.map((step, idx) => {
                    const currentIdx = getStepIndex(activeOrder.tracking_status);
                    const isPassed = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div key={idx} className="flex sm:flex-col items-center text-left sm:text-center space-x-3 sm:space-x-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                          isCurrent 
                            ? 'bg-orange-500 text-white ring-4 ring-orange-100 scale-110' 
                            : isPassed 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isPassed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isPassed ? 'text-slate-900' : 'text-slate-400'}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-slate-400 hidden sm:block mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transit Details Box */}
              <div className="mt-6 p-4 bg-orange-50/60 rounded-2xl border border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <span>Destination: <strong>{activeOrder.shipping_address}</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-orange-800 font-bold">
                  <Clock className="w-4 h-4" />
                  <span>Estimated Delivery: {activeOrder.estimated_delivery}</span>
                </div>
              </div>
            </div>

            {/* List of Previous Orders Selectors */}
            {orders.length > 1 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3">All Your Pet Orders</h4>
                <div className="space-y-2">
                  {orders.map((ord) => (
                    <button
                      key={ord.id}
                      onClick={() => setActiveOrder(ord)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        activeOrder.id === ord.id 
                          ? 'border-orange-500 bg-orange-50/50' 
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{ord.pet_title} ({ord.id})</p>
                        <p className="text-[11px] text-slate-500">Date: {new Date(ord.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">${ord.total_amount}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Printable Itemized Billing Invoice */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between" id="printable-invoice">
            <div>
              {/* Invoice Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🐾</span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-display">PetPaws Official Invoice</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Tax Receipt</p>
                  </div>
                </div>

                <button
                  onClick={handlePrintInvoice}
                  className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                  title="Print Invoice"
                >
                  <Printer className="w-5 h-5" />
                </button>
              </div>

              {/* Invoice Metadata */}
              <div className="space-y-3 text-xs border-b border-slate-100 pb-4 mb-4">
                <div className="flex justify-between text-slate-600">
                  <span>Invoice ID:</span>
                  <strong className="text-slate-900 font-mono">{activeOrder.id}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Date:</span>
                  <strong className="text-slate-900">{new Date(activeOrder.created_at).toLocaleDateString()}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Payment Method:</span>
                  <strong className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">{activeOrder.payment_method} ({activeOrder.payment_status})</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Seller Name:</span>
                  <strong className="text-slate-900">{activeOrder.seller_name}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Buyer Name:</span>
                  <strong className="text-slate-900">{activeOrder.buyer_name}</strong>
                </div>
              </div>

              {/* Itemized Line Items */}
              <div className="space-y-2 mb-6">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Itemized Breakdown</div>
                
                <div className="flex justify-between text-xs text-slate-800 font-medium">
                  <span>1x {activeOrder.pet_title} ({activeOrder.pet_category})</span>
                  <span>${activeOrder.price}</span>
                </div>

                <div className="flex justify-between text-xs text-slate-500">
                  <span>Veterinary Health Certificate & Logistics</span>
                  <span>Included</span>
                </div>

                <div className="flex justify-between text-xs text-slate-500">
                  <span>GST / Tax (8%)</span>
                  <span>${activeOrder.tax}</span>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold">Total Amount Paid</span>
                <span className="text-xl font-black font-display">${activeOrder.total_amount}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                Thank you for choosing PetPaws for your pet adoption & purchases.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
