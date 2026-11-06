/**
 * PetPaws Comprehensive Offers & Discounts Verification Test Suite
 *
 * Verifies offers and discounts across all marketplace categories:
 * 1. Pet Products: Percentage and fixed discounts, max discount, min purchase.
 * 2. Pet Listings: Paid pet listings receive valid discounts; FREE adoption listings strictly reject commercial discounts.
 * 3. Veterinary Services: Vet consultation fee discounts and appointment snapshots.
 * 4. Grooming & Care Services: Service package discounts and booking snapshots.
 * 5. Offer Management & Ownership Isolation: Only authorized providers/admins can manage offers; tenants cannot touch others' items.
 * 6. Bounds & Date Validation: 1-90% percentage, fixed <= base price, end_date >= start_date.
 * 7. Real Checkout & Booking Financials: Server recalculates authoritative totals, taxes, and saves immutable historical snapshots.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.env.EMAIL_TRANSPORT = 'test';
const http = require('http');
const { Duplex } = require('stream');
const assert = require('assert');
const { test, describe, before } = require('node:test');
const { app } = require('../server');
const {
  isDiscountActive,
  calculateEffectivePrice,
  parseAndValidateDiscount,
  decorateWithDiscount
} = require('../utils/discountEngine');
const { getLastEmailTo } = require('../utils/emailService');

const makeMockSocket = () => {
  const socket = new Duplex({
    read() {},
    write(chunk, encoding, callback) {
      callback();
    }
  });
  socket.remoteAddress = '127.0.0.1';
  socket.encrypted = false;
  return socket;
};

const makeRequest = (method, url, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(makeMockSocket());
    req.method = method;
    req.url = url;
    req.headers = {
      host: 'localhost',
      'user-agent': 'NodeTestAgent/1.0',
      ...headers
    };

    const res = new http.ServerResponse(req);
    let resBody = '';

    res.write = function (chunk) {
      if (chunk) resBody += chunk.toString();
      return true;
    };

    res.end = function (chunk) {
      if (chunk) resBody += chunk.toString();
      let parsed = null;
      try {
        parsed = JSON.parse(resBody);
      } catch {
        parsed = resBody;
      }
      resolve({ status: res.statusCode, headers: res.getHeaders(), data: parsed });
    };

    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = Buffer.byteLength(payload);
      app(req, res);
      req.push(payload);
      req.push(null);
    } else {
      app(req, res);
      req.push(null);
    }
  });
};

const postJson = (url, body, token = null) =>
  makeRequest('POST', url, body, token ? { authorization: `Bearer ${token}` } : {});
const putJson = (url, body, token = null) =>
  makeRequest('PUT', url, body, token ? { authorization: `Bearer ${token}` } : {});
const getJson = (url, token = null) =>
  makeRequest('GET', url, null, token ? { authorization: `Bearer ${token}` } : {});
const delJson = (url, token = null) =>
  makeRequest('DELETE', url, null, token ? { authorization: `Bearer ${token}` } : {});

const registerAndVerify = async (payload) => {
  const regRes = await postJson('/api/auth/register', payload);
  assert.strictEqual(regRes.status, 201, `Reg failed: ${JSON.stringify(regRes.data)}`);

  const emailItem = getLastEmailTo(payload.email, 'verify-email');
  assert.ok(emailItem?.otp, 'Expected verification OTP');

  const verifyRes = await postJson('/api/auth/verify-otp', {
    email: payload.email,
    otp: emailItem.otp
  });
  assert.strictEqual(verifyRes.status, 200, 'OTP verify failed');

  const loginRes = await postJson('/api/auth/login', {
    email: payload.email,
    password: payload.password
  });
  assert.strictEqual(loginRes.status, 200, 'Login failed');
  return loginRes.data;
};

describe('PetPaws Comprehensive Offers & Discounts Engine Tests', async () => {
  let buyerToken, buyerUser;
  let sellerToken, sellerUser;
  let otherSellerToken, otherSellerUser;
  let vetToken, vetUser;
  let groomerToken, groomerUser;

  before(async () => {
    const ts = Date.now();
    const buyerAuth = await registerAndVerify({
      name: `Discount Buyer ${ts}`,
      email: `disc_buyer_${ts}@test.com`,
      password: 'Password123!',
      role: 'buyer',
      phone: '+91 9876543210',
      address: '42 Marine Drive, Mumbai'
    });
    buyerToken = buyerAuth.token;
    buyerUser = buyerAuth.user;

    const sellerAuth = await registerAndVerify({
      name: `Discount Seller ${ts}`,
      email: `disc_seller_${ts}@test.com`,
      password: 'Password123!',
      role: 'seller',
      phone: '+91 9876543211',
      address: '10 Breeder Walk, Mumbai'
    });
    sellerToken = sellerAuth.token;
    sellerUser = sellerAuth.user;

    const otherSellerAuth = await registerAndVerify({
      name: `Other Seller ${ts}`,
      email: `other_seller_${ts}@test.com`,
      password: 'Password123!',
      role: 'seller',
      phone: '+91 9876543212',
      address: '12 Breeder Walk, Mumbai'
    });
    otherSellerToken = otherSellerAuth.token;
    otherSellerUser = otherSellerAuth.user;

    const vetAuth = await registerAndVerify({
      name: `Dr. Discount Vet ${ts}`,
      email: `disc_vet_${ts}@test.com`,
      password: 'Password123!',
      role: 'vet',
      phone: '+91 9876543213',
      address: '5 Health Blvd, Mumbai'
    });
    vetToken = vetAuth.token;
    vetUser = vetAuth.user;

    const groomerAuth = await registerAndVerify({
      name: `Paws Groomer ${ts}`,
      email: `disc_groomer_${ts}@test.com`,
      password: 'Password123!',
      role: 'groomer',
      phone: '+91 9876543214',
      address: '8 Spa Court, Mumbai'
    });
    groomerToken = groomerAuth.token;
    groomerUser = groomerAuth.user;
  });

  test('1. Discount Engine Core: percentage and fixed validation and calculation', () => {
    // Percentage 20% on 100
    const effPct = calculateEffectivePrice({ price: 100, discount: { is_active: true, type: 'percentage', value: 20 } });
    assert.strictEqual(effPct.isDiscountActive, true);
    assert.strictEqual(effPct.basePrice, 100);
    assert.strictEqual(effPct.discountAmount, 20);
    assert.strictEqual(effPct.finalPrice, 80);

    // Fixed discount 35 on 100
    const effFix = calculateEffectivePrice({ price: 100, discount: { is_active: true, type: 'fixed', value: 35 } });
    assert.strictEqual(effFix.isDiscountActive, true);
    assert.strictEqual(effFix.discountAmount, 35);
    assert.strictEqual(effFix.finalPrice, 65);

    // Fixed discount exceeding base price is capped at base price (never negative)
    const effCap = calculateEffectivePrice({ price: 50, discount: { is_active: true, type: 'fixed', value: 80 } });
    assert.strictEqual(effCap.finalPrice, 0);
    assert.strictEqual(effCap.discountAmount, 50);

    // Percentage bounds: < 1 or > 90 rejected by parser
    assert.throws(() => parseAndValidateDiscount({ type: 'percentage', value: 0.5 }, 100), /between 1% and 90%/);
    assert.throws(() => parseAndValidateDiscount({ type: 'percentage', value: 95 }, 100), /between 1% and 90%/);

    // End date before start date rejected
    assert.throws(
      () => parseAndValidateDiscount({ type: 'percentage', value: 10, start_date: '2026-12-01', end_date: '2026-11-01' }, 100),
      /end date cannot be earlier/
    );
  });

  test('2. Free Adoption Rule: commercial discounts strictly rejected on free listings (price <= 0)', () => {
    // Engine calculation strictly denies discount on price 0
    const effFree = calculateEffectivePrice({ price: 0, discount: { is_active: true, type: 'percentage', value: 50 } });
    assert.strictEqual(effFree.isDiscountActive, false);
    assert.strictEqual(effFree.discountAmount, 0);
    assert.strictEqual(effFree.finalPrice, 0);

    // Parser strictly throws error on free listings
    assert.throws(
      () => parseAndValidateDiscount({ type: 'percentage', value: 20 }, 0, { isFreeListing: true }),
      /Commercial discounts cannot be applied to free listings/
    );
  });

  test('3. Pet Listings: Seller can list paid pet with offer and buyer checkout records snapshot', async () => {
    // Seller creates paid pet with 25% discount
    const petRes = await postJson('/api/pets', {
      title: 'Pedigree Golden Retriever Puppy',
      category: 'Dogs',
      price: 400,
      stock: 2,
      discount: {
        type: 'percentage',
        value: 25,
        title: 'Spring Breeder Discount',
        is_active: true
      }
    }, sellerToken);
    assert.strictEqual(petRes.status, 201);
    const pet = petRes.data.pet;
    assert.strictEqual(pet.has_active_discount, true);
    assert.strictEqual(pet.effective_price, 300);
    assert.strictEqual(pet.original_price, 400);

    // Buyer places order for pet
    const orderRes = await postJson('/api/orders/checkout', {
      pet_id: pet.id || pet.custom_id,
      buyer_phone: '9876543210',
      shipping_address: '42 Marine Drive, Mumbai, 400001',
      payment_method: 'UPI',
      payment_details: { upi_id: 'buyer@okaxis' }
    }, buyerToken);

    assert.strictEqual(orderRes.status, 201);
    const order = orderRes.data.order;
    assert.strictEqual(order.price, 300, 'Net price charged must be effective discounted price');
    assert.strictEqual(order.original_price, 400, 'Original price must be snapshotted');
    assert.strictEqual(order.discount_amount, 100, 'Discount amount must be 100');
    assert.ok(order.discount_info, 'Discount info must be snapshotted');
    assert.strictEqual(order.tax, 24, '8% tax on 300 is 24');
    assert.strictEqual(order.total_amount, 324, 'Total must be 300 + 24 = 324');
  });

  test('4. Free Adoption Listings: Cannot attach discount upon creation or via offer routes', async () => {
    // Creating free adoption listing with discount must fail
    const freePetRes = await postJson('/api/pets', {
      title: 'Rescue Kitten for Free Adoption',
      category: 'Cats',
      price: 0,
      stock: 1,
      discount: {
        type: 'percentage',
        value: 10,
        is_active: true
      }
    }, sellerToken);
    assert.strictEqual(freePetRes.status, 400);
    assert.match(freePetRes.data.message, /Commercial discounts cannot be applied to free listings/);

    // List free adoption pet without discount
    const cleanFreePetRes = await postJson('/api/pets', {
      title: 'Rescue Kitten for Free Adoption',
      category: 'Cats',
      price: 0,
      stock: 1
    }, sellerToken);
    assert.strictEqual(cleanFreePetRes.status, 201);
    const freePet = cleanFreePetRes.data.pet;

    // Attempting to add offer to free pet via /api/offers/pets/:id must fail
    const offerRes = await putJson(`/api/offers/pets/${freePet.id || freePet.custom_id}`, {
      type: 'percentage',
      value: 15,
      is_active: true
    }, sellerToken);
    assert.strictEqual(offerRes.status, 400);
    assert.match(offerRes.data.message, /Commercial discounts cannot be applied/);
  });

  test('5. Tenant Isolation: Another seller cannot modify or delete offers on a pet listing', async () => {
    // Seller creates paid pet
    const petRes = await postJson('/api/pets', {
      title: 'German Shepherd Puppy',
      category: 'Dogs',
      price: 500,
      stock: 1
    }, sellerToken);
    const petId = petRes.data.pet.id || petRes.data.pet.custom_id;

    // otherSeller attempts to set offer
    const intruderRes = await putJson(`/api/offers/pets/${petId}`, {
      type: 'percentage',
      value: 30,
      is_active: true
    }, otherSellerToken);
    assert.strictEqual(intruderRes.status, 403, 'Intruder seller must be rejected with 403');

    // Owner seller can update offer
    const ownerRes = await putJson(`/api/offers/pets/${petId}`, {
      type: 'percentage',
      value: 20,
      title: 'Special Summer Discount',
      is_active: true
    }, sellerToken);
    assert.strictEqual(ownerRes.status, 200);
    assert.strictEqual(ownerRes.data.effective_price, 400);
    assert.strictEqual(ownerRes.data.has_active_discount, true);

    // Pause offer
    const pauseRes = await putJson(`/api/offers/pets/${petId}/status`, { is_active: false }, sellerToken);
    assert.strictEqual(pauseRes.status, 200);
    assert.strictEqual(pauseRes.data.has_active_discount, false);
    assert.strictEqual(pauseRes.data.discount_status, 'paused');

    // Delete offer
    const delRes = await delJson(`/api/offers/pets/${petId}`, sellerToken);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.has_active_discount, false);
  });

  test('6. Veterinary Services: Vet profile consultation discount and appointment snapshot', async () => {
    // Update vet profile consultation fee with discount
    const vetProfileRes = await putJson('/api/vets/my-profile', {
      consultation_fee: 60,
      discount: {
        type: 'fixed',
        value: 15,
        title: 'New Pet Wellness Special',
        is_active: true
      }
    }, vetToken);
    assert.strictEqual(vetProfileRes.status, 200);
    const vet = vetProfileRes.data.vet;
    assert.strictEqual(vet.effective_fee, 45);
    assert.strictEqual(vet.original_fee, 60);
    assert.strictEqual(vet.has_active_discount, true);

    // Buyer books vet appointment
    const aptRes = await postJson('/api/vets/appointments', {
      vet_id: vet.id || vet.custom_id || vet.user_id,
      pet_name: 'Max',
      appointment_date: '2026-11-20',
      time_slot: '11:00 AM',
      type: 'General Consultation',
      notes: 'Routine vaccination'
    }, buyerToken);

    assert.strictEqual(aptRes.status, 201);
    const apt = aptRes.data.appointment;
    assert.strictEqual(apt.fee, 45, 'Charged fee must be discounted fee');
    assert.strictEqual(apt.original_fee, 60, 'Original fee must be snapshotted');
    assert.strictEqual(apt.discount_amount, 15, 'Discount amount must be snapshotted');
    assert.ok(apt.discount_info, 'Discount details must be recorded');
  });

  test('7. Grooming & Care Services: Package discount and booking snapshot', async () => {
    // Create grooming service with discount via SaaS route
    const srvRes = await postJson('/api/saas/grooming/services', {
      title: 'Full Spa & Coat Deshedding',
      category: 'Grooming',
      price: 80,
      duration: '75 Mins',
      description: 'Warm hydro-bath, organic shampoo, coat styling.',
      discount: {
        type: 'percentage',
        value: 20,
        title: 'First Grooming 20% OFF',
        is_active: true
      }
    }, groomerToken);
    assert.strictEqual(srvRes.status, 201);
    const srv = srvRes.data.service;
    assert.strictEqual(srv.effective_price, 64);
    assert.strictEqual(srv.original_price, 80);
    assert.strictEqual(srv.has_active_discount, true);

    // Buyer books service
    const bookRes = await postJson('/api/services/book', {
      service_id: srv.id || srv.custom_id,
      booking_date: '2026-11-22',
      time_slot: '02:00 PM'
    }, buyerToken);

    assert.strictEqual(bookRes.status, 201);
    const booking = bookRes.data.booking;
    assert.strictEqual(booking.price, 64, 'Booking price must be discounted price');
    assert.strictEqual(booking.original_price, 80, 'Original price must be snapshotted');
    assert.strictEqual(booking.discount_amount, 16, 'Discount amount must be snapshotted');
    assert.ok(booking.discount_info, 'Discount info must be snapshotted');
  });

  test('8. Date-based offers: Scheduled vs Expired vs Active', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    // Scheduled offer (future start date)
    const effSched = calculateEffectivePrice({
      price: 100,
      discount: { is_active: true, type: 'percentage', value: 20, start_date: tomorrow, end_date: nextWeek }
    });
    assert.strictEqual(effSched.isDiscountActive, false);
    assert.strictEqual(effSched.status, 'scheduled');
    assert.strictEqual(effSched.finalPrice, 100);

    // Expired offer (past end date)
    const effExp = calculateEffectivePrice({
      price: 100,
      discount: { is_active: true, type: 'percentage', value: 20, start_date: lastWeek, end_date: yesterday }
    });
    assert.strictEqual(effExp.isDiscountActive, false);
    assert.strictEqual(effExp.status, 'expired');
    assert.strictEqual(effExp.finalPrice, 100);

    // Active offer
    const effAct = calculateEffectivePrice({
      price: 100,
      discount: { is_active: true, type: 'percentage', value: 20, start_date: yesterday, end_date: nextWeek }
    });
    assert.strictEqual(effAct.isDiscountActive, true);
    assert.strictEqual(effAct.status, 'active');
    assert.strictEqual(effAct.finalPrice, 80);
  });

  test('9. Edit existing pet listing: add promotional offer, save, and verify across APIs', async () => {
    // Step 1: Create a pet listing without an offer
    const createRes = await postJson('/api/pets', {
      title: 'Golden Retriever Pup',
      category: 'Dogs',
      price: 400,
      age: '3 Months',
      breed: 'Golden Retriever',
      gender: 'Male',
      health_status: 'Fully Vaccinated',
      description: 'Energetic and playful pup',
      stock: 2
    }, sellerToken);

    assert.strictEqual(createRes.status, 201, `Create failed: ${JSON.stringify(createRes.data)}`);
    const createdPet = createRes.data.pet;
    const petId = createdPet.id || createdPet.custom_id;
    assert.ok(petId, 'Pet must have an identifier');
    assert.strictEqual(createdPet.has_active_discount, false);
    assert.strictEqual(createdPet.effective_price, 400);

    // Step 2: Edit the existing pet listing to add a promotional offer (25% off)
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const editRes = await putJson(`/api/pets/${petId}`, {
      title: 'Golden Retriever Pup (Special Edition)',
      category: 'Dogs',
      price: 400,
      discount: {
        is_active: true,
        type: 'percentage',
        value: 25,
        title: 'Autumn Special 25% OFF',
        description: 'Limited autumn discount',
        start_date: today,
        end_date: nextMonth
      },
      age: '3 Months',
      breed: 'Golden Retriever',
      gender: 'Male',
      health_status: 'Fully Vaccinated',
      description: 'Energetic and playful pup',
      stock: 2
    }, sellerToken);

    assert.strictEqual(editRes.status, 200, `Edit failed: ${JSON.stringify(editRes.data)}`);
    assert.strictEqual(editRes.data.success, true);
    const updatedPet = editRes.data.pet;
    assert.strictEqual(updatedPet.has_active_discount, true, 'Pet must show active discount after saving edit');
    assert.strictEqual(updatedPet.original_price, 400);
    assert.strictEqual(updatedPet.effective_price, 300, 'Effective price must reflect 25% discount ($300)');
    assert.strictEqual(updatedPet.discount_info?.title, 'Autumn Special 25% OFF');
    assert.strictEqual(updatedPet.discount_info?.discount_amount, 100);

    // Step 3: Verify seller inventory returns the decorated discount
    const invRes = await getJson('/api/pets/seller/inventory', sellerToken);
    assert.strictEqual(invRes.status, 200);
    const invPet = invRes.data.pets.find(p => (p.id === petId || p.custom_id === petId));
    assert.ok(invPet, 'Listing must be present in seller inventory');
    assert.strictEqual(invPet.has_active_discount, true, 'Seller inventory listing must show active discount');
    assert.strictEqual(invPet.effective_price, 300);
    assert.strictEqual(invPet.original_price, 400);

    // Step 4: Verify public marketplace API returns the decorated discount
    const publicRes = await getJson('/api/pets');
    assert.strictEqual(publicRes.status, 200);
    const pubPet = publicRes.data.pets.find(p => (p.id === petId || p.custom_id === petId));
    assert.ok(pubPet, 'Listing must be present in public marketplace');
    assert.strictEqual(pubPet.has_active_discount, true, 'Marketplace listing must show active discount badge');
    assert.strictEqual(pubPet.effective_price, 300);
    assert.strictEqual(pubPet.original_price, 400);
    assert.strictEqual(pubPet.discount_info?.title, 'Autumn Special 25% OFF');

    // Step 5: Verify single pet lookup API
    const singleRes = await getJson(`/api/pets/${petId}`);
    assert.strictEqual(singleRes.status, 200);
    assert.strictEqual(singleRes.data.pet.has_active_discount, true);
    assert.strictEqual(singleRes.data.pet.effective_price, 300);

    // Step 6: Verify dedicated offer endpoints work on pets (/api/offers/pets/:id)
    const offerRes = await getJson(`/api/offers/pets/${petId}`);
    assert.strictEqual(offerRes.status, 200);
    assert.strictEqual(offerRes.data.has_active_discount, true);
    assert.strictEqual(offerRes.data.effective_price, 300);

    // Pause offer via dedicated status endpoint
    const pauseRes = await putJson(`/api/offers/pets/${petId}/status`, { is_active: false }, sellerToken);
    assert.strictEqual(pauseRes.status, 200);
    assert.strictEqual(pauseRes.data.has_active_discount, false);
    assert.strictEqual(pauseRes.data.effective_price, 400);

    // Re-check public marketplace reflects paused offer
    const afterPauseRes = await getJson(`/api/pets/${petId}`);
    assert.strictEqual(afterPauseRes.data.pet.has_active_discount, false);
    assert.strictEqual(afterPauseRes.data.pet.effective_price, 400);
  });
});
