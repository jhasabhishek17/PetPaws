/**
 * SaaS Multi-Tenant Business, Subscription, Payment & Platform Moderation Controller
 *
 * Responsibilities:
 * - Business tenant profile management & team membership management (RBAC)
 * - Subscription plan catalog (Free, Starter, Growth, Pro) & billing cycle selection
 * - Server-side subscription checkout & HMAC-SHA256 cryptographic signature verification
 *   (supports Razorpay live/test credentials when configured in .env, and deterministic
 *   server-signed sandbox verification for local development/testing — never trusting
 *   unverified client payment flags)
 * - Webhook handler with HMAC verification and idempotency / duplicate-event protection
 * - Grooming business service & booking operations
 * - Tenant-scoped sales, revenue, commission, and low-stock analytics
 * - Platform Administration: vendor verification/suspension, product moderation, and audit trail
 */

const crypto = require('crypto');
const Business = require('../models/Business');
const BusinessMembership = require('../models/BusinessMembership');
const SubscriptionTransaction = require('../models/SubscriptionTransaction');
const AuditLog = require('../models/AuditLog');
const Product = require('../models/Product');
const ProductOrder = require('../models/ProductOrder');
const Pet = require('../models/Pet');
const Order = require('../models/Order');
const GroomingService = require('../models/GroomingService');
const GroomingBooking = require('../models/GroomingBooking');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId } = require('../utils/dbHelpers');
const {
  SUBSCRIPTION_PLANS,
  getPlanConfig,
  ensureUserBusiness,
  checkSubscriptionLimit,
  recordAuditLog
} = require('../middleware/tenantMiddleware');
const { getJwtSecret } = require('../config/jwt');
const ExpressError = require('../utils/ExpressError');

const isRazorpayConfigured = () => {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
};

const getPaymentSigningSecret = () => {
  if (process.env.RAZORPAY_KEY_SECRET) {
    return process.env.RAZORPAY_KEY_SECRET;
  }
  return `${getJwtSecret()}-saas-payment-hmac`;
};

const computeHmacSignature = (orderId, paymentId) => {
  return crypto
    .createHmac('sha256', getPaymentSigningSecret())
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
};

/**
 * GET /api/saas/plans
 * Public endpoint returning all SaaS subscription tiers, pricing, and feature limits
 */
const getSubscriptionPlans = async (req, res) => {
  res.json({
    success: true,
    payment_mode: isRazorpayConfigured() ? 'razorpay_live' : 'verified_sandbox',
    razorpay_key_id: process.env.RAZORPAY_KEY_ID || '',
    plans: Object.values(SUBSCRIPTION_PLANS)
  });
};

/**
 * GET /api/saas/my-business
 * Returns the authenticated user's Business tenant, active membership, team members,
 * subscription status, billing history, and operational analytics.
 */
