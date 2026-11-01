/**
 * Multi-Tenant SaaS & Subscription Enforcement Middleware
 *
 * Responsibilities:
 * 1. Define canonical SaaS subscription plan tiers (Free, Starter, Growth, Pro)
 *    with monthly/annual pricing and backend feature limits.
 * 2. Resolve the authenticated user's active Business (tenant) and BusinessMembership
 *    from server-side identity rather than trusting client-supplied business_id values.
 * 3. Safely provision a default Business + Owner membership for existing seller,
 *    shopkeeper, vet, or groomer accounts without destructive database migrations.
 * 4. Enforce vendor suspension checks and subscription plan resource limits on the backend.
 */

const Business = require('../models/Business');
const BusinessMembership = require('../models/BusinessMembership');
const Product = require('../models/Product');
const Pet = require('../models/Pet');
const GroomingService = require('../models/GroomingService');
const AuditLog = require('../models/AuditLog');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const ExpressError = require('../utils/ExpressError');

const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free Starter',
    badge: 'Free Tier',
    monthly_price: 0,
    annual_price: 0,
    currency: 'USD',
    description: 'Essential tools for new pet shops, breeders, and independent care providers getting started.',
    feature_limits: {
      max_products: 5,
      max_pets: 5,
      max_services: 3,
      max_team_members: 1,
      analytics_enabled: false,
      priority_support: false,
      commission_rate: 12
    },
    highlights: [
      'Up to 5 active pet product listings',
      'Up to 5 pet adoption/breeder listings',
      'Up to 3 grooming or care service packages',
      '1 owner seat',
      'Standard order management & status tracking',
      '12% platform marketplace commission'
    ]
  },
  starter: {
    id: 'starter',
    name: 'Starter Shop',
    badge: 'Growing Vendors',
    monthly_price: 19,
    annual_price: 190,
    currency: 'USD',
    description: 'Built for independent pet supply stores and clinics expanding their catalog and team.',
    feature_limits: {
      max_products: 25,
      max_pets: 15,
      max_services: 10,
      max_team_members: 3,
      analytics_enabled: true,
      priority_support: false,
      commission_rate: 8
    },
    highlights: [
      'Up to 25 active product listings with variants',
      'Up to 15 pet listings & 10 service packages',
      'Up to 3 authorized team members',
      'Sales revenue & low-stock inventory analytics',
      'Reduced 8% platform marketplace commission'
    ]
  },
  growth: {
    id: 'growth',
    name: 'Growth Business',
    badge: 'Most Popular',
    monthly_price: 49,
    annual_price: 490,
    currency: 'USD',
    description: 'Full-featured SaaS suite for established multi-category pet retailers and busy clinics.',
    feature_limits: {
      max_products: 100,
      max_pets: 50,
      max_services: 30,
      max_team_members: 10,
      analytics_enabled: true,
      priority_support: true,
      commission_rate: 5
    },
    highlights: [
      'Up to 100 active product listings with variants',
      'Up to 50 pet listings & 30 service packages',
      'Up to 10 staff & manager memberships',
      'Full analytics dashboard & CSV export',
      'Priority vendor verification & support',
      'Low 5% platform marketplace commission'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Enterprise Pro',
    badge: 'Unlimited Scale',
    monthly_price: 99,
    annual_price: 990,
    currency: 'USD',
    description: 'Unlimited catalog capacity and lowest marketplace commission for high-volume pet brands.',
    feature_limits: {
      max_products: 99999,
      max_pets: 99999,
      max_services: 99999,
      max_team_members: 50,
      analytics_enabled: true,
      priority_support: true,
      commission_rate: 3
    },
    highlights: [
      'Unlimited product, pet & service listings',
      'Up to 50 multi-role staff memberships',
      'Advanced multi-vendor analytics & audit trail',
      'Dedicated account support',
      'Industry-low 3% marketplace commission'
    ]
  }
};

const getPlanConfig = (planId) => {
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.free;
};

const inferBusinessType = (role) => {
  if (role === 'vet') return 'vet_clinic';
  if (role === 'groomer') return 'grooming_salon';
  if (role === 'shopkeeper') return 'pet_shop';
  return 'pet_shop';
};

/**
 * Helper to record an audit log entry in MongoDB or JSON fallback
 */
