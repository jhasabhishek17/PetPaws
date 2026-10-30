import React, { useState, useEffect } from 'react';
import {
  Store,
  Package,
  ShoppingBag,
  BarChart3,
  CreditCard,
  Users,
  Settings,
  ShieldAlert,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Upload,
  Lock,
  Scissors,
  Stethoscope,
  RefreshCw
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete, apiUploadMedia } from '../utils/auth';
import PawLoader from './PawLoader';

const ORDER_STATUS_OPTIONS = [
  'Order Placed',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered'
];

export default function BusinessSaaSPortal({
  currentUser,
  onOpenAuth,
  onNavigate,
  onAddToast
}) {
  const [activeSection, setActiveSection] = useState(
    currentUser?.role === 'admin' ? 'admin' : 'overview'
  );
  const [loading, setLoading] = useState(true);

  // Tenant & SaaS state
  const [business, setBusiness] = useState(null);
  const [membership, setMembership] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);

  // Vendor Catalog & Orders
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [groomingData, setGroomingData] = useState({ services: [], bookings: [] });

  // Product Form State (Create / Edit)
  const [editingProductId, setEditingProductId] = useState('');
  const [prodTitle, setProdTitle] = useState('');
  const [prodCategory, setProdCategory] = useState('Food & Nutrition');
  const [prodSubcategory, setProdSubcategory] = useState('Dry Kibble');
  const [prodPetType, setProdPetType] = useState('All Pets');
  const [prodBrand, setProdBrand] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodComparePrice, setProdComparePrice] = useState('');
  const [prodStock, setProdStock] = useState('15');
  const [prodDescription, setProdDescription] = useState('');
  const [prodFeatures, setProdFeatures] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodVariants, setProdVariants] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Business Settings & Team Form
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState('pet_shop');
  const [bizDesc, setBizDesc] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizGst, setBizGst] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('staff');

  // Subscription Billing Cycle
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [upgradingPlanId, setUpgradingPlanId] = useState('');

  // Grooming Package Form
  const [srvTitle, setSrvTitle] = useState('');
  const [srvCategory, setSrvCategory] = useState('Grooming');
  const [srvPrice, setSrvPrice] = useState('');
  const [srvDuration, setSrvDuration] = useState('60 Mins');
  const [srvDesc, setSrvDesc] = useState('');

  // Platform Admin Moderation State
  const [adminData, setAdminData] = useState({
    businesses: [],
    products: [],
    auditLogs: [],
    subscriptionTransactions: []
  });

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        setActiveSection(prev => (prev === 'overview' ? 'admin' : prev));
      }
      loadPortalData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [plansRes, dashRes, catsRes, invRes, ordRes] = await Promise.all([
        apiGet('/api/saas/plans'),
        apiGet('/api/saas/my-business'),
        apiGet('/api/products/categories'),
        ['seller', 'shopkeeper', 'admin'].includes(currentUser.role)
          ? apiGet('/api/products/vendor/inventory')
          : Promise.resolve({ success: true, products: [] }),
        ['seller', 'shopkeeper', 'admin'].includes(currentUser.role)
          ? apiGet('/api/product-orders?view=vendor')
          : Promise.resolve({ success: true, orders: [] })
      ]);

      if (plansRes.success) setPlans(plansRes.plans || []);
      if (catsRes.success) setCategories(catsRes.categories || []);
      if (invRes.success) setProducts(invRes.products || []);
      if (ordRes.success) setVendorOrders(ordRes.orders || []);

      if (dashRes.success && dashRes.business) {
        const b = dashRes.business;
        setBusiness(b);
        setMembership(dashRes.membership);
        setCurrentPlan(dashRes.currentPlan);
        setUsage(dashRes.usage);
        setAnalytics(dashRes.analytics);
        setTeamMembers(dashRes.teamMembers || []);
        setBillingHistory(dashRes.billingHistory || []);
        if (dashRes.grooming) setGroomingData(dashRes.grooming);

        setBizName(b.name || '');
        setBizType(b.business_type || 'pet_shop');
        setBizDesc(b.description || '');
        setBizPhone(b.contact_phone || '');
        setBizAddress(b.address || '');
        setBizGst(b.gst_or_tax_id || '');
        setUpiId(b.payout_details?.upi_id || currentUser.upi_id || '');
        setBankName(b.payout_details?.bank_name || currentUser.bank_name || '');
        setBankAccount(b.payout_details?.bank_account || currentUser.bank_account || '');
        setIfscCode(b.payout_details?.ifsc_code || currentUser.ifsc_code || '');
      }

      if (currentUser.role === 'admin') {
        const adm = await apiGet('/api/saas/admin/overview');
        if (adm.success) {
          setAdminData({
            businesses: adm.businesses || [],
            products: adm.products || [],
            auditLogs: adm.auditLogs || [],
            subscriptionTransactions: adm.subscriptionTransactions || []
          });
        }
      }
    } catch (err) {
      console.error('Error loading SaaS portal:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-10 shadow-aesthetic">
          <div className="w-16 h-16 bg-[#FFF5F0] text-[#E07A5F] border border-[#F4C4B7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#231F20] font-display mb-2">
            PetPaws Multi-Tenant SaaS & Shopkeeper Portal
          </h2>
          <p className="text-sm text-[#65605B] max-w-md mx-auto mb-6">
            Sign in with a Shopkeeper, Seller, Veterinarian, Groomer, or Admin account to manage products, inventory variants, orders, team members, and SaaS subscriptions.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-3 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-extrabold text-xs rounded-full shadow-md cursor-pointer"
          >
            Sign In to Business Portal
          </button>
        </div>
      </div>
    );
  }

  const resetProductForm = () => {
    setEditingProductId('');
    setProdTitle('');
    setProdCategory('Food & Nutrition');
    setProdSubcategory('Dry Kibble');
    setProdPetType('All Pets');
    setProdBrand(business?.name || '');
    setProdPrice('');
    setProdComparePrice('');
    setProdStock('15');
    setProdDescription('');
    setProdFeatures('');
    setProdImageUrl('');
    setProdVariants([]);
  };

  const handleEditProduct = (prod) => {
    setEditingProductId(prod.id);
    setProdTitle(prod.title || '');
    setProdCategory(prod.category || 'Food & Nutrition');
    setProdSubcategory(prod.subcategory || '');
    setProdPetType(prod.pet_type || 'All Pets');
    setProdBrand(prod.brand || '');
    setProdPrice(String(prod.price ?? ''));
    setProdComparePrice(prod.compare_at_price ? String(prod.compare_at_price) : '');
    setProdStock(String(prod.stock ?? '10'));
    setProdDescription(prod.description || '');
    setProdFeatures(Array.isArray(prod.features) ? prod.features.join(', ') : '');
    setProdImageUrl(prod.image_url || '');
    setProdVariants(Array.isArray(prod.variants) ? prod.variants : []);
    setActiveSection('products');
  };

  const handleProductFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const res = await apiUploadMedia(file, { context: 'products' });
      if (res.success && res.url) {
        setProdImageUrl(res.url);
        onAddToast?.('Product image uploaded to Cloudinary!', 'success');
      }
    } catch (err) {
      onAddToast?.(err.message || 'Image upload failed; you can also paste a direct image URL.', 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleAddVariantRow = () => {
    setProdVariants(prev => [
      ...prev,
      {
        variant_id: `var-${Date.now()}-${prev.length + 1}`,
        label: '',
        size: '',
        color: '',
        pack_size: '',
        price: Number(prodPrice) || 25,
        stock: 10
      }
    ]);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const payload = {
        title: prodTitle,
        category: prodCategory,
        subcategory: prodSubcategory,
        pet_type: prodPetType,
        brand: prodBrand || business?.name || 'PetPaws Essentials',
        price: Number(prodPrice),
        compare_at_price: prodComparePrice ? Number(prodComparePrice) : 0,
        stock: Number(prodStock),
        description: prodDescription,
        features: prodFeatures,
        image_url: prodImageUrl,
        variants: prodVariants
      };

      const res = editingProductId
        ? await apiPut(`/api/products/${encodeURIComponent(editingProductId)}`, payload)
        : await apiPost('/api/products', payload);

      if (res.success) {
        onAddToast?.(res.message || 'Product saved!', 'success');
        resetProductForm();
        loadPortalData();
      } else {
        onAddToast?.(res.message || 'Could not save product', 'error');
      }
    } catch {
      onAddToast?.('Failed to save product.', 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteOrArchiveProduct = async (productId, archiveOnly = false) => {
    try {
      const res = await apiDelete(
        `/api/products/${encodeURIComponent(productId)}${archiveOnly ? '?archiveOnly=true' : ''}`
      );
      if (res.success) {
        onAddToast?.(res.message, 'success');
        loadPortalData();
      } else {
        onAddToast?.(res.message || 'Action failed', 'error');
      }
    } catch {
      onAddToast?.('Could not update product.', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, tracking_status) => {
    try {
      const res = await apiPut(`/api/product-orders/${encodeURIComponent(orderId)}/status`, {
        tracking_status
      });
      if (res.success) {
        onAddToast?.(res.message, 'success');
        loadPortalData();
      } else {
        onAddToast?.(res.message || 'Status update failed', 'error');
      }
    } catch {
      onAddToast?.('Failed to update order status.', 'error');
    }
  };

  const handleApproveReturn = async (orderId, action) => {
    try {
      const res = await apiPut(`/api/product-orders/${encodeURIComponent(orderId)}/return`, {
        action
      });
      if (res.success) {
        onAddToast?.(res.message, 'success');
        loadPortalData();
      } else {
        onAddToast?.(res.message || 'Could not process return', 'error');
      }
    } catch {
      onAddToast?.('Error processing return request.', 'error');
    }
  };

  const handleUpgradeSubscription = async (planId) => {
    setUpgradingPlanId(planId);
    try {
      const checkoutRes = await apiPost('/api/saas/subscriptions/checkout', {
        plan_id: planId,
        billing_cycle: billingCycle
      });

      if (!checkoutRes.success) {
        onAddToast?.(checkoutRes.message || 'Could not start subscription checkout', 'error');
        return;
      }

      if (checkoutRes.immediate) {
        onAddToast?.(checkoutRes.message || 'Switched plan!', 'success');
        loadPortalData();
        return;
      }

      // Perform server-side HMAC-SHA256 verification handshake
      if (checkoutRes.sandbox_handshake) {
        const verifyRes = await apiPost('/api/saas/subscriptions/verify', checkoutRes.sandbox_handshake);
        if (verifyRes.success) {
          onAddToast?.(verifyRes.message || 'Subscription verified & activated!', 'success');
          loadPortalData();
        } else {
          onAddToast?.(verifyRes.message || 'Payment signature verification failed', 'error');
        }
      }
    } catch {
      onAddToast?.('Error processing subscription upgrade.', 'error');
    } finally {
      setUpgradingPlanId('');
    }
  };

  const handleSaveBusinessSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await apiPut('/api/saas/my-business', {
        name: bizName,
        business_type: bizType,
        description: bizDesc,
        contact_phone: bizPhone,
        address: bizAddress,
        gst_or_tax_id: bizGst,
        payout_details: {
          upi_id: upiId,
          bank_name: bankName,
          bank_account: bankAccount,
          ifsc_code: ifscCode
        }
      });
      if (res.success) {
        onAddToast?.(res.message || 'Business profile updated!', 'success');
        loadPortalData();
      } else {
        onAddToast?.(res.message || 'Could not update business profile', 'error');
      }
    } catch {
      onAddToast?.('Failed to save business settings.', 'error');
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    try {
      const res = await apiPost('/api/saas/my-business/members', {
        user_name: newMemberName,
        user_email: newMemberEmail,
        role: newMemberRole
      });
      if (res.success) {
        onAddToast?.(res.message, 'success');
        setNewMemberName('');
        setNewMemberEmail('');
        loadPortalData();
      } else {
        onAddToast?.(res.message || 'Failed to add member', 'error');
      }
    } catch {
      onAddToast?.('Error adding team member.', 'error');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const res = await apiDelete(`/api/saas/my-business/members/${encodeURIComponent(memberId)}`);
      if (res.success) {
        onAddToast?.('Team member removed', 'success');
        loadPortalData();
      } else {
        onAddToast?.(res.message || 'Could not remove member', 'error');
      }
    } catch {
      onAddToast?.('Error removing team member.', 'error');
    }
  };

  const handleCreateGroomingPackage = async (e) => {
    e.preventDefault();
    try {
      const res = await apiPost('/api/saas/grooming/services', {
        title: srvTitle,
        category: srvCategory,
        price: Number(srvPrice),
        duration: srvDuration,
        description: srvDesc
      });
      if (res.success) {
        onAddToast?.(res.message, 'success');
        setSrvTitle('');
        setSrvPrice('');
        setSrvDesc('');
        loadPortalData();
      } else {
        onAddToast?.(res.message || 'Could not create service package', 'error');
      }
    } catch {
      onAddToast?.('Error creating grooming package.', 'error');
    }
  };

  const handleModerateBusiness = async (bizId, updates) => {
    try {
      const res = await apiPut(`/api/saas/admin/businesses/${encodeURIComponent(bizId)}/status`, updates);
      if (res.success) {
        onAddToast?.(res.message, 'success');
        loadPortalData();
      }
    } catch {
      onAddToast?.('Admin moderation action failed.', 'error');
    }
  };

  const handleModerateProduct = async (prodId, moderation_status) => {
    try {
      const res = await apiPut(`/api/saas/admin/products/${encodeURIComponent(prodId)}/moderate`, {
        moderation_status
      });
      if (res.success) {
        onAddToast?.(res.message, 'success');
        loadPortalData();
      }
    } catch {
      onAddToast?.('Product moderation failed.', 'error');
    }
  };

  const isVendor = ['seller', 'shopkeeper', 'admin'].includes(currentUser.role);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Top SaaS Tenant Header */}
      <div className="bg-gradient-to-r from-[#231F20] via-[#2D2829] to-[#243D36] rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#E07A5F] text-white text-[11px] font-extrabold uppercase tracking-wider">
              {currentPlan?.name || 'Free Starter'} Plan
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 text-[#C5DFD2] text-[11px] font-bold">
              Tenant ID: {business?.id || 'Provisional'}
            </span>
            <span className="px-3 py-1 rounded-full bg-[#EAEFE9]/20 text-[#F6C06B] text-[11px] font-bold uppercase">
              Role: {membership?.role || currentUser.role}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display">
            {business?.name || `${currentUser.name} Business Workspace`}
          </h1>
          <p className="text-xs sm:text-sm text-white/75 mt-1">
            Multi-tenant SaaS operations hub — manage products, variant stock, orders, team permissions & subscriptions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentUser.role === 'seller' && (
            <button
              type="button"
              onClick={() => onNavigate?.('seller')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
            >
              🐾 Pet Breeder Listings
            </button>
          )}
          {currentUser.role === 'vet' && (
            <button
              type="button"
              onClick={() => onNavigate?.('vet-dashboard')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
            >
              🩺 Vet Clinical Schedule
            </button>
          )}
          <button
            type="button"
            onClick={loadPortalData}
            className="px-4 py-2.5 bg-[#E07A5F] hover:bg-[#D0654A] text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Workspace</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 mb-6">
        {[
          { id: 'overview', label: 'Analytics & Usage', icon: BarChart3, show: true },
          { id: 'products', label: `Products Catalog (${products.length})`, icon: Package, show: isVendor },
          { id: 'orders', label: `Product Orders (${vendorOrders.length})`, icon: ShoppingBag, show: isVendor },
          { id: 'grooming-ops', label: 'Grooming & Spa Ops', icon: Scissors, show: ['groomer', 'seller', 'shopkeeper', 'admin'].includes(currentUser.role) },
          { id: 'subscriptions', label: 'SaaS Plans & Billing', icon: CreditCard, show: true },
          { id: 'team', label: `Team & Settings (${teamMembers.length})`, icon: Users, show: true },
          { id: 'admin', label: 'Platform Moderation', icon: ShieldAlert, show: currentUser.role === 'admin' }
        ]
          .filter(t => t.show)
          .map(tab => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center space-x-2 flex-shrink-0 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#231F20] text-white shadow-md'
                    : 'bg-white text-[#4A4344] border border-[#EFE9DF] hover:bg-[#FAF6F0]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {loading ? (
        <PawLoader label="Loading your multi-tenant SaaS workspace…" />
      ) : (
        <>
          {/* 1. OVERVIEW & ANALYTICS */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white rounded-3xl border border-[#EFE9DF] p-5 shadow-aesthetic">
                  <span className="text-xs font-bold text-[#65605B]">Gross Product Sales</span>
                  <p className="text-2xl font-black text-[#231F20] font-display mt-1">
                    ₹{Number(analytics?.gross_product_revenue || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[11px] font-bold text-[#2A5C4A]">
                    {analytics?.units_sold || 0} units across {analytics?.product_orders_count || 0} orders
                  </span>
                </div>

                <div className="bg-white rounded-3xl border border-[#EFE9DF] p-5 shadow-aesthetic">
                  <span className="text-xs font-bold text-[#65605B]">Net Vendor Earnings</span>
                  <p className="text-2xl font-black text-[#52796F] font-display mt-1">
                    ₹{Number(analytics?.net_product_earnings || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[11px] text-[#65605B]">
                    After {analytics?.commission_rate ?? 10}% platform commission (₹{Number(analytics?.platform_commission || 0).toLocaleString('en-IN')})
                  </span>
                </div>

                <div className="bg-white rounded-3xl border border-[#EFE9DF] p-5 shadow-aesthetic">
                  <span className="text-xs font-bold text-[#65605B]">Product Catalog Quota</span>
                  <p className="text-2xl font-black text-[#E07A5F] font-display mt-1">
                    {usage?.active_products || 0} / {usage?.max_products > 9000 ? 'Unlimited' : usage?.max_products || 5}
                  </p>
                  <span className="text-[11px] text-[#65605B]">
                    Plan: {currentPlan?.name || 'Free Starter'}
                  </span>
                </div>

                <div className="bg-white rounded-3xl border border-[#EFE9DF] p-5 shadow-aesthetic">
                  <span className="text-xs font-bold text-[#65605B]">Low-Stock Alerts (≤ 5 units)</span>
                  <p className="text-2xl font-black text-amber-600 font-display mt-1">
                    {analytics?.low_stock_count || 0} Items
                  </p>
                  <span className="text-[11px] text-[#65605B]">
                    Replenish stock to prevent missed orders
                  </span>
                </div>
              </div>

              {/* Low Stock Table & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                  <h3 className="text-base font-extrabold text-[#231F20] font-display mb-3">
                    Inventory Restock Watchlist
                  </h3>
                  {analytics?.low_stock_items?.length > 0 ? (
                    <div className="space-y-2.5">
                      {analytics.low_stock_items.map(item => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-extrabold text-[#231F20]">{item.title}</p>
                            <span className="text-[11px] text-[#65605B]">{item.category}</span>
                          </div>
                          <span className="px-3 py-1 bg-amber-600 text-white font-black rounded-full">
                            {item.stock} left
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#65605B] py-6 text-center">
                      All active products have healthy stock levels (&gt; 5 units).
                    </p>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                  <h3 className="text-base font-extrabold text-[#231F20] font-display mb-3">
                    SaaS Plan Entitlements & Revenue Model
                  </h3>
                  <div className="space-y-2.5 text-xs text-[#4A4344]">
                    <p>
                      <strong className="text-[#231F20]">1. SaaS Subscription:</strong> Your business is on the{' '}
                      <strong className="text-[#E07A5F]">{currentPlan?.name}</strong> tier ({business?.billing_cycle}), giving you up to{' '}
                      <strong>{usage?.max_products > 9000 ? 'Unlimited' : usage?.max_products}</strong> product listings and{' '}
                      <strong>{usage?.max_team_members}</strong> staff seats.
                    </p>
                    <p>
                      <strong className="text-[#231F20]">2. Marketplace Commission:</strong> PetPaws deducts a{' '}
                      <strong>{analytics?.commission_rate}%</strong> commission on completed customer product orders. Upgrading to Growth (5%) or Pro (3%) lowers your commission fee.
                    </p>
                    <p>
                      <strong className="text-[#231F20]">3. Tenant Data Isolation:</strong> Your inventory, customer shipping addresses, and payout settings are isolated to tenant{' '}
                      <code className="px-1.5 py-0.5 bg-[#FAF6F0] rounded font-mono">{business?.id}</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PRODUCTS CATALOG & VARIANT MANAGEMENT */}
          {activeSection === 'products' && isVendor && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Product Creation / Edit Form */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic h-fit">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-[#231F20] font-display">
                    {editingProductId ? 'Edit Product Listing' : 'Publish New Pet Product'}
                  </h3>
                  {editingProductId && (
                    <button
                      type="button"
                      onClick={resetProductForm}
                      className="text-xs font-extrabold text-[#E07A5F] hover:underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-[#4A4344] mb-1">Product Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Orthopedic Memory Foam Dog Bed"
                      value={prodTitle}
                      onChange={e => setProdTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#4A4344] mb-1">Category *</label>
                      <select
                        value={prodCategory}
                        onChange={e => {
                          setProdCategory(e.target.value);
                          const found = categories.find(c => c.id === e.target.value);
                          setProdSubcategory(found?.subcategories?.[0] || '');
                        }}
                        className="w-full px-3 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-bold"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-[#4A4344] mb-1">Target Pet</label>
                      <select
                        value={prodPetType}
                        onChange={e => setProdPetType(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-bold"
                      >
                        {['All Pets', 'Dogs', 'Cats', 'Fishes', 'Rabbits', 'Birds'].map(pt => (
                          <option key={pt} value={pt}>
                            {pt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-bold text-[#4A4344] mb-1">Price (₹ INR) *</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        required
                        placeholder="899"
                        value={prodPrice}
                        onChange={e => setProdPrice(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#4A4344] mb-1">Compare Price (₹)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="1199"
                        value={prodComparePrice}
                        onChange={e => setProdComparePrice(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#4A4344] mb-1">Base Stock *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={prodStock}
                        onChange={e => setProdStock(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#4A4344] mb-1">Brand Name</label>
                    <input
                      type="text"
                      placeholder={business?.name || 'NaturePaws'}
                      value={prodBrand}
                      onChange={e => setProdBrand(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-semibold"
                    />
                  </div>

                  {/* Product Variants Builder */}
                  <div className="p-3.5 bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#231F20]">
                        Size / Pack / Color Variants ({prodVariants.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddVariantRow}
                        className="px-2.5 py-1 bg-[#52796F] text-white rounded-lg text-[11px] font-bold flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Variant</span>
                      </button>
                    </div>
                    {prodVariants.map((v, idx) => (
                      <div key={v.variant_id || idx} className="grid grid-cols-12 gap-1.5 items-center">
                        <input
                          type="text"
                          placeholder="Label (e.g. Medium / Blue or 5kg)"
                          value={v.label}
                          onChange={e => {
                            const next = [...prodVariants];
                            next[idx] = { ...next[idx], label: e.target.value };
                            setProdVariants(next);
                          }}
                          className="col-span-6 px-2.5 py-1.5 bg-white border border-[#E6DCCF] rounded-lg text-[11px]"
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          value={v.price}
                          onChange={e => {
                            const next = [...prodVariants];
                            next[idx] = { ...next[idx], price: Number(e.target.value) };
                            setProdVariants(next);
                          }}
                          className="col-span-3 px-2 py-1.5 bg-white border border-[#E6DCCF] rounded-lg text-[11px]"
                        />
                        <input
                          type="number"
                          placeholder="Stock"
                          value={v.stock}
                          onChange={e => {
                            const next = [...prodVariants];
                            next[idx] = { ...next[idx], stock: Number(e.target.value) };
                            setProdVariants(next);
                          }}
                          className="col-span-2 px-2 py-1.5 bg-white border border-[#E6DCCF] rounded-lg text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() => setProdVariants(prodVariants.filter((_, i) => i !== idx))}
                          className="col-span-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Image Upload / URL */}
                  <div>
                    <label className="block font-bold text-[#4A4344] mb-1">
                      Product Image (Upload or URL)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={prodImageUrl}
                        onChange={e => setProdImageUrl(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                      />
                      <label className="px-3 py-2 bg-[#EAEFE9] text-[#2A5C4A] font-extrabold rounded-xl cursor-pointer flex items-center space-x-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingMedia ? 'Uploading…' : 'Upload'}</span>
                        <input type="file" accept="image/*" onChange={handleProductFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#4A4344] mb-1">
                      Highlights (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="Grain-free, Vet formulated, Machine washable"
                      value={prodFeatures}
                      onChange={e => setProdFeatures(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#4A4344] mb-1">Description *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe materials, nutritional benefits, sizing guide..."
                      value={prodDescription}
                      onChange={e => setProdDescription(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="w-full py-3 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                  >
                    {savingProduct
                      ? 'Saving Product…'
                      : editingProductId
                      ? 'Save Product Changes'
                      : 'Publish Product to Storefront'}
                  </button>
                </form>
              </div>

              {/* Vendor's Product Inventory List */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                  <h3 className="text-lg font-black text-[#231F20] font-display mb-4">
                    Your Shop Inventory ({products.length} items)
                  </h3>

                  {products.length === 0 ? (
                    <p className="text-xs text-[#65605B] py-12 text-center">
                      You haven&apos;t added any pet products yet. Use the form on the left to publish your first item!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {products.map(prod => (
                        <div
                          key={prod.id}
                          className="p-4 rounded-2xl border border-[#EFE9DF] hover:bg-[#FAF6F0]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center space-x-3.5">
                            <img
                              src={prod.image_url}
                              alt={prod.title}
                              className="w-16 h-16 rounded-2xl object-cover border border-[#E6DCCF]"
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#EAEFE9] text-[#2A5C4A]">
                                  {prod.category}
                                </span>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    prod.status === 'active'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {prod.status}
                                </span>
                              </div>
                              <h4 className="text-sm font-extrabold text-[#231F20] mt-1">{prod.title}</h4>
                              <p className="text-xs text-[#65605B]">
                                Price: <strong className="text-[#231F20]">₹{Number(prod.price || 0).toLocaleString('en-IN')}</strong> • Total Stock:{' '}
                                <strong className={Number(prod.stock) <= 5 ? 'text-amber-600' : 'text-[#2A5C4A]'}>
                                  {prod.stock} units
                                </strong>
                                {prod.variants?.length > 0 && ` (${prod.variants.length} variants)`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleEditProduct(prod)}
                              className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-[#EFE9DF] text-[#231F20] rounded-xl text-xs font-bold flex items-center space-x-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrArchiveProduct(prod.id, true)}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold"
                            >
                              Archive
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrArchiveProduct(prod.id, false)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. VENDOR PRODUCT ORDERS FULFILLMENT */}
          {activeSection === 'orders' && isVendor && (
            <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
              <h3 className="text-lg font-black text-[#231F20] font-display mb-4">
                Customer Product Orders for Your Shop ({vendorOrders.length})
              </h3>

              {vendorOrders.length === 0 ? (
                <p className="text-xs text-[#65605B] py-12 text-center">
                  No customer product orders yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {vendorOrders.map(ord => (
                    <div key={ord.id} className="p-5 rounded-2xl border border-[#EFE9DF] bg-[#FAF6F0]/40 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE9DF] pb-3">
                        <div>
                          <span className="text-xs font-black font-mono text-[#231F20]">{ord.id}</span>
                          <span className="text-xs text-[#65605B] ml-2">
                            • Tracking: <strong className="font-mono">{ord.tracking_code}</strong>
                          </span>
                          <p className="text-xs text-[#65605B] mt-0.5">
                            Customer: <strong className="text-[#231F20]">{ord.buyer_name}</strong> ({ord.buyer_phone}) —{' '}
                            {ord.shipping_address}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <label className="text-[11px] font-bold text-[#65605B]">Update Status:</label>
                          <select
                            value={ord.tracking_status}
                            disabled={ord.tracking_status === 'Cancelled' || ord.tracking_status === 'Returned'}
                            onChange={e => handleUpdateOrderStatus(ord.id, e.target.value)}
                            className="px-3 py-1.5 bg-white border border-[#E6DCCF] rounded-xl text-xs font-extrabold text-[#231F20]"
                          >
                            {ORDER_STATUS_OPTIONS.map(st => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {(ord.items || []).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2.5">
                              {item.image_url && (
                                <img src={item.image_url} alt={item.title} className="w-10 h-10 rounded-lg object-cover" />
                              )}
                              <div>
                                <p className="font-bold text-[#231F20]">
                                  {item.quantity}x {item.title} ({item.variant_label})
                                </p>
                                <span className="text-[11px] text-[#65605B]">
                                  Unit: ₹{Number(item.unit_price || 0).toLocaleString('en-IN')} • Item Status: {item.item_status}
                                </span>
                              </div>
                            </div>
                            <span className="font-extrabold text-[#231F20]">₹{Number(item.line_total || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>

                      {ord.return_status === 'Requested' && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <strong className="text-amber-900">Return Requested by Buyer:</strong>{' '}
                            <span className="text-amber-800">{ord.return_reason}</span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleApproveReturn(ord.id, 'approve')}
                              className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg"
                            >
                              Approve & Refund
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveReturn(ord.id, 'reject')}
                              className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. GROOMING & SPA BUSINESS OPERATIONS */}
          {activeSection === 'grooming-ops' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic h-fit">
                <h3 className="text-lg font-black text-[#231F20] font-display mb-4">
                  Publish Grooming / Training Package
                </h3>
                <form onSubmit={handleCreateGroomingPackage} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Package Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Organic Oatmeal Spa & Nail Trim"
                      value={srvTitle}
                      onChange={e => setSrvTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold mb-1">Category</label>
                      <select
                        value={srvCategory}
                        onChange={e => setSrvCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-bold"
                      >
                        <option value="Grooming">Grooming</option>
                        <option value="Training">Training</option>
                        <option value="Daycare">Daycare</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Price ($ USD) *</label>
                      <input
                        type="number"
                        required
                        placeholder="55"
                        value={srvPrice}
                        onChange={e => setSrvPrice(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Session Duration</label>
                    <input
                      type="text"
                      value={srvDuration}
                      onChange={e => setSrvDuration(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={srvDesc}
                      onChange={e => setSrvDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#52796F] text-white font-extrabold rounded-xl"
                  >
                    Publish Service Package
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                <h3 className="text-lg font-black text-[#231F20] font-display mb-4">
                  Scheduled Grooming & Training Bookings ({groomingData.bookings?.length || 0})
                </h3>
                <div className="space-y-3">
                  {(groomingData.bookings || []).map(b => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-2xl border border-[#EFE9DF] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-[#231F20]">{b.service_title}</p>
                        <p className="text-[#65605B]">
                          Client: {b.buyer_name} • {b.booking_date} at {b.time_slot}
                        </p>
                      </div>
                      <select
                        value={b.status}
                        onChange={async e => {
                          const res = await apiPut(`/api/saas/grooming/bookings/${encodeURIComponent(b.id)}/status`, {
                            status: e.target.value
                          });
                          if (res.success) {
                            onAddToast?.(res.message, 'success');
                            loadPortalData();
                          }
                        }}
                        className="px-3 py-1.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-bold"
                      >
                        {['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. SAAS SUBSCRIPTION PLANS & VERIFIED BILLING */}
          {activeSection === 'subscriptions' && (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 sm:p-8 shadow-aesthetic">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-black text-[#231F20] font-display">
                      PetPaws Business SaaS Subscription Plans
                    </h3>
                    <p className="text-xs text-[#65605B] mt-1">
                      Backend-enforced catalog limits, team seats, and marketplace commission discounts. Verified via HMAC-SHA256 payment signatures.
                    </p>
                  </div>

                  <div className="inline-flex bg-[#FAF6F0] p-1 rounded-2xl border border-[#E6DCCF]">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                        billingCycle === 'monthly' ? 'bg-[#231F20] text-white' : 'text-[#65605B]'
                      }`}
                    >
                      Monthly Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('annual')}
                      className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                        billingCycle === 'annual' ? 'bg-[#E07A5F] text-white' : 'text-[#65605B]'
                      }`}
                    >
                      Annual (Save 17%)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {plans.map(plan => {
                    const isCurrent = business?.subscription_plan === plan.id;
                    const price = billingCycle === 'annual' ? plan.annual_price : plan.monthly_price;

                    return (
                      <div
                        key={plan.id}
                        className={`rounded-3xl border p-6 flex flex-col justify-between transition-all ${
                          isCurrent
                            ? 'border-[#E07A5F] bg-[#FFF5F0]/50 ring-2 ring-[#E07A5F]/25'
                            : 'border-[#EFE9DF] bg-white'
                        }`}
                      >
                        <div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FAF6F0] text-[#E07A5F] border border-[#E6DCCF]">
                            {plan.badge}
                          </span>
                          <h4 className="text-lg font-black text-[#231F20] font-display mt-3">
                            {plan.name}
                          </h4>
                          <div className="mt-2 mb-3">
                            <span className="text-3xl font-black text-[#231F20] font-display">
                              ${price}
                            </span>
                            <span className="text-xs text-[#65605B]">
                              /{billingCycle === 'annual' ? 'year' : 'month'}
                            </span>
                          </div>
                          <p className="text-xs text-[#65605B] mb-4">{plan.description}</p>

                          <ul className="space-y-2 text-xs text-[#231F20] mb-6">
                            {(plan.highlights || []).map((h, i) => (
                              <li key={i} className="flex items-start space-x-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#52796F] flex-shrink-0 mt-0.5" />
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          type="button"
                          disabled={isCurrent && business?.billing_cycle === billingCycle}
                          onClick={() => handleUpgradeSubscription(plan.id)}
                          className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            isCurrent && business?.billing_cycle === billingCycle
                              ? 'bg-[#EAEFE9] text-[#2A5C4A] cursor-default'
                              : 'bg-[#E07A5F] hover:bg-[#D0654A] text-white shadow-md'
                          }`}
                        >
                          {upgradingPlanId === plan.id
                            ? 'Verifying Payment…'
                            : isCurrent && business?.billing_cycle === billingCycle
                            ? 'Current Active Plan'
                            : `Select ${plan.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Billing History Table */}
              <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                <h4 className="text-base font-black text-[#231F20] font-display mb-4">
                  Subscription Billing & HMAC-Verified Transactions ({billingHistory.length})
                </h4>
                {billingHistory.length === 0 ? (
                  <p className="text-xs text-[#65605B]">No paid subscription transactions recorded yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {billingHistory.map(tx => (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-2xl border border-[#EFE9DF] flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-extrabold text-[#231F20]">{tx.plan_name}</span>
                          <span className="text-[#65605B] ml-2">
                            ({tx.billing_cycle}) • Order: <code className="font-mono">{tx.provider_order_id}</code>
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-2.5 py-0.5 bg-[#EAEFE9] text-[#2A5C4A] font-extrabold rounded-full">
                            {tx.status.toUpperCase()} {tx.webhook_verified ? '• HMAC Verified' : ''}
                          </span>
                          <strong className="text-sm font-black">${tx.amount}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. BUSINESS PROFILE, PAYOUTS & TEAM MEMBERSHIPS */}
          {activeSection === 'team' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                <h3 className="text-lg font-black text-[#231F20] font-display mb-4">
                  Business Profile & Payout Settings
                </h3>
                <form onSubmit={handleSaveBusinessSettings} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Business / Storefront Name *</label>
                      <input
                        type="text"
                        required
                        value={bizName}
                        onChange={e => setBizName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Business Type</label>
                      <select
                        value={bizType}
                        onChange={e => setBizType(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl font-bold"
                      >
                        <option value="pet_shop">Pet Products Shop</option>
                        <option value="breeder">Ethical Pet Breeder</option>
                        <option value="vet_clinic">Veterinary Clinic</option>
                        <option value="grooming_salon">Grooming & Training Studio</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Storefront Description</label>
                    <textarea
                      rows={2}
                      value={bizDesc}
                      onChange={e => setBizDesc(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={bizPhone}
                        onChange={e => setBizPhone(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">GST / Tax Identification Number</label>
                      <input
                        type="text"
                        placeholder="US-EIN or GSTIN"
                        value={bizGst}
                        onChange={e => setBizGst(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Business Address</label>
                    <input
                      type="text"
                      value={bizAddress}
                      onChange={e => setBizAddress(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                    />
                  </div>

                  <div className="pt-3 border-t border-[#EFE9DF]">
                    <h4 className="font-extrabold text-[#231F20] mb-2">
                      Vendor Payout Bank & UPI Account
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="UPI ID (e.g. shop@upi)"
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        className="px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                      />
                      <input
                        type="text"
                        placeholder="Bank Name"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        className="px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                      />
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={bankAccount}
                        onChange={e => setBankAccount(e.target.value)}
                        className="px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                      />
                      <input
                        type="text"
                        placeholder="IFSC / Routing Code"
                        value={ifscCode}
                        onChange={e => setIfscCode(e.target.value)}
                        className="px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                  >
                    Save Business Settings
                  </button>
                </form>
              </div>

              {/* Team Memberships (RBAC) */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic h-fit space-y-4">
                <div>
                  <h3 className="text-lg font-black text-[#231F20] font-display">
                    Authorized Team Members ({teamMembers.length} / {usage?.max_team_members || 1})
                  </h3>
                  <p className="text-xs text-[#65605B]">
                    Grant multi-user access to your business tenant without sharing your personal password.
                  </p>
                </div>

                <form onSubmit={handleInviteMember} className="space-y-2.5 text-xs bg-[#FAF6F0] p-4 rounded-2xl border border-[#E6DCCF]">
                  <input
                    type="text"
                    required
                    placeholder="Staff Member Full Name"
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E6DCCF] rounded-xl"
                  />
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="staff@petshop.com"
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-[#E6DCCF] rounded-xl"
                    />
                    <select
                      value={newMemberRole}
                      onChange={e => setNewMemberRole(e.target.value)}
                      className="px-3 py-2 bg-white border border-[#E6DCCF] rounded-xl font-bold"
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                      <option value="vet">Vet</option>
                      <option value="groomer">Groomer</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#52796F] text-white font-extrabold rounded-xl"
                  >
                    Add Team Member
                  </button>
                </form>

                <div className="space-y-2">
                  {teamMembers.map(mem => (
                    <div
                      key={mem.id}
                      className="p-3 rounded-2xl border border-[#EFE9DF] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-[#231F20]">{mem.user_name}</p>
                        <p className="text-[11px] text-[#65605B]">
                          {mem.user_email} • <strong className="uppercase">{mem.role}</strong>
                        </p>
                      </div>
                      {mem.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(mem.id)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 7. PLATFORM ADMIN MODERATION & AUDIT TRAIL */}
          {activeSection === 'admin' && currentUser.role === 'admin' && (
            <div className="space-y-8">
              {/* Vendor Moderation */}
              <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                <h3 className="text-lg font-black text-[#231F20] font-display mb-4">
                  Platform Vendor & Tenant Governance ({adminData.businesses.length})
                </h3>
                <div className="space-y-3">
                  {adminData.businesses.map(b => (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl border border-[#EFE9DF] flex flex-wrap items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-[#231F20] text-sm">
                          {b.name} <span className="font-mono text-[#65605B]">({b.id})</span>
                        </p>
                        <p className="text-[#65605B]">
                          Type: {b.business_type} • Plan: <strong className="uppercase">{b.subscription_plan}</strong> • Status:{' '}
                          <strong>{b.status}</strong> ({b.verification_status})
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleModerateBusiness(b.id, {
                              verification_status: 'approved',
                              status: 'active'
                            })
                          }
                          className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl"
                        >
                          Approve / Activate
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleModerateBusiness(b.id, {
                              verification_status: 'suspended',
                              status: 'suspended'
                            })
                          }
                          className="px-3 py-1.5 bg-red-600 text-white font-bold rounded-xl"
                        >
                          Suspend Tenant
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Moderation */}
              <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                <h3 className="text-lg font-black text-[#231F20] font-display mb-4">
                  Product Listing Moderation & Reports ({adminData.products.length})
                </h3>
                <div className="space-y-3">
                  {adminData.products.map(p => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl border border-[#EFE9DF] flex flex-wrap items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-[#231F20]">
                          {p.title} — ₹{Number(p.price || 0).toLocaleString('en-IN')} ({p.business_name})
                        </p>
                        <p className="text-[#65605B]">
                          Moderation: <strong>{p.moderation_status || 'approved'}</strong> • Reports:{' '}
                          <strong className={p.report_count > 0 ? 'text-red-600' : ''}>{p.report_count || 0}</strong>
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleModerateProduct(p.id, 'approved')}
                          className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerateProduct(p.id, 'suspended')}
                          className="px-3 py-1.5 bg-red-600 text-white font-bold rounded-xl"
                        >
                          Suspend Listing
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Audit Logs */}
              <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
                <h3 className="text-lg font-black text-[#231F20] font-display mb-4">
                  Platform Security & Multi-Tenant Audit Log ({adminData.auditLogs.length})
                </h3>
                <div className="space-y-2 text-xs">
                  {adminData.auditLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-xl bg-[#FAF6F0] border border-[#E6DCCF] flex justify-between">
                      <div>
                        <strong className="text-[#E07A5F] font-mono">{log.action}</strong> — {log.details}
                      </div>
                      <span className="text-[#65605B]">
                        Actor: {log.actor_name} ({log.actor_role})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