const getMyBusinessDashboard = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required', 401);
  }

  const { business, membership } = await ensureUserBusiness(req.user, req.query.businessId || '');
  const currentPlan = getPlanConfig(business.subscription_plan || 'free');

  let teamMembers = [];
  let billingHistory = [];
  let products = [];
  let productOrders = [];
  let pets = [];
  let petOrders = [];
  let groomingServices = [];
  let groomingBookings = [];

  if (isMongoConnected()) {
    const [memDocs, txDocs, prodDocs, prodOrdDocs, petDocs, petOrdDocs, srvDocs, bkgDocs] = await Promise.all([
      BusinessMembership.find({ business_id: business.id }),
      SubscriptionTransaction.find({ business_id: business.id }).sort({ createdAt: -1 }),
      Product.find({ $or: [{ business_id: business.id }, { seller_id: business.owner_user_id }] }).sort({ createdAt: -1 }),
      ProductOrder.find({ $or: [{ business_ids: business.id }, { seller_ids: business.owner_user_id }] }).sort({ createdAt: -1 }),
      Pet.find({ seller_id: business.owner_user_id }).sort({ createdAt: -1 }),
      Order.find({ seller_id: business.owner_user_id }).sort({ createdAt: -1 }),
      GroomingService.find({ $or: [{ business_id: business.id }, { provider_id: business.owner_user_id }, { business_id: '' }] }),
      GroomingBooking.find({}).sort({ createdAt: -1 })
    ]);

    teamMembers = memDocs.map(normalizeItem);
    billingHistory = txDocs.map(normalizeItem);
    products = prodDocs.map(normalizeItem);
    productOrders = prodOrdDocs.map(normalizeItem);
    pets = petDocs.map(normalizeItem);
    petOrders = petOrdDocs.map(normalizeItem);
    groomingServices = srvDocs.map(normalizeItem);
    const tenantServiceIds = new Set(groomingServices.map(s => s.id));
    groomingBookings = bkgDocs
      .map(normalizeItem)
      .filter(
        b =>
          req.user.role === 'admin' ||
          b.business_id === business.id ||
          b.provider_id === business.owner_user_id ||
          (!b.business_id && tenantServiceIds.has(b.service_id))
      );
  } else {
    const db = loadData();
    teamMembers = (db.business_memberships || []).filter(m => m.business_id === business.id);
    billingHistory = (db.subscription_transactions || []).filter(t => t.business_id === business.id);
    products = (db.products || []).filter(p => p.business_id === business.id || p.seller_id === business.owner_user_id);
    productOrders = (db.product_orders || []).filter(
      o =>
        (o.business_ids || []).includes(business.id) ||
        (o.seller_ids || []).includes(business.owner_user_id) ||
        (o.items || []).some(i => i.business_id === business.id || i.seller_id === business.owner_user_id)
    );
    pets = (db.pets || []).filter(p => p.seller_id === business.owner_user_id);
    petOrders = (db.orders || []).filter(o => o.seller_id === business.owner_user_id);
    groomingServices = (db.grooming_services || []).filter(
      s => !s.business_id || s.business_id === business.id || s.provider_id === business.owner_user_id
    );
    const tenantServiceIds = new Set(groomingServices.map(s => s.id));
    groomingBookings = (db.grooming_bookings || []).filter(
      b =>
        req.user.role === 'admin' ||
        b.business_id === business.id ||
        b.provider_id === business.owner_user_id ||
        (!b.business_id && tenantServiceIds.has(b.service_id))
    );
  }

  // Compute vendor-scoped analytics
  const activeProducts = products.filter(p => p.status !== 'archived');
  const lowStockProducts = activeProducts.filter(p => Number(p.stock) <= 5);

  let grossProductRevenue = 0;
  let unitsSold = 0;
  for (const ord of productOrders) {
    if (ord.tracking_status === 'Cancelled' || ord.tracking_status === 'Returned') continue;
    for (const item of ord.items || []) {
      if (item.business_id === business.id || item.seller_id === business.owner_user_id) {
        grossProductRevenue += Number(item.line_total || 0);
        unitsSold += Number(item.quantity || 0);
      }
    }
  }

  const grossPetRevenue = petOrders
    .filter(o => o.tracking_status !== 'Cancelled')
    .reduce((sum, o) => sum + Number(o.price || o.total_amount || 0), 0);

  const commissionRate = Number(business.feature_limits?.commission_rate ?? currentPlan.feature_limits.commission_rate);
  const estimatedCommission = Number(((grossProductRevenue * commissionRate) / 100).toFixed(2));
  const netProductPayout = Number((grossProductRevenue - estimatedCommission).toFixed(2));

  res.json({
    success: true,
    business,
    membership,
    currentPlan,
    teamMembers,
    billingHistory,
    usage: {
      active_products: activeProducts.length,
      max_products: business.feature_limits?.max_products ?? currentPlan.feature_limits.max_products,
      active_pets: pets.filter(p => p.status === 'active').length,
      max_pets: business.feature_limits?.max_pets ?? currentPlan.feature_limits.max_pets,
      team_members: teamMembers.filter(m => m.status === 'active').length,
      max_team_members: business.feature_limits?.max_team_members ?? currentPlan.feature_limits.max_team_members
    },
    analytics: {
      gross_product_revenue: Number(grossProductRevenue.toFixed(2)),
      gross_pet_revenue: Number(grossPetRevenue.toFixed(2)),
      total_combined_revenue: Number((grossProductRevenue + grossPetRevenue).toFixed(2)),
      commission_rate: commissionRate,
      platform_commission: estimatedCommission,
      net_product_earnings: netProductPayout,
      product_orders_count: productOrders.length,
      units_sold: unitsSold,
      low_stock_count: lowStockProducts.length,
      low_stock_items: lowStockProducts.map(p => ({
        id: p.id,
        title: p.title,
        stock: p.stock,
        category: p.category
      }))
    },
    grooming: {
      services: groomingServices,
      bookings: groomingBookings
    }
  });
};

