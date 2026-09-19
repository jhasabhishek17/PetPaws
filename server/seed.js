require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { loadData } = require('./db');

const User = require('./models/User');
const Pet = require('./models/Pet');
const Order = require('./models/Order');
const VetProfile = require('./models/VetProfile');
const VetAppointment = require('./models/VetAppointment');
const GroomingService = require('./models/GroomingService');
const GroomingBooking = require('./models/GroomingBooking');
const SupportTicket = require('./models/SupportTicket');

const seedData = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Could not connect to MongoDB. Make sure MongoDB daemon is running at MONGODB_URI.');
    process.exit(1);
  }

  try {
    const data = loadData();

    // Clear existing collections
    await User.deleteMany({});
    await Pet.deleteMany({});
    await Order.deleteMany({});
    await VetProfile.deleteMany({});
    await VetAppointment.deleteMany({});
    await GroomingService.deleteMany({});
    await GroomingBooking.deleteMany({});
    await SupportTicket.deleteMany({});

    console.log('🧹 Existing MongoDB collections cleared.');

    // Seed Users
    if (data.users && data.users.length) {
      await User.insertMany(data.users.map(u => ({ ...u, custom_id: u.id })));
      console.log(`✅ Seeded ${data.users.length} Users`);
    }

    // Seed Pets
    if (data.pets && data.pets.length) {
      await Pet.insertMany(data.pets.map(p => ({ ...p, custom_id: p.id })));
      console.log(`✅ Seeded ${data.pets.length} Pets`);
    }

    // Seed Orders
    if (data.orders && data.orders.length) {
      await Order.insertMany(data.orders.map(o => ({ ...o, custom_id: o.id })));
      console.log(`✅ Seeded ${data.orders.length} Orders`);
    }

    // Seed Vet Profiles
    if (data.vet_profiles && data.vet_profiles.length) {
      await VetProfile.insertMany(data.vet_profiles.map(v => ({ ...v, custom_id: v.id })));
      console.log(`✅ Seeded ${data.vet_profiles.length} Vet Profiles`);
    }

    // Seed Vet Appointments
    if (data.vet_appointments && data.vet_appointments.length) {
      await VetAppointment.insertMany(data.vet_appointments.map(a => ({ ...a, custom_id: a.id })));
      console.log(`✅ Seeded ${data.vet_appointments.length} Vet Appointments`);
    }

    // Seed Grooming Services
    if (data.grooming_services && data.grooming_services.length) {
      await GroomingService.insertMany(data.grooming_services.map(s => ({ ...s, custom_id: s.id })));
      console.log(`✅ Seeded ${data.grooming_services.length} Grooming Services`);
    }

    // Seed Grooming Bookings
    if (data.grooming_bookings && data.grooming_bookings.length) {
      await GroomingBooking.insertMany(data.grooming_bookings.map(b => ({ ...b, custom_id: b.id })));
      console.log(`✅ Seeded ${data.grooming_bookings.length} Grooming Bookings`);
    }

    // Seed Support Tickets
    if (data.support_tickets && data.support_tickets.length) {
      await SupportTicket.insertMany(data.support_tickets.map(t => ({ ...t, custom_id: t.id })));
      console.log(`✅ Seeded ${data.support_tickets.length} Support Tickets`);
    }

    console.log('🎉 MongoDB database successfully seeded!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding MongoDB:', error);
    process.exit(1);
  }
};

seedData();
