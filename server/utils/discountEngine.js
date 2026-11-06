/**
 * PetPaws Centralized Promotional Offers & Discounts Engine
 *
 * Supports offers across all PetPaws marketplace categories:
 * - Marketplace Products (Food, toys, accessories, etc.)
 * - Pet Sales & Breeder Listings (Eligible paid pets only; never free adoptions)
 * - Veterinary Services (Consultations, checkups, telehealth)
 * - Grooming, Boarding, Daycare & Training Packages
 *
 * Rules:
 * - Commercial discounts cannot be applied to free listings or zero-price services.
 * - Percentage discounts must be between 1% and 90%.
 * - Fixed discounts cannot exceed the base price (cannot produce negative prices).
 * - Start and expiration dates are validated (end_date cannot precede start_date).
 * - Supports active, scheduled, expired, and paused statuses.
 * - Supports optional min_purchase requirements and max_discount caps.
 * - Calculates effective prices strictly server-side using trusted data.
 */

const ExpressError = require('./ExpressError');

/**
 * Safely parse date boundaries. Date-only strings ('YYYY-MM-DD') are parsed
 * as inclusive whole days (start at 00:00:00.000Z, end at 23:59:59.999Z).
 */
const parseDateBoundary = (dateStr, isEnd = false) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isEnd ? new Date(`${trimmed}T23:59:59.999Z`) : new Date(`${trimmed}T00:00:00.000Z`);
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Determine discount status: 'active', 'scheduled', 'expired', 'paused', or null
 */
const getDiscountStatus = (discount) => {
  if (!discount || typeof discount !== 'object') return null;
  const numVal = Number(discount.value);
  if (!Number.isFinite(numVal) || numVal <= 0) return null;

  if (!discount.is_active) {
    return 'paused';
  }

  const now = new Date();
  if (discount.start_date) {
    const start = parseDateBoundary(discount.start_date, false);
    if (start && now < start) {
      return 'scheduled';
    }
  }

  if (discount.end_date) {
    const end = parseDateBoundary(discount.end_date, true);
    if (end && now > end) {
      return 'expired';
    }
  }

  return 'active';
};

/**
 * Check whether a discount is currently active and eligible for application
 */
const isDiscountActive = (discount) => {
  return getDiscountStatus(discount) === 'active';
};

/**
 * Calculates server-side effective price, discount amount, and savings snapshot.
 *
 * @param {Object} item - Product, Pet, VetProfile, or GroomingService
 * @param {Object} [options] - Optional overrides (e.g., variant, explicit basePrice)
 * @returns {Object} Pricing details
 */
const calculateEffectivePrice = (item, options = {}) => {
  if (!item || typeof item !== 'object') {
    return {
      basePrice: 0,
      originalPrice: 0,
      discountAmount: 0,
      finalPrice: 0,
      effectivePrice: 0,
      isDiscountActive: false,
      status: null,
      discountTitle: '',
      discountType: '',
      discountValue: 0,
      amount_saved: 0,
      min_purchase: 0,
      max_discount: 0,
      start_date: '',
      end_date: '',
      description: ''
    };
  }

  const opts = options && typeof options === 'object' ? options : {};
  let variant = null;
  let explicitBasePrice = undefined;
  let explicitDiscount = null;

  if ('variant' in opts || 'basePrice' in opts || 'discount' in opts) {
    variant = opts.variant || null;
    explicitBasePrice = opts.basePrice;
    explicitDiscount = opts.discount || null;
  } else if (opts.price !== undefined || opts.variant_id !== undefined || opts.sku !== undefined) {
    variant = opts;
  }

  const rawBase = explicitBasePrice !== undefined
    ? explicitBasePrice
    : variant
    ? variant.price
    : item.price !== undefined
    ? item.price
    : item.consultation_fee !== undefined
    ? item.consultation_fee
    : item.fee !== undefined
    ? item.fee
    : 0;

  const basePrice = Number(rawBase) || 0;
  const discount = item.discount || explicitDiscount || null;
  const status = getDiscountStatus(discount);

  // Free listings or free services can NEVER receive commercial discounts
  if (basePrice <= 0 || status !== 'active' || !discount) {
    return {
      basePrice,
      originalPrice: basePrice,
      discountAmount: 0,
      finalPrice: Math.max(0, basePrice),
      effectivePrice: Math.max(0, basePrice),
      isDiscountActive: false,
      status,
      discountTitle: '',
      discountType: discount?.type || '',
      discountValue: Number(discount?.value) || 0,
      amount_saved: 0,
      min_purchase: Number(discount?.min_purchase) || 0,
      max_discount: Number(discount?.max_discount) || 0,
      start_date: discount?.start_date || '',
      end_date: discount?.end_date || '',
      description: discount?.description || ''
    };
  }

  // Minimum purchase check
  const minPurchase = Number(discount.min_purchase) || 0;
  if (minPurchase > 0 && basePrice < minPurchase) {
    return {
      basePrice,
      originalPrice: basePrice,
      discountAmount: 0,
      finalPrice: basePrice,
      effectivePrice: basePrice,
      isDiscountActive: false,
      status: 'min_purchase_not_met',
      discountTitle: discount.title || '',
      discountType: discount.type,
      discountValue: Number(discount.value) || 0,
      amount_saved: 0,
      min_purchase: minPurchase,
      max_discount: Number(discount.max_discount) || 0,
      start_date: discount.start_date || '',
      end_date: discount.end_date || '',
      description: discount.description || ''
    };
  }

  let discountAmount = 0;
  const val = Number(discount.value);

  if (discount.type === 'fixed') {
    // Fixed discount cannot exceed base price
    discountAmount = Math.min(basePrice, Math.max(0, val));
  } else {
    // Percentage discount capped between 1% and 90%
    const pct = Math.min(90, Math.max(1, val));
    discountAmount = Number(((basePrice * pct) / 100).toFixed(2));
  }

  // Maximum discount cap
  const maxDiscount = Number(discount.max_discount) || 0;
  if (maxDiscount > 0 && discountAmount > maxDiscount) {
    discountAmount = maxDiscount;
  }

  discountAmount = Number(Math.min(basePrice, Math.max(0, discountAmount)).toFixed(2));
  const finalPrice = Number(Math.max(0, basePrice - discountAmount).toFixed(2));

  const discountTitle = discount.title && String(discount.title).trim()
    ? String(discount.title).trim()
    : discount.type === 'percentage'
    ? `${val}% OFF`
    : `₹${val} OFF`;

  return {
    basePrice,
    originalPrice: basePrice,
    discountAmount,
    finalPrice,
    effectivePrice: finalPrice,
    isDiscountActive: discountAmount > 0,
    status: 'active',
    discountTitle,
    discountType: discount.type,
    discountValue: val,
    amount_saved: discountAmount,
    min_purchase: minPurchase,
    max_discount: maxDiscount,
    start_date: discount.start_date || '',
    end_date: discount.end_date || '',
    description: discount.description || ''
  };
};