const recordAuditLog = async ({ actor, business_id = '', action, target_type = '', target_id = '', details = '', metadata = {} }) => {
  try {
    const entry = {
      custom_id: `aud-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      actor_user_id: actor?.id || 'system',
      actor_name: actor?.name || 'System',
      actor_role: actor?.role || 'system',
      business_id,
      action,
      target_type,
      target_id,
      details,
      metadata
    };

    if (isMongoConnected()) {
      await AuditLog.create(entry);
      return;
    }

    const db = loadData();
    if (!Array.isArray(db.audit_logs)) db.audit_logs = [];
    db.audit_logs.unshift({
      ...entry,
      id: entry.custom_id,
      created_at: new Date().toISOString()
    });
    saveData(db);
  } catch (err) {
    console.error('Audit log write warning:', err.message);
  }
};

/**
 * Resolve or safely initialize the Business tenant and BusinessMembership for a user.
 * Never trusts an unverified business_id from the client: if requestedBusinessId is
 * passed, we verify the user has an active BusinessMembership or ownership for it.
 */
const ensureUserBusiness = async (user, requestedBusinessId = '') => {
  if (!user || !user.id) {
    throw new ExpressError('Authentication required to resolve business tenant', 401);
  }

  const defaultPlan = getPlanConfig('free');
  const slugBase = (user.name || 'petpaws-partner')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (isMongoConnected()) {
    let business = null;
    let membership = null;

    if (requestedBusinessId) {
      membership = await BusinessMembership.findOne({
        business_id: requestedBusinessId,
        user_id: user.id,
        status: 'active'
      });
      business = await Business.findOne({ custom_id: requestedBusinessId });
      if (!business) {
        throw new ExpressError('Requested business tenant not found', 404);
      }
      if (!membership && business.owner_user_id !== user.id && user.role !== 'admin') {
        throw new ExpressError('Access denied: you are not an authorized member of this business', 403);
      }
    } else {
      membership = await BusinessMembership.findOne({ user_id: user.id, status: 'active' });
      if (membership) {
        business = await Business.findOne({ custom_id: membership.business_id });
      }
      if (!business) {
        business = await Business.findOne({ owner_user_id: user.id });
      }
    }

    if (!business) {
      const bizId = `biz-${user.id}`;
      business = await Business.create({
        custom_id: bizId,
        name: user.name ? `${user.name} Pet Store & Care` : 'Verified PetPaws Business',
        slug: `${slugBase}-${Date.now().toString().slice(-4)}`,
        business_type: inferBusinessType(user.role),
        owner_user_id: user.id,
        owner_name: user.name || 'Business Owner',
        description: 'Official verified partner store and pet care provider on PetPaws.',
        contact_email: user.email || '',
        contact_phone: user.phone || '',
        address: user.address || 'Austin, TX',
        verification_status: 'approved',
        subscription_plan: 'free',
        billing_cycle: 'monthly',
        subscription_status: 'active',
        feature_limits: defaultPlan.feature_limits,
        status: 'active'
      });
    }

    const normalizedBiz = normalizeItem(business);

    if (!membership) {
      const memDoc = await BusinessMembership.create({
        custom_id: `mem-${normalizedBiz.id}-${user.id}`,
        business_id: normalizedBiz.id,
        user_id: user.id,
        user_name: user.name || '',
        user_email: user.email || '',
        role: business.owner_user_id === user.id ? 'owner' : 'staff',
        permissions: ['manage_products', 'manage_orders', 'manage_pets', 'manage_services', 'view_analytics', 'manage_billing', 'manage_settings'],
        status: 'active'
      });
      membership = normalizeItem(memDoc);
    } else {
      membership = normalizeItem(membership);
    }

    return { business: normalizedBiz, membership };
  }

  // Fallback JSON persistence branch
  const db = loadData();
  if (!Array.isArray(db.businesses)) db.businesses = [];
  if (!Array.isArray(db.business_memberships)) db.business_memberships = [];

  let business = null;
  let membership = null;

  if (requestedBusinessId) {
    business = db.businesses.find(b => b.id === requestedBusinessId || b.custom_id === requestedBusinessId);
    membership = db.business_memberships.find(
      m => m.business_id === requestedBusinessId && m.user_id === user.id && m.status === 'active'
    );
    if (!business) {
      throw new ExpressError('Requested business tenant not found', 404);
    }
    if (!membership && business.owner_user_id !== user.id && user.role !== 'admin') {
      throw new ExpressError('Access denied: you are not an authorized member of this business', 403);
    }
  } else {
    membership = db.business_memberships.find(m => m.user_id === user.id && m.status === 'active');
    if (membership) {
      business = db.businesses.find(b => b.id === membership.business_id || b.custom_id === membership.business_id);
    }
    if (!business) {
      business = db.businesses.find(b => b.owner_user_id === user.id);
    }
  }

  let mutated = false;
  if (!business) {
    const bizId = `biz-${user.id}`;
    business = {
      id: bizId,
      custom_id: bizId,
      name: user.name ? `${user.name}` : 'Verified PetPaws Business',
      slug: `${slugBase}-${Date.now().toString().slice(-4)}`,
      business_type: inferBusinessType(user.role),
      owner_user_id: user.id,
      owner_name: user.name || 'Business Owner',
      description: 'Independent pet business operating on PetPaws.',
      contact_email: user.email || '',
      contact_phone: user.phone || '',
      address: user.address || 'Austin, TX',
      verification_status: 'approved',
      subscription_plan: 'free',
      billing_cycle: 'monthly',
      subscription_status: 'active',
      feature_limits: { ...defaultPlan.feature_limits },
      payout_details: {
        upi_id: user.upi_id || '',
        bank_name: user.bank_name || '',
        bank_account: user.bank_account || '',
        ifsc_code: user.ifsc_code || ''
      },
      status: 'active',
      created_at: new Date().toISOString()
    };
    db.businesses.push(business);
    mutated = true;
  }

  if (!membership) {
    membership = {
      id: `mem-${business.id}-${user.id}`,
      custom_id: `mem-${business.id}-${user.id}`,
      business_id: business.id,
      user_id: user.id,
      user_name: user.name || '',
      user_email: user.email || '',
      role: business.owner_user_id === user.id ? 'owner' : 'staff',
      permissions: ['manage_products', 'manage_orders', 'manage_pets', 'manage_services', 'view_analytics', 'manage_billing', 'manage_settings'],
      status: 'active',
      created_at: new Date().toISOString()
    };
    db.business_memberships.push(membership);
    mutated = true;
  }

  if (mutated) {
    saveData(db);
  }

  return { business, membership };
};

/**
 * Express middleware that attaches req.business and req.membership for authenticated business users
 */
const resolveTenant = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ExpressError('Authentication required', 401));
    }
    const requestedBizId = req.headers['x-business-id'] || req.query.businessId || '';
    const { business, membership } = await ensureUserBusiness(req.user, requestedBizId);

    if (business.status === 'suspended' || business.verification_status === 'suspended') {
      if (req.method !== 'GET' && req.user.role !== 'admin') {
        return next(new ExpressError('Your business account is currently suspended. Please contact platform moderation.', 403));
      }
    }

    req.business = business;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Check if a business has capacity under its current SaaS subscription plan
 * before creating a new product, pet listing, or grooming service.
 */
const checkSubscriptionLimit = async (business, resourceType) => {
  const plan = getPlanConfig(business.subscription_plan || 'free');
  const limits = business.feature_limits || plan.feature_limits;

  if (business.subscription_status === 'expired' || business.subscription_status === 'cancelled') {
    throw new ExpressError('Your business subscription is not active. Please renew or switch to the Free Starter tier.', 403);
  }

  if (resourceType === 'product') {
    const maxProducts = Number(limits.max_products ?? plan.feature_limits.max_products);
    let currentCount = 0;
    if (isMongoConnected()) {
      currentCount = await Product.countDocuments({
        business_id: business.id,
        status: { $ne: 'archived' }
      });
    } else {
      const db = loadData();
      currentCount = (db.products || []).filter(
        p => (p.business_id === business.id || p.seller_id === business.owner_user_id) && p.status !== 'archived'
      ).length;
    }

    if (currentCount >= maxProducts) {
      throw new ExpressError(
        `Subscription limit reached: Your ${plan.name} plan allows up to ${maxProducts} active products (currently ${currentCount}). Upgrade your SaaS plan to list more products.`,
        403
      );
    }
  }

  if (resourceType === 'pet') {
    const maxPets = Number(limits.max_pets ?? plan.feature_limits.max_pets);
    let currentCount = 0;
    if (isMongoConnected()) {
      currentCount = await Pet.countDocuments({ seller_id: business.owner_user_id, status: 'active' });
    } else {
      const db = loadData();
      currentCount = (db.pets || []).filter(p => p.seller_id === business.owner_user_id && p.status === 'active').length;
    }
    if (currentCount >= maxPets) {
      throw new ExpressError(
        `Subscription limit reached: Your ${plan.name} plan allows up to ${maxPets} active pet listings. Upgrade your SaaS plan for higher limits.`,
        403
      );
    }
  }

  if (resourceType === 'service') {
    const maxServices = Number(limits.max_services ?? plan.feature_limits.max_services);
    let currentCount = 0;
    if (isMongoConnected()) {
      currentCount = await GroomingService.countDocuments({
        $or: [{ business_id: business.id }, { provider_id: business.owner_user_id }],
        status: { $ne: 'archived' }
      });
    } else {
      const db = loadData();
      currentCount = (db.grooming_services || []).filter(
        s => (s.business_id === business.id || s.provider_id === business.owner_user_id) && s.status !== 'archived'
      ).length;
    }
    if (currentCount >= maxServices) {
      throw new ExpressError(
        `Subscription limit reached: Your ${plan.name} plan allows up to ${maxServices} active grooming/care service packages (currently ${currentCount}). Upgrade your SaaS plan for higher limits.`,
        403
      );
    }
  }
};

module.exports = {
  SUBSCRIPTION_PLANS,
  getPlanConfig,
  ensureUserBusiness,
  resolveTenant,
  checkSubscriptionLimit,
  recordAuditLog
};
