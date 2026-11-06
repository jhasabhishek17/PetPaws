import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  HelpCircle,
  Store,
  Package,
  Activity,
  LayoutDashboard,
  Search,
  Filter,
  RefreshCw,
  Send,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Mail,
  Calendar,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  ShieldAlert,
  Server,
  Cpu,
  Database,
  ArrowUpRight,
  Check,
  Ban,
  FileText,
  Building,
  DollarSign
} from 'lucide-react';
import { apiGet, apiPut, apiPatch } from '../utils/auth';

/**
 * Format ISO date string into a friendly localized display
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Priority badge helper
 */
const PriorityBadge = ({ priority }) => {
  const norm = String(priority || 'Medium').toLowerCase();
  let colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  if (norm === 'urgent') {
    colorClasses = 'bg-red-50 text-red-700 border-red-200 animate-pulse';
  } else if (norm === 'high') {
    colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
  } else if (norm === 'low') {
    colorClasses = 'bg-stone-100 text-stone-600 border-stone-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${colorClasses}`}
    >
      {priority || 'Medium'}
    </span>
  );
};

/**
 * Status badge helper
 */
const StatusBadge = ({ status }) => {
  const norm = String(status || 'Open').toLowerCase();
  let colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
  if (norm === 'in progress') {
    colorClasses = 'bg-sky-50 text-sky-800 border-sky-200';
  } else if (norm === 'resolved') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (norm === 'closed') {
    colorClasses = 'bg-stone-100 text-stone-600 border-stone-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClasses}`}
    >
      {status || 'Open'}
    </span>
  );
};

/**
 * Confirmation Dialog Component
 */
