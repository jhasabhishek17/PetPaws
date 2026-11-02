/**
 * PetPaws Safe, Idempotent Database Seeder
 *
 * Usage:
 *   cd server && npm run seed
 *
 * Guarantees:
 * - Never deletes existing products, users, businesses, orders, pets, or appointments.
 * - Uses atomic `updateOne(..., { $setOnInsert: ... }, { upsert: true })` keyed by stable
 *   `custom_id` (and unique `email` / `slug` where applicable) so running it multiple times
 *   never creates duplicates.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { loadData } = require('./db');
const { SAMPLE_PRODUCTS, syncLocalJsonFallback } = require('./seedProducts');

const User = require('./models/User');
const Business = require('./models/Business');
const BusinessMembership = require('./models/BusinessMembership');
const SubscriptionTransaction = require('./models/SubscriptionTransaction');
const AuditLog = require('./models/AuditLog');
const Pet = require('./models/Pet');
const Product = require('./models/Product');
const Order = require('./models/Order');
const ProductOrder = require('./models/ProductOrder');
const VetProfile = require('./models/VetProfile');
const VetAppointment = require('./models/VetAppointment');
const GroomingService = require('./models/GroomingService');
const GroomingBooking = require('./models/GroomingBooking');
const SupportTicket = require('./models/SupportTicket');

const upsertCollection = async (Model, records, label, filterBuilder) => {
  if (!Array.isArray(records) || records.length === 0) return { inserted: 0, existing: 0 };
  let inserted = 0;
  let existing = 0;

  for (const raw of records) {
    const customId = raw.custom_id || raw.id;
    if (!customId) continue;
    const { id, _id, ...rest } = raw;
    const docToInsert = { ...rest, custom_id: customId };
    const filter = filterBuilder ? filterBuilder(docToInsert) : { custom_id: customId };

    const res = await Model.updateOne(filter, { $setOnInsert: docToInsert }, { upsert: true });
    if (res.upsertedCount && res.upsertedCount > 0) {
      inserted += 1;
    } else {
      existing += 1;
    }
  }

  console.log(`  ✅ ${label.padEnd(26)}: ${inserted} inserted, ${existing} already present`);
  return { inserted, existing };
};

const seedData = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Could not connect to MongoDB. Check MONGODB_URI in server/.env.');
    process.exit(1);
  }

  try {
    // Synchronize local fallback JSON with the 20 INR sample products first
    syncLocalJsonFallback();
    const data = loadData();

    console.log(`📦 Connected to MongoDB database: "${mongoose.connection.name}"`);
    console.log('🌱 Running non-destructive idempotent seed (existing records are preserved)...');

    // Hash plaintext seed passwords if needed
    const preparedUsers = [];
    for (const u of data.users || []) {
      const copy = { ...u };
      if (copy.password && !copy.password.startsWith('$2')) {
        copy.password = await bcrypt.hash(copy.password, 10);
      }
      preparedUsers.push(copy);
    }

    await upsertCollection(User, preparedUsers, 'Users', (doc) => ({
      $or: [{ custom_id: doc.custom_id }, { email: doc.email }]
    }));

    await upsertCollection(Business, data.businesses, 'Businesses', (doc) => ({
      $or: [{ custom_id: doc.custom_id }, { slug: doc.slug }]
    }));

    await upsertCollection(BusinessMembership, data.business_memberships, 'Business Memberships');
    await upsertCollection(SubscriptionTransaction, data.subscription_transactions, 'Subscription Transactions');
    await upsertCollection(AuditLog, data.audit_logs, 'Audit Logs');
    await upsertCollection(Product, SAMPLE_PRODUCTS, 'Marketplace Products (INR)');
    await upsertCollection(ProductOrder, data.product_orders, 'Product Orders');
    await upsertCollection(Pet, data.pets, 'Pets');
    await upsertCollection(Order, data.orders, 'Pet Orders');
    await upsertCollection(VetProfile, data.vet_profiles, 'Vet Profiles');
    await upsertCollection(VetAppointment, data.vet_appointments, 'Vet Appointments');
    await upsertCollection(GroomingService, data.grooming_services, 'Grooming Services');
    await upsertCollection(GroomingBooking, data.grooming_bookings, 'Grooming Bookings');
    await upsertCollection(SupportTicket, data.support_tickets, 'Support Tickets');

    const totalProducts = await Product.countDocuments();
    console.log(`🎉 Seed complete! Total products in "${Product.collection.name}" collection: ${totalProducts}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding MongoDB:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedData();