/**
 * Validates and normalizes discount payloads for any category.
 *
 * @param {Object} d - Raw discount payload from client
 * @param {number} basePrice - Base price of the entity
 * @param {Object} [options] - Options such as isFreeListing
 * @returns {Object|null} Clean discount object
 */
const parseAndValidateDiscount = (d, basePrice = 0, { isFreeListing = false } = {}) => {
  if (!d || typeof d !== 'object') return null;

  // Never allow discounts on free adoption listings or 0-priced services
  if (isFreeListing || Number(basePrice) <= 0) {
    if (d.value !== undefined && Number(d.value) > 0) {
      throw new ExpressError('Commercial discounts cannot be applied to free listings or adoption posts.', 400);
    }
    return null;
  }

  const type = d.type === 'fixed' ? 'fixed' : 'percentage';
  const val = Number(d.value);

  // If value is missing, 0, or inactive without value, return inactive empty discount
  if (!Number.isFinite(val) || val <= 0) {
    return {
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
  }

  // Bounds validation
  if (type === 'percentage') {
    if (val < 1 || val > 90) {
      throw new ExpressError('Percentage discount must be between 1% and 90%', 400);
    }
  } else if (type === 'fixed') {
    if (val > Number(basePrice)) {
      throw new ExpressError('Fixed discount cannot exceed the eligible base price', 400);
    }
  }

  // Date validation
  if (d.start_date && d.end_date) {
    const s = parseDateBoundary(d.start_date, false);
    const e = parseDateBoundary(d.end_date, true);
    if (s && e && e < s) {
      throw new ExpressError('Promotional offer end date cannot be earlier than start date', 400);
    }
  }

  const min_purchase = Math.max(0, Number(d.min_purchase) || 0);
  const max_discount = Math.max(0, Number(d.max_discount) || 0);

  return {
    type,
    value: val,
    start_date: d.start_date ? String(d.start_date).trim() : '',
    end_date: d.end_date ? String(d.end_date).trim() : '',
    is_active: d.is_active !== undefined ? Boolean(d.is_active) : true,
    title: d.title ? String(d.title).trim() : '',
    description: d.description ? String(d.description).trim() : '',
    min_purchase,
    max_discount
  };
};

/**
 * Decorates an item object with effective price and discount info for client responses
 */
const decorateWithDiscount = (item, priceField = 'price') => {
  if (!item) return item;
  const isDoc = typeof item.toObject === 'function';
  const obj = isDoc ? item.toObject() : { ...item };

  const eff = calculateEffectivePrice(obj, { basePrice: obj[priceField] });

  obj.original_price = eff.basePrice;
  obj.effective_price = eff.finalPrice;
  obj.has_active_discount = eff.isDiscountActive;
  obj.discount_status = eff.status;

  if (priceField === 'consultation_fee' || priceField === 'fee') {
    obj.original_fee = eff.basePrice;
    obj.effective_fee = eff.finalPrice;
  }

  obj.discount_info = eff.isDiscountActive
    ? {
        title: eff.discountTitle,
        type: eff.discountType,
        value: eff.discountValue,
        discount_amount: eff.discountAmount,
        amount_saved: eff.discountAmount,
        min_purchase: eff.min_purchase,
        max_discount: eff.max_discount,
        start_date: eff.start_date,
        end_date: eff.end_date,
        description: eff.description
      }
    : null;

  return obj;
};

module.exports = {
  getDiscountStatus,
  isDiscountActive,
  calculateEffectivePrice,
  parseAndValidateDiscount,
  decorateWithDiscount
};