const ConfirmationModal = ({ isOpen, title, message, confirmText = 'Confirm', confirmStyle = 'danger', onConfirm, onCancel, loading }) => {
  if (!isOpen) return null;

  const btnBg =
    confirmStyle === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-[#52796F] hover:bg-[#3D5A52] text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
        <div className="flex items-center gap-3 text-stone-900 mb-3">
          <AlertTriangle className={`w-6 h-6 ${confirmStyle === 'danger' ? 'text-red-500' : 'text-[#E07A5F]'}`} />
          <h3 className="text-lg font-black font-display">{title}</h3>
        </div>
        <p className="text-sm text-stone-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${btnBg} flex items-center gap-1.5`}
          >
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminPortal({
  currentUser,
  initialSection = 'overview',
  onNavigate,
  onAddToast
}) {
  const [activeSection, setActiveSection] = useState(initialSection);

  // Sync internal active section if initialSection prop updates from URL hash/tab changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Support Desk state
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState(null);
  const [supportSearch, setSupportSearch] = useState('');
  const [supportStatus, setSupportStatus] = useState('All');
  const [supportPriority, setSupportPriority] = useState('All');
  const [supportPage, setSupportPage] = useState(1);
  const [supportPagination, setSupportPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [updatingTicketStatus, setUpdatingTicketStatus] = useState(false);

  // SaaS Overview & Moderation state
  const [adminOverview, setAdminOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(null);

  // Vendor Management state
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorVerificationFilter, setVendorVerificationFilter] = useState('All');
  const [vendorStatusFilter, setVendorStatusFilter] = useState('All');
  const [vendorModalAction, setVendorModalAction] = useState(null); // { type, business }
  const [vendorActionLoading, setVendorActionLoading] = useState(false);

  // Product Moderation state
  const [productSearch, setProductSearch] = useState('');
  const [productModerationFilter, setProductModerationFilter] = useState('All');
  const [productModalAction, setProductModalAction] = useState(null); // { type, product }
  const [productActionLoading, setProductActionLoading] = useState(false);

  // System Health state
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthPingMs, setHealthPingMs] = useState(null);
  const [healthError, setHealthError] = useState(null);

  // Ensure unauthorized users cannot access this component
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="bg-white rounded-3xl border border-stone-200 p-10 shadow-aesthetic">
          <div className="w-16 h-16 bg-red-50 text-red-600 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 font-display mb-2">
            Platform Administrator Access Required
          </h2>
          <p className="text-sm text-stone-600 max-w-md mx-auto mb-6">
            This dashboard is strictly restricted to authenticated PetPaws Platform Administrators. Please sign in with an administrative account to continue.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate?.('marketplace')}
              className="px-6 py-2.5 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-bold text-xs rounded-full shadow-aesthetic transition-all cursor-pointer"
            >
              Return to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fetch Support Tickets
  const fetchTickets = async (page = 1) => {
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (supportStatus !== 'All') params.set('status', supportStatus);
      if (supportPriority !== 'All') params.set('priority', supportPriority);
      if (supportSearch.trim()) params.set('search', supportSearch.trim());

      const res = await apiGet(`/api/support/tickets?${params.toString()}`);
      if (res && res.success) {
        setTickets(res.tickets || []);
        if (res.pagination) {
          setSupportPagination(res.pagination);
          setSupportPage(res.pagination.page);
        }
      } else {
        setTicketsError(res?.message || 'Failed to retrieve support tickets');
      }
    } catch (err) {
      setTicketsError('Network error loading support tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  // Fetch SaaS Overview data (businesses, products, audit logs, subscription transactions)
  const fetchAdminOverview = async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await apiGet('/api/saas/admin/overview');
      if (res && res.success) {
        setAdminOverview(res);
      } else {
        setOverviewError(res?.message || 'Failed to load platform overview');
      }
    } catch (err) {
      setOverviewError('Network error loading platform overview');
    } finally {
      setOverviewLoading(false);
    }
  };

  // Fetch System Health
  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    const start = performance.now();
    try {
      const res = await apiGet('/api/health');
      const ping = Math.round(performance.now() - start);
      setHealthPingMs(ping);
      if (res && res.status === 'ok') {
        setHealthData(res);
      } else {
        setHealthError('Server health reported an unexpected status');
      }
    } catch (err) {
      setHealthError('Unable to reach health monitoring endpoint');
    } finally {
      setHealthLoading(false);
    }
  };

  // Load section-specific data upon section change or initial mount
  useEffect(() => {
    if (activeSection === 'support') {
      fetchTickets(supportPage);
    } else if (activeSection === 'overview' || activeSection === 'vendors' || activeSection === 'products') {
      fetchAdminOverview();
      if (activeSection === 'overview') {
        fetchHealth();
        // Also fetch initial tickets summary
        fetchTickets(1);
      }
    } else if (activeSection === 'health') {
      fetchHealth();
    }
  }, [activeSection]);

  // Refetch tickets when search or filters change
  useEffect(() => {
    if (activeSection === 'support') {
      fetchTickets(1);
    }
  }, [supportStatus, supportPriority]);

  // Open ticket drawer and fetch freshest details
  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setTicketDrawerOpen(true);
    setReplyMessage('');
    try {
      const res = await apiGet(`/api/support/tickets/${encodeURIComponent(ticket.custom_id || ticket.id)}`);
      if (res && res.success && res.ticket) {
        setSelectedTicket(res.ticket);
      }
    } catch (err) {
      console.warn('Could not refresh single ticket:', err);
    }
  };

  // Submit Admin Reply to Support Ticket
  const handleSendReply = async (newStatusOverride = null) => {
    if (!selectedTicket) return;
    if (!replyMessage.trim()) {
      onAddToast?.('Please write a reply message before submitting.', 'error');
      return;
    }

    setReplySubmitting(true);
    try {
      const ticketId = selectedTicket.custom_id || selectedTicket.id;
      const body = {
        reply: replyMessage.trim()
      };
      if (newStatusOverride) {
        body.status = newStatusOverride;
      }

      const res = await apiPut(`/api/support/tickets/${encodeURIComponent(ticketId)}`, body);
      if (res && res.success) {
        onAddToast?.(res.message || 'Reply posted and customer notified.', 'success');
        setReplyMessage('');
        if (res.ticket) {
          setSelectedTicket(res.ticket);
        }
        // Refresh ticket listing in background
        fetchTickets(supportPage);
      } else {
        onAddToast?.(res?.message || 'Failed to submit reply.', 'error');
      }
    } catch (err) {
      onAddToast?.('Network error while submitting reply.', 'error');
    } finally {
      setReplySubmitting(false);
    }
  };

  // Update Status / Priority of selected ticket
  const handleUpdateTicketMeta = async (updates) => {
    if (!selectedTicket) return;
    setUpdatingTicketStatus(true);
    try {
      const ticketId = selectedTicket.custom_id || selectedTicket.id;
      const res = await apiPut(`/api/support/tickets/${encodeURIComponent(ticketId)}`, updates);
      if (res && res.success) {
        onAddToast?.(res.message || 'Ticket updated successfully.', 'success');
        if (res.ticket) {
          setSelectedTicket(res.ticket);
        }
        fetchTickets(supportPage);
      } else {
        onAddToast?.(res?.message || 'Failed to update ticket.', 'error');
      }
    } catch (err) {
      onAddToast?.('Network error updating ticket.', 'error');
    } finally {
      setUpdatingTicketStatus(false);
    }
  };

  // Moderate Business (Approve, Reject, Suspend, Reactivate)
  const handleExecuteVendorAction = async () => {
    if (!vendorModalAction || !vendorModalAction.business) return;
    const { type, business } = vendorModalAction;
    setVendorActionLoading(true);

    const updates = {};
    if (type === 'verify') {
      updates.verification_status = 'verified';
    } else if (type === 'reject') {
      updates.verification_status = 'rejected';
    } else if (type === 'suspend') {
      updates.status = 'suspended';
    } else if (type === 'reactivate') {
      updates.status = 'active';
    }

    try {
      const bizId = business.id || business.custom_id;
      const res = await apiPut(`/api/saas/admin/businesses/${encodeURIComponent(bizId)}/status`, updates);
      if (res && res.success) {
        onAddToast?.(res.message || `Vendor ${business.name} updated.`, 'success');
        setVendorModalAction(null);
        fetchAdminOverview();
      } else {
        onAddToast?.(res?.message || 'Failed to update vendor.', 'error');
      }
    } catch {
      onAddToast?.('Network error while updating vendor status.', 'error');
    } finally {
      setVendorActionLoading(false);
    }
  };

  // Moderate Product (Approve, Suspend)
  const handleExecuteProductAction = async () => {
    if (!productModalAction || !productModalAction.product) return;
    const { type, product } = productModalAction;
    setProductActionLoading(true);

    const moderation_status = type === 'approve' ? 'approved' : 'suspended';
    try {
      const prodId = product.id || product.custom_id;
      const res = await apiPut(`/api/saas/admin/products/${encodeURIComponent(prodId)}/moderate`, {
        moderation_status
      });
      if (res && res.success) {
        onAddToast?.(res.message || `Product ${product.title} updated.`, 'success');
        setProductModalAction(null);
        fetchAdminOverview();
      } else {
        onAddToast?.(res?.message || 'Failed to update product moderation.', 'error');
      }
    } catch {
      onAddToast?.('Network error while moderating product.', 'error');
    } finally {
      setProductActionLoading(false);
    }
  };

  // Filtered businesses
  const filteredBusinesses = useMemo(() => {
    if (!adminOverview?.businesses) return [];
    return adminOverview.businesses.filter((b) => {
      if (vendorVerificationFilter !== 'All' && b.verification_status !== vendorVerificationFilter) {
        return false;
      }
      if (vendorStatusFilter !== 'All' && b.status !== vendorStatusFilter) {
        return false;
      }
      if (vendorSearch.trim()) {
        const q = vendorSearch.toLowerCase().trim();
        const nameMatch = (b.name || '').toLowerCase().includes(q);
        const emailMatch = (b.contact_email || b.owner_user_id || '').toLowerCase().includes(q);
        const typeMatch = (b.business_type || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || typeMatch;
      }
      return true;
    });
  }, [adminOverview, vendorVerificationFilter, vendorStatusFilter, vendorSearch]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (!adminOverview?.products) return [];
    return adminOverview.products.filter((p) => {
      if (productModerationFilter !== 'All' && p.moderation_status !== productModerationFilter) {
        return false;
      }
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase().trim();
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const catMatch = (p.category || '').toLowerCase().includes(q);
        const idMatch = String(p.id || p.custom_id || '').toLowerCase().includes(q);
        return titleMatch || catMatch || idMatch;
      }
      return true;
    });
  }, [adminOverview, productModerationFilter, productSearch]);

  // Calculate Overview KPIs
  const kpis = useMemo(() => {
    const businesses = adminOverview?.businesses || [];
    const products = adminOverview?.products || [];
    const pendingVendors = businesses.filter((b) => b.verification_status === 'pending');
    const suspendedProducts = products.filter((p) => p.moderation_status === 'suspended');
    const reportedProducts = products.filter((p) => (Number(p.report_count) || 0) > 0);

    return {
      totalVendors: businesses.length,
      pendingVendors: pendingVendors.length,
      totalProducts: products.length,
      flaggedProducts: suspendedProducts.length + reportedProducts.length,
      totalTickets: supportPagination.total || tickets.length,
      openTickets: tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length
    };
  }, [adminOverview, supportPagination, tickets]);

  const navSections = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'support', label: 'Support Desk', icon: HelpCircle, badge: kpis.openTickets > 0 ? kpis.openTickets : null },
    { id: 'vendors', label: 'Vendor Management', icon: Store, badge: kpis.pendingVendors > 0 ? kpis.pendingVendors : null },
    { id: 'products', label: 'Product Moderation', icon: Package, badge: kpis.flaggedProducts > 0 ? kpis.flaggedProducts : null },
    { id: 'health', label: 'System Health', icon: Activity }
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      {/* Top Admin Identity & Status Header */}
      <div className="bg-gradient-to-r from-[#231F20] via-[#2F3E46] to-[#243D36] rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E07A5F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Platform Administrator Portal
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 text-[11px] font-bold">
                Admin ID: {currentUser.id}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Production Guard Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Platform Governance & Support Center
            </h1>
            <p className="text-sm text-stone-300 mt-1 max-w-2xl leading-relaxed">
              Unified console for monitoring platform health, resolving customer support tickets, auditing vendor verifications, and moderating marketplace listings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2.5 text-right">
              <p className="text-[10px] uppercase font-bold text-stone-300">Signed In As</p>
              <p className="text-xs font-bold text-white truncate max-w-[200px]">{currentUser.name}</p>
              <p className="text-[10px] text-stone-300 truncate max-w-[200px]">{currentUser.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar + Active Section Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <nav className="lg:col-span-3 xl:col-span-2 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0" aria-label="Admin Navigation">
          {navSections.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  const tabMap = {
                    overview: 'admin-portal',
                    support: 'admin-support',
                    vendors: 'admin-vendors',
                    products: 'admin-products',
                    health: 'admin-health'
                  };
                  onNavigate?.(tabMap[item.id] || 'admin-portal');
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#231F20] text-white shadow-md'
                    : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F4A261]' : 'text-stone-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-[#E07A5F] text-white' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Content Workspace */}
        <section className="lg:col-span-9 xl:col-span-10 min-w-0" aria-live="polite">
          {/* ========================================================= */}
          {/* 1. OVERVIEW SECTION */}
          {/* ========================================================= */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Operational Alert Banners */}
              {kpis.openTickets > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">
                        {kpis.openTickets} Customer Support {kpis.openTickets === 1 ? 'Ticket Requires' : 'Tickets Require'} Attention
                      </h4>
                      <p className="text-xs text-amber-700">
                        Customer inquiries pending admin response. Respond promptly to maintain SLA benchmarks.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('support')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors whitespace-nowrap"
                  >
                    Open Support Desk
                  </button>
                </div>
              )}

              {kpis.pendingVendors > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-blue-900">
                        {kpis.pendingVendors} Vendor Business {kpis.pendingVendors === 1 ? 'Verification' : 'Verifications'} Pending
                      </h4>
                      <p className="text-xs text-blue-700">
                        New breeders, pet shops, or grooming businesses awaiting credential review.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('vendors')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors whitespace-nowrap"
                  >
                    Review Vendors
                  </button>
                </div>
              )}

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Support Desk</span>
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#E07A5F] flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black font-display text-stone-900">{kpis.totalTickets}</p>
                  <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                    <span className="font-bold text-amber-600">{kpis.openTickets} open</span>
                    <span>•</span>
                    <span>{Math.max(0, kpis.totalTickets - kpis.openTickets)} resolved</span>
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Vendor Businesses</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#52796F] flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black font-display text-stone-900">{kpis.totalVendors}</p>
                  <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                    <span className="font-bold text-blue-600">{kpis.pendingVendors} pending review</span>
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Products Catalog</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black font-display text-stone-900">{kpis.totalProducts}</p>
                  <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                    <span className={kpis.flaggedProducts > 0 ? 'text-red-600 font-bold' : 'text-stone-500'}>
                      {kpis.flaggedProducts} moderation flagged
                    </span>
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">System Engine</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                      <Activity className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black font-display text-stone-900 truncate">
                    {healthData?.database?.mode || 'Operational'}
                  </p>
                  <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>API Latency: {healthPingMs !== null ? `${healthPingMs}ms` : 'Healthy'}</span>
                  </p>
                </div>
              </div>

              {/* Audit Logs & Platform Activity */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-black font-display text-stone-900">Platform Security & Audit Trail</h3>
                    <p className="text-xs text-stone-500">Recent administrative actions, role updates, and moderation events</p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchAdminOverview}
                    disabled={overviewLoading}
                    className="p-2 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition-colors"
                    title="Refresh audit activity"
                    aria-label="Refresh audit activity"
                  >
                    <RefreshCw className={`w-4 h-4 ${overviewLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {overviewLoading && !adminOverview ? (
                  <div className="py-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#E07A5F]" />
                    <span>Loading audit records...</span>
                  </div>
                ) : adminOverview?.auditLogs && adminOverview.auditLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-100 text-stone-500 uppercase font-bold text-[10px]">
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Actor</th>
                          <th className="py-2.5 px-3">Target</th>
                          <th className="py-2.5 px-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-700">
                        {adminOverview.auditLogs.slice(0, 10).map((log, idx) => (
                          <tr key={log.id || idx} className="hover:bg-stone-50 transition-colors">
                            <td className="py-2.5 px-3 text-stone-500 whitespace-nowrap">{formatDate(log.createdAt || log.created_at)}</td>
                            <td className="py-2.5 px-3 font-bold text-stone-900">{log.action || 'system.event'}</td>
                            <td className="py-2.5 px-3 text-stone-600">{log.actor_name || log.actor?.name || 'Admin'}</td>
                            <td className="py-2.5 px-3 text-stone-500">{log.target_type ? `${log.target_type} (${log.target_id})` : '-'}</td>
                            <td className="py-2.5 px-3 text-stone-600 max-w-xs truncate">{log.details || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-stone-500">
                    No recent audit log entries captured.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. SUPPORT DESK SECTION */}
          {/* ========================================================= */}
          {activeSection === 'support' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5 animate-fadeIn">
              {/* Header and Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-xl font-black font-display text-stone-900">Support Desk</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Review incoming tickets, manage status and priority, and dispatch verified replies to customers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchTickets(supportPage)}
                    disabled={ticketsLoading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ticketsLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchTickets(1);
                }}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3"
              >
                <div className="sm:col-span-6 relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={supportSearch}
                    onChange={(e) => setSupportSearch(e.target.value)}
                    placeholder="Search by ticket ID, customer name, email, or message..."
                    className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-[#E07A5F] focus:ring-0 transition-colors"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={supportStatus}
                    onChange={(e) => setSupportStatus(e.target.value)}
                    aria-label="Filter by Status"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-[#E07A5F] focus:ring-0 transition-colors"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={supportPriority}
                    onChange={(e) => setSupportPriority(e.target.value)}
                    aria-label="Filter by Priority"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-[#E07A5F] focus:ring-0 transition-colors"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </form>

              {/* Tickets Table / List */}
              {ticketsLoading ? (
                <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#E07A5F]" />
                  <span>Loading platform support tickets...</span>
                </div>
              ) : ticketsError ? (
                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-red-700 text-xs">
                  <p className="font-bold mb-1">Failed to load support tickets</p>
                  <p className="mb-3">{ticketsError}</p>
                  <button
                    type="button"
                    onClick={() => fetchTickets(supportPage)}
                    className="px-4 py-1.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-stone-200 rounded-2xl p-8">
                  <HelpCircle className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-stone-800 mb-1">No Support Tickets Found</h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    {supportSearch || supportStatus !== 'All' || supportPriority !== 'All'
                      ? 'No tickets match the selected filters or search query.'
                      : 'There are currently no support tickets recorded in the platform.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 uppercase font-bold text-[10px] bg-stone-50/70">
                        <th className="py-3 px-4">Ticket ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Created</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {tickets.map((t) => {
                        const ticketId = t.custom_id || t.id;
                        const hasReplies = Array.isArray(t.responses) && t.responses.length > 0;
                        return (
                          <tr
                            key={ticketId}
                            onClick={() => handleOpenTicket(t)}
                            className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                              {ticketId}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <p className="font-bold text-stone-900">{t.user_name || 'Customer'}</p>
                              <p className="text-[11px] text-stone-500">{t.user_email}</p>
                            </td>
                            <td className="py-3 px-4 max-w-xs">
                              <p className="font-bold text-stone-900 truncate">{t.subject}</p>
                              <p className="text-[11px] text-stone-500 truncate">{t.message}</p>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <PriorityBadge priority={t.priority} />
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <StatusBadge status={t.status} />
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-stone-500">
                              {formatDate(t.created_at || t.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenTicket(t);
                                }}
                                className="px-3 py-1.5 bg-[#52796F] hover:bg-[#3D5A52] text-white font-bold text-[11px] rounded-lg transition-colors shadow-sm inline-flex items-center gap-1"
                              >
                                <span>Inspect</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {supportPagination && supportPagination.pages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-stone-100 text-xs text-stone-600">
                  <p>
                    Showing page <span className="font-bold text-stone-900">{supportPagination.page}</span> of{' '}
                    <span className="font-bold text-stone-900">{supportPagination.pages}</span> ({supportPagination.total} total tickets)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={supportPagination.page <= 1 || ticketsLoading}
                      onClick={() => fetchTickets(supportPagination.page - 1)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 disabled:opacity-50 font-bold transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={supportPagination.page >= supportPagination.pages || ticketsLoading}
                      onClick={() => fetchTickets(supportPagination.page + 1)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 disabled:opacity-50 font-bold transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. VENDOR MANAGEMENT SECTION */}
          {/* ========================================================= */}
          {activeSection === 'vendors' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-xl font-black font-display text-stone-900">Vendor Business Management</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Review and govern verified breeder kennels, pet supply stores, and grooming salon tenants.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchAdminOverview}
                  disabled={overviewLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${overviewLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Vendor Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    placeholder="Search vendor name, email, or category..."
                    className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-[#E07A5F] focus:ring-0 transition-colors"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={vendorVerificationFilter}
                    onChange={(e) => setVendorVerificationFilter(e.target.value)}
                    aria-label="Filter by Verification Status"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-[#E07A5F] focus:ring-0 transition-colors"
                  >
                    <option value="All">All Verification Statuses</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={vendorStatusFilter}
                    onChange={(e) => setVendorStatusFilter(e.target.value)}
                    aria-label="Filter by Account Status"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-[#E07A5F] focus:ring-0 transition-colors"
                  >
                    <option value="All">All Account Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Vendors Table */}
              {overviewLoading && !adminOverview ? (
                <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#E07A5F]" />
                  <span>Loading registered vendor businesses...</span>
                </div>
              ) : filteredBusinesses.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-stone-200 rounded-2xl p-8">
                  <Store className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-stone-800 mb-1">No Vendor Businesses Found</h3>
                  <p className="text-xs text-stone-500">No vendor business tenants match your current filter parameters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 uppercase font-bold text-[10px] bg-stone-50/70">
                        <th className="py-3 px-4">Business</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Plan</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {filteredBusinesses.map((b) => {
                        const isVerified = b.verification_status === 'verified';
                        const isPending = b.verification_status === 'pending';
                        const isSuspended = b.status === 'suspended';
                        return (
                          <tr key={b.id || b.custom_id} className="hover:bg-stone-50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-bold text-stone-900">{b.name}</p>
                              <p className="text-[11px] text-stone-500">{b.contact_email || b.owner_user_id || 'ID: ' + b.id}</p>
                            </td>
                            <td className="py-3 px-4 capitalize whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium">
                                {(b.business_type || 'General').replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 capitalize whitespace-nowrap font-bold text-stone-800">
                              {b.subscription_plan || 'free'}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" /> Verified
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
                                  {b.verification_status || 'Unverified'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isSuspended ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                  Suspended
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isVerified && (
                                  <button
                                    type="button"
                                    onClick={() => setVendorModalAction({ type: 'verify', business: b })}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors shadow-sm"
                                  >
                                    Verify
                                  </button>
                                )}
                                {isPending && (
                                  <button
                                    type="button"
                                    onClick={() => setVendorModalAction({ type: 'reject', business: b })}
                                    className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-[11px] rounded-lg transition-colors"
                                  >
                                    Reject
                                  </button>
                                )}
                                {!isSuspended ? (
                                  <button
                                    type="button"
                                    onClick={() => setVendorModalAction({ type: 'suspend', business: b })}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] rounded-lg transition-colors"
                                  >
                                    Suspend
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setVendorModalAction({ type: 'reactivate', business: b })}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] rounded-lg transition-colors"
                                  >
                                    Reactivate
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. PRODUCT MODERATION SECTION */}
          {/* ========================================================= */}
          {activeSection === 'products' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-xl font-black font-display text-stone-900">Marketplace Product Moderation</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Inspect supply products, pet accessories, food, and grooming goods submitted by platform vendors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchAdminOverview}
                  disabled={overviewLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${overviewLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Product Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product title, category, or listing ID..."
                    className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-[#E07A5F] focus:ring-0 transition-colors"
                  />
                </div>

                <div className="sm:col-span-4">
                  <select
                    value={productModerationFilter}
                    onChange={(e) => setProductModerationFilter(e.target.value)}
                    aria-label="Filter by Moderation Status"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-[#E07A5F] focus:ring-0 transition-colors"
                  >
                    <option value="All">All Moderation Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Products Table */}
              {overviewLoading && !adminOverview ? (
                <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#E07A5F]" />
                  <span>Loading marketplace products catalog...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-stone-200 rounded-2xl p-8">
                  <Package className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-stone-800 mb-1">No Products Found</h3>
                  <p className="text-xs text-stone-500">No marketplace listings match your search criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 uppercase font-bold text-[10px] bg-stone-50/70">
                        <th className="py-3 px-4">Product Listing</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Reports</th>
                        <th className="py-3 px-4">Moderation</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {filteredProducts.map((p) => {
                        const isApproved = p.moderation_status === 'approved';
                        const isSuspended = p.moderation_status === 'suspended';
                        const reports = Number(p.report_count) || 0;
                        return (
                          <tr key={p.id || p.custom_id} className="hover:bg-stone-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {p.image_url ? (
                                  <img
                                    src={p.image_url}
                                    alt={p.title}
                                    className="w-10 h-10 rounded-lg object-cover border border-stone-200 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 flex-shrink-0">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-stone-900 line-clamp-1">{p.title}</p>
                                  <p className="text-[11px] text-stone-500">ID: {p.id || p.custom_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-stone-600">
                              {p.category || 'Supplies'}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-bold text-stone-900">
                              ${Number(p.price || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {reports > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                  {reports} reported
                                </span>
                              ) : (
                                <span className="text-stone-400">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isApproved ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Approved
                                </span>
                              ) : isSuspended ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                  Suspended
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isApproved && (
                                  <button
                                    type="button"
                                    onClick={() => setProductModalAction({ type: 'approve', product: p })}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors shadow-sm"
                                  >
                                    Approve
                                  </button>
                                )}
                                {!isSuspended && (
                                  <button
                                    type="button"
                                    onClick={() => setProductModalAction({ type: 'suspend', product: p })}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] rounded-lg transition-colors"
                                  >
                                    Suspend
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. SYSTEM HEALTH SECTION */}
          {/* ========================================================= */}
          {activeSection === 'health' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-xl font-black font-display text-stone-900">System Diagnostics & Architecture Health</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Real-time operational telemetry from the Node.js backend and active persistence engine.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchHealth}
                  disabled={healthLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#52796F] hover:bg-[#3D5A52] text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                  <span>Probe API Health</span>
                </button>
              </div>

              {healthLoading && !healthData ? (
                <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#E07A5F]" />
                  <span>Probing server health endpoints...</span>
                </div>
              ) : healthError ? (
                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-red-700 text-xs">
                  <p className="font-bold mb-1">Health Check Failed</p>
                  <p className="mb-3">{healthError}</p>
                  <button
                    type="button"
                    onClick={fetchHealth}
                    className="px-4 py-1.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry Health Probe
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Service Status */}
                  <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
                    <div className="flex items-center gap-2 text-stone-500 text-xs font-bold uppercase tracking-wider mb-2">
                      <Activity className="w-4 h-4 text-emerald-600" /> Service Status
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-lg font-black font-display text-stone-900">All Systems Operational</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-2">
                      Last ping latency: <span className="font-bold text-stone-800">{healthPingMs}ms</span> • API status: ok
                    </p>
                  </div>

                  {/* Storage Persistence Engine */}
                  <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
                    <div className="flex items-center gap-2 text-stone-500 text-xs font-bold uppercase tracking-wider mb-2">
                      <Database className="w-4 h-4 text-[#E07A5F]" /> Storage Engine
                    </div>
                    <p className="text-lg font-black font-display text-stone-900">
                      {healthData?.database?.mode || 'Local Storage Active'}
                    </p>
                    <p className="text-xs text-stone-500 mt-2">
                      Persistence layer: {healthData?.database?.isMongo ? 'MongoDB Atlas Replica Set' : 'JSON Fallback Storage Engine'}
                    </p>
                  </div>

                  {/* Node Runtime */}
                  <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
                    <div className="flex items-center gap-2 text-stone-500 text-xs font-bold uppercase tracking-wider mb-2">
                      <Server className="w-4 h-4 text-purple-600" /> Node.js Runtime
                    </div>
                    <p className="text-lg font-black font-display text-stone-900">
                      Node {healthData?.node?.version || process.version || 'v20+'} ({healthData?.node?.platform || 'darwin'})
                    </p>
                    <p className="text-xs text-stone-500 mt-2">
                      Environment: <span className="font-bold uppercase text-stone-800">{healthData?.environment || 'development'}</span>
                    </p>
                  </div>

                  {/* Process Uptime & Memory */}
                  <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
                    <div className="flex items-center gap-2 text-stone-500 text-xs font-bold uppercase tracking-wider mb-2">
                      <Cpu className="w-4 h-4 text-sky-600" /> Memory & Uptime
                    </div>
                    <p className="text-lg font-black font-display text-stone-900">
                      {healthData?.uptime !== undefined
                        ? `${Math.floor(healthData.uptime / 60)} mins uptime`
                        : 'Active uptime'}
                    </p>
                    <p className="text-xs text-stone-500 mt-2">
                      Heap usage: {healthData?.node?.memory?.heapUsedMB ? `${healthData.node.memory.heapUsedMB} MB` : 'Optimal'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ========================================================= */}
      {/* TICKET DETAIL & REPLY DRAWER */}
      {/* ========================================================= */}
      {ticketDrawerOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-stone-200">
              {/* Drawer Header */}
              <div className="p-6 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-white/15 text-[#F4A261]">
                      {selectedTicket.custom_id || selectedTicket.id}
                    </span>
                    <PriorityBadge priority={selectedTicket.priority} />
                    <StatusBadge status={selectedTicket.status} />
                  </div>
                  <h3 className="text-lg font-black font-display text-white line-clamp-2">
                    {selectedTicket.subject}
                  </h3>
                  <p className="text-xs text-stone-300 mt-1 flex items-center gap-1.5">
                    <span>{selectedTicket.user_name}</span>
                    <span>•</span>
                    <span>{selectedTicket.user_email}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTicketDrawerOpen(false)}
                  className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close ticket drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Priority Controls Toolbar */}
              <div className="bg-stone-50 border-b border-stone-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-500">Update Status:</span>
                  <select
                    value={selectedTicket.status}
                    disabled={updatingTicketStatus}
                    onChange={(e) => handleUpdateTicketMeta({ status: e.target.value })}
                    aria-label="Update Ticket Status"
                    className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-800 focus:border-[#E07A5F] focus:ring-0"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-500">Update Priority:</span>
                  <select
                    value={selectedTicket.priority}
                    disabled={updatingTicketStatus}
                    onChange={(e) => handleUpdateTicketMeta({ priority: e.target.value })}
                    aria-label="Update Ticket Priority"
                    className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-800 focus:border-[#E07A5F] focus:ring-0"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Conversation Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Original Customer Message */}
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#E07A5F] text-white flex items-center justify-center font-bold text-xs">
                        {(selectedTicket.user_name || 'C')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-900">{selectedTicket.user_name || 'Customer'}</p>
                        <p className="text-[10px] text-stone-500">Original Inquiry</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-400">
                      {formatDate(selectedTicket.created_at || selectedTicket.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed mt-2 pl-9">
                    {selectedTicket.message}
                  </p>
                </div>

                {/* Responses Array (Chronological History) */}
                {Array.isArray(selectedTicket.responses) && selectedTicket.responses.length > 0 ? (
                  selectedTicket.responses.map((resp, idx) => {
                    const isAdmin = resp.author_role === 'admin';
                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl p-4 border ${
                          isAdmin
                            ? 'bg-emerald-50/70 border-emerald-200 ml-6'
                            : 'bg-stone-50 border-stone-200 mr-6'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                isAdmin ? 'bg-[#52796F] text-white' : 'bg-stone-300 text-stone-700'
                              }`}
                            >
                              {(resp.author_name || 'A')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                <span>{resp.author_name || (isAdmin ? 'Platform Support' : 'Customer')}</span>
                                {isAdmin && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                                    Support Staff
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-stone-500">{resp.author_role || 'staff'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-stone-400">
                            {formatDate(resp.created_at || resp.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed mt-1 pl-9">
                          {resp.message}
                        </p>
                      </div>
                    );
                  })
                ) : selectedTicket.response ? (
                  /* Backward Compatibility: Legacy single response field */
                  <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 ml-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#52796F] text-white flex items-center justify-center font-bold text-xs">
                          A
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            <span>Platform Support</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                              Support Staff
                            </span>
                          </p>
                          <p className="text-[10px] text-stone-500">Official Reply</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed mt-1 pl-9">
                      {selectedTicket.response}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Admin Reply Composer Footer */}
              <div className="p-6 bg-stone-50 border-t border-stone-200">
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Write Reply to Customer
                </label>
                <textarea
                  rows={4}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response here. The customer will receive this message in their portal and via verified email notification..."
                  className="w-full p-3 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:border-[#E07A5F] focus:ring-0 transition-colors"
                />

                <div className="flex items-center justify-between mt-3">
                  <p className="text-[11px] text-stone-500">
                    Dispatches notification to <span className="font-bold text-stone-700">{selectedTicket.user_email}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={replySubmitting || !replyMessage.trim()}
                      onClick={() => handleSendReply('Resolved')}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                    >
                      Reply & Mark Resolved
                    </button>
                    <button
                      type="button"
                      disabled={replySubmitting || !replyMessage.trim()}
                      onClick={() => handleSendReply()}
                      className="px-4 py-2 bg-[#52796F] hover:bg-[#3D5A52] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {replySubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(vendorModalAction)}
        title={
          vendorModalAction?.type === 'verify'
            ? 'Verify Vendor Business'
            : vendorModalAction?.type === 'reject'
            ? 'Reject Vendor Application'
            : vendorModalAction?.type === 'suspend'
            ? 'Suspend Vendor Account'
            : 'Reactivate Vendor Account'
        }
        message={
          vendorModalAction?.type === 'verify'
            ? `Are you sure you want to approve "${vendorModalAction?.business?.name}" as a verified platform vendor?`
            : vendorModalAction?.type === 'reject'
            ? `Are you sure you want to reject the vendor verification for "${vendorModalAction?.business?.name}"?`
            : vendorModalAction?.type === 'suspend'
            ? `Warning: Suspending "${vendorModalAction?.business?.name}" will disable their store front and listings from the marketplace.`
            : `Reactivate "${vendorModalAction?.business?.name}" and restore their platform privileges?`
        }
        confirmText={
          vendorModalAction?.type === 'verify'
            ? 'Approve & Verify'
            : vendorModalAction?.type === 'reject'
            ? 'Reject Application'
            : vendorModalAction?.type === 'suspend'
            ? 'Suspend Vendor'
            : 'Reactivate'
        }
        confirmStyle={vendorModalAction?.type === 'suspend' || vendorModalAction?.type === 'reject' ? 'danger' : 'primary'}
        loading={vendorActionLoading}
        onConfirm={handleExecuteVendorAction}
        onCancel={() => setVendorModalAction(null)}
      />

      {/* Product Moderation Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(productModalAction)}
        title={productModalAction?.type === 'approve' ? 'Approve Product Listing' : 'Suspend Product Listing'}
        message={
          productModalAction?.type === 'approve'
            ? `Approve "${productModalAction?.product?.title}" for display in the public marketplace?`
            : `Suspend "${productModalAction?.product?.title}" from the marketplace? Buyers will no longer be able to discover or order this product.`
        }
        confirmText={productModalAction?.type === 'approve' ? 'Approve Listing' : 'Suspend Listing'}
        confirmStyle={productModalAction?.type === 'suspend' ? 'danger' : 'primary'}
        loading={productActionLoading}
        onConfirm={handleExecuteProductAction}
        onCancel={() => setProductModalAction(null)}
      />
    </div>
  );
}