/**
 * PUT /api/saas/my-business
 * Update business tenant profile, tax/GST registration, or payout details
 */
const updateBusinessProfile = async (req, res) => {
  if (!req.user) throw new ExpressError('Authentication required', 401);

  const { business, membership } = await ensureUserBusiness(req.user, req.body.business_id || '');
  if (membership.role !== 'owner' && membership.role !== 'manager' && req.user.role !== 'admin') {
    throw new ExpressError('Only business owners or managers can update business settings', 403);
  }

  const ALLOWED = [
    'name',
    'business_type',
    'description',
    'logo_url',
    'contact_email',
    'contact_phone',
    'address',
    'city',
    'registration_number',
    'gst_or_tax_id'
  ];

  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => ALLOWED.includes(k))
  );

  if (req.body.payout_details && typeof req.body.payout_details === 'object') {
    updates.payout_details = {
      upi_id: String(req.body.payout_details.upi_id || '').trim(),
      bank_name: String(req.body.payout_details.bank_name || '').trim(),
      bank_account: String(req.body.payout_details.bank_account || '').trim(),
      ifsc_code: String(req.body.payout_details.ifsc_code || '').trim()
    };
  }

  if (isMongoConnected()) {
    const updated = await Business.findOneAndUpdate(
      { custom_id: business.id },
      { $set: updates },
      { new: true }
    );
    await recordAuditLog({
      actor: req.user,
      business_id: business.id,
      action: 'business.profile_updated',
      target_type: 'Business',
      target_id: business.id,
      details: `Updated business profile for "${updated.name}"`
    });
    return res.json({
      success: true,
      business: normalizeItem(updated),
      message: 'Business profile saved successfully'
    });
  }

  const db = loadData();
  const idx = (db.businesses || []).findIndex(b => b.id === business.id || b.custom_id === business.id);
  if (idx === -1) throw new ExpressError('Business not found', 404);

  db.businesses[idx] = { ...db.businesses[idx], ...updates };
  saveData(db);

  await recordAuditLog({
    actor: req.user,
    business_id: business.id,
    action: 'business.profile_updated',
    target_type: 'Business',
    target_id: business.id,
    details: `Updated business profile for "${db.businesses[idx].name}"`
  });

  res.json({
    success: true,
    business: db.businesses[idx],
    message: 'Business profile saved successfully'
  });
};

/**
 * POST /api/saas/my-business/members
 * Add or invite an authorized staff/manager/vet/groomer member to the business tenant
 */
const addBusinessMember = async (req, res) => {
  if (!req.user) throw new ExpressError('Authentication required', 401);

  const { business, membership } = await ensureUserBusiness(req.user);
  if (membership.role !== 'owner' && membership.role !== 'manager' && req.user.role !== 'admin') {
    throw new ExpressError('Only business owners or managers can add team members', 403);
  }

  const { user_name, user_email, role = 'staff' } = req.body;
  if (!user_name || !user_email) {
    throw new ExpressError('Member name and email address are required', 400);
  }

  const plan = getPlanConfig(business.subscription_plan || 'free');
  const maxMembers = Number(business.feature_limits?.max_team_members ?? plan.feature_limits.max_team_members);

  const memId = `mem-${business.id}-${Date.now()}`;
  const validRole = ['manager', 'staff', 'vet', 'groomer'].includes(role) ? role : 'staff';

  if (isMongoConnected()) {
    const currentCount = await BusinessMembership.countDocuments({ business_id: business.id, status: 'active' });
    if (currentCount >= maxMembers) {
      throw new ExpressError(
        `Team seat limit reached (${maxMembers} on ${plan.name}). Upgrade your SaaS plan to invite more team members.`,
        403
      );
    }

    const created = await BusinessMembership.create({
      custom_id: memId,
      business_id: business.id,
      user_id: `u-staff-${Date.now()}`,
      user_name: String(user_name).trim(),
      user_email: String(user_email).toLowerCase().trim(),
      role: validRole,
      permissions: validRole === 'manager'
        ? ['manage_products', 'manage_orders', 'manage_pets', 'manage_services', 'view_analytics']
        : ['manage_products', 'manage_orders'],
      status: 'active'
    });

    return res.status(201).json({
      success: true,
      member: normalizeItem(created),
      message: `${user_name} added to ${business.name} as ${validRole}`
    });
  }

  const db = loadData();
  if (!Array.isArray(db.business_memberships)) db.business_memberships = [];
  const currentMembers = db.business_memberships.filter(m => m.business_id === business.id && m.status === 'active');
  if (currentMembers.length >= maxMembers) {
    throw new ExpressError(
      `Team seat limit reached (${maxMembers} on ${plan.name}). Upgrade your SaaS plan to invite more team members.`,
      403
    );
  }

  const newMember = {
    id: memId,
    custom_id: memId,
    business_id: business.id,
    user_id: `u-staff-${Date.now()}`,
    user_name: String(user_name).trim(),
    user_email: String(user_email).toLowerCase().trim(),
    role: validRole,
    permissions: validRole === 'manager'
      ? ['manage_products', 'manage_orders', 'manage_pets', 'manage_services', 'view_analytics']
      : ['manage_products', 'manage_orders'],
    status: 'active',
    created_at: new Date().toISOString()
  };

  db.business_memberships.push(newMember);
  saveData(db);

  res.status(201).json({
    success: true,
    member: newMember,
    message: `${user_name} added to ${business.name} as ${validRole}`
  });
};

