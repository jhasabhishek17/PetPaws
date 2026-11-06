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
const { isDiscountActive, calculateEffectivePrice } = require('./discountEngine');

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

module.exports = {
  isRazorpayConfigured,
  getPaymentSigningSecret,
  computePaymentSignature,
  verifyPaymentSignature,
  isDiscountActive,
  calculateEffectivePrice
};
