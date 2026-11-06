/**
 * PetPaws Role-Based Permissions & Checkout Enforcement Test Suite
 *
 * Verifies that the backend strictly enforces role boundaries:
 * - Providers (seller, shopkeeper, vet, groomer) CANNOT place product orders or pet adoption orders
 * - Customer / Buyer accounts CAN place product orders and pet adoption orders
 * - Providers cannot book veterinary or grooming appointments as customers
 * - Unauthenticated guest requests to checkout endpoints are rejected with 401
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.env.EMAIL_TRANSPORT = 'test';
const http = require('http');
const { Duplex } = require('stream');
const assert = require('assert');
const { test, describe, before, after } = require('node:test');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');
const { app } = require('../server');
const { getLastEmailTo } = require('../utils/emailService');
const { setDnsResolverForTesting, clearDnsCache } = require('../utils/emailValidator');

const testDnsResolver = {
  resolveMx: async (domain) => {
    const d = String(domain || '').toLowerCase().trim();
    if (d === 'test.com' || d === 'petpaws.com' || d === 'gmail.com') {
      return [{ exchange: `mail.${d}`, priority: 10 }];
    }
    const nxErr = new Error(`queryMx ENOTFOUND ${d}`);
    nxErr.code = 'ENOTFOUND';
    throw nxErr;
  },
  resolve4: async (domain) => {
    const d = String(domain || '').toLowerCase().trim();
    if (d === 'test.com' || d === 'petpaws.com' || d === 'gmail.com') {
      return ['127.0.0.1'];
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
};

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

    if (body) {
      const jsonStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = Buffer.byteLength(jsonStr);
    }

    let resBody = '';
    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    res.write = function (chunk, encoding) {
      if (chunk) {
        resBody += Buffer.isBuffer(chunk) ? chunk.toString(encoding || 'utf8') : chunk;
      }
      return true;
    };

    res.end = function (chunk, encoding) {
      if (chunk) {
        resBody += Buffer.isBuffer(chunk) ? chunk.toString(encoding || 'utf8') : chunk;
      }
      let parsed = null;
      try {
        parsed = JSON.parse(resBody);
      } catch (e) {
        parsed = resBody;
      }
      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        body: parsed
      });
    };

    app(req, res);

    if (body) {
      req.emit('data', typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.emit('end');
  });
}

describe('PetPaws Role-Based Permissions & Checkout Policy Enforcement', () => {
  const createdUserEmails = new Set();
  const createdProductIds = new Set();
  const createdOrderIds = new Set();
  let buyerToken;
  let sellerToken;
  let vetToken;
  let groomerToken;
  let shopkeeperToken;
  let testProductId;
  let lastLoginUser;
  let sellerUser;

  async function registerAndVerifyUser(payload) {
    if (payload && payload.email) {
      createdUserEmails.add(payload.email);
    }
    const regRes = await makeRequest(app, {
      method: 'POST',
      url: '/api/auth/register',
      body: payload
    });
    assert.strictEqual(regRes.statusCode, 201);
    assert.strictEqual(regRes.body.requires_verification, true);

    const emailRecord = getLastEmailTo(payload.email, 'verify-email');
    assert.ok(emailRecord && emailRecord.token, `Verification email must be captured for ${payload.email}`);

    const verifyRes = await makeRequest(app, {
      method: 'POST',
      url: '/api/auth/verify-email',
      body: { token: emailRecord.token }
    });
    assert.strictEqual(verifyRes.statusCode, 200);

    const loginRes = await makeRequest(app, {
      method: 'POST',
      url: '/api/auth/login',
      body: { email: payload.email, password: payload.password }
    });
    assert.strictEqual(loginRes.statusCode, 200);
    assert.ok(loginRes.body.token);
    lastLoginUser = loginRes.body.user;
    return loginRes.body.token;
  }

  before(async () => {
    setDnsResolverForTesting(testDnsResolver);
    const ts = Date.now();

    // 1. Register & Verify Buyer
    buyerToken = await registerAndVerifyUser({
      name: `Test Buyer ${ts}`,
      email: `buyer_${ts}@test.com`,
      password: 'Password123!',
      role: 'buyer'
    });

    // 2. Register & Verify Seller
    sellerToken = await registerAndVerifyUser({
      name: `Test Seller ${ts}`,
      email: `seller_${ts}@test.com`,
      password: 'Password123!',
      role: 'seller',
      business_name: `Breeder ${ts}`
    });
    sellerUser = lastLoginUser;

    // 3. Register & Verify Vet
    vetToken = await registerAndVerifyUser({
      name: `Dr. Vet ${ts}`,
      email: `vet_${ts}@test.com`,
      password: 'Password123!',
      role: 'vet',
      business_name: `Clinic ${ts}`
    });

    // 4. Register & Verify Groomer
    groomerToken = await registerAndVerifyUser({
      name: `Groomer ${ts}`,
      email: `groomer_${ts}@test.com`,
      password: 'Password123!',
      role: 'groomer',
      business_name: `Spa ${ts}`
    });

    // 5. Register & Verify Shopkeeper
    shopkeeperToken = await registerAndVerifyUser({
      name: `Shopkeeper ${ts}`,
      email: `shop_${ts}@test.com`,
      password: 'Password123!',
      role: 'shopkeeper',
      business_name: `Shop ${ts}`
    });

    // Create a product by the shopkeeper
    const prodRes = await makeRequest(app, {
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${shopkeeperToken}` },
      body: {
        title: `Premium Organic Kibble ${ts}`,
        category: 'Food & Nutrition',
        price: 999,
        stock: 25,
        description: 'Nutritious natural kibble for dogs'
      }
    });
    assert.strictEqual(prodRes.statusCode, 201);
    testProductId = prodRes.body.product.id;
    if (testProductId) createdProductIds.add(testProductId);
  });

  test('1. Guest / unauthenticated user cannot initiate product checkout (401)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/product-orders/initiate',
      body: {
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    });
    assert.strictEqual(res.statusCode, 401);
  });

  test('2. Seller account cannot initiate product checkout (403)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/product-orders/initiate',
      headers: { authorization: `Bearer ${sellerToken}` },
      body: {
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /customer accounts can place product orders/i);
  });

  test('3. Shopkeeper account cannot initiate product checkout (403)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/product-orders/initiate',
      headers: { authorization: `Bearer ${shopkeeperToken}` },
      body: {
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /customer accounts can place product orders/i);
  });

  test('4. Veterinarian account cannot initiate product checkout (403)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/product-orders/initiate',
      headers: { authorization: `Bearer ${vetToken}` },
      body: {
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /customer accounts can place product orders/i);
  });

  test('5. Grooming provider cannot initiate product checkout (403)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/product-orders/initiate',
      headers: { authorization: `Bearer ${groomerToken}` },
      body: {
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /customer accounts can place product orders/i);
  });

  test('6. Buyer account can initiate product checkout successfully (200)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/product-orders/initiate',
      headers: { authorization: `Bearer ${buyerToken}` },
      body: {
        items: [{ product_id: testProductId, quantity: 2 }]
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.summary.subtotal, 999 * 2);
  });

  test('7. Provider accounts cannot book vet appointments as customers (403)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/vets/appointments',
      headers: { authorization: `Bearer ${sellerToken}` },
      body: {
        vet_id: 'vet-101',
        appointment_date: '2026-12-01',
        time_slot: '10:00 AM',
        pet_name: 'Buddy'
      }
    });
    assert.strictEqual(res.statusCode, 403);
  });

  test('8. Buyer account can complete product order with COD (201)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/product-orders/checkout',
      headers: { authorization: `Bearer ${buyerToken}` },
      body: {
        items: [{ product_id: testProductId, quantity: 1, title: 'Kibble' }],
        buyer_name: 'Alex Morgan',
        buyer_phone: '+91 98201 11223',
        shipping_address: '42 Marine Drive, Mumbai, MH',
        payment_method: 'COD',
        idempotency_key: `idem_test_${Date.now()}`
      }
    });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    if (res.body.order?.id) createdOrderIds.add(res.body.order.id);
    assert.strictEqual(res.body.order.payment_method, 'COD');
    assert.strictEqual(res.body.order.payment_status, 'Pending');
  });

  test('9. Seller cannot place pet adoption order (403)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/orders/checkout',
      headers: { authorization: `Bearer ${sellerToken}` },
      body: {
        pet_id: 'pet-101',
        buyer_phone: '+91 98765 43210',
        shipping_address: '123 Breeder Lane',
        payment_method: 'COD'
      }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /Only buyer accounts can place pet orders/i);
  });

  test('10. Authentication security: JWT for nonexistent user ID is rejected with 401', async () => {
    const forgedToken = jwt.sign(
      { id: 'nonexistent-user-id-99999', email: 'ghost@petpaws.com', role: 'admin' },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
    const res = await makeRequest(app, {
      method: 'GET',
      url: '/api/product-orders/my-orders',
      headers: { authorization: `Bearer ${forgedToken}` }
    });
    assert.strictEqual(res.statusCode, 401);
  });

  test('11. Role claim tampering: database user role is authoritative and cannot be overridden by JWT claims', async () => {
    assert.ok(sellerUser && sellerUser.id, 'Seller user must be initialized');
    const tamperedToken = jwt.sign(
      { id: sellerUser.id, email: sellerUser.email, role: 'admin', tv: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
    // Attempting to place an order as seller (even with a JWT claiming role: 'admin') is checked against DB role
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/product-orders/initiate',
      headers: { authorization: `Bearer ${tamperedToken}` },
      body: {
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    });
    // In database, user is a seller, so provider restriction (403) must strictly be enforced
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /customer accounts can place product orders/i);
  });

  after(async () => {
    setDnsResolverForTesting(null);
    clearDnsCache();

    try {
      const { loadData, saveData, isMongoConnected } = require('../db');
      const User = require('../models/User');
      const Product = require('../models/Product');
      const ProductOrder = require('../models/ProductOrder');

      const userEmails = Array.from(createdUserEmails);
      const productIds = Array.from(createdProductIds);
      const orderIds = Array.from(createdOrderIds);

      if (isMongoConnected()) {
        if (userEmails.length > 0) {
          await User.deleteMany({ email: { $in: userEmails } });
        }
        if (productIds.length > 0) {
          await Product.deleteMany({ $or: [{ custom_id: { $in: productIds } }, { id: { $in: productIds } }] });
        }
        if (orderIds.length > 0) {
          await ProductOrder.deleteMany({ $or: [{ custom_id: { $in: orderIds } }, { id: { $in: orderIds } }] });
        }
      } else {
        const db = loadData();
        if (Array.isArray(db.users) && userEmails.length > 0) {
          db.users = db.users.filter(u => !userEmails.includes(u.email));
        }
        if (Array.isArray(db.products) && productIds.length > 0) {
          db.products = db.products.filter(p => !productIds.includes(p.custom_id) && !productIds.includes(p.id));
        }
        if (Array.isArray(db.product_orders) && orderIds.length > 0) {
          db.product_orders = db.product_orders.filter(o => !orderIds.includes(o.custom_id) && !orderIds.includes(o.id));
        }
        saveData(db);
      }
    } catch {
      // Soft cleanup
    }
  });
});