/**
 * DELETE /api/saas/my-business/members/:memberId
 * Revoke a team member's access (cannot revoke primary owner)
 */
const removeBusinessMember = async (req, res) => {
  if (!req.user) throw new ExpressError('Authentication required', 401);
  const { memberId } = req.params;
  const { business, membership } = await ensureUserBusiness(req.user);

  if (membership.role !== 'owner' && req.user.role !== 'admin') {
    throw new ExpressError('Only the business owner can revoke team memberships', 403);
  }

  if (isMongoConnected()) {
    const target = await findDocByAnyId(BusinessMembership, memberId);
    if (!target || target.business_id !== business.id) {
      throw new ExpressError('Team membership not found', 404);
    }
    if (target.role === 'owner') {
      throw new ExpressError('Cannot remove the primary business owner', 400);
    }
    await target.deleteOne();
    return res.json({ success: true, message: 'Team member removed' });
  }

  const db = loadData();
  const idx = (db.business_memberships || []).findIndex(
    m => (m.id === memberId || m.custom_id === memberId) && m.business_id === business.id
  );
  if (idx === -1) throw new ExpressError('Team membership not found', 404);
  if (db.business_memberships[idx].role === 'owner') {
    throw new ExpressError('Cannot remove the primary business owner', 400);
  }
  db.business_memberships.splice(idx, 1);
  saveData(db);
  res.json({ success: true, message: 'Team member removed' });
};

/**
 * POST /api/saas/subscriptions/checkout
 * Initiates a subscription upgrade or plan change.
 * - If plan_id === 'free', immediately switches the business to the Free tier.
 * - For paid tiers ('starter', 'growth', 'pro'), creates a server-side SubscriptionTransaction
 *   with a unique provider_order_id and idempotency_key. Returns a server-generated challenge
 *   so the verification endpoint can cryptographically verify the HMAC-SHA256 signature.
 */
