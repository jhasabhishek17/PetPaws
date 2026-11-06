/**
 * Centralized Promotional Offers & Discounts Controller
 *
 * Provides unified offer management across all marketplace categories:
 * - products: Pet Supplies, Food, Accessories
 * - pets: Pet Sales & Breeder Listings (Eligible paid pets only; strictly no discounts on free adoption listings)
 * - vets: Veterinary Consultations & Telehealth Care
 * - services: Grooming, Spa, Boarding & Training Packages
 */

const Product = require('../models/Product');
const Pet = require('../models/Pet');
const VetProfile = require('../models/VetProfile');
const GroomingService = require('../models/GroomingService');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId } = require('../utils/dbHelpers');
const ExpressError = require('../utils/ExpressError');
const {
  parseAndValidateDiscount,
  decorateWithDiscount,
  calculateEffectivePrice,
  getDiscountStatus
} = require('../utils/discountEngine');

const CATEGORY_CONFIG = {
  products: {
    model: Product,
    jsonKey: 'products',
    priceField: 'price',
    roles: ['seller', 'admin'],
    isOwner: (entity, user) =>
      user.role === 'admin' ||
      entity.seller_id === user.id ||
      (user.business_id && entity.business_id === user.business_id)
  },
  pets: {
    model: Pet,
    jsonKey: 'pets',
    priceField: 'price',
    roles: ['seller', 'admin'],
    isOwner: (entity, user) =>
      user.role === 'admin' || entity.seller_id === user.id
  },
  vets: {
    model: VetProfile,
    jsonKey: 'vet_profiles',
    priceField: 'consultation_fee',
    roles: ['vet', 'admin'],
    isOwner: (entity, user) =>
      user.role === 'admin' ||
      entity.user_id === user.id ||
      entity.id === user.id ||
      entity.custom_id === user.id
  },
  services: {
    model: GroomingService,
    jsonKey: 'grooming_services',
    priceField: 'price',
    roles: ['groomer', 'seller', 'shopkeeper', 'admin'],
    isOwner: (entity, user) =>
      user.role === 'admin' ||
      entity.provider_id === user.id ||
      (user.business_id && entity.business_id === user.business_id) ||
      ['groomer', 'seller', 'shopkeeper'].includes(user.role)
  }
};

/**
 * Resolve entity and verify authorization
 */
const resolveEntityAndAuth = async (category, id, user, requireOwnership = true) => {
  const config = CATEGORY_CONFIG[category];
  if (!config) {
    throw new ExpressError(`Invalid offer category: ${category}. Allowed categories: products, pets, vets, services`, 400);
  }

  let entity = null;
  let saveEntity = null;

  if (isMongoConnected()) {
    let doc = await findDocByAnyId(config.model, id);
    if (!doc && category === 'vets') {
      doc = await config.model.findOne({ $or: [{ user_id: id }, { custom_id: id }, { name: user?.name }] });
    }
    if (!doc) {
      throw new ExpressError(`Item not found in category '${category}'`, 404);
    }
    entity = doc;
    saveEntity = async (updates) => {
      Object.assign(entity, updates);
      if (updates.discount !== undefined && typeof entity.markModified === 'function') {
        entity.markModified('discount');
      }
      await entity.save();
      return entity;
    };
  } else {
    const db = loadData();
    const list = db[config.jsonKey] || [];
    let idx = list.findIndex(i => i.id === id || i.custom_id === id || i._id === id);
    if (idx === -1 && category === 'vets') {
      idx = list.findIndex(v => v.user_id === id || v.id === user?.id || v.name === user?.name);
    }
    if (idx === -1) {
      throw new ExpressError(`Item not found in category '${category}'`, 404);
    }
    entity = list[idx];
    saveEntity = async (updates) => {
      Object.assign(db[config.jsonKey][idx], updates);
      saveData(db);
      return db[config.jsonKey][idx];
    };
  }

  if (requireOwnership && user) {
    if (!config.roles.includes(user.role)) {
      throw new ExpressError(`Forbidden: User role '${user.role}' is not authorized to manage offers in '${category}'`, 403);
    }
    if (!config.isOwner(entity, user)) {
      throw new ExpressError(`Tenant Isolation: You are not authorized to manage offers on this ${category} item`, 403);
    }
  }

  return { entity, saveEntity, config };
};

/**
 * GET /api/offers/:category/:id
 */
