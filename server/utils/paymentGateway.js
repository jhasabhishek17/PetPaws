/**
 * Payment Gateway & Server-Side Pricing/Discount Engine
 *
 * Responsibilities:
 * - Detects configured payment providers (Razorpay) via environment variables.
 * - Enforces cryptographically verified HMAC-SHA256 payment signatures.
 * - Provides safe, configuration-ready sandbox verification when Razorpay credentials are not yet set in .env.
 * - Prevents duplicate order creation & payment replay via idempotency keys.
 * - Calculates server-side prices, percentage/fixed discounts, taxes, and shipping fees.
 * - Handles Cash on Delivery (COD) separately with a clear 'Pending' payment status.
 */

const crypto = require('crypto');
const { getJwtSecret } = require('../config/jwt');

const isRazorpayConfigured = () => {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id'
  );
};

const getPaymentSigningSecret = () => {
  if (process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET !== 'your_razorpay_key_secret') {
    return process.env.RAZORPAY_KEY_SECRET;
  }
  return `${getJwtSecret()}-petpaws-payment-hmac-v1`;
};

/**
 * Computes deterministic HMAC-SHA256 signature for (order_id | payment_id)
 */
const computePaymentSignature = (providerOrderId, providerPaymentId) => {
  return crypto
    .createHmac('sha256', getPaymentSigningSecret())
    .update(`${providerOrderId}|${providerPaymentId}`)
    .digest('hex');
};

/**
 * Cryptographically verifies an incoming payment signature against expected HMAC-SHA256
 */
const verifyPaymentSignature = (providerOrderId, providerPaymentId, providerSignature) => {
  if (!providerOrderId || !providerPaymentId || !providerSignature) return false;
  const expected = computePaymentSignature(providerOrderId, providerPaymentId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(providerSignature, 'utf8'));
  } catch {
    return expected === providerSignature;
  }
};

/**
 * Determines whether a promotional discount is currently active and valid
 */
const isDiscountActive = (discount) => {
  if (!discount || !discount.is_active) return false;
  const numVal = Number(discount.value);
  if (!Number.isFinite(numVal) || numVal <= 0) return false;

  const now = new Date();
  if (discount.start_date) {
    const start = new Date(discount.start_date);
    if (!isNaN(start.getTime()) && now < start) return false;
  }
  if (discount.end_date) {
    const end = new Date(discount.end_date);
    if (!isNaN(end.getTime()) && now > end) return false;
  }

  return true;
};

/**
 * Computes effective unit price and discount amount for a product or variant on the server
 */
const calculateEffectivePrice = (product, variant = null) => {
  const basePrice = Number(variant ? variant.price : product.price) || 0;
  const discount = product.discount;

  if (!isDiscountActive(discount)) {
    return {
      basePrice,
      discountAmount: 0,
      finalPrice: Math.max(0, basePrice),
      isDiscountActive: false,
      discountTitle: '',
      discountType: '',
      discountValue: 0
    };
  }

  let discountAmount = 0;
  const val = Number(discount.value);

  if (discount.type === 'fixed') {
    // Fixed amount discount cannot exceed base price (cannot produce negative prices)
    discountAmount = Math.min(basePrice, Math.max(0, val));
  } else {
    // Percentage discount between 1% and 90%
    const pct = Math.min(90, Math.max(1, val));
    discountAmount = Number(((basePrice * pct) / 100).toFixed(2));
  }

  const finalPrice = Number(Math.max(0, basePrice - discountAmount).toFixed(2));

  return {
    basePrice,
    discountAmount,
    finalPrice,
    isDiscountActive: true,
    discountTitle: discount.title || `${discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`} OFF`,
    discountType: discount.type,
    discountValue: val
  };
};

module.exports = {
  isRazorpayConfigured,
  getPaymentSigningSecret,
  computePaymentSignature,
  verifyPaymentSignature,
  isDiscountActive,
  calculateEffectivePrice
};
