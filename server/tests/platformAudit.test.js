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
const http = require('http');
const { Duplex } = require('stream');
const assert = require('assert');
const { test, describe, before } = require('node:test');
const { app } = require('../server');
const connectDB = require('../config/db');
const { computePaymentSignature } = require('../utils/paymentGateway');

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

describe('PetPaws Platform Audit & Feature Verification', async () => {
  before(async () => {
    await connectDB();

    const timestamp = Date.now();

    // 1. Register test customer
    const custRes = await postJson('/api/auth/register', {
      name: `Test Customer ${timestamp}`,
      email: `customer_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'buyer',
      phone: '+91 9876543210',
      address: '123 Pet Lane, Mumbai'
    });
    assert.strictEqual(custRes.status, 201, 'Customer registration failed');
    customerToken = custRes.data.token;
    customerUser = custRes.data.user;

    // 2. Register test seller
    const sellRes = await postJson('/api/auth/register', {
      name: `Test Seller ${timestamp}`,
      email: `seller_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'seller',
      phone: '+91 9123456780',
      address: '456 Vendor Hub, Pune'
    });
    assert.strictEqual(sellRes.status, 201, 'Seller registration failed');
    sellerToken = sellRes.data.token;
    sellerUser = sellRes.data.user;

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
    const anotherCust = await postJson('/api/auth/register', {
      name: 'Another Customer',
      email: `another_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'buyer'
    });

    const res = await getJson('/api/product-orders/my-orders', anotherCust.data.token);
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

  test('11. Password reset flow: token generation, hashing, generic response, and single-use consumption', async () => {
    const forgotRes = await postJson('/api/auth/forgot-password', {
      email: customerUser.email
    });
    assert.strictEqual(forgotRes.status, 200);
    assert.ok(forgotRes.data.dev_reset_token, 'In dev mode with no SMTP configured, dev token helper must be present');

    const resetToken = forgotRes.data.dev_reset_token;

    const resetRes = await postJson('/api/auth/reset-password', {
      token: resetToken,
      password: 'NewStrongPassword123!'
    });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data.success, true);

    const replayRes = await postJson('/api/auth/reset-password', {
      token: resetToken,
      password: 'AnotherPassword123!'
    });
    assert.strictEqual(replayRes.status, 400, 'Reusing an expired or consumed token must fail');

    const loginRes = await postJson('/api/auth/login', {
      email: customerUser.email,
      password: 'NewStrongPassword123!'
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.data.token);
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
    // Register Seller B
    const sellerB = await postJson('/api/auth/register', {
      name: `Competitor Seller ${Date.now()}`,
      email: `competitor_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'seller'
    });

    // Seller B attempts to update Seller A's product
    const tamperRes = await putJson(`/api/products/${testProduct.id}`, {
      title: 'Hacked Product Title',
      price: 1
    }, sellerB.data.token);

    assert.strictEqual(tamperRes.status, 403, 'Sellers must not be able to edit another seller product');
  });
});