const getOffer = async (req, res) => {
  const { category, id } = req.params;
  const { entity, config } = await resolveEntityAndAuth(category, id, req.user, false);
  const normalized = normalizeItem(entity);
  const decorated = decorateWithDiscount(normalized, config.priceField);

  res.json({
    success: true,
    category,
    offer: decorated.discount || null,
    discount_status: decorated.discount_status,
    has_active_discount: decorated.has_active_discount,
    effective_price: decorated.effective_price,
    original_price: decorated.original_price,
    item: decorated
  });
};

/**
 * PUT /api/offers/:category/:id
 * Create or update an offer on a listing/service
 */
const updateOffer = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to manage offers', 401);
  }

  const { category, id } = req.params;
  const { entity, saveEntity, config } = await resolveEntityAndAuth(category, id, req.user, true);

  const basePrice = Number(entity[config.priceField]) || 0;
  const isFreeListing = category === 'pets' && basePrice <= 0;

  if (isFreeListing && req.body && req.body.value > 0) {
    throw new ExpressError('Commercial discounts cannot be applied to free listings or adoption posts.', 400);
  }

  const validatedDiscount = parseAndValidateDiscount(req.body, basePrice, { isFreeListing });

  const updatedEntity = await saveEntity({
    discount: validatedDiscount || {
      type: 'percentage',
      value: 0,
      start_date: '',
      end_date: '',
      is_active: false,
      title: '',
      description: '',
      min_purchase: 0,
      max_discount: 0
    }
  });

  const normalized = normalizeItem(updatedEntity);
  const decorated = decorateWithDiscount(normalized, config.priceField);

  res.json({
    success: true,
    category,
    offer: decorated.discount,
    discount_status: decorated.discount_status,
    has_active_discount: decorated.has_active_discount,
    effective_price: decorated.effective_price,
    original_price: decorated.original_price,
    item: decorated,
    message: 'Promotional offer updated successfully'
  });
};

/**
 * PUT /api/offers/:category/:id/status
 * Toggle or explicitly set active/paused status of an offer
 */
const toggleOfferStatus = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to manage offers', 401);
  }

  const { category, id } = req.params;
  const { entity, saveEntity, config } = await resolveEntityAndAuth(category, id, req.user, true);

  const basePrice = Number(entity[config.priceField]) || 0;
  if (category === 'pets' && basePrice <= 0) {
    throw new ExpressError('Commercial discounts cannot be applied to free listings or adoption posts.', 400);
  }

  const currentDiscount = entity.discount || {};
  const currentActive = Boolean(currentDiscount.is_active);
  const nextActive = req.body?.is_active !== undefined ? Boolean(req.body.is_active) : !currentActive;

  const updatedDiscount = {
    ...currentDiscount,
    is_active: nextActive
  };

  const updatedEntity = await saveEntity({ discount: updatedDiscount });
  const normalized = normalizeItem(updatedEntity);
  const decorated = decorateWithDiscount(normalized, config.priceField);

  res.json({
    success: true,
    category,
    offer: decorated.discount,
    discount_status: decorated.discount_status,
    has_active_discount: decorated.has_active_discount,
    effective_price: decorated.effective_price,
    original_price: decorated.original_price,
    item: decorated,
    message: `Offer ${nextActive ? 'activated' : 'paused'} successfully`
  });
};

/**
 * DELETE /api/offers/:category/:id
 * Remove an offer from an item
 */
const deleteOffer = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to manage offers', 401);
  }

  const { category, id } = req.params;
  const { entity, saveEntity, config } = await resolveEntityAndAuth(category, id, req.user, true);

  const emptyDiscount = {
    type: 'percentage',
    value: 0,
    start_date: '',
    end_date: '',
    is_active: false,
    title: '',
    description: '',
    min_purchase: 0,
    max_discount: 0
  };

  const updatedEntity = await saveEntity({ discount: emptyDiscount });
  const normalized = normalizeItem(updatedEntity);
  const decorated = decorateWithDiscount(normalized, config.priceField);

  res.json({
    success: true,
    category,
    offer: null,
    discount_status: null,
    has_active_discount: false,
    effective_price: decorated.effective_price,
    original_price: decorated.original_price,
    item: decorated,
    message: 'Offer removed successfully'
  });
};

module.exports = {
  getOffer,
  updateOffer,
  toggleOfferStatus,
  deleteOffer
};
