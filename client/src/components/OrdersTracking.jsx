import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Printer,
  Lock,
  XCircle,
  Package,
  RotateCcw
} from 'lucide-react';
import { apiGet, apiPut } from '../utils/auth';
import LiveTransportRadar from './LiveTransportRadar';
import PawLoader from './PawLoader';

/**
 * OrdersTracking Component
 * Strictly visible only to the authenticated user who placed the order.
 * Supports both Pet Adoption/Transport Orders (/api/orders) and
 * Multi-Vendor Pet Supply Product Orders (/api/product-orders) including
 * cancellations with automatic restocking and post-delivery return requests.
 */
export default function OrdersTracking({ currentUser, onOpenAuth, onAddToast }) {
  const [orderTab, setOrderTab] = useState('pets'); // 'pets' or 'products'
  const [orders, setOrders] = useState([]);
  const [productOrders, setProductOrders] = useState([]);
  const [searchTrackingCode, setSearchTrackingCode] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeProductOrder, setActiveProductOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchAllOrders();
    } else {
      setOrders([]);
      setProductOrders([]);
      setActiveOrder(null);
      setActiveProductOrder(null);
      setLoading(false);
    }
  }, [currentUser]);

  const fetchAllOrders = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [petRes, prodRes] = await Promise.all([
        apiGet('/api/orders'),
        apiGet('/api/product-orders')
      ]);

      if (petRes.success && Array.isArray(petRes.orders) && petRes.orders.length > 0) {
        setOrders(petRes.orders);
        setActiveOrder(petRes.orders[0]);
      } else {
        setOrders([]);
        setActiveOrder(null);
      }

      if (prodRes.success && Array.isArray(prodRes.orders) && prodRes.orders.length > 0) {
        setProductOrders(prodRes.orders);
        setActiveProductOrder(prodRes.orders[0]);
      } else {
        setProductOrders([]);
        setActiveProductOrder(null);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchTracking = async (e) => {
    e.preventDefault();
    if (!currentUser || !searchTrackingCode.trim()) return;
    const code = searchTrackingCode.trim();

    try {
      if (code.toUpperCase().startsWith('TRK-PRD') || code.toUpperCase().startsWith('PORD')) {
        const data = await apiGet(`/api/product-orders/track/${encodeURIComponent(code)}`);
        if (data.success && data.order) {
          setOrderTab('products');
          setActiveProductOrder(data.order);
          onAddToast?.(`Loaded product order ${data.order.id}`, 'success');
          return;
        }
      }

      const data = await apiGet(`/api/orders/track/${encodeURIComponent(code)}`);
      if (data.success && data.order) {
        setOrderTab('pets');
        setActiveOrder(data.order);
        onAddToast?.(`Loaded pet order ${data.order.id}`, 'success');
      } else {
        onAddToast?.(data.message || 'No matching order found for your account.', 'error');
      }
    } catch {
      onAddToast?.('Error searching tracking code.', 'error');
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleCancelOrder = async (orderId) => {
    if (!orderId) return;
    const confirmed = window.confirm(
      `Are you sure you want to cancel order ${orderId}? Your payment will be refunded and the pet will be restocked.`
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      const data = await apiPut(`/api/orders/${orderId}/cancel`, {});
      if (data.success && data.order) {
        onAddToast?.(data.message || 'Order cancelled and refunded successfully.', 'success');
        setActiveOrder(data.order);
        setOrders(prev => prev.map(o => (o.id === orderId ? data.order : o)));
      } else {
        onAddToast?.(data.message || 'Failed to cancel order.', 'error');
      }
    } catch {
      onAddToast?.('An error occurred while cancelling order.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelProductOrder = async (orderId) => {
    if (!orderId) return;
    setCancelling(true);
    try {
      const data = await apiPut(`/api/product-orders/${encodeURIComponent(orderId)}/cancel`, {});
      if (data.success && data.order) {
        onAddToast?.(data.message || 'Product order cancelled and restocked.', 'success');
        setActiveProductOrder(data.order);
        setProductOrders(prev => prev.map(o => (o.id === orderId ? data.order : o)));
      } else {
        onAddToast?.(data.message || 'Could not cancel product order', 'error');
      }
    } catch {
      onAddToast?.('Error cancelling product order.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleRequestProductReturn = async (orderId) => {
    try {
      const data = await apiPut(`/api/product-orders/${encodeURIComponent(orderId)}/return`, {
        action: 'request',
        reason: returnReason.trim() || 'Item size or specification mismatch'
      });
      if (data.success && data.order) {
        onAddToast?.(data.message || 'Return request submitted!', 'success');
        setReturnReason('');
        setActiveProductOrder(data.order);
        setProductOrders(prev => prev.map(o => (o.id === orderId ? data.order : o)));
      } else {
        onAddToast?.(data.message || 'Failed to request return', 'error');
      }
    } catch {
      onAddToast?.('Error submitting return request.', 'error');
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-10 shadow-aesthetic">
          <div className="w-16 h-16 bg-[#FFF5F0] text-[#E07A5F] border border-[#F4C4B7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <span className="inline-block px-3.5 py-1 bg-[#FFF5F0] text-[#E07A5F] border border-[#F4C4B7] text-xs font-extrabold rounded-full mb-3 uppercase tracking-wider">
            Private Order Records
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#231F20] font-display mb-2">
            Sign In to Track Your Pet & Supply Orders
          </h2>
          <p className="text-sm text-[#65605B] max-w-md mx-auto mb-6">
            For your privacy and security, order tracking, delivery addresses, and tax invoices are visible only to the authenticated buyer who placed the order.
          </p>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-6 py-3 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-extrabold text-xs rounded-full shadow-md"
            >
              Sign In to View Orders
            </button>
          )}
        </div>
      </div>
    );
  }

  const trackingSteps = [
    { label: 'Order Placed', desc: 'Awaiting seller confirmation & vet check' },
    { label: 'Health Check Completed', desc: 'Vet inspection passed' },
    { label: 'In Transit', desc: 'Live climate controlled transport' },
    { label: 'Out for Delivery', desc: 'Driver near your location' },
    { label: 'Delivered', desc: 'Safely handed over to buyer' }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'Order Placed':
        return 0;
      case 'Health Check Completed':
        return 1;
      case 'In Transit':
        return 2;
      case 'Out for Delivery':
        return 3;
      case 'Delivered':
        return 4;
      default:
        return 0;
    }
  };

  const formatDate = (ord) => {
    const raw = ord?.created_at || ord?.createdAt;
    return raw ? new Date(raw).toLocaleDateString() : 'Recent';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#EAEFE9] text-[#2A5C4A] border border-[#D1E7DD] rounded-full text-xs font-extrabold mb-2">
            <Truck className="w-3.5 h-3.5 text-[#52796F]" />
            <span>Private Order Tracking • {currentUser.name}</span>
          </span>
          <h1 className="text-3xl font-black text-[#231F20] font-display">
            My Orders, Shipments & Official Invoices
          </h1>
          <p className="text-[#65605B] text-sm mt-1">
            Track both live pet climate transport and multi-vendor pet supplies orders
          </p>
        </div>

        <form onSubmit={handleSearchTracking} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C847C]" />
            <input
              type="text"
              placeholder="Enter tracking code (e.g. TRK-PRD-...)..."
              value={searchTrackingCode}
              onChange={(e) => setSearchTrackingCode(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-[#E6DCCF] rounded-xl text-xs font-bold w-64 focus:outline-none focus:border-[#E07A5F]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all"
          >
            Track
          </button>
        </form>
      </div>

      {/* Switcher: Pet Orders vs Product Orders */}
      <div className="flex items-center space-x-2 mb-6">
        <button
          type="button"
          onClick={() => setOrderTab('pets')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
            orderTab === 'pets'
              ? 'bg-[#231F20] text-white shadow-md'
              : 'bg-white text-[#4A4344] border border-[#EFE9DF] hover:bg-[#FAF6F0]'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Pet Adoption & Transport Orders ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setOrderTab('products')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
            orderTab === 'products'
              ? 'bg-[#52796F] text-white shadow-md'
              : 'bg-white text-[#4A4344] border border-[#EFE9DF] hover:bg-[#FAF6F0]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Pet Supplies & Product Orders ({productOrders.length})</span>
        </button>
      </div>

      {loading ? (
        <PawLoader label="Fetching your order records…" />
      ) : orderTab === 'products' ? (
        /* PRODUCT ORDERS TAB */
        !activeProductOrder ? (
          <div className="bg-white rounded-3xl border border-[#EFE9DF] p-12 text-center shadow-aesthetic">
            <Package className="w-12 h-12 text-[#8C847C] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#231F20]">No Pet Product Orders Yet</h3>
            <p className="text-[#65605B] text-xs mt-1">
              Visit the Products section to shop food, harnesses, toys, and supplies!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EFE9DF]">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase text-[#52796F]">
                      Multi-Vendor Supply Order • {activeProductOrder.tracking_status}
                    </span>
                    <h3 className="text-xl font-black text-[#231F20] font-display">
                      Order {activeProductOrder.id} ({activeProductOrder.tracking_code})
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!['Delivered', 'Cancelled', 'Returned', 'Return Requested'].includes(
                      activeProductOrder.tracking_status
                    ) && (
                      <button
                        type="button"
                        disabled={cancelling}
                        onClick={() => handleCancelProductOrder(activeProductOrder.id)}
                        className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-extrabold flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel & Restock</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  {(activeProductOrder.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E6DCCF] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-3">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                        )}
                        <div>
                          <p className="text-xs font-extrabold text-[#231F20]">
                            {item.quantity}x {item.title}
                          </p>
                          <p className="text-[11px] text-[#65605B]">
                            Variant: <strong>{item.variant_label}</strong> • Shop: {item.business_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-[#231F20]">₹{Number(item.line_total || 0).toLocaleString('en-IN')}</span>
                        <span className="block text-[10px] font-bold text-[#52796F]">{item.item_status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Return Request Workflow when Delivered */}
                {activeProductOrder.tracking_status === 'Delivered' && (
                  <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6DCCF] space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-extrabold text-[#231F20]">
                      <RotateCcw className="w-4 h-4 text-[#E07A5F]" />
                      <span>Need to Return or Exchange an Item?</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Reason for return (e.g. size mismatch)..."
                        value={returnReason}
                        onChange={e => setReturnReason(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-[#E6DCCF] rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRequestProductReturn(activeProductOrder.id)}
                        className="px-4 py-2 bg-[#E07A5F] text-white text-xs font-extrabold rounded-xl"
                      >
                        Request Return
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Orders Selector List */}
              <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic space-y-2.5">
                <h4 className="text-sm font-extrabold text-[#231F20] font-display mb-2">
                  All Product Orders ({productOrders.length})
                </h4>
                {productOrders.map(po => (
                  <button
                    key={po.id}
                    type="button"
                    onClick={() => setActiveProductOrder(po)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      activeProductOrder.id === po.id
                        ? 'border-[#52796F] bg-[#EAEFE9]/50'
                        : 'border-[#EFE9DF] hover:bg-[#FAF6F0]'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-extrabold text-[#231F20]">
                        {po.id} • {po.items?.length || 1} item(s)
                      </p>
                      <p className="text-[11px] text-[#65605B]">
                        Tracking: <span className="font-mono">{po.tracking_code}</span> • {formatDate(po)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FAF6F0] text-[#231F20] block mb-1">
                        {po.tracking_status}
                      </span>
                      <strong className="text-xs font-black">₹{Number(po.total_amount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Product Order Invoice */}
            <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic h-fit">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE9DF] mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#231F20] font-display">
                    Product Tax Invoice
                  </h3>
                  <p className="text-[10px] text-[#8C847C] uppercase font-bold">
                    {activeProductOrder.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="p-2 text-[#65605B] hover:text-[#E07A5F] rounded-xl"
                >
                  <Printer className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-[#65605B]">Subtotal:</span>
                  <strong>₹{Number(activeProductOrder.subtotal || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65605B]">GST (8%):</span>
                  <strong>₹{Number(activeProductOrder.tax || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65605B]">Shipping:</span>
                  <strong>₹{Number(activeProductOrder.shipping_fee || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>
              <div className="p-4 bg-[#243D36] text-white rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold">Total Paid ({activeProductOrder.payment_method})</span>
                <span className="text-xl font-black font-display">₹{Number(activeProductOrder.total_amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )
      ) : !activeOrder ? (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-12 text-center shadow-aesthetic">
          <Truck className="w-12 h-12 text-[#8C847C] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#231F20]">No Pet Orders Found for Your Account</h3>
          <p className="text-[#65605B] text-xs mt-1">
            Purchase a pet from the marketplace to track your live delivery order here!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EFE9DF] mb-6">
                  <div className="flex items-center space-x-3.5">
                    {activeOrder.pet_image && (
                      <img
                        src={activeOrder.pet_image}
                        alt={activeOrder.pet_title}
                        className="w-14 h-14 rounded-2xl object-cover border border-[#E6DCCF]"
                      />
                    )}
                    <div>
                      <span
                        className={`text-[11px] font-extrabold uppercase tracking-wider ${
                          activeOrder.tracking_status === 'Cancelled' ? 'text-red-600' : 'text-[#E07A5F]'
                        }`}
                      >
                        Live Transport Status • {activeOrder.tracking_status}
                      </span>
                      <h3 className="text-xl font-extrabold text-[#231F20] font-display">
                        {activeOrder.pet_title}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {activeOrder.tracking_status !== 'Delivered' &&
                      activeOrder.tracking_status !== 'Cancelled' && (
                        <button
                          onClick={() => handleCancelOrder(activeOrder.id)}
                          disabled={cancelling}
                          className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 font-extrabold text-xs rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                          <span>{cancelling ? 'Cancelling...' : 'Cancel Order'}</span>
                        </button>
                      )}
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#8C847C] block">Tracking Number</span>
                      <span className="text-sm font-mono font-extrabold text-[#231F20] bg-[#FAF6F0] px-3 py-1 rounded-lg border border-[#E6DCCF] inline-block mt-0.5">
                        {activeOrder.tracking_code}
                      </span>
                    </div>
                  </div>
                </div>

                {activeOrder.tracking_status === 'Cancelled' ? (
                  <div className="p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3.5 text-red-800">
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-extrabold text-red-900">
                        Order Cancelled & Payment Refunded
                      </h4>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                        This order has been cancelled upon request. A refund of{' '}
                        <strong>${activeOrder.total_amount}</strong> has been issued to your payment method (
                        {activeOrder.payment_method}), and the listing for {activeOrder.pet_title} has been restored to the marketplace.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative py-4">
                    <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-[#EFE9DF] -translate-y-1/2 z-0" />

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                      {trackingSteps.map((step, idx) => {
                        const currentIdx = getStepIndex(activeOrder.tracking_status);
                        const isCompleted = idx < currentIdx || activeOrder.tracking_status === 'Delivered';
                        const isCurrent = idx === currentIdx && activeOrder.tracking_status !== 'Delivered';

                        return (
                          <div
                            key={idx}
                            className="flex sm:flex-col items-center text-left sm:text-center space-x-3 sm:space-x-0"
                          >
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                                isCurrent
                                  ? 'bg-[#E07A5F] text-white ring-4 ring-[#FFE7DC] scale-110'
                                  : isCompleted
                                  ? 'bg-[#52796F] text-white'
                                  : 'bg-[#FAF6F0] text-[#8C847C] border border-[#E6DCCF]'
                              }`}
                            >
                              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                            </div>
                            <div>
                              <p
                                className={`text-xs font-extrabold ${
                                  isCompleted || isCurrent ? 'text-[#231F20]' : 'text-[#8C847C]'
                                }`}
                              >
                                {step.label}
                              </p>
                              <p className="text-[10px] text-[#8C847C] hidden sm:block mt-0.5">{step.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div
                  className={`mt-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
                    activeOrder.tracking_status === 'Cancelled'
                      ? 'bg-red-50/60 border-red-200 text-red-800'
                      : 'bg-[#FFF5F0] border-[#F4C4B7] text-[#4A4344]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-[#E07A5F] flex-shrink-0" />
                    <span>
                      Destination: <strong className="text-[#231F20]">{activeOrder.shipping_address}</strong>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 font-extrabold">
                    <Clock className="w-4 h-4" />
                    <span>
                      {activeOrder.tracking_status === 'Cancelled'
                        ? 'Status: Cancelled & Refunded'
                        : `Estimated Delivery: ${activeOrder.estimated_delivery}`}
                    </span>
                  </div>
                </div>
              </div>

              {orders.length > 0 && (
                <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-extrabold text-[#231F20] font-display">
                      Your Pet Orders ({orders.length})
                    </h4>
                  </div>
                  <div className="space-y-2.5">
                    {orders.map((ord) => (
                      <button
                        key={ord.id}
                        onClick={() => setActiveOrder(ord)}
                        className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          activeOrder.id === ord.id
                            ? 'border-[#E07A5F] bg-[#FFF5F0]'
                            : 'border-[#EFE9DF] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {ord.pet_image && (
                            <img
                              src={ord.pet_image}
                              alt={ord.pet_title}
                              className="w-11 h-11 rounded-xl object-cover"
                            />
                          )}
                          <div>
                            <p className="text-xs font-extrabold text-[#231F20]">
                              {ord.pet_title} <span className="font-mono text-[#65605B]">({ord.id})</span>
                            </p>
                            <p className="text-[11px] text-[#65605B]">
                              Date: {formatDate(ord)} • Tracking:{' '}
                              <span className="font-mono">{ord.tracking_code}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full block mb-1 ${
                              ord.tracking_status === 'Cancelled'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : ord.tracking_status === 'Delivered'
                                ? 'bg-[#EAEFE9] text-[#2A5C4A]'
                                : ord.tracking_status === 'In Transit'
                                ? 'bg-[#FFF5F0] text-[#E07A5F]'
                                : 'bg-[#FFF8EB] text-[#B0622A]'
                            }`}
                          >
                            {ord.tracking_status}
                          </span>
                          <span className="text-xs font-black text-[#231F20] font-display">
                            ${ord.total_amount}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic flex flex-col justify-between"
              id="printable-invoice"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#EFE9DF] mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🐾</span>
                    <div>
                      <h3 className="text-base font-extrabold text-[#231F20] font-display">
                        PetPaws Official Invoice
                      </h3>
                      <p className="text-[10px] text-[#8C847C] uppercase tracking-wider font-bold">
                        Tax Receipt
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handlePrintInvoice}
                    className="p-2 text-[#65605B] hover:text-[#E07A5F] hover:bg-[#FFF5F0] rounded-xl transition-all"
                    title="Print Invoice"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs border-b border-[#EFE9DF] pb-4 mb-4">
                  <div className="flex justify-between text-[#65605B]">
                    <span>Invoice ID:</span>
                    <strong className="text-[#231F20] font-mono">{activeOrder.id}</strong>
                  </div>
                  <div className="flex justify-between text-[#65605B]">
                    <span>Date:</span>
                    <strong className="text-[#231F20]">{formatDate(activeOrder)}</strong>
                  </div>
                  <div className="flex justify-between text-[#65605B]">
                    <span>Payment Method:</span>
                    <strong className="text-[#2A5C4A] bg-[#EAEFE9] px-2 py-0.5 rounded font-bold">
                      {activeOrder.payment_method} ({activeOrder.payment_status})
                    </strong>
                  </div>
                  <div className="flex justify-between text-[#65605B]">
                    <span>Seller Name:</span>
                    <strong className="text-[#231F20]">{activeOrder.seller_name}</strong>
                  </div>
                  <div className="flex justify-between text-[#65605B]">
                    <span>Buyer Name:</span>
                    <strong className="text-[#231F20]">{activeOrder.buyer_name}</strong>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="text-[11px] font-bold text-[#8C847C] uppercase tracking-wider mb-2">
                    Itemized Breakdown
                  </div>

                  <div className="flex justify-between text-xs text-[#231F20] font-bold">
                    <span>
                      1x {activeOrder.pet_title} ({activeOrder.pet_category})
                    </span>
                    <span>${activeOrder.price}</span>
                  </div>

                  <div className="flex justify-between text-xs text-[#65605B]">
                    <span>Veterinary Health Certificate & Logistics</span>
                    <span>Included</span>
                  </div>

                  <div className="flex justify-between text-xs text-[#65605B]">
                    <span>GST / Tax (8%)</span>
                    <span>${activeOrder.tax}</span>
                  </div>
                </div>

                <div className="p-4 bg-[#243D36] text-white rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold">Total Amount Paid</span>
                  <span className="text-xl font-black font-display">${activeOrder.total_amount}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#EFE9DF] text-center">
                <p className="text-[11px] text-[#8C847C]">
                  Thank you for choosing PetPaws for your pet adoption & purchases.
                </p>
              </div>
            </div>
          </div>

          <LiveTransportRadar order={activeOrder} />
        </>
      )}
    </div>
  );
}
