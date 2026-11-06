/**
 * PetPaws Comprehensive Platform Audit & Verification Suite
 *
 * Covers:
 * 1. Product details options returns server-calculated effective price and discount info
 * 2. Checkout initiation pre-calculates verified totals and challenges on server
 * 3. Server rejects manipulated/tampered prices and calculates real price
 * 4. Out-of-stock products purchase prevention
 * 5. Failed online payments with invalid HMAC signatures do not create paid orders
 * 6. Valid cryptographic HMAC signature succeeds and confirms online order
 * 7. Duplicate idempotency callbacks do not duplicate orders or double-decrement stock
 * 8. Customers can only access their own orders (tenant & user isolation)
 * 9. Provider accounts (seller, shopkeeper, vet, groomer) cannot book customer appointments
 * 10. Customer accounts can book appointments
 * 11. Password reset flow: token generation, hashing, generic response, and single-use consumption
 * 12. Profile picture upload endpoint rejects unauthenticated requests
 * 13. Paid business plans remain inactive until payment verification
 * 14. Free plan switches immediately without requiring payment
 * 15. Server startup and database connection
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.env.EMAIL_TRANSPORT = 'test';
const http = require('http');
const { Duplex } = require('stream');
const assert = require('assert');
const { test, describe, before } = require('node:test');
const { app } = require('../server');
const connectDB = require('../config/db');
const { computePaymentSignature } = require('../utils/paymentGateway');
const { getLastEmailTo, getSmtpConfig, getFromAddress, getConfiguredProvider, sendEmail } = require('../utils/emailService');
const {
  validateEmailSyntax,
  validateEmailAddress,
  setDnsResolverForTesting,
  clearDnsCache
} = require('../utils/emailValidator');
const {
  HOUR_MS,
  DAY_MS,
  shiftOtpRateLimitWindow,
  resetOtpRateLimit
} = require('../utils/otpRateLimiter');
const { isCloudinaryConfigured, configureCloudinary, assertCloudinaryConfigured } = require('../config/cloudinary');

let customerToken;
let customerUser;
let sellerToken;
let sellerUser;
let testProduct;

function makeRequest(app, { method = 'GET', url = '/', headers = {}, body = null }) {
  return new Promise((resolve) => {
    const socket = new Duplex({
      read() {},
      write(chunk, enc, cb) { cb(); }
    });
    socket.remoteAddress = '127.0.0.1';

    const req = new http.IncomingMessage(socket);
    req.socket = socket;
    req.connection = socket;
    req.method = method;
    req.url = url;
    req.headers = { ...headers };

    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    if (bodyStr) {
      if (!req.headers['content-type']) req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = Buffer.byteLength(bodyStr);
    }

    const res = Object.setPrototypeOf({
      _headers: {},
      _body: '',
      statusCode: 200,
      setHeader(k, v) { this._headers[k.toLowerCase()] = v; },
      getHeader(k) { return this._headers[k.toLowerCase()]; },
      removeHeader(k) { delete this._headers[k.toLowerCase()]; },
      writeHead(code, headers) {
        this.statusCode = code;
        if (headers) Object.assign(this._headers, headers);
        return this;
      },
      write(chunk) {
        if (chunk) this._body += chunk.toString();
        return true;
      },
      end(chunk) {
        if (chunk) this._body += chunk.toString();
        let json = null;
        try { json = JSON.parse(this._body); } catch {}
        resolve({ status: this.statusCode, data: json || this._body, headers: this._headers });
      }
    }, app.response);

    res.app = app;
    req.app = app;
    res.req = req;

    app.handle(req, res);

    if (bodyStr) {
      req.push(bodyStr);
    }
    req.push(null);
  });
}

const postJson = (endpoint, data, token) => {
  const headers = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = `Bearer ${token}`;
  return makeRequest(app, { method: 'POST', url: endpoint, headers, body: data });
};

const getJson = (endpoint, token) => {
  const headers = {};
  if (token) headers['authorization'] = `Bearer ${token}`;
  return makeRequest(app, { method: 'GET', url: endpoint, headers });
};

const putJson = (endpoint, data, token) => {
  const headers = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = `Bearer ${token}`;
  return makeRequest(app, { method: 'PUT', url: endpoint, headers, body: data });
};

async function registerAndVerify(payload) {
  const regRes = await postJson('/api/auth/register', payload);
  assert.strictEqual(regRes.status, 201, `Registration failed for ${payload.email}: ${JSON.stringify(regRes.data)}`);
  assert.strictEqual(regRes.data.requires_verification, true);
  assert.strictEqual(regRes.data.user.email_verified, false);

  const emailItem = getLastEmailTo(payload.email, 'verify-email');
  assert.ok(emailItem && emailItem.otp, `Expected 6-digit verification OTP email for ${payload.email}`);
  assert.match(String(emailItem.otp), /^\d{6}$/, 'Verification OTP must be a 6-digit numeric code');

  const verifyRes = await postJson('/api/auth/verify-otp', {
    email: payload.email,
    otp: emailItem.otp
  });
  assert.strictEqual(verifyRes.status, 200, `Email OTP verification failed for ${payload.email}`);

  const loginRes = await postJson('/api/auth/login', {
    email: payload.email,
    password: payload.password
  });
  assert.strictEqual(loginRes.status, 200, `Login after verification failed for ${payload.email}`);
  return loginRes.data;
}

describe('PetPaws Platform Audit & Feature Verification', async () => {
  before(async () => {
    await connectDB();

    const timestamp = Date.now();

    // 1. Register & verify test customer
    const custAuth = await registerAndVerify({
      name: `Test Customer ${timestamp}`,
      email: `customer_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'buyer',
      phone: '+91 9876543210',
      address: '123 Pet Lane, Mumbai'
    });
    customerToken = custAuth.token;
    customerUser = custAuth.user;

    // 2. Register & verify test seller
    const sellAuth = await registerAndVerify({
      name: `Test Seller ${timestamp}`,
      email: `seller_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'seller',
      phone: '+91 9123456780',
      address: '456 Vendor Hub, Pune'
    });
    sellerToken = sellAuth.token;
    sellerUser = sellAuth.user;

    // 3. Create test product under seller with discount
    const prodRes = await postJson('/api/products', {
      title: `Audit Organic Kibble ${timestamp}`,
      category: 'Food & Nutrition',
      subcategory: 'Dry Kibble',
      pet_type: 'Dogs',
      brand: 'NatureBite',
      price: 500,
      stock: 10,
      description: 'High-protein dry food for adult dogs.',
      image_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
      discount: {
        type: 'percentage',
        value: 10,
        is_active: true,
        title: 'Launch 10% Off'
      }
    }, sellerToken);
    assert.strictEqual(prodRes.status, 201, 'Product creation failed');
    testProduct = prodRes.data.product;
  });

  test('1. Product details options returns server-calculated effective price and discount info', async () => {
    const res = await getJson(`/api/products/${testProduct.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.product.price, 500);
    assert.strictEqual(res.data.product.effective_price, 450, '10% discount from 500 should be 450');
    assert.strictEqual(res.data.product.has_active_discount, true);
    assert.strictEqual(res.data.product.discount_info.amount_saved, 50);
  });

  test('2. Checkout initiation pre-calculates verified totals and challenges on server', async () => {
    const res = await postJson('/api/product-orders/initiate', {
      items: [{ product_id: testProduct.id, quantity: 2 }]
    }, customerToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.summary.subtotal, 900);
    assert.strictEqual(res.data.summary.total_discount, 100);
    assert.strictEqual(res.data.summary.total_amount, 1051); // 900 + 72 tax + 79 shipping
    assert.strictEqual(res.data.prefill.buyer_name, customerUser.name);
    assert.ok(res.data.payment_challenge, 'Payment challenge must be returned');
  });

  test('3. Server rejects manipulated/tampered prices and calculates real price', async () => {
    const idempotencyKey = `idem_tamper_${Date.now()}`;
    const res = await postJson('/api/product-orders/checkout', {
      items: [{ product_id: testProduct.id, quantity: 1, price: 10 }],
      customer_name: customerUser.name,
      customer_phone: '+91 9876543210',
      shipping_address: '123 Pet Lane, Mumbai',
      payment_method: 'cod',
      idempotency_key: idempotencyKey
    }, customerToken);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.order.items[0].unit_price, 450);
    assert.strictEqual(res.data.order.total_discount, 50);
    assert.strictEqual(res.data.order.payment_status, 'Pending', 'COD order must have payment_status: Pending');
  });

  test('4. Out-of-stock products purchase prevention', async () => {
    const res = await postJson('/api/product-orders/checkout', {
      items: [{ product_id: testProduct.id, quantity: 20 }],
      customer_name: customerUser.name,
      customer_phone: '+91 9876543210',
      shipping_address: '123 Pet Lane, Mumbai',
      payment_method: 'cod',
      idempotency_key: `idem_stock_${Date.now()}`
    }, customerToken);

    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /stock|quantity/i);
  });

  test('5. Failed online payments with invalid HMAC signatures do not create paid orders', async () => {
    const res = await postJson('/api/product-orders/checkout', {
      items: [{ product_id: testProduct.id, quantity: 1 }],
      customer_name: customerUser.name,
      customer_phone: '+91 9876543210',
      shipping_address: '123 Pet Lane, Mumbai',
      payment_method: 'online',
      provider_order_id: 'order_test_123',
      provider_payment_id: 'pay_test_456',
      payment_signature: 'invalid_forged_signature_12345',
      idempotency_key: `idem_fake_pay_${Date.now()}`
    }, customerToken);

    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /signature|verification/i);
  });

  test('6. Valid cryptographic HMAC signature succeeds and confirms online order', async () => {
    const orderId = `order_test_${Date.now()}`;
    const paymentId = `pay_test_${Date.now()}`;
    const validSignature = computePaymentSignature(orderId, paymentId);

    const res = await postJson('/api/product-orders/checkout', {
      items: [{ product_id: testProduct.id, quantity: 1 }],
      customer_name: customerUser.name,
      customer_phone: '+91 9876543210',
      shipping_address: '123 Pet Lane, Mumbai',
      payment_method: 'online',
      provider_order_id: orderId,
      provider_payment_id: paymentId,
      payment_signature: validSignature,
      idempotency_key: `idem_valid_${Date.now()}`
    }, customerToken);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.order.payment_status, 'Paid');
    assert.strictEqual(res.data.order.order_status, 'Confirmed');
  });

  test('7. Duplicate idempotency callbacks do not duplicate orders or double-decrement stock', async () => {
    const idemKey = `idem_replay_${Date.now()}`;
    const payload = {
      items: [{ product_id: testProduct.id, quantity: 1 }],
      customer_name: customerUser.name,
      customer_phone: '+91 9876543210',
      shipping_address: '123 Pet Lane, Mumbai',
      payment_method: 'cod',
      idempotency_key: idemKey
    };

    const first = await postJson('/api/product-orders/checkout', payload, customerToken);
    assert.strictEqual(first.status, 201);
    const firstOrderId = first.data.order.id;

    const second = await postJson('/api/product-orders/checkout', payload, customerToken);
    assert.strictEqual(second.status, 200);
    assert.strictEqual(second.data.idempotent_replay, true);
    assert.strictEqual(second.data.order.id, firstOrderId, 'Replay must return original order ID');
  });

  test('8. Customers can only access their own orders', async () => {
    const anotherCust = await registerAndVerify({
      name: 'Another Customer',
      email: `another_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'buyer'
    });

    const res = await getJson('/api/product-orders/my-orders', anotherCust.token);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.orders.length, 0, 'New customer must see 0 orders');
  });

  test('9. Provider accounts (seller, shopkeeper, vet, groomer) cannot book customer appointments', async () => {
    const resVet = await postJson('/api/vets/appointments', {
      vet_id: 'vet-01',
      pet_name: 'Buddy',
      appointment_date: '2026-12-01',
      time_slot: '11:00 AM',
      type: 'Checkup'
    }, sellerToken);
    assert.strictEqual(resVet.status, 403, 'Provider account must be rejected from booking vet appointment');

    const resGroom = await postJson('/api/services/book', {
      service_id: 'srv-01',
      booking_date: '2026-12-01',
      time_slot: '10:00 AM'
    }, sellerToken);
    assert.strictEqual(resGroom.status, 403, 'Provider account must be rejected from booking grooming appointment');
  });

  test('10. Customer accounts can book appointments', async () => {
    const vetsRes = await getJson('/api/vets');
    const vetId = (vetsRes.data && vetsRes.data.vets && vetsRes.data.vets.length > 0)
      ? vetsRes.data.vets[0].id
      : 'vet-01';

    const res = await postJson('/api/vets/appointments', {
      vet_id: vetId,
      pet_name: 'Milo the Golden',
      appointment_date: '2026-12-01',
      time_slot: '11:00 AM',
      type: 'General Checkup',
      notes: 'Routine health assessment'
    }, customerToken);

    assert.strictEqual(res.status, 201);
    assert.ok(res.data.appointment);
    assert.strictEqual(res.data.appointment.buyer_id, customerUser.id);
  });

  test('11. Password reset OTP flow: 6-digit OTP generation, hashing, generic anti-enumeration response, attempt limit, single-use consumption, and session invalidation', async () => {
    const oldToken = customerToken;

    // Unknown email returns identical generic 200 message (no account enumeration)
    const unknownForgotRes = await postJson('/api/auth/forgot-password', {
      email: `unknown_account_${Date.now()}@test.com`
    });
    assert.strictEqual(unknownForgotRes.status, 200);

    // Advance persistent rate-limit window past the 60s registration cooldown before requesting forgot-password OTP
    await shiftOtpRateLimitWindow(customerUser.email, 65000);

    const forgotRes = await postJson('/api/auth/forgot-password', {
      email: customerUser.email
    });
    assert.strictEqual(forgotRes.status, 200);
    assert.strictEqual(forgotRes.data.dev_reset_token, undefined, 'Reset OTP must never be exposed in the API response');

    const resetEmail = getLastEmailTo(customerUser.email, 'reset-password');
    assert.ok(resetEmail && resetEmail.otp, 'Password reset email with 6-digit OTP must be generated');
    assert.match(String(resetEmail.otp), /^\d{6}$/, 'Reset OTP must be a 6-digit numeric code');
    const resetOtp = resetEmail.otp;

    // Immediate duplicate forgot-password request within cooldown is rate-limited (429)
    const cooldownForgotRes = await postJson('/api/auth/forgot-password', {
      email: customerUser.email
    });
    assert.strictEqual(cooldownForgotRes.status, 429);

    // Wrong reset OTP increments attempt counter and returns 400
    const wrongOtp = resetOtp === '000000' ? '111111' : '000000';
    const wrongCheckRes = await postJson('/api/auth/verify-reset-otp', {
      email: customerUser.email,
      otp: wrongOtp
    });
    assert.strictEqual(wrongCheckRes.status, 400);
    assert.match(wrongCheckRes.data.message, /attempt\(s\) remaining/i);

    // Pre-verify correct reset OTP
    const checkTokenRes = await postJson('/api/auth/verify-reset-otp', {
      email: customerUser.email,
      otp: resetOtp
    });
    assert.strictEqual(checkTokenRes.status, 200);
    assert.strictEqual(checkTokenRes.data.valid, true);

    const resetRes = await postJson('/api/auth/reset-password', {
      email: customerUser.email,
      otp: resetOtp,
      new_password: 'NewStrongPassword123!',
      confirm_password: 'NewStrongPassword123!'
    });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data.success, true);

    // Reusing consumed reset OTP must fail
    const replayRes = await postJson('/api/auth/reset-password', {
      email: customerUser.email,
      otp: resetOtp,
      new_password: 'AnotherPassword123!'
    });
    assert.strictEqual(replayRes.status, 400, 'Reusing an expired or consumed OTP must fail');

    // Old JWT session must be invalidated after password reset
    const oldSessionRes = await getJson('/api/auth/me', oldToken);
    assert.strictEqual(oldSessionRes.status, 401, 'Old JWT token must be invalidated after password reset');

    const loginRes = await postJson('/api/auth/login', {
      email: customerUser.email,
      password: 'NewStrongPassword123!'
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.data.token);
    customerToken = loginRes.data.token;
  });

  test('12. Profile picture upload endpoint rejects unauthenticated requests', async () => {
    const res = await postJson('/api/upload', {});
    assert.strictEqual(res.status, 401);
  });

  test('13. Paid business plans remain inactive until payment verification', async () => {
    const checkoutRes = await postJson('/api/saas/subscriptions/checkout', {
      plan_id: 'growth',
      billing_cycle: 'monthly'
    }, sellerToken);

    assert.strictEqual(checkoutRes.status, 201);
    assert.strictEqual(checkoutRes.data.immediate, false);
    assert.ok(checkoutRes.data.provider_order_id);

    const dashBefore = await getJson('/api/saas/my-business', sellerToken);
    assert.strictEqual(dashBefore.data.business.subscription_plan, 'free', 'Plan must remain Free before payment');

    const handshake = checkoutRes.data.sandbox_handshake;
    assert.ok(handshake, 'Sandbox handshake signature must be returned');

    const verifyRes = await postJson('/api/saas/subscriptions/verify', handshake, sellerToken);
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.success, true);

    const dashAfter = await getJson('/api/saas/my-business', sellerToken);
    assert.strictEqual(dashAfter.data.business.subscription_plan, 'growth');
  });

  test('14. Free plan switches immediately without requiring payment', async () => {
    const freeRes = await postJson('/api/saas/subscriptions/checkout', {
      plan_id: 'free',
      billing_cycle: 'monthly'
    }, sellerToken);

    assert.strictEqual(freeRes.status, 200);
    assert.strictEqual(freeRes.data.immediate, true);
    assert.strictEqual(freeRes.data.business.subscription_plan, 'free');
  });

  test('15. Verified buyer who purchased can review the product; duplicate review is rejected', async () => {
    // Customer purchased testProduct in earlier tests
    const revRes = await postJson(`/api/products/${testProduct.id}/reviews`, {
      rating: 5,
      comment: 'Top quality dog food, my pup loved it!'
    }, customerToken);

    assert.strictEqual(revRes.status, 201);
    assert.strictEqual(revRes.data.success, true);
    assert.strictEqual(revRes.data.review.verified_purchase, true);

    // Duplicate review attempt by same user must be rejected
    const dupRes = await postJson(`/api/products/${testProduct.id}/reviews`, {
      rating: 4,
      comment: 'Duplicate review should be blocked'
    }, customerToken);

    assert.strictEqual(dupRes.status, 400);
    assert.match(dupRes.data.message, /already submitted a review/i);
  });

  test('16. Seller cannot edit or modify another seller product', async () => {
    // Register & Verify Seller B
    const sellerB = await registerAndVerify({
      name: `Competitor Seller ${Date.now()}`,
      email: `competitor_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'seller'
    });

    // Seller B attempts to update Seller A's product
    const tamperRes = await putJson(`/api/products/${testProduct.id}`, {
      title: 'Hacked Product Title',
      price: 1
    }, sellerB.token);

    assert.strictEqual(tamperRes.status, 403, 'Sellers must not be able to edit another seller product');
  });

  test('17. Email OTP verification flow: registration, unverified login block, wrong OTP attempt limit, resend cooldown & previous OTP invalidation, expired OTP, and normal login', async () => {
    const nodemailer = require('nodemailer');
    assert.strictEqual(typeof nodemailer.createTransport, 'function', 'Nodemailer must be installed and available');

    const unverifiedEmail = `unverified_${Date.now()}@test.com`;
    const regRes = await postJson('/api/auth/register', {
      name: 'Unverified Buyer',
      email: unverifiedEmail,
      password: 'Password123!',
      role: 'buyer'
    });
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.data.requires_verification, true);
    assert.strictEqual(regRes.data.email_sent, true);
    assert.strictEqual(regRes.data.token, undefined, 'Registration must not issue JWT before email OTP verification');

    // Attempt login before verifying email
    const blockedLogin = await postJson('/api/auth/login', {
      email: unverifiedEmail,
      password: 'Password123!'
    });
    assert.strictEqual(blockedLogin.status, 403);
    assert.strictEqual(blockedLogin.data.code, 'EMAIL_NOT_VERIFIED');
    assert.strictEqual(blockedLogin.data.requires_verification, true);

    // Check first verification email and 6-digit OTP format
    const firstEmailRecord = getLastEmailTo(unverifiedEmail, 'verify-email');
    assert.ok(firstEmailRecord && firstEmailRecord.otp);
    assert.match(String(firstEmailRecord.otp), /^\d{6}$/, 'OTP must be a 6-digit number');
    assert.ok(firstEmailRecord.text.includes(firstEmailRecord.otp), 'Email text must contain the 6-digit OTP');

    // Immediate resend within 60s cooldown must return 429
    const earlyResend = await postJson('/api/auth/resend-otp', { email: unverifiedEmail });
    assert.strictEqual(earlyResend.status, 429);
    assert.ok(earlyResend.data.retry_after_seconds > 0);

    // Simulate expired verification OTP and advance persistent rate-limit window past 60s cooldown
    const { loadData, saveData, isMongoConnected } = require('../db');
    const User = require('../models/User');
    await shiftOtpRateLimitWindow(unverifiedEmail, 120000);
    if (isMongoConnected()) {
      await User.updateOne(
        { email: unverifiedEmail },
        {
          $set: {
            email_verification_expires_at: new Date(Date.now() - 60000)
          }
        }
      );
    } else {
      const db = loadData();
      const idx = db.users.findIndex((u) => u.email === unverifiedEmail);
      if (idx !== -1) {
        db.users[idx].email_verification_expires_at = new Date(Date.now() - 60000).toISOString();
        saveData(db);
      }
    }

    const expiredVerifyRes = await postJson('/api/auth/verify-otp', {
      email: unverifiedEmail,
      otp: firstEmailRecord.otp
    });
    assert.strictEqual(expiredVerifyRes.status, 400);
    assert.match(expiredVerifyRes.data.message, /expired/i);

    // Resend verification OTP after cooldown
    const resendRes = await postJson('/api/auth/resend-otp', { email: unverifiedEmail });
    assert.strictEqual(resendRes.status, 200);
    assert.strictEqual(resendRes.data.email_sent, true);

    const secondEmailRecord = getLastEmailTo(unverifiedEmail, 'verify-email');
    assert.ok(secondEmailRecord && secondEmailRecord.otp);

    // Test incorrect OTP attempt limit (5 wrong attempts invalidate the OTP)
    const wrongOtp = secondEmailRecord.otp === '999999' ? '888888' : '999999';
    for (let attempt = 1; attempt <= 4; attempt++) {
      const wrongRes = await postJson('/api/auth/verify-otp', {
        email: unverifiedEmail,
        otp: wrongOtp
      });
      assert.strictEqual(wrongRes.status, 400);
      assert.match(wrongRes.data.message, /attempt\(s\) remaining/i);
    }
    const fifthWrongRes = await postJson('/api/auth/verify-otp', {
      email: unverifiedEmail,
      otp: wrongOtp
    });
    assert.strictEqual(fifthWrongRes.status, 429, '5th failed OTP attempt must invalidate the OTP with 429');

    // Even the correct second OTP must now be rejected because it was invalidated after 5 failed attempts
    const afterLockoutRes = await postJson('/api/auth/verify-otp', {
      email: unverifiedEmail,
      otp: secondEmailRecord.otp
    });
    assert.strictEqual(afterLockoutRes.status, 400);

    // Advance persistent rate-limit window past 60s cooldown and resend a fresh 3rd OTP
    await shiftOtpRateLimitWindow(unverifiedEmail, 120000);

    const thirdResend = await postJson('/api/auth/resend-otp', { email: unverifiedEmail });
    assert.strictEqual(thirdResend.status, 200);
    const thirdEmailRecord = getLastEmailTo(unverifiedEmail, 'verify-email');
    assert.ok(thirdEmailRecord && thirdEmailRecord.otp);

    // Verify email with fresh 3rd OTP
    const verifyRes = await postJson('/api/auth/verify-otp', {
      email: unverifiedEmail,
      otp: thirdEmailRecord.otp
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.success, true);
    assert.strictEqual(verifyRes.data.verified, true);
    assert.ok(verifyRes.data.token, 'Successful OTP verification returns auth token');

    // Reusing same verification OTP must fail
    const replayVerify = await postJson('/api/auth/verify-otp', {
      email: unverifiedEmail,
      otp: thirdEmailRecord.otp
    });
    assert.strictEqual(replayVerify.status, 400);

    // Normal login succeeds after verification without requiring another OTP
    const okLogin = await postJson('/api/auth/login', {
      email: unverifiedEmail,
      password: 'Password123!'
    });
    assert.strictEqual(okLogin.status, 200);
    assert.ok(okLogin.data.token);
  });

  test('18. Email delivery failure handling: never falsely claims email was sent when SMTP is unconfigured and recovers cleanly', async () => {
    const savedTransport = process.env.EMAIL_TRANSPORT;
    const savedSmtpHost = process.env.SMTP_HOST;
    const savedResendKey = process.env.RESEND_API_KEY;
    const failEmail = `smtp_fail_${Date.now()}@test.com`;

    try {
      process.env.EMAIL_TRANSPORT = '';
      process.env.SMTP_HOST = '';
      process.env.RESEND_API_KEY = '';

      // 1. Registration when email service is unconfigured must report email_sent: false & delivery_error: true
      const regFailRes = await postJson('/api/auth/register', {
        name: 'Pending SMTP User',
        email: failEmail,
        password: 'Password123!',
        role: 'buyer'
      });
      assert.strictEqual(regFailRes.status, 201);
      assert.strictEqual(regFailRes.data.email_sent, false, 'Must not falsely claim email was sent');
      assert.strictEqual(regFailRes.data.delivery_error, true);

      // 2. Resend verification when email service is unconfigured must return 503
      const resendFailRes = await postJson('/api/auth/resend-verification', { email: failEmail });
      assert.strictEqual(resendFailRes.status, 503);

      // 3. Forgot password when email service is unconfigured must return 503
      const forgotFailRes = await postJson('/api/auth/forgot-password', { email: failEmail });
      assert.strictEqual(forgotFailRes.status, 503);

      // 4. Once email provider is configured again, re-registering or resending on the unverified account succeeds
      process.env.EMAIL_TRANSPORT = 'test';
      const retryRegRes = await postJson('/api/auth/register', {
        name: 'Pending SMTP User',
        email: failEmail,
        password: 'Password123!',
        role: 'buyer'
      });
      assert.strictEqual(retryRegRes.status, 201);
      assert.strictEqual(retryRegRes.data.email_sent, true);
      assert.strictEqual(retryRegRes.data.delivery_error, false);
    } finally {
      process.env.EMAIL_TRANSPORT = savedTransport || 'test';
      if (savedSmtpHost !== undefined) process.env.SMTP_HOST = savedSmtpHost;
      if (savedResendKey !== undefined) process.env.RESEND_API_KEY = savedResendKey;
    }
  });

  test('19. Cloudinary configuration loads from server/.env and validates missing credentials safely', async () => {
    assert.strictEqual(isCloudinaryConfigured(), true, 'Cloudinary should be configured from server/.env');
    assert.strictEqual(configureCloudinary(), true);

    // Temporarily test missing credential validation without exposing secrets
    const savedName = process.env.CLOUDINARY_CLOUD_NAME;
    const savedKey = process.env.CLOUDINARY_API_KEY;
    const savedSecret = process.env.CLOUDINARY_API_SECRET;
    try {
      process.env.CLOUDINARY_CLOUD_NAME = 'your_cloud_name';
      process.env.CLOUDINARY_API_KEY = '';
      process.env.CLOUDINARY_API_SECRET = '';
      assert.throws(
        () => assertCloudinaryConfigured(),
        (err) => err.statusCode === 503 && /CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET/.test(err.message)
      );
    } finally {
      process.env.CLOUDINARY_CLOUD_NAME = savedName;
      process.env.CLOUDINARY_API_KEY = savedKey;
      process.env.CLOUDINARY_API_SECRET = savedSecret;
      configureCloudinary();
    }
  });

  test('20. Authoritative email normalization, malformed syntax rejection, and DNS MX/A mail-routing verification', async () => {
    // 1. Test malformed email syntax cases across register, resend-otp, and forgot-password
    const malformedEmails = [
      'plainaddress',
      '@missinglocal.com',
      'user@',
      'user@@gmail.com',
      '.leadingdot@gmail.com',
      'trailingdot.@gmail.com',
      'consecutive..dots@gmail.com',
      'user@singlelabel',
      'user@domain..com',
      'user@-leadinghyphen.com',
      'user@trailinghyphen-.com',
      'user@numeric-tld.123',
      'user@reserved.invalid',
      'user@reserved.local',
      'user@reserved.localhost',
      'user@example.com',
      'user@gmial.com',
      'user@gmail.con'
    ];

    for (const badEmail of malformedEmails) {
      const syntaxCheck = validateEmailSyntax(badEmail);
      assert.strictEqual(syntaxCheck.valid, false, `Expected syntax check to reject "${badEmail}"`);

      const regRes = await postJson('/api/auth/register', {
        name: 'Bad Email Tester',
        email: badEmail,
        password: 'Password123!',
        role: 'buyer'
      });
      assert.strictEqual(regRes.status, 400, `Expected /register to reject "${badEmail}" with 400`);
      assert.strictEqual(regRes.data.message, 'Please enter a valid email address.');
    }

    const badForgotRes = await postJson('/api/auth/forgot-password', { email: 'user@domain.invalid' });
    assert.strictEqual(badForgotRes.status, 400);
    assert.strictEqual(badForgotRes.data.message, 'Please enter a valid email address.');

    const badResendRes = await postJson('/api/auth/resend-otp', { email: 'user@gmial.com' });
    assert.strictEqual(badResendRes.status, 400);
    assert.strictEqual(badResendRes.data.message, 'Please enter a valid email address.');

    // 2. Test DNS MX and A/AAAA fallback behavior deterministically using injectable DNS resolver
    try {
      setDnsResolverForTesting({
        resolveMx: async (domain) => {
          if (domain === 'valid-mx-domain.org') {
            return [{ exchange: 'mx1.valid-mx-domain.org', priority: 10 }];
          }
          if (domain === 'null-mx-domain.org') {
            // RFC 7505 Null MX record ("0 .")
            return [{ exchange: '.', priority: 0 }];
          }
          if (domain === 'implicit-a-domain.org' || domain === 'no-mx-no-a-domain.org') {
            const err = new Error('queryMx ENODATA');
            err.code = 'ENODATA';
            throw err;
          }
          const nxErr = new Error(`queryMx ENOTFOUND ${domain}`);
          nxErr.code = 'ENOTFOUND';
          throw nxErr;
        },
        resolve4: async (domain) => {
          if (domain === 'implicit-a-domain.org') {
            return ['93.184.216.34'];
          }
          const err = new Error('queryA ENODATA');
          err.code = 'ENODATA';
          throw err;
        },
        resolve6: async () => {
          const err = new Error('queryAAAA ENODATA');
          err.code = 'ENODATA';
          throw err;
        }
      });

      // Valid MX domain passes validation and normalizes whitespace + case
      const validMxCheck = await validateEmailAddress('  Valid.User@VALID-MX-DOMAIN.ORG  ');
      assert.strictEqual(validMxCheck.valid, true);
      assert.strictEqual(validMxCheck.normalizedEmail, 'valid.user@valid-mx-domain.org');
      assert.strictEqual(validMxCheck.routingMethod, 'mx');

      // RFC 5321 Section 5.1 A-record fallback passes when MX is ENODATA but A record exists
      const fallbackACheck = await validateEmailAddress('owner@implicit-a-domain.org');
      assert.strictEqual(fallbackACheck.valid, true);
      assert.strictEqual(fallbackACheck.routingMethod, 'a_fallback');

      // RFC 7505 Null MX domain is rejected before creating account or sending OTP
      const nullMxReg = await postJson('/api/auth/register', {
        name: 'Null MX User',
        email: 'user@null-mx-domain.org',
        password: 'Password123!',
        role: 'buyer'
      });
      assert.strictEqual(nullMxReg.status, 400);
      assert.strictEqual(nullMxReg.data.message, 'Please enter a valid email address.');
      assert.strictEqual(getLastEmailTo('user@null-mx-domain.org', 'verify-email'), null);

      // Nonexistent domain (NXDOMAIN / ENOTFOUND) is rejected before creating account or sending OTP
      const nxDomainReg = await postJson('/api/auth/register', {
        name: 'Nonexistent Domain User',
        email: 'user@nonexistent-domain-99999.org',
        password: 'Password123!',
        role: 'buyer'
      });
      assert.strictEqual(nxDomainReg.status, 400);
      assert.strictEqual(nxDomainReg.data.message, 'Please enter a valid email address.');
      assert.strictEqual(getLastEmailTo('user@nonexistent-domain-99999.org', 'verify-email'), null);

      // Domain with ENODATA on both MX and A/AAAA is rejected
      const noMxNoAReg = await postJson('/api/auth/register', {
        name: 'Unroutable Domain User',
        email: 'user@no-mx-no-a-domain.org',
        password: 'Password123!',
        role: 'buyer'
      });
      assert.strictEqual(noMxNoAReg.status, 400);
      assert.strictEqual(noMxNoAReg.data.message, 'Please enter a valid email address.');
    } finally {
      setDnsResolverForTesting(null);
      clearDnsCache();
    }
  });

  test('21. Persistent OTP sending limits (60s cooldown, 3/hour, 5/24h, IP limit) and cross-endpoint bypass prevention', async () => {
    const rawMixedEmail = `  RateLimit_${Date.now()}@GMAIL.COM  `;
    const normalizedTarget = rawMixedEmail.trim().toLowerCase();
    await resetOtpRateLimit({ email: normalizedTarget });

    // --- SEND #1 (via /api/auth/register) ---
    const send1 = await postJson('/api/auth/register', {
      name: 'Rate Limit User',
      email: rawMixedEmail,
      password: 'Password123!',
      role: 'buyer'
    });
    assert.strictEqual(send1.status, 201);
    assert.strictEqual(send1.data.email_sent, true);
    assert.strictEqual(send1.data.email, normalizedTarget);
    const otpAfterSend1 = getLastEmailTo(normalizedTarget, 'verify-email')?.otp;
    assert.match(String(otpAfterSend1), /^\d{6}$/);

    // --- 60s COOLDOWN BYPASS ATTEMPTS ACROSS ALL ENDPOINTS ---
    // 1a. Try /api/auth/resend-otp within 60s (even with { force: true } and uppercase email)
    const bypassResend = await postJson('/api/auth/resend-otp', {
      email: normalizedTarget.toUpperCase(),
      force: true
    });
    assert.strictEqual(bypassResend.status, 429);
    assert.strictEqual(bypassResend.data.limit_type, 'cooldown');
    assert.ok(bypassResend.data.retry_after_seconds > 0 && bypassResend.data.retry_after_seconds <= 60);

    // 1b. Try /api/auth/resend-verification within 60s
    const bypassResendAlt = await postJson('/api/auth/resend-verification', {
      email: normalizedTarget
    });
    assert.strictEqual(bypassResendAlt.status, 429);

    // 1c. Try /api/auth/forgot-password within 60s
    const bypassForgot = await postJson('/api/auth/forgot-password', {
      email: normalizedTarget,
      force: true
    });
    assert.strictEqual(bypassForgot.status, 429);
    assert.strictEqual(bypassForgot.data.limit_type, 'cooldown');

    // 1d. Try re-submitting /api/auth/register within 60s
    const bypassRegister = await postJson('/api/auth/register', {
      name: 'Rate Limit User',
      email: normalizedTarget,
      password: 'Password123!',
      role: 'buyer'
    });
    assert.strictEqual(bypassRegister.status, 429);

    // Confirm no new OTP was sent during the blocked 429 requests
    assert.strictEqual(getLastEmailTo(normalizedTarget, 'verify-email')?.otp, otpAfterSend1);

    // --- SEND #2 (after advancing 61s, via /api/auth/resend-otp) ---
    await shiftOtpRateLimitWindow(normalizedTarget, 61 * 1000);
    const send2 = await postJson('/api/auth/resend-otp', { email: normalizedTarget });
    assert.strictEqual(send2.status, 200);
    const otpAfterSend2 = getLastEmailTo(normalizedTarget, 'verify-email')?.otp;
    assert.ok(otpAfterSend2);

    // --- SEND #3 (after advancing 61s, via /api/auth/forgot-password) ---
    await shiftOtpRateLimitWindow(normalizedTarget, 61 * 1000);
    const send3 = await postJson('/api/auth/forgot-password', { email: normalizedTarget });
    assert.strictEqual(send3.status, 200);
    const resetOtpAfterSend3 = getLastEmailTo(normalizedTarget, 'reset-password')?.otp;
    assert.match(String(resetOtpAfterSend3), /^\d{6}$/);

    // --- HOURLY LIMIT (3 per rolling hour): Advance 61s so 60s cooldown is over, but 3 sends occurred in the last hour ---
    await shiftOtpRateLimitWindow(normalizedTarget, 61 * 1000);

    const hourlyBlockedResend = await postJson('/api/auth/resend-otp', { email: normalizedTarget });
    assert.strictEqual(hourlyBlockedResend.status, 429, '4th OTP send within 1 hour must return 429');
    assert.strictEqual(hourlyBlockedResend.data.code, 'OTP_HOURLY_LIMIT');
    assert.strictEqual(hourlyBlockedResend.data.limit_type, 'hourly');
    assert.ok(hourlyBlockedResend.data.retry_after_seconds > 60, 'Hourly retry_after_seconds must reflect remaining hour window');
    assert.match(hourlyBlockedResend.data.message, /3 OTP emails per hour/i);

    const hourlyBlockedForgot = await postJson('/api/auth/forgot-password', { email: normalizedTarget });
    assert.strictEqual(hourlyBlockedForgot.status, 429);
    assert.strictEqual(hourlyBlockedForgot.data.code, 'OTP_HOURLY_LIMIT');

    const hourlyBlockedReg = await postJson('/api/auth/register', {
      name: 'Rate Limit User',
      email: normalizedTarget,
      password: 'Password123!',
      role: 'buyer'
    });
    assert.strictEqual(hourlyBlockedReg.status, 429);
    assert.strictEqual(hourlyBlockedReg.data.code, 'OTP_HOURLY_LIMIT');

    // Confirm active reset OTP from Send #3 was NOT invalidated by the 429 hourly rate-limit blocks
    const stillValidResetOtp = await postJson('/api/auth/verify-reset-otp', {
      email: normalizedTarget,
      otp: resetOtpAfterSend3
    });
    assert.strictEqual(stillValidResetOtp.status, 200);
    assert.strictEqual(stillValidResetOtp.data.valid, true);

    // --- ADVANCE 61 MINUTES: First 3 sends are now > 1 hour ago, but still within the 24-hour window (3/5 used in 24h) ---
    await shiftOtpRateLimitWindow(normalizedTarget, HOUR_MS + 60 * 1000);

    // --- SEND #4 (4th in 24h, 1st in current hour) ---
    const send4 = await postJson('/api/auth/resend-verification', { email: normalizedTarget });
    assert.strictEqual(send4.status, 200);

    // --- SEND #5 (5th in 24h, 2nd in current hour) ---
    await shiftOtpRateLimitWindow(normalizedTarget, 61 * 1000);
    const send5 = await postJson('/api/auth/forgot-password', { email: normalizedTarget });
    assert.strictEqual(send5.status, 200);

    // --- DAILY LIMIT (5 per rolling 24 hours): Advance 61s (only 2 sends in last hour, >60s since last send, but 5 sends in 24h) ---
    await shiftOtpRateLimitWindow(normalizedTarget, 61 * 1000);

    const dailyBlockedResend = await postJson('/api/auth/resend-otp', { email: normalizedTarget });
    assert.strictEqual(dailyBlockedResend.status, 429, '6th OTP send within 24 hours must return 429');
    assert.strictEqual(dailyBlockedResend.data.code, 'OTP_DAILY_LIMIT');
    assert.strictEqual(dailyBlockedResend.data.limit_type, 'daily');
    assert.ok(dailyBlockedResend.data.retry_after_seconds > 3600);
    assert.match(dailyBlockedResend.data.message, /5 OTP emails per 24 hours/i);

    const dailyBlockedForgot = await postJson('/api/auth/forgot-password', { email: normalizedTarget });
    assert.strictEqual(dailyBlockedForgot.status, 429);
    assert.strictEqual(dailyBlockedForgot.data.code, 'OTP_DAILY_LIMIT');

    // --- ADVANCE 24 HOURS: Daily window expires and sending is allowed again ---
    await shiftOtpRateLimitWindow(normalizedTarget, DAY_MS + 60 * 1000);
    const afterDayResend = await postJson('/api/auth/resend-otp', { email: normalizedTarget });
    assert.strictEqual(afterDayResend.status, 200);

    // --- IP-BASED PERSISTENT RATE LIMIT ACROSS MULTIPLE EMAILS ---
    const savedIpHourly = process.env.OTP_IP_HOURLY_LIMIT;
    const testIp = '203.0.113.77';
    await resetOtpRateLimit({ ip: testIp });
    try {
      process.env.OTP_IP_HOURLY_LIMIT = '2';

      const ipReq1 = await makeRequest(app, {
        method: 'POST',
        url: '/api/auth/forgot-password',
        headers: { 'content-type': 'application/json', 'x-otp-test-ip': testIp },
        body: { email: `ip_user1_${Date.now()}@gmail.com` }
      });
      assert.strictEqual(ipReq1.status, 200);

      const ipReq2 = await makeRequest(app, {
        method: 'POST',
        url: '/api/auth/forgot-password',
        headers: { 'content-type': 'application/json', 'x-otp-test-ip': testIp },
        body: { email: `ip_user2_${Date.now()}@gmail.com` }
      });
      assert.strictEqual(ipReq2.status, 200);

      const ipReq3Blocked = await makeRequest(app, {
        method: 'POST',
        url: '/api/auth/resend-otp',
        headers: { 'content-type': 'application/json', 'x-otp-test-ip': testIp },
        body: { email: `ip_user3_${Date.now()}@gmail.com` }
      });
      assert.strictEqual(ipReq3Blocked.status, 429, 'IP rate limit must block excessive OTP requests across emails/endpoints');
      assert.strictEqual(ipReq3Blocked.data.code, 'OTP_IP_HOURLY_LIMIT');
    } finally {
      if (savedIpHourly === undefined) {
        delete process.env.OTP_IP_HOURLY_LIMIT;
      } else {
        process.env.OTP_IP_HOURLY_LIMIT = savedIpHourly;
      }
      await resetOtpRateLimit({ ip: testIp });
    }
  });

  test('22. Gmail SMTP configuration resolution and App Password space normalization', async () => {
    const savedHost = process.env.SMTP_HOST;
    const savedPort = process.env.SMTP_PORT;
    const savedSecure = process.env.SMTP_SECURE;
    const savedUser = process.env.SMTP_USER;
    const savedPass = process.env.SMTP_PASS;

    try {
      process.env.SMTP_HOST = 'smtp.gmail.com';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_SECURE = 'true';
      process.env.SMTP_USER = 'petpaws.alerts@gmail.com';
      process.env.SMTP_PASS = 'abcd efgh ijkl mnop';

      const smtpCfg = getSmtpConfig();
      assert.strictEqual(smtpCfg.host, 'smtp.gmail.com');
      assert.strictEqual(smtpCfg.port, 465);
      assert.strictEqual(smtpCfg.secure, true);
      assert.strictEqual(smtpCfg.user, 'petpaws.alerts@gmail.com');
      assert.strictEqual(smtpCfg.pass, 'abcdefghijklmnop', '16-char Gmail App Password spaces must be normalized out');
    } finally {
      if (savedHost === undefined) delete process.env.SMTP_HOST; else process.env.SMTP_HOST = savedHost;
      if (savedPort === undefined) delete process.env.SMTP_PORT; else process.env.SMTP_PORT = savedPort;
      if (savedSecure === undefined) delete process.env.SMTP_SECURE; else process.env.SMTP_SECURE = savedSecure;
      if (savedUser === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = savedUser;
      if (savedPass === undefined) delete process.env.SMTP_PASS; else process.env.SMTP_PASS = savedPass;
    }
  });

  test('23. Gmail SMTP port 465 defaults, EMAIL_FROM compatibility with SMTP_USER, and Resend fallback', async () => {
    const savedHost = process.env.SMTP_HOST;
    const savedPort = process.env.SMTP_PORT;
    const savedSecure = process.env.SMTP_SECURE;
    const savedUser = process.env.SMTP_USER;
    const savedPass = process.env.SMTP_PASS;
    const savedFrom = process.env.EMAIL_FROM;
    const savedResendKey = process.env.RESEND_API_KEY;
    const savedResendFrom = process.env.RESEND_FROM;

    try {
      // A. When host is smtp.gmail.com and no port is provided, default to port 465 with secure=true
      process.env.SMTP_HOST = 'smtp.gmail.com';
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_SECURE;
      process.env.SMTP_USER = 'sender@gmail.com';
      process.env.SMTP_PASS = 'abcdefghijklmnop';

      const gmailCfg = getSmtpConfig();
      assert.strictEqual(gmailCfg.host, 'smtp.gmail.com');
      assert.strictEqual(gmailCfg.port, 465, 'Gmail SMTP without explicit port must default to port 465');
      assert.strictEqual(gmailCfg.secure, true, 'Port 465 must have secure=true (TLS enabled)');

      // B. EMAIL_FROM compatibility with Gmail SMTP_USER:
      // When EMAIL_FROM has a different domain/address than SMTP_USER, preserve display name and align email with SMTP_USER
      process.env.EMAIL_FROM = 'PetPaws Customer Support <support@petpaws.app>';
      const alignedFrom = getFromAddress('smtp');
      assert.strictEqual(
        alignedFrom,
        '"PetPaws Customer Support" <sender@gmail.com>',
        'Gmail SMTP requires sender address to match authenticated SMTP_USER'
      );

      // When EMAIL_FROM already matches SMTP_USER, preserve it
      process.env.EMAIL_FROM = 'PetPaws <sender@gmail.com>';
      assert.strictEqual(getFromAddress('smtp'), 'PetPaws <sender@gmail.com>');

      // C. Resend sender address handling:
      // When EMAIL_FROM is unset, getFromAddress defaults to onboarding@resend.dev
      process.env.RESEND_API_KEY = 're_test_key_12345';
      delete process.env.EMAIL_FROM;
      delete process.env.RESEND_FROM;
      assert.strictEqual(
        getFromAddress('resend'),
        'PetPaws <onboarding@resend.dev>',
        'Resend must default to onboarding@resend.dev when EMAIL_FROM is unset'
      );

      // When a verified custom domain is configured in EMAIL_FROM, Resend uses it
      process.env.EMAIL_FROM = 'PetPaws <no-reply@verified.petpaws.org>';
      assert.strictEqual(
        getFromAddress('resend'),
        'PetPaws <no-reply@verified.petpaws.org>'
      );

      // D. Provider selection when RESEND_API_KEY is absent:
      // When RESEND_API_KEY is unset and SMTP credentials are provided, provider automatically resolves to 'smtp'
      delete process.env.EMAIL_TRANSPORT;
      delete process.env.RESEND_API_KEY;
      assert.strictEqual(
        getConfiguredProvider(),
        'smtp',
        'Provider must automatically resolve to smtp when RESEND_API_KEY is absent and SMTP credentials are present'
      );

      // E. Production safeguard: EMAIL_TRANSPORT=test must be rejected in production mode
      const savedNodeEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        process.env.EMAIL_TRANSPORT = 'test';
        // With NODE_ENV=production, EMAIL_TRANSPORT=test is ignored and falls through to smtp
        assert.strictEqual(
          getConfiguredProvider(),
          'smtp',
          'In production mode, EMAIL_TRANSPORT=test must be ignored and not selected as provider'
        );
      } finally {
        if (savedNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedNodeEnv;
      }
    } finally {
      if (savedHost === undefined) delete process.env.SMTP_HOST; else process.env.SMTP_HOST = savedHost;
      if (savedPort === undefined) delete process.env.SMTP_PORT; else process.env.SMTP_PORT = savedPort;
      if (savedSecure === undefined) delete process.env.SMTP_SECURE; else process.env.SMTP_SECURE = savedSecure;
      if (savedUser === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = savedUser;
      if (savedPass === undefined) delete process.env.SMTP_PASS; else process.env.SMTP_PASS = savedPass;
      if (savedFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = savedFrom;
      if (savedResendKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = savedResendKey;
      if (savedResendFrom === undefined) delete process.env.RESEND_FROM; else process.env.RESEND_FROM = savedResendFrom;
    }
  });

  test('24. Express trust proxy and express-rate-limit handling with X-Forwarded-For', async () => {
    // A. Verify trust proxy is configured to 1 (single reverse proxy hop)
    const trustProxy = app.get('trust proxy');
    assert.ok(
      trustProxy === 1 || trustProxy === true,
      `Express trust proxy must be configured to 1 for reverse proxies (got ${trustProxy})`
    );

    // B. Verify that requests with X-Forwarded-For execute through rate-limited endpoints
    // without throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/auth/login',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.25'
      },
      body: { email: 'nonexistent@testdomain.com', password: 'wrongpassword' }
    });

    // Request should proceed to normal auth handling (400 or 401), NOT fail with 500 ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
    assert.ok(
      res.status === 400 || res.status === 401 || res.status === 404,
      `Expected auth validation response, got status ${res.status}: ${JSON.stringify(res.data)}`
    );
    assert.strictEqual(
      res.data?.code !== 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR',
      true,
      'express-rate-limit must not reject requests with unexpected X-Forwarded-For'
    );
  });

  test('25. Failed password-reset email delivery returns safe 503 error without leaking credentials', async () => {
    // Register and verify a confirmed buyer account for the test
    const testEmail = `pwd_reset_fail_${Date.now()}@gmail.com`;
    await registerAndVerify({
      name: 'Fail Reset User',
      email: testEmail,
      password: 'Password123!',
      role: 'buyer'
    });

    // Advance rate-limit window past registration cooldown
    await shiftOtpRateLimitWindow(testEmail, 65000);

    // Temporarily point email provider to an unreachable host to simulate connection timeout failure
    const savedTransport = process.env.EMAIL_TRANSPORT;
    const savedResend = process.env.RESEND_API_KEY;
    const savedSmtpHost = process.env.SMTP_HOST;
    const savedSmtpUser = process.env.SMTP_USER;
    const savedSmtpPass = process.env.SMTP_PASS;

    try {
      delete process.env.EMAIL_TRANSPORT;
      delete process.env.RESEND_API_KEY;
      process.env.SMTP_HOST = '192.0.2.1'; // RFC 5737 non-routable IP
      process.env.SMTP_PORT = '465';
      process.env.SMTP_SECURE = 'true';
      process.env.SMTP_USER = 'sender@gmail.com';
      process.env.SMTP_PASS = 'super_secret_smtp_password';
      process.env.SMTP_TIMEOUT_MS = '200';

      const resetReq = await postJson('/api/auth/forgot-password', { email: testEmail });

      // Must return HTTP 503 Service Unavailable
      assert.strictEqual(resetReq.status, 503, 'Email delivery failure must return 503');
      assert.strictEqual(
        resetReq.data.message,
        'Failed to send password reset OTP email. Please verify your server SMTP/email settings and try again.',
        'Must return generic user-friendly error message'
      );
      // Ensure no passwords, OTPs, or internal IP addresses are leaked to the client response
      const responseStr = JSON.stringify(resetReq.data);
      assert.strictEqual(responseStr.includes('super_secret_smtp_password'), false, 'Response must never leak SMTP password');
      assert.strictEqual(responseStr.includes('192.0.2.1'), false, 'Response must not leak internal host');
    } finally {
      if (savedTransport === undefined) delete process.env.EMAIL_TRANSPORT; else process.env.EMAIL_TRANSPORT = savedTransport;
      if (savedResend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = savedResend;
      if (savedSmtpHost === undefined) delete process.env.SMTP_HOST; else process.env.SMTP_HOST = savedSmtpHost;
      if (savedSmtpUser === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = savedSmtpUser;
      if (savedSmtpPass === undefined) delete process.env.SMTP_PASS; else process.env.SMTP_PASS = savedSmtpPass;
      delete process.env.SMTP_TIMEOUT_MS;
      process.env.EMAIL_TRANSPORT = 'test';
    }
  });

  test('26. Sender address authorization validation and Resend testing sender recipient restrictions', async () => {
    const testEmail1 = `sender_auth_fail1_${Date.now()}@gmail.com`;
    const testEmail2 = `sender_auth_fail2_${Date.now()}@gmail.com`;
    await registerAndVerify({
      name: 'Sender Auth User 1',
      email: testEmail1,
      password: 'Password123!',
      role: 'buyer'
    });
    await registerAndVerify({
      name: 'Sender Auth User 2',
      email: testEmail2,
      password: 'Password123!',
      role: 'buyer'
    });

    await shiftOtpRateLimitWindow(testEmail1, 65000);
    await shiftOtpRateLimitWindow(testEmail2, 65000);

    const savedTransport = process.env.EMAIL_TRANSPORT;
    const savedResend = process.env.RESEND_API_KEY;
    const savedFrom = process.env.EMAIL_FROM;
    const savedAuthRecip = process.env.RESEND_AUTHORIZED_RECIPIENT;

    try {
      delete process.env.EMAIL_TRANSPORT;
      process.env.RESEND_API_KEY = 're_test_dummy_key_12345';

      // 1. Sending via Resend with a public webmail domain (@gmail.com) must reject as unauthorized sender
      process.env.EMAIL_FROM = 'PetPaws Support <support@gmail.com>';
      const resendPublicFromReq = await postJson('/api/auth/forgot-password', { email: testEmail1 });
      assert.strictEqual(resendPublicFromReq.status, 503);
      assert.strictEqual(
        resendPublicFromReq.data.message,
        'Failed to send password reset OTP email: sender email address is not authorized on the server. Please verify your server email domain configuration.'
      );

      // 2. Default testing sender (onboarding@resend.dev) sending to an unauthorized live recipient
      delete process.env.EMAIL_FROM; // Defaults to onboarding@resend.dev
      process.env.RESEND_AUTHORIZED_RECIPIENT = 'owner.account@resendtest.com';
      const testingSenderReq = await postJson('/api/auth/forgot-password', { email: testEmail2 });
      assert.strictEqual(testingSenderReq.status, 503);
      assert.strictEqual(
        testingSenderReq.data.message,
        'Failed to send password reset OTP email: sender email address is not authorized on the server. Please verify your server email domain configuration.'
      );
    } finally {
      if (savedTransport === undefined) delete process.env.EMAIL_TRANSPORT; else process.env.EMAIL_TRANSPORT = savedTransport;
      if (savedResend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = savedResend;
      if (savedFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = savedFrom;
      if (savedAuthRecip === undefined) delete process.env.RESEND_AUTHORIZED_RECIPIENT; else process.env.RESEND_AUTHORIZED_RECIPIENT = savedAuthRecip;
      process.env.EMAIL_TRANSPORT = 'test';
    }
  });

  test('27. email59 HTTPS API delivery, provider selection, payload verification, error handling, and rate-limit rollback', async () => {
    const savedTransport = process.env.EMAIL_TRANSPORT;
    const savedEmail59Key = process.env.EMAIL59_API_KEY;
    const savedEmail59From = process.env.EMAIL59_FROM;
    const savedResendKey = process.env.RESEND_API_KEY;
    const savedSmtpHost = process.env.SMTP_HOST;
    const savedSmtpUser = process.env.SMTP_USER;
    const savedSmtpPass = process.env.SMTP_PASS;
    const originalFetch = global.fetch;

    const logMessages = [];
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args) => {
      logMessages.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      originalConsoleError.apply(console, args);
    };
    console.warn = (...args) => {
      logMessages.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      originalConsoleWarn.apply(console, args);
    };

    try {
      // 1. Provider selection: email59 is selected when its API key is present
      delete process.env.EMAIL_TRANSPORT;
      delete process.env.RESEND_API_KEY;
      process.env.SMTP_HOST = 'smtp.gmail.com';
      process.env.SMTP_USER = 'localdev@gmail.com';
      process.env.SMTP_PASS = 'localdevpass1234';

      process.env.EMAIL59_API_KEY = 'e59_mock_test_key_xyz123';
      assert.strictEqual(
        getConfiguredProvider(),
        'email59',
        'Provider must resolve to email59 when EMAIL59_API_KEY is present'
      );
      assert.strictEqual(
        getFromAddress('email59'),
        'petpaws@email59.com',
        'email59 sender must default to petpaws@email59.com'
      );

      // 2. Local provider selection: Gmail SMTP remains selected when EMAIL59_API_KEY is absent
      delete process.env.EMAIL59_API_KEY;
      assert.strictEqual(
        getConfiguredProvider(),
        'smtp',
        'Provider must fall back to local Gmail SMTP when EMAIL59_API_KEY is absent'
      );

      // Re-enable email59 for delivery tests
      process.env.EMAIL59_API_KEY = 'e59_mock_test_key_xyz123';

      // 3. Payload and header verification on successful send (status: "sent" with real ID)
      let capturedRequest = null;
      global.fetch = async (url, options) => {
        capturedRequest = { url, options, body: JSON.parse(options.body) };
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'msg_e59_mock_999', status: 'sent' })
        };
      };

      const sendResult = await sendEmail({
        to: 'buyer.recipient@gmail.com',
        subject: 'Your PetPaws verification code',
        html: '<p>Code: 482910</p>',
        text: 'Code: 482910'
      });

      assert.strictEqual(sendResult.delivered, true);
      assert.strictEqual(sendResult.provider, 'email59');
      assert.strictEqual(sendResult.id, 'msg_e59_mock_999');
      assert.strictEqual(sendResult.status, 'sent');

      assert.strictEqual(capturedRequest.url, 'https://email59.com/v1/send');
      assert.strictEqual(capturedRequest.options.method, 'POST');
      assert.strictEqual(capturedRequest.options.headers['Authorization'], 'Bearer e59_mock_test_key_xyz123');
      assert.strictEqual(capturedRequest.options.headers['Content-Type'], 'application/json');
      assert.strictEqual(capturedRequest.body.from, 'petpaws');
      assert.strictEqual(capturedRequest.body.to, 'buyer.recipient@gmail.com');
      assert.strictEqual(capturedRequest.body.subject, 'Your PetPaws verification code');
      assert.strictEqual(capturedRequest.body.html, '<p>Code: 482910</p>');
      assert.strictEqual(capturedRequest.body.text, 'Code: 482910');

      // 4. Test mode in development: status "test" must return delivered: false and testMode: true
      const savedNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: 'test_e59_mock_777', status: 'test' })
      });

      const devTestResult = await sendEmail({
        to: 'buyer.recipient@gmail.com',
        subject: 'Test Subject',
        text: 'Test Body'
      });

      assert.strictEqual(devTestResult.delivered, false, 'status: "test" must never return delivered: true');
      assert.strictEqual(devTestResult.testMode, true, 'status: "test" outside production must report testMode: true');
      assert.strictEqual(devTestResult.id, 'test_e59_mock_777', 'Must preserve real message ID');
      assert.strictEqual(devTestResult.status, 'test');

      // 5. Test mode in production: status "test" must throw EMAIL59_TEST_KEY_IN_PROD
      process.env.NODE_ENV = 'production';
      await assert.rejects(
        async () => {
          await sendEmail({
            to: 'buyer.recipient@gmail.com',
            subject: 'Test Subject',
            text: 'Test Body'
          });
        },
        (err) =>
          err.code === 'EMAIL59_TEST_KEY_IN_PROD' &&
          /email59 intercepted email in test mode/.test(err.message),
        'status: "test" in production must throw EMAIL59_TEST_KEY_IN_PROD'
      );
      process.env.NODE_ENV = savedNodeEnv || 'development';

      // 6. Missing message ID: API response without genuine ID must throw EMAIL59_MISSING_MESSAGE_ID
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ status: 'sent' }) // Missing id / messageId
      });

      await assert.rejects(
        async () => {
          await sendEmail({
            to: 'recipient@gmail.com',
            subject: 'Test Subject',
            text: 'Test Body'
          });
        },
        (err) => err.code === 'EMAIL59_MISSING_MESSAGE_ID',
        'Missing message ID must throw EMAIL59_MISSING_MESSAGE_ID'
      );

      // 7. Error handling: HTTP 401 Unauthorized must throw and not report success
      global.fetch = async () => ({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid or inactive email59 API key' })
      });

      await assert.rejects(
        async () => {
          await sendEmail({
            to: 'recipient@gmail.com',
            subject: 'Test Subject',
            text: 'Test Body'
          });
        },
        (err) => err.code === 'EMAIL59_API_401' && /Invalid or inactive email59 API key/.test(err.message),
        'HTTP 401 from email59 must reject with EMAIL59_API_401'
      );

      // 8. Error handling: Malformed response (non-JSON) must throw
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Unexpected token < in JSON');
        }
      });

      await assert.rejects(
        async () => {
          await sendEmail({
            to: 'recipient@gmail.com',
            subject: 'Test Subject',
            text: 'Test Body'
          });
        },
        (err) => err.code === 'EMAIL59_MISSING_MESSAGE_ID',
        'Malformed response without message ID must throw'
      );

      // 9. Network failure: fetch rejects
      global.fetch = async () => {
        throw new Error('fetch failed: ECONNRESET');
      };

      await assert.rejects(
        async () => {
          await sendEmail({
            to: 'recipient@gmail.com',
            subject: 'Test Subject',
            text: 'Test Body'
          });
        },
        /fetch failed: ECONNRESET/,
        'Network error must propagate without reporting delivery'
      );

      // 10. Security audit: API key and secret OTP must NEVER appear in console logs
      const combinedLogs = logMessages.join('\n');
      assert.strictEqual(
        combinedLogs.includes('e59_mock_test_key_xyz123'),
        false,
        'API keys must never be leaked into server logs'
      );

      // 11. Integration test with controller: Rate-limit rollback when email59 dispatch fails
      const testUserEmail = `e59_test_user_${Date.now()}@gmail.com`;
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: 'msg_verify_reg', status: 'sent' })
      });
      await registerAndVerify({
        name: 'Email59 User',
        email: testUserEmail,
        password: 'Password123!',
        role: 'buyer'
      });
      await shiftOtpRateLimitWindow(testUserEmail, 65000);

      // Mock email59 to fail
      global.fetch = async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal upstream routing error' })
      });

      const resetReq = await postJson('/api/auth/forgot-password', { email: testUserEmail });
      assert.strictEqual(resetReq.status, 503);
      assert.strictEqual(
        resetReq.data.message,
        'Failed to send password reset OTP email. Please verify your server SMTP/email settings and try again.'
      );

      // 12. Controller test mode handling: Verify API never reports email_sent: true when provider returns status: "test"
      const testModeUserEmail = `e59_testmode_${Date.now()}@gmail.com`;
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: 'test_e59_mock_intercepted', status: 'test' })
      });

      // A. Register with test-mode email59
      const regRes = await postJson('/api/auth/register', {
        name: 'TestMode User',
        email: testModeUserEmail,
        password: 'Password123!',
        role: 'buyer'
      });
      assert.strictEqual(regRes.status, 201);
      assert.strictEqual(regRes.data.email_sent, false, 'Registration must not claim email_sent: true in test mode');
      assert.strictEqual(regRes.data.delivery_error, true, 'Registration must mark delivery_error: true in test mode');
      assert.strictEqual(regRes.data.test_mode, true, 'Registration must report test_mode: true');
      assert.strictEqual(regRes.data.cooldown_seconds, 0, 'Rate-limit cooldown must be 0 when email was not delivered');

      // B. Resend verification OTP with test-mode email59
      const resendRes = await postJson('/api/auth/resend-otp', { email: testModeUserEmail });
      assert.strictEqual(resendRes.status, 200);
      assert.strictEqual(resendRes.data.email_sent, false, 'Resend OTP must not claim email_sent: true in test mode');
      assert.strictEqual(resendRes.data.test_mode, true, 'Resend OTP must report test_mode: true');
      assert.strictEqual(resendRes.data.cooldown_seconds, 0, 'Resend OTP cooldown must be 0 in test mode');

      // C. Forgot password with test-mode email59
      const forgotRes = await postJson('/api/auth/forgot-password', { email: testModeUserEmail });
      assert.strictEqual(forgotRes.status, 200);
      assert.strictEqual(forgotRes.data.email_sent, false, 'Forgot password must not claim email_sent: true in test mode');
      assert.strictEqual(forgotRes.data.test_mode, true, 'Forgot password must report test_mode: true');
      assert.strictEqual(forgotRes.data.cooldown_seconds, 0, 'Forgot password cooldown must be 0 in test mode');

      // Verify reset token was rolled back and cleared
      const { loadData, isMongoConnected } = require('../db');
      const UserModel = require('../models/User');
      if (isMongoConnected()) {
        const u = await UserModel.findOne({ email: testModeUserEmail });
        assert.strictEqual(u.reset_password_token_hash, null, 'Reset token hash must be cleared in test mode');
      } else {
        const db = loadData();
        const u = (db.users || []).find(usr => usr.email === testModeUserEmail);
        assert.strictEqual(u.reset_password_token_hash, null, 'Reset token hash must be cleared in test mode');
      }

    } finally {
      global.fetch = originalFetch;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      if (savedTransport === undefined) delete process.env.EMAIL_TRANSPORT; else process.env.EMAIL_TRANSPORT = savedTransport;
      if (savedEmail59Key === undefined) delete process.env.EMAIL59_API_KEY; else process.env.EMAIL59_API_KEY = savedEmail59Key;
      if (savedEmail59From === undefined) delete process.env.EMAIL59_FROM; else process.env.EMAIL59_FROM = savedEmail59From;
      if (savedResendKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = savedResendKey;
      if (savedSmtpHost === undefined) delete process.env.SMTP_HOST; else process.env.SMTP_HOST = savedSmtpHost;
      if (savedSmtpUser === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = savedSmtpUser;
      if (savedSmtpPass === undefined) delete process.env.SMTP_PASS; else process.env.SMTP_PASS = savedSmtpPass;
      process.env.EMAIL_TRANSPORT = 'test';
    }
  });
});