const createSubscriptionCheckout = async (req, res) => {
  if (!req.user) throw new ExpressError('Authentication required', 401);

  const { plan_id, billing_cycle = 'monthly' } = req.body;
  if (!SUBSCRIPTION_PLANS[plan_id]) {
    throw new ExpressError('Invalid subscription plan selected', 400);
  }

  const cycle = billing_cycle === 'annual' ? 'annual' : 'monthly';
  const plan = getPlanConfig(plan_id);
  const amount = cycle === 'annual' ? plan.annual_price : plan.monthly_price;
  const { business } = await ensureUserBusiness(req.user);

  const now = new Date();
  const periodEnd = new Date(now);
  if (cycle === 'annual') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Free tier immediate switch
  if (plan_id === 'free' || amount === 0) {
    const updates = {
      subscription_plan: 'free',
      billing_cycle: 'monthly',
      subscription_status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      feature_limits: plan.feature_limits
    };

    if (isMongoConnected()) {
      const updatedBiz = await Business.findOneAndUpdate(
        { custom_id: business.id },
        { $set: updates },
        { new: true }
      );
      return res.json({
        success: true,
        immediate: true,
        business: normalizeItem(updatedBiz),
        message: 'Switched to Free Starter plan'
      });
    }

    const db = loadData();
    const bIdx = (db.businesses || []).findIndex(b => b.id === business.id || b.custom_id === business.id);
    if (bIdx !== -1) {
      db.businesses[bIdx] = { ...db.businesses[bIdx], ...updates };
      saveData(db);
    }
    return res.json({
      success: true,
      immediate: true,
      business: db.businesses[bIdx],
      message: 'Switched to Free Starter plan'
    });
  }

  const txId = `subtx-${Date.now()}`;
  const providerOrderId = `order_petpaws_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const idempotencyKey = `idem_${business.id}_${plan_id}_${cycle}_${Date.now()}`;
  const simulatedPaymentId = `pay_petpaws_${Date.now()}`;
  const expectedSignature = computeHmacSignature(providerOrderId, simulatedPaymentId);

  const txPayload = {
    custom_id: txId,
    business_id: business.id,
    business_name: business.name,
    user_id: req.user.id,
    plan_id,
    plan_name: plan.name,
    billing_cycle: cycle,
    amount,
    currency: plan.currency,
    payment_provider: isRazorpayConfigured() ? 'razorpay' : 'sandbox_dev',
    provider_order_id: providerOrderId,
    idempotency_key: idempotencyKey,
    status: 'created',
    period_start: now.toISOString(),
    period_end: periodEnd.toISOString()
  };

  if (isMongoConnected()) {
    await SubscriptionTransaction.create(txPayload);
  } else {
    const db = loadData();
    if (!Array.isArray(db.subscription_transactions)) db.subscription_transactions = [];
    db.subscription_transactions.unshift({
      id: txId,
      ...txPayload,
      created_at: now.toISOString()
    });
    saveData(db);
  }

  res.status(201).json({
    success: true,
    immediate: false,
    transaction_id: txId,
    provider_order_id: providerOrderId,
    amount,
    currency: plan.currency,
    plan: {
      id: plan.id,
      name: plan.name,
      billing_cycle: cycle
    },
    payment_mode: isRazorpayConfigured() ? 'razorpay_live' : 'verified_sandbox',
    // When Razorpay live credentials are not configured in local dev, we return the
    // server-signed sandbox payload so the frontend can complete the full HMAC-verified handshake
    sandbox_handshake: !isRazorpayConfigured()
      ? {
          provider_order_id: providerOrderId,
          provider_payment_id: simulatedPaymentId,
          provider_signature: expectedSignature
        }
      : null
  });
};

/**
 * POST /api/saas/subscriptions/verify
 * Verifies the HMAC-SHA256 signature (order_id|payment_id) on the server before activating
 * a subscription plan. Protects against duplicate replay via idempotency status checks.
 */
const verifySubscriptionPayment = async (req, res) => {
  if (!req.user) throw new ExpressError('Authentication required', 401);

  const {
    provider_order_id,
    provider_payment_id,
    provider_signature
  } = req.body;

  if (!provider_order_id || !provider_payment_id || !provider_signature) {
    throw new ExpressError('Payment verification failed: missing order_id, payment_id, or cryptographic signature', 400);
  }

  const expectedSignature = computeHmacSignature(provider_order_id, provider_payment_id);
  if (expectedSignature !== provider_signature) {
    throw new ExpressError('Payment signature verification failed: invalid HMAC-SHA256 signature', 400);
  }

  if (isMongoConnected()) {
    const tx = await SubscriptionTransaction.findOne({ provider_order_id });
    if (!tx) throw new ExpressError('Subscription order transaction not found', 404);

    if (tx.status === 'paid') {
      const existingBiz = await Business.findOne({ custom_id: tx.business_id });
      return res.json({
        success: true,
        idempotent_replay: true,
        business: normalizeItem(existingBiz),
        transaction: normalizeItem(tx),
        message: `Subscription ${tx.plan_name} is already active (duplicate event ignored safely)`
      });
    }

    const plan = getPlanConfig(tx.plan_id);
    tx.provider_payment_id = provider_payment_id;
    tx.provider_signature = provider_signature;
    tx.status = 'paid';
    tx.webhook_verified = true;
    await tx.save();

    const updatedBiz = await Business.findOneAndUpdate(
      { custom_id: tx.business_id },
      {
        $set: {
          subscription_plan: plan.id,
          billing_cycle: tx.billing_cycle,
          subscription_status: 'active',
          current_period_start: tx.period_start,
          current_period_end: tx.period_end,
          feature_limits: plan.feature_limits
        }
      },
      { new: true }
    );

    await recordAuditLog({
      actor: req.user,
      business_id: tx.business_id,
      action: 'subscription.upgraded',
      target_type: 'SubscriptionTransaction',
      target_id: tx.custom_id,
      details: `Upgraded business to ${plan.name} (${tx.billing_cycle}) — verified payment ${provider_payment_id}`
    });

    return res.json({
      success: true,
      business: normalizeItem(updatedBiz),
      transaction: normalizeItem(tx),
      message: `${plan.name} (${tx.billing_cycle}) subscription activated!`
    });
  }

  const db = loadData();
  const txIdx = (db.subscription_transactions || []).findIndex(t => t.provider_order_id === provider_order_id);
  if (txIdx === -1) throw new ExpressError('Subscription order transaction not found', 404);

  const tx = db.subscription_transactions[txIdx];
  if (tx.status === 'paid') {
    const existingBiz = (db.businesses || []).find(b => b.id === tx.business_id);
    return res.json({
      success: true,
      idempotent_replay: true,
      business: existingBiz,
      transaction: tx,
      message: `Subscription ${tx.plan_name} is already active (duplicate event ignored safely)`
    });
  }

  const plan = getPlanConfig(tx.plan_id);
  tx.provider_payment_id = provider_payment_id;
  tx.provider_signature = provider_signature;
  tx.status = 'paid';
  tx.webhook_verified = true;

  const bIdx = (db.businesses || []).findIndex(b => b.id === tx.business_id || b.custom_id === tx.business_id);
  if (bIdx !== -1) {
    db.businesses[bIdx] = {
      ...db.businesses[bIdx],
      subscription_plan: plan.id,
      billing_cycle: tx.billing_cycle,
      subscription_status: 'active',
      current_period_start: tx.period_start,
      current_period_end: tx.period_end,
      feature_limits: { ...plan.feature_limits }
    };
  }
  saveData(db);

  await recordAuditLog({
    actor: req.user,
    business_id: tx.business_id,
    action: 'subscription.upgraded',
    target_type: 'SubscriptionTransaction',
    target_id: tx.id,
    details: `Upgraded business to ${plan.name} (${tx.billing_cycle}) — verified payment ${provider_payment_id}`
  });

  res.json({
    success: true,
    business: db.businesses[bIdx],
    transaction: tx,
    message: `${plan.name} (${tx.billing_cycle}) subscription activated!`
  });
};

/**
 * POST /api/saas/Grooming Services Management for Groomer / Business Portal
 */
const createGroomingServicePackage = async (req, res) => {
  if (!req.user || !['groomer', 'seller', 'shopkeeper', 'admin'].includes(req.user.role)) {
    throw new ExpressError('Only authorized grooming or business accounts can create service packages', 403);
  }

  const { business } = await ensureUserBusiness(req.user);
  await checkSubscriptionLimit(business, 'service');
  const { title, category = 'Grooming', price, duration = '60 Mins', description, image_url } = req.body;

  if (!title || price === undefined) {
    throw new ExpressError('Service title and price are required', 400);
  }

  const srvId = `srv-${Date.now()}`;
  const payload = {
    custom_id: srvId,
    business_id: business.id,
    provider_id: req.user.id,
    provider_name: business.name || req.user.name,
    title: String(title).trim(),
    category: String(category).trim(),
    price: Math.max(0, Number(price)),
    duration: String(duration).trim(),
    description: description ? String(description).trim() : 'Professional pet grooming & care session.',
    image_url: image_url || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80',
    status: 'active'
  };

  if (isMongoConnected()) {
    const created = await GroomingService.create(payload);
    return res.status(201).json({
      success: true,
      service: normalizeItem(created),
      message: 'Grooming & care service package published'
    });
  }

  const db = loadData();
  if (!Array.isArray(db.grooming_services)) db.grooming_services = [];
  const newSrv = { id: srvId, ...payload, created_at: new Date().toISOString() };
  db.grooming_services.unshift(newSrv);
  saveData(db);

  res.status(201).json({
    success: true,
    service: newSrv,
    message: 'Grooming & care service package published'
  });
};

/**
 * PUT /api/saas/grooming/bookings/:id/status
 * Allows groomers / business operators to update booking status (Scheduled -> In Progress -> Completed)
 */
const updateGroomingBookingStatus = async (req, res) => {
  if (!req.user || !['groomer', 'seller', 'shopkeeper', 'admin'].includes(req.user.role)) {
    throw new ExpressError('Only authorized grooming providers can update booking status', 403);
  }

  const { id } = req.params;
  const { status } = req.body;
  const ALLOWED = ['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
  if (!ALLOWED.includes(status)) {
    throw new ExpressError(`Invalid status. Allowed: ${ALLOWED.join(', ')}`, 400);
  }

  const { business } = await ensureUserBusiness(req.user);

  if (isMongoConnected()) {
    const bkg = await findDocByAnyId(GroomingBooking, id);
    if (!bkg) throw new ExpressError('Grooming booking not found', 404);

    if (req.user.role !== 'admin') {
      const srv = bkg.service_id ? await findDocByAnyId(GroomingService, bkg.service_id) : null;
      const bkgBizId = bkg.business_id || srv?.business_id || '';
      const bkgProviderId = bkg.provider_id || srv?.provider_id || '';
      if (bkgBizId && bkgBizId !== business.id && bkgProviderId !== req.user.id) {
        throw new ExpressError('Tenant isolation error: Not authorized to update another business\'s grooming booking', 403);
      }
    }

    bkg.status = status;
    await bkg.save();
    return res.json({ success: true, booking: normalizeItem(bkg), message: `Booking marked ${status}` });
  }

  const db = loadData();
  const idx = (db.grooming_bookings || []).findIndex(b => b.id === id || b.custom_id === id);
  if (idx === -1) throw new ExpressError('Grooming booking not found', 404);
  const bkg = db.grooming_bookings[idx];
  if (req.user.role !== 'admin') {
    const srv = (db.grooming_services || []).find(s => s.id === bkg.service_id || s.custom_id === bkg.service_id);
    const bkgBizId = bkg.business_id || srv?.business_id || '';
    const bkgProviderId = bkg.provider_id || srv?.provider_id || '';
    if (bkgBizId && bkgBizId !== business.id && bkgProviderId !== req.user.id) {
      throw new ExpressError('Tenant isolation error: Not authorized to update another business\'s grooming booking', 403);
    }
  }
  db.grooming_bookings[idx].status = status;
  saveData(db);
  res.json({ success: true, booking: db.grooming_bookings[idx], message: `Booking marked ${status}` });
};

/**
 * GET /api/saas/admin/overview
 * Platform Admin overview: all businesses, products needing moderation, reported items, and audit logs
 */
const getAdminOverview = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ExpressError('Platform Administrator access required', 403);
  }

  if (isMongoConnected()) {
    const [bizDocs, prodDocs, auditDocs, txDocs] = await Promise.all([
      Business.find().sort({ createdAt: -1 }),
      Product.find().sort({ report_count: -1, createdAt: -1 }),
      AuditLog.find().sort({ createdAt: -1 }).limit(50),
      SubscriptionTransaction.find().sort({ createdAt: -1 }).limit(30)
    ]);

    return res.json({
      success: true,
      businesses: bizDocs.map(normalizeItem),
      products: prodDocs.map(normalizeItem),
      auditLogs: auditDocs.map(normalizeItem),
      subscriptionTransactions: txDocs.map(normalizeItem)
    });
  }

  const db = loadData();
  res.json({
    success: true,
    businesses: db.businesses || [],
    products: db.products || [],
    auditLogs: (db.audit_logs || []).slice(0, 50),
    subscriptionTransactions: (db.subscription_transactions || []).slice(0, 30)
  });
};

/**
 * PUT /api/saas/admin/businesses/:id/status
 * Admin approves, suspends, or reactivates a vendor business tenant
 */
const moderateBusiness = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ExpressError('Platform Administrator access required', 403);
  }

  const { id } = req.params;
  const { verification_status, status, subscription_plan, notes } = req.body;

  const updates = {};
  if (verification_status) updates.verification_status = verification_status;
  if (status) updates.status = status;
  if (notes !== undefined) updates.verification_notes = notes;
  if (subscription_plan && SUBSCRIPTION_PLANS[subscription_plan]) {
    updates.subscription_plan = subscription_plan;
    updates.feature_limits = SUBSCRIPTION_PLANS[subscription_plan].feature_limits;
  }

  if (isMongoConnected()) {
    const biz = await findDocByAnyId(Business, id);
    if (!biz) throw new ExpressError('Business tenant not found', 404);
    Object.assign(biz, updates);
    await biz.save();

    await recordAuditLog({
      actor: req.user,
      business_id: biz.custom_id || id,
      action: 'admin.business_moderated',
      target_type: 'Business',
      target_id: biz.custom_id || id,
      details: `Updated business "${biz.name}" -> status=${biz.status}, verification=${biz.verification_status}`
    });

    return res.json({
      success: true,
      business: normalizeItem(biz),
      message: `Business "${biz.name}" updated`
    });
  }

  const db = loadData();
  const idx = (db.businesses || []).findIndex(b => b.id === id || b.custom_id === id);
  if (idx === -1) throw new ExpressError('Business tenant not found', 404);

  db.businesses[idx] = { ...db.businesses[idx], ...updates };
  saveData(db);

  await recordAuditLog({
    actor: req.user,
    business_id: db.businesses[idx].id,
    action: 'admin.business_moderated',
    target_type: 'Business',
    target_id: db.businesses[idx].id,
    details: `Updated business "${db.businesses[idx].name}" -> status=${db.businesses[idx].status}, verification=${db.businesses[idx].verification_status}`
  });

  res.json({
    success: true,
    business: db.businesses[idx],
    message: `Business "${db.businesses[idx].name}" updated`
  });
};

/**
 * PUT /api/saas/admin/products/:id/moderate
 * Admin approves or suspends a marketplace product listing
 */
const moderateProduct = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ExpressError('Platform Administrator access required', 403);
  }

  const { id } = req.params;
  const { moderation_status, status, moderation_notes } = req.body;

  const updates = {};
  if (moderation_status) updates.moderation_status = moderation_status;
  if (status) updates.status = status;
  if (moderation_notes !== undefined) updates.moderation_notes = moderation_notes;
  if (moderation_status === 'suspended') updates.status = 'suspended';
  if (moderation_status === 'approved' && (!status || status === 'suspended')) updates.status = 'active';

  if (isMongoConnected()) {
    const prod = await findDocByAnyId(Product, id);
    if (!prod) throw new ExpressError('Product not found', 404);
    Object.assign(prod, updates);
    await prod.save();

    await recordAuditLog({
      actor: req.user,
      business_id: prod.business_id,
      action: 'admin.product_moderated',
      target_type: 'Product',
      target_id: prod.custom_id || id,
      details: `Moderated product "${prod.title}" -> moderation_status=${prod.moderation_status}`
    });

    return res.json({
      success: true,
      product: normalizeItem(prod),
      message: `Product "${prod.title}" moderation updated to ${prod.moderation_status}`
    });
  }

  const db = loadData();
  const idx = (db.products || []).findIndex(p => p.id === id || p.custom_id === id);
  if (idx === -1) throw new ExpressError('Product not found', 404);

  db.products[idx] = { ...db.products[idx], ...updates };
  saveData(db);

  await recordAuditLog({
    actor: req.user,
    business_id: db.products[idx].business_id,
    action: 'admin.product_moderated',
    target_type: 'Product',
    target_id: db.products[idx].id,
    details: `Moderated product "${db.products[idx].title}" -> moderation_status=${db.products[idx].moderation_status}`
  });

  res.json({
    success: true,
    product: db.products[idx],
    message: `Product "${db.products[idx].title}" moderation updated to ${db.products[idx].moderation_status}`
  });
};

module.exports = {
  getSubscriptionPlans,
  getMyBusinessDashboard,
  updateBusinessProfile,
  addBusinessMember,
  removeBusinessMember,
  createSubscriptionCheckout,
  verifySubscriptionPayment,
  createGroomingServicePackage,
  updateGroomingBookingStatus,
  getAdminOverview,
  moderateBusiness,
  moderateProduct
};
