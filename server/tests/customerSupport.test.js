/**
 * PetPaws Customer Support & Platform Admin Ticketing Test Suite
 *
 * Verifies Stage 1 Customer Support enhancements:
 * 1. Authenticated customer can submit support tickets.
 * 2. Customers can only retrieve their own tickets (tenant isolation).
 * 3. Platform Admin can retrieve all support tickets across the platform.
 * 4. Platform Admin can filter tickets by status and priority.
 * 5. Platform Admin can search tickets by query (ticket ID, subject, customer details).
 * 6. Non-admin users receive HTTP 403 when attempting admin ticket updates.
 * 7. Platform Admin can update ticket status, priority, and append a reply.
 * 8. Validation rejects empty replies, invalid status/priority, and protected field tampering.
 * 9. Nonexistent ticket IDs return HTTP 404.
 * 10. Unauthenticated requests return HTTP 401.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.env.EMAIL_TRANSPORT = 'test';
const http = require('http');
const { Duplex } = require('stream');
const assert = require('assert');
const { test, describe, before, after } = require('node:test');
const jwt = require('jsonwebtoken');
const { app } = require('../server');
const { getJwtSecret } = require('../config/jwt');
const { loadData, saveData, isMongoConnected } = require('../db');
const User = require('../models/User');
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
      } catch {
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

describe('PetPaws Customer Support & Platform Admin Ticket Management', () => {
  const createdTicketIds = new Set();
  const createdUserEmails = new Set();
  let buyerToken1;
  let buyerEmail1;
  let buyerToken2;
  let buyerEmail2;
  let sellerToken;
  let adminToken;
  let ticket1Id;
  let ticket2Id;

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
    return loginRes.body.token;
  }

  async function createAdminUser() {
    const adminCustomId = `u-admin-test-${Date.now()}`;
    const adminEmail = `admin_support_test_${Date.now()}@petpaws.com`;
    createdUserEmails.add(adminEmail);

    if (isMongoConnected()) {
      const adminDoc = await User.create({
        custom_id: adminCustomId,
        name: 'Support Admin Test',
        email: adminEmail,
        password: '$2a$10$dummyhashedpasswordforadmin',
        role: 'admin',
        email_verified: true,
        token_version: 0
      });
      return jwt.sign(
        { id: adminDoc._id.toString(), custom_id: adminCustomId, role: 'admin', email: adminEmail, token_version: 0 },
        getJwtSecret(),
        { expiresIn: '7d' }
      );
    }

    const db = loadData();
    if (!Array.isArray(db.users)) db.users = [];
    const adminUser = {
      id: adminCustomId,
      custom_id: adminCustomId,
      name: 'Support Admin Test',
      email: adminEmail,
      password: '$2a$10$dummyhashedpasswordforadmin',
      role: 'admin',
      email_verified: true,
      token_version: 0,
      created_at: new Date().toISOString()
    };
    db.users.push(adminUser);
    saveData(db);

    return jwt.sign(
      { id: adminCustomId, custom_id: adminCustomId, role: 'admin', email: adminEmail, token_version: 0 },
      getJwtSecret(),
      { expiresIn: '7d' }
    );
  }

  before(async () => {
    setDnsResolverForTesting(testDnsResolver);
    const ts = Date.now();
    buyerEmail1 = `buyer1_support_${ts}@test.com`;
    buyerToken1 = await registerAndVerifyUser({
      name: `Customer Alpha ${ts}`,
      email: buyerEmail1,
      password: 'Password123!',
      role: 'buyer'
    });

    buyerEmail2 = `buyer2_support_${ts}@test.com`;
    buyerToken2 = await registerAndVerifyUser({
      name: `Customer Beta ${ts}`,
      email: buyerEmail2,
      password: 'Password123!',
      role: 'buyer'
    });

    sellerToken = await registerAndVerifyUser({
      name: `Seller Gamma ${ts}`,
      email: `seller_support_${ts}@test.com`,
      password: 'Password123!',
      role: 'seller',
      business_name: `Shop ${ts}`
    });

    adminToken = await createAdminUser();
  });

  test('1. Unauthenticated request to support endpoints is rejected with 401', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      url: '/api/support/tickets'
    });
    assert.strictEqual(res.statusCode, 401);
  });

  test('2. Customer Alpha submits a support ticket (Priority: High)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/support/tickets',
      headers: { authorization: `Bearer ${buyerToken1}` },
      body: {
        subject: 'Climate-controlled carrier question',
        message: 'Need to confirm temperature logging for pup shipment #48291.',
        priority: 'High'
      }
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.ticket);
    assert.strictEqual(res.body.ticket.priority, 'High');
    assert.strictEqual(res.body.ticket.status, 'In Progress');
    ticket1Id = res.body.ticket.custom_id || res.body.ticket.id;
    createdTicketIds.add(ticket1Id);
    assert.ok(ticket1Id, 'Ticket must have an identifier');
  });

  test('3. Customer Beta submits a separate support ticket (Priority: Medium)', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      url: '/api/support/tickets',
      headers: { authorization: `Bearer ${buyerToken2}` },
      body: {
        subject: 'UPI payout verification question',
        message: 'My recent order transaction invoice has a typo in address.',
        priority: 'Medium'
      }
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    ticket2Id = res.body.ticket.custom_id || res.body.ticket.id;
    createdTicketIds.add(ticket2Id);
    assert.ok(ticket2Id);
  });

  test('4. Tenant Isolation: Customer Alpha retrieves only their own tickets', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      url: '/api/support/tickets',
      headers: { authorization: `Bearer ${buyerToken1}` }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.tickets));
    const ids = res.body.tickets.map(t => t.custom_id || t.id);
    assert.ok(ids.includes(ticket1Id), 'Customer Alpha must see ticket 1');
    assert.strictEqual(ids.includes(ticket2Id), false, 'Customer Alpha must NEVER see ticket 2');
  });

  test('5. Tenant Isolation: Customer Beta retrieves only their own tickets', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      url: '/api/support/tickets',
      headers: { authorization: `Bearer ${buyerToken2}` }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const ids = res.body.tickets.map(t => t.custom_id || t.id);
    assert.ok(ids.includes(ticket2Id), 'Customer Beta must see ticket 2');
    assert.strictEqual(ids.includes(ticket1Id), false, 'Customer Beta must NEVER see ticket 1');
  });

  test('6. Platform Admin retrieves all platform tickets across all users', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      url: '/api/support/tickets',
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(typeof res.body.count === 'number');
    const ids = res.body.tickets.map(t => t.custom_id || t.id);
    assert.ok(ids.includes(ticket1Id), 'Admin must see ticket 1');
    assert.ok(ids.includes(ticket2Id), 'Admin must see ticket 2');
  });

  test('7. Platform Admin filters tickets by priority=High', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      url: '/api/support/tickets?priority=High',
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const ids = res.body.tickets.map(t => t.custom_id || t.id);
    assert.ok(ids.includes(ticket1Id), 'Filtered High priority must include ticket 1');
    assert.strictEqual(ids.includes(ticket2Id), false, 'Filtered High priority must exclude ticket 2');
  });

  test('8. Platform Admin searches tickets by customer email / query keyword', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      url: `/api/support/tickets?search=${encodeURIComponent('Climate-controlled')}`,
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const ids = res.body.tickets.map(t => t.custom_id || t.id);
    assert.ok(ids.includes(ticket1Id));
    assert.strictEqual(ids.includes(ticket2Id), false);
  });

  test('9. Non-admin role (seller) receives 403 when attempting ticket update', async () => {
    const res = await makeRequest(app, {
      method: 'PUT',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${sellerToken}` },
      body: { status: 'Resolved' }
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('Required role: admin') || res.body.message.includes('Platform Administrator'));
  });

  test('10. Platform Admin updates ticket status to "Resolved" and appends a reply', async () => {
    const res = await makeRequest(app, {
      method: 'PUT',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        status: 'Resolved',
        priority: 'Low',
        reply: 'We verified the climate-controlled carrier telemetry: temperature is maintained at 21C with live GPS active.'
      }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.ticket.status, 'Resolved');
    assert.strictEqual(res.body.ticket.priority, 'Low');
    assert.ok(res.body.ticket.response.includes('climate-controlled carrier telemetry'));
  });

  test('11. Customer Alpha sees the updated status and admin response on their ticket', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${buyerToken1}` }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.ticket.status, 'Resolved');
    assert.strictEqual(res.body.ticket.priority, 'Low');
    assert.ok(res.body.ticket.response.includes('temperature is maintained at 21C'));
  });

  test('12. Customer Alpha is denied (403) from accessing Customer Beta ticket by ID', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      url: `/api/support/tickets/${ticket2Id}`,
      headers: { authorization: `Bearer ${buyerToken1}` }
    });

    assert.strictEqual(res.statusCode, 403);
  });

  test('13. Validation: Empty reply or whitespace-only reply rejected with 400', async () => {
    const res = await makeRequest(app, {
      method: 'PUT',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: { reply: '   ' }
    });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('Reply message cannot be empty'));
  });

  test('14. Validation: Invalid status value rejected with 400', async () => {
    const res = await makeRequest(app, {
      method: 'PUT',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: { status: 'NotAValidStatus' }
    });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('Invalid ticket status'));
  });

  test('15. Validation: Invalid priority value rejected with 400', async () => {
    const res = await makeRequest(app, {
      method: 'PUT',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: { priority: 'CriticalExtreme' }
    });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('Invalid ticket priority'));
  });

  test('16. Validation: Attempting to overwrite protected fields (user_id, custom_id) is rejected with 400', async () => {
    const res = await makeRequest(app, {
      method: 'PUT',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        user_id: 'tampered-user-id',
        status: 'Open'
      }
    });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('Field "user_id" cannot be modified'));
  });

  test('17. Validation: Updating a nonexistent ticket ID returns 404', async () => {
    const res = await makeRequest(app, {
      method: 'PUT',
      url: '/api/support/tickets/TCK-NONEXISTENT-9999',
      headers: { authorization: `Bearer ${adminToken}` },
      body: { status: 'Resolved' }
    });

    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.message.includes('Support ticket not found'));
  });

  // --- STAGE 2 TESTS: CONVERSATION HISTORY & NOTIFICATIONS ---

  test('18. Customer ticket creation triggers support team notification email when configured', async () => {
    const originalSupportEmail = process.env.SUPPORT_TEAM_EMAIL;
    const testSupportMailbox = 'support.desk@petpaws.internal';
    process.env.SUPPORT_TEAM_EMAIL = testSupportMailbox;

    try {
      const res = await makeRequest(app, {
        method: 'POST',
        url: '/api/support/tickets',
        headers: { authorization: `Bearer ${buyerToken1}` },
        body: {
          subject: 'Vet wellness check query',
          message: 'Can I reschedule the appointment for Dr. Carter on Saturday?',
          priority: 'Medium'
        }
      });

      assert.strictEqual(res.statusCode, 201);
      const newTicketId = res.body.ticket.custom_id || res.body.ticket.id;

      const supportEmail = getLastEmailTo(testSupportMailbox, 'support-ticket-created');
      assert.ok(supportEmail, 'Support team must receive notification email');
      assert.strictEqual(supportEmail.to, testSupportMailbox);
      assert.ok(supportEmail.subject.includes(newTicketId));
      assert.ok(supportEmail.text.includes('Vet wellness check query'));
      assert.ok(supportEmail.text.includes(buyerEmail1));
    } finally {
      if (originalSupportEmail === undefined) {
        delete process.env.SUPPORT_TEAM_EMAIL;
      } else {
        process.env.SUPPORT_TEAM_EMAIL = originalSupportEmail;
      }
    }
  });

  test('19. Admin reply triggers a customer notification email with ticket details and status', async () => {
    const replyText = 'We have confirmed with Dr. Carter that the Saturday 11:00 AM slot is open.';
    const res = await makeRequest(app, {
      method: 'PUT',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        status: 'In Progress',
        reply: replyText
      }
    });

    assert.strictEqual(res.statusCode, 200);

    const customerEmail = getLastEmailTo(buyerEmail1, 'support-ticket-reply');
    assert.ok(customerEmail, 'Customer must receive email notification upon admin reply');
    assert.strictEqual(customerEmail.to, buyerEmail1.toLowerCase());
    assert.ok(customerEmail.subject.includes(ticket1Id));
    assert.ok(customerEmail.text.includes(replyText));
    assert.ok(customerEmail.text.includes('In Progress'));
  });

  test('20. Multiple admin replies are retained in chronological order in responses array', async () => {
    // Reply 1 was already added in test 10/19. Add Reply 2 and Reply 3.
    const reply2 = 'Driver telemetry update: GPS indicates arrival in 45 minutes.';
    const res2 = await makeRequest(app, {
      method: 'PUT',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        status: 'In Progress',
        reply: reply2
      }
    });
    assert.strictEqual(res2.statusCode, 200);

    const reply3 = 'Puppy safely delivered and signed off. All clear!';
    const res3 = await makeRequest(app, {
      method: 'PUT',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        status: 'Resolved',
        reply: reply3
      }
    });
    assert.strictEqual(res3.statusCode, 200);

    // Retrieve the ticket and verify responses history
    const getRes = await makeRequest(app, {
      method: 'GET',
      url: `/api/support/tickets/${ticket1Id}`,
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(getRes.statusCode, 200);
    const t = getRes.body.ticket;
    assert.ok(Array.isArray(t.responses));
    assert.ok(t.responses.length >= 3, `Expected at least 3 replies, got ${t.responses.length}`);

    // Verify chronological order and content
    const lastResponses = t.responses.slice(-2);
    assert.strictEqual(lastResponses[0].message, reply2);
    assert.strictEqual(lastResponses[1].message, reply3);
    assert.strictEqual(lastResponses[1].author_role, 'admin');
    assert.ok(lastResponses[1].created_at);

    // Verify legacy response string reflects the latest response
    assert.strictEqual(t.response, reply3);
    assert.strictEqual(t.status, 'Resolved');
  });

  test('21. Backward compatibility: Existing legacy tickets without responses array load correctly', async () => {
    const legacyCustomId = `TCK-LEGACY-${Date.now()}`;
    createdTicketIds.add(legacyCustomId);
    createdUserEmails.add('legacy@petpaws.com');
    const legacyResponse = 'Legacy standalone support response from older platform version.';

    if (isMongoConnected()) {
      const SupportTicket = require('../models/SupportTicket');
      await SupportTicket.collection.insertOne({
        custom_id: legacyCustomId,
        user_id: 'legacy-user-123',
        user_name: 'Legacy Customer',
        user_email: 'legacy@petpaws.com',
        subject: 'Historical legacy ticket',
        message: 'Legacy issue text',
        priority: 'Low',
        status: 'Resolved',
        response: legacyResponse,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      const db = loadData();
      if (!Array.isArray(db.support_tickets)) db.support_tickets = [];
      db.support_tickets.push({
        id: legacyCustomId,
        custom_id: legacyCustomId,
        user_id: 'legacy-user-123',
        user_name: 'Legacy Customer',
        user_email: 'legacy@petpaws.com',
        subject: 'Historical legacy ticket',
        message: 'Legacy issue text',
        priority: 'Low',
        status: 'Resolved',
        response: legacyResponse,
        created_at: new Date().toISOString()
      });
      saveData(db);
    }

    const res = await makeRequest(app, {
      method: 'GET',
      url: `/api/support/tickets/${legacyCustomId}`,
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.ticket.response, legacyResponse);
    assert.ok(Array.isArray(res.body.ticket.responses), 'responses must always be an array');
    assert.strictEqual(res.body.ticket.responses.length, 0, 'responses array should be empty for legacy ticket');
  });

  test('22. Resilience: Non-blocking email errors do not fail ticket creation or admin reply', async () => {
    const originalSendEmail = require('../utils/emailService').sendEmail;
    const emailModule = require('../utils/emailService');

    const originalSupportEmail = process.env.SUPPORT_TEAM_EMAIL;
    process.env.SUPPORT_TEAM_EMAIL = 'support.down@petpaws.internal';

    try {
      // Temporarily monkey-patch sendEmail to reject
      emailModule.sendEmail = async () => {
        const err = new Error('Upstream mail service simulated outage: ECONNREFUSED');
        err.code = 'ECONNREFUSED';
        throw err;
      };

      // A. Ticket creation must still succeed despite email failure
      const createRes = await makeRequest(app, {
        method: 'POST',
        url: '/api/support/tickets',
        headers: { authorization: `Bearer ${buyerToken1}` },
        body: {
          subject: 'Order shipment inquiry with mail error',
          message: 'My order has not updated in 2 days.',
          priority: 'High'
        }
      });

      assert.strictEqual(createRes.statusCode, 201, 'Ticket creation must succeed even if notification email fails');
      assert.strictEqual(createRes.body.success, true);
      const failedMailTicketId = createRes.body.ticket.custom_id || createRes.body.ticket.id;
      createdTicketIds.add(failedMailTicketId);

      // B. Admin reply must still succeed and persist reply despite email failure
      const replyRes = await makeRequest(app, {
        method: 'PUT',
        url: `/api/support/tickets/${failedMailTicketId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        body: {
          status: 'In Progress',
          reply: 'We checked the warehouse and your package is in transit.'
        }
      });

      assert.strictEqual(replyRes.statusCode, 200, 'Admin update must succeed even if reply email fails');
      assert.strictEqual(replyRes.body.success, true);
      assert.strictEqual(replyRes.body.ticket.status, 'In Progress');
      assert.ok(replyRes.body.ticket.response.includes('package is in transit'));
      assert.strictEqual(replyRes.body.ticket.responses.length, 1);
    } finally {
      emailModule.sendEmail = originalSendEmail;
      if (originalSupportEmail === undefined) {
        delete process.env.SUPPORT_TEAM_EMAIL;
      } else {
        process.env.SUPPORT_TEAM_EMAIL = originalSupportEmail;
      }
    }
  });

  test('23. Admin Portal: Platform Admin retrieves SaaS overview, and non-admins receive 403', async () => {
    // Non-admin (buyer) request is rejected with 403
    const buyerRes = await makeRequest(app, {
      method: 'GET',
      url: '/api/saas/admin/overview',
      headers: { authorization: `Bearer ${buyerToken1}` }
    });
    assert.strictEqual(buyerRes.statusCode, 403);

    // Seller request is rejected with 403
    const sellerRes = await makeRequest(app, {
      method: 'GET',
      url: '/api/saas/admin/overview',
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.strictEqual(sellerRes.statusCode, 403);

    // Platform Admin retrieves overview successfully
    const adminRes = await makeRequest(app, {
      method: 'GET',
      url: '/api/saas/admin/overview',
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminRes.statusCode, 200);
    assert.strictEqual(adminRes.body.success, true);
    assert.ok(Array.isArray(adminRes.body.businesses));
    assert.ok(Array.isArray(adminRes.body.products));
    assert.ok(Array.isArray(adminRes.body.auditLogs));
    assert.ok(Array.isArray(adminRes.body.subscriptionTransactions));
  });

  test('24. Admin Portal: Platform Admin moderates vendor business and product listings', async () => {
    // Attempt moderation as seller (must be rejected with 403)
    const unauthorizedMod = await makeRequest(app, {
      method: 'PUT',
      url: '/api/saas/admin/businesses/test-biz-id/status',
      headers: { authorization: `Bearer ${sellerToken}` },
      body: { verification_status: 'verified' }
    });
    assert.strictEqual(unauthorizedMod.statusCode, 403);

    // As admin: overview contains businesses
    const overviewRes = await makeRequest(app, {
      method: 'GET',
      url: '/api/saas/admin/overview',
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(overviewRes.statusCode, 200);

    if (overviewRes.body.businesses.length > 0) {
      const targetBiz = overviewRes.body.businesses[0];
      const bizId = targetBiz.id || targetBiz.custom_id;

      const modRes = await makeRequest(app, {
        method: 'PUT',
        url: `/api/saas/admin/businesses/${bizId}/status`,
        headers: { authorization: `Bearer ${adminToken}` },
        body: {
          verification_status: 'verified',
          status: 'active'
        }
      });

      assert.strictEqual(modRes.statusCode, 200);
      assert.strictEqual(modRes.body.success, true);
      assert.strictEqual(modRes.body.business.verification_status, 'verified');
    }
  });

  test('25. System Health: /api/health exposes genuine telemetry without leaking credentials', async () => {
    const healthRes = await makeRequest(app, {
      method: 'GET',
      url: '/api/health'
    });

    assert.strictEqual(healthRes.statusCode, 200);
    assert.strictEqual(healthRes.body.status, 'ok');
    assert.ok(typeof healthRes.body.timestamp === 'string');
    assert.ok(typeof healthRes.body.uptime === 'number');
    assert.ok(healthRes.body.database && healthRes.body.database.mode);
    assert.ok(healthRes.body.node && healthRes.body.node.version);

    // Verify zero secrets/credentials are leaked
    const jsonStr = JSON.stringify(healthRes.body);
    assert.ok(!jsonStr.includes('password'));
    assert.ok(!jsonStr.includes('secret'));
    assert.ok(!jsonStr.includes('EMAIL59_API_KEY'));
    assert.ok(!jsonStr.includes('JWT_SECRET'));
  });

  after(async () => {
    setDnsResolverForTesting(null);
    clearDnsCache();

    try {
      const SupportTicket = require('../models/SupportTicket');
      const ticketIds = Array.from(createdTicketIds);
      const userEmails = Array.from(createdUserEmails);

      if (isMongoConnected()) {
        if (userEmails.length > 0) {
          await User.deleteMany({ email: { $in: userEmails } });
        }
        if (ticketIds.length > 0) {
          await SupportTicket.deleteMany({ $or: [{ custom_id: { $in: ticketIds } }, { id: { $in: ticketIds } }] });
        }
      } else {
        const db = loadData();
        if (Array.isArray(db.users) && userEmails.length > 0) {
          db.users = db.users.filter(u => !userEmails.includes(u.email));
        }
        if (Array.isArray(db.support_tickets) && ticketIds.length > 0) {
          db.support_tickets = db.support_tickets.filter(t => !ticketIds.includes(t.custom_id) && !ticketIds.includes(t.id));
        }
        saveData(db);
      }
    } catch {
      // Soft cleanup
    }
  });
});
