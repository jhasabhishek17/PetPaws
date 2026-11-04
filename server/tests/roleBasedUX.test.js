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
const http = require('http');
const { Duplex } = require('stream');
const assert = require('assert');
const { test, describe, before } = require('node:test');
const { app } = require('../server');

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
  let buyerToken;
  let sellerToken;
  let vetToken;
  let groomerToken;
  let shopkeeperToken;
  let testProductId;

  before(async () => {
    const ts = Date.now();

    // 1. Register Buyer
    const buyerRes = await makeRequest(app, {
      method: 'POST',
      url: '/api/auth/register',
      body: {
        name: `Test Buyer ${ts}`,
        email: `buyer_${ts}@test.com`,
        password: 'Password123!',
        role: 'buyer'
      }
    });
    assert.strictEqual(buyerRes.statusCode, 201);
    buyerToken = buyerRes.body.token;

    // 2. Register Seller
    const sellerRes = await makeRequest(app, {
      method: 'POST',
      url: '/api/auth/register',
      body: {
        name: `Test Seller ${ts}`,
        email: `seller_${ts}@test.com`,
        password: 'Password123!',
        role: 'seller',
        business_name: `Breeder ${ts}`
      }
    });
    assert.strictEqual(sellerRes.statusCode, 201);
    sellerToken = sellerRes.body.token;

    // 3. Register Vet
    const vetRes = await makeRequest(app, {
      method: 'POST',
      url: '/api/auth/register',
      body: {
        name: `Dr. Vet ${ts}`,
        email: `vet_${ts}@test.com`,
        password: 'Password123!',
        role: 'vet',
        business_name: `Clinic ${ts}`
      }
    });
    assert.strictEqual(vetRes.statusCode, 201);
    vetToken = vetRes.body.token;

    // 4. Register Groomer
    const groomerRes = await makeRequest(app, {
      method: 'POST',
      url: '/api/auth/register',
      body: {
        name: `Groomer ${ts}`,
        email: `groomer_${ts}@test.com`,
        password: 'Password123!',
        role: 'groomer',
        business_name: `Spa ${ts}`
      }
    });
    assert.strictEqual(groomerRes.statusCode, 201);
    groomerToken = groomerRes.body.token;

    // 5. Register Shopkeeper
    const shopRes = await makeRequest(app, {
      method: 'POST',
      url: '/api/auth/register',
      body: {
        name: `Shopkeeper ${ts}`,
        email: `shop_${ts}@test.com`,
        password: 'Password123!',
        role: 'shopkeeper',
        business_name: `Shop ${ts}`
      }
    });
    assert.strictEqual(shopRes.statusCode, 201);
    shopkeeperToken = shopRes.body.token;

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
});
