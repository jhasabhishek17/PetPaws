/**
 * PetPaws Backend Server (MERN Stack Architecture)
 * 
 * Provides RESTful API endpoints for:
 * 1. MongoDB Database Connection & Fallback Data Layer
 * 2. Multi-role authentication (Buyer, Seller, Veterinarian)
 * 3. Pet Marketplace (Listings, stock management, filter/search)
 * 4. Checkout, Payment Simulation & Order Tracking Timeline
 * 5. Veterinarian appointment booking
 * 6. Pet Grooming & Training service reservations
 * 7. Customer Support Ticketing System
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { loadData, saveData, isMongoConnected } = require('./db');

// Mongoose Models
const User = require('./models/User');
const Pet = require('./models/Pet');
const Order = require('./models/Order');
const VetProfile = require('./models/VetProfile');
const VetAppointment = require('./models/VetAppointment');
const GroomingService = require('./models/GroomingService');
const GroomingBooking = require('./models/GroomingBooking');
const SupportTicket = require('./models/SupportTicket');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable Cross-Origin Resource Sharing & JSON body parser
app.use(cors());
app.use(express.json());

// Initialize MongoDB connection asynchronously
connectDB();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Helper for mapping MongoDB doc or fallback doc
const normalizeItem = (item) => {
  if (!item) return null;
  const obj = item.toObject ? item.toObject() : { ...item };
  obj.id = obj.custom_id || obj.id || obj._id;
  return obj;
};

// ==========================================
// 1. AUTHENTICATION & USER MANAGEMENT API
// ==========================================

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (isMongoConnected()) {
      const user = await User.findOne({ email: email.toLowerCase(), password });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      if (role && user.role !== role) {
        return res.status(403).json({ success: false, message: `Account exists as ${user.role}. Please log in as ${user.role}.` });
      }
      return res.json({ success: true, user: normalizeItem(user) });
    }

    // Fallback JSON handling
    const db = loadData();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (role && user.role !== role) {
      return res.status(403).json({ success: false, message: `Account exists as ${user.role}. Please log in as ${user.role}.` });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/auth/register
 */
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, phone, address, upi_id, bank_name, bank_account, ifsc_code } = req.body;
  const customId = `u-${role || 'buyer'}-${Date.now()}`;

  try {
    if (isMongoConnected()) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      const newUser = await User.create({
        custom_id: customId,
        name,
        email,
        password,
        role: role || 'buyer',
        phone: phone || '',
        address: address || '',
        upi_id: upi_id || '',
        bank_name: bank_name || '',
        bank_account: bank_account || '',
        ifsc_code: ifsc_code || ''
      });

      return res.status(201).json({ success: true, user: normalizeItem(newUser) });
    }

    // Fallback JSON handling
    const db = loadData();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const newUser = {
      id: customId,
      name,
      email,
      password,
      role: role || 'buyer',
      phone: phone || '',
      address: address || '',
      upi_id: upi_id || '',
      bank_name: bank_name || '',
      bank_account: bank_account || '',
      ifsc_code: ifsc_code || '',
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);
    saveData(db);
    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/auth/update-payout
 */
app.put('/api/auth/update-payout', async (req, res) => {
  const { userId, upi_id, bank_name, bank_account, ifsc_code } = req.body;

  try {
    if (isMongoConnected()) {
      const updatedUser = await User.findOneAndUpdate(
        { $or: [{ custom_id: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }] },
        { upi_id, bank_name, bank_account, ifsc_code },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.json({ success: true, user: normalizeItem(updatedUser), message: 'Payout settings updated' });
    }

    // Fallback JSON handling
    const db = loadData();
    const uIndex = db.users.findIndex(u => u.id === userId);
    if (uIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    db.users[uIndex].upi_id = upi_id;
    db.users[uIndex].bank_name = bank_name;
    db.users[uIndex].bank_account = bank_account;
    db.users[uIndex].ifsc_code = ifsc_code;

    saveData(db);
    res.json({ success: true, user: db.users[uIndex], message: 'Payout settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. PET MARKETPLACE API
// ==========================================

/**
 * GET /api/pets
 */
app.get('/api/pets', async (req, res) => {
  const { category, search, sellerId } = req.query;

  try {
    if (isMongoConnected()) {
      let query = {};
      if (sellerId) {
        query.seller_id = sellerId;
      } else {
        query.status = 'active';
        query.stock = { $gt: 0 };
      }

      if (category && category !== 'All') {
        query.category = new RegExp(`^${category}$`, 'i');
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { breed: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const pets = await Pet.find(query).sort({ createdAt: -1 });
      const normalizedPets = pets.map(normalizeItem);
      return res.json({ success: true, count: normalizedPets.length, pets: normalizedPets });
    }

    // Fallback JSON handling
    const db = loadData();
    let pets = db.pets;
    if (sellerId) {
      pets = pets.filter(p => p.seller_id === sellerId);
    } else {
      pets = pets.filter(p => p.status === 'active' && p.stock > 0);
    }

    if (category && category !== 'All') {
      pets = pets.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      pets = pets.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.breed.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: pets.length, pets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/pets/:id
 */
app.get('/api/pets/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (isMongoConnected()) {
      const pet = await Pet.findOne({ $or: [{ custom_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] });
      if (!pet) {
        return res.status(404).json({ success: false, message: 'Pet listing not found' });
      }
      return res.json({ success: true, pet: normalizeItem(pet) });
    }

    const db = loadData();
    const pet = db.pets.find(p => p.id === id);
    if (!pet) {
      return res.status(404).json({ success: false, message: 'Pet listing not found' });
    }
    res.json({ success: true, pet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/pets
 */
app.post('/api/pets', async (req, res) => {
  const { seller_id, seller_name, title, category, price, age, breed, gender, health_status, description, image_url, stock } = req.body;
  const customId = `pet-${Date.now()}`;

  try {
    if (isMongoConnected()) {
      const newPet = await Pet.create({
        custom_id: customId,
        seller_id,
        seller_name: seller_name || 'Verified Seller',
        title,
        category: category || 'Dogs',
        price: Number(price) || 0,
        age: age || 'Young',
        breed: breed || 'Mixed',
        gender: gender || 'Male',
        health_status: health_status || 'Health Checked & Vaccinated',
        description: description || '',
        image_url: image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
        stock: Number(stock) || 1,
        status: 'active'
      });

      return res.status(201).json({ success: true, pet: normalizeItem(newPet), message: 'Pet listed successfully!' });
    }

    const db = loadData();
    const newPet = {
      id: customId,
      seller_id,
      seller_name: seller_name || 'Verified Seller',
      title,
      category: category || 'Dogs',
      price: Number(price) || 0,
      age: age || 'Young',
      breed: breed || 'Mixed',
      gender: gender || 'Male',
      health_status: health_status || 'Health Checked & Vaccinated',
      description: description || '',
      image_url: image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
      stock: Number(stock) || 1,
      status: 'active',
      created_at: new Date().toISOString()
    };

    db.pets.unshift(newPet);
    saveData(db);
    res.status(201).json({ success: true, pet: newPet, message: 'Pet listed successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/pets/:id
 */
app.put('/api/pets/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (isMongoConnected()) {
      if (updates.price !== undefined) updates.price = Number(updates.price);
      if (updates.stock !== undefined) {
        updates.stock = Number(updates.stock);
        if (updates.stock === 0) updates.status = 'sold';
      }

      const updatedPet = await Pet.findOneAndUpdate(
        { $or: [{ custom_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] },
        { $set: updates },
        { new: true }
      );

      if (!updatedPet) {
        return res.status(404).json({ success: false, message: 'Pet listing not found' });
      }

      return res.json({ success: true, pet: normalizeItem(updatedPet), message: 'Pet updated successfully' });
    }

    const db = loadData();
    const petIndex = db.pets.findIndex(p => p.id === id);
    if (petIndex === -1) {
      return res.status(404).json({ success: false, message: 'Pet listing not found' });
    }

    db.pets[petIndex] = {
      ...db.pets[petIndex],
      ...updates,
      price: updates.price !== undefined ? Number(updates.price) : db.pets[petIndex].price,
      stock: updates.stock !== undefined ? Number(updates.stock) : db.pets[petIndex].stock,
      status: (updates.stock !== undefined && Number(updates.stock) === 0) ? 'sold' : (updates.status || db.pets[petIndex].status)
    };

    saveData(db);
    res.json({ success: true, pet: db.pets[petIndex], message: 'Pet updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/pets/:id
 */
app.delete('/api/pets/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (isMongoConnected()) {
      const deleted = await Pet.findOneAndDelete({ $or: [{ custom_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Pet listing not found' });
      }
      return res.json({ success: true, message: 'Pet listing deleted successfully' });
    }

    const db = loadData();
    const petIndex = db.pets.findIndex(p => p.id === id);
    if (petIndex === -1) {
      return res.status(404).json({ success: false, message: 'Pet listing not found' });
    }

    db.pets.splice(petIndex, 1);
    saveData(db);
    res.json({ success: true, message: 'Pet listing deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. ORDERS, CHECKOUT & TRACKING API
// ==========================================

/**
 * POST /api/orders/checkout
 */
app.post('/api/orders/checkout', async (req, res) => {
  const { buyer_id, buyer_name, buyer_email, buyer_phone, shipping_address, pet_id, payment_method } = req.body;

  try {
    if (isMongoConnected()) {
      const pet = await Pet.findOne({ $or: [{ custom_id: pet_id }, { _id: mongoose.Types.ObjectId.isValid(pet_id) ? pet_id : null }] });
      if (!pet || pet.stock <= 0 || pet.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Sorry, this pet is no longer available!' });
      }

      pet.stock -= 1;
      if (pet.stock === 0) pet.status = 'sold';
      await pet.save();

      const tax = Math.round(pet.price * 0.08);
      const total_amount = pet.price + tax;
      const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      const trackingCode = `TRACK-PET-${Math.floor(100000 + Math.random() * 900000)}`;

      const newOrder = await Order.create({
        custom_id: orderId,
        buyer_id: buyer_id || 'u-buyer-1',
        buyer_name: buyer_name || 'Alex Morgan',
        buyer_email: buyer_email || 'buyer@petpaws.com',
        buyer_phone: buyer_phone || '+1 (555) 234-5678',
        shipping_address: shipping_address || '123 Main Street, City',
        pet_id: pet.custom_id || pet._id.toString(),
        pet_title: pet.title,
        pet_category: pet.category,
        pet_image: pet.image_url,
        seller_id: pet.seller_id,
        seller_name: pet.seller_name,
        price: pet.price,
        tax,
        total_amount,
        payment_method: payment_method || 'UPI',
        payment_status: 'Completed',
        tracking_code: trackingCode,
        tracking_status: 'Order Placed',
        estimated_delivery: 'Within 2-3 Business Days'
      });

      return res.status(201).json({ success: true, order: normalizeItem(newOrder), message: 'Order placed successfully!' });
    }

    const db = loadData();
    const pet = db.pets.find(p => p.id === pet_id);
    if (!pet || pet.stock <= 0 || pet.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Sorry, this pet is no longer available!' });
    }

    pet.stock -= 1;
    if (pet.stock === 0) pet.status = 'sold';

    const tax = Math.round(pet.price * 0.08);
    const total_amount = pet.price + tax;
    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingCode = `TRACK-PET-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = {
      id: orderId,
      buyer_id: buyer_id || 'u-buyer-1',
      buyer_name: buyer_name || 'Alex Morgan',
      buyer_email: buyer_email || 'buyer@petpaws.com',
      buyer_phone: buyer_phone || '+1 (555) 234-5678',
      shipping_address: shipping_address || '123 Main Street, City',
      pet_id: pet.id,
      pet_title: pet.title,
      pet_category: pet.category,
      pet_image: pet.image_url,
      seller_id: pet.seller_id,
      seller_name: pet.seller_name,
      price: pet.price,
      tax,
      total_amount,
      payment_method: payment_method || 'UPI',
      payment_status: 'Completed',
      tracking_code: trackingCode,
      tracking_status: 'Order Placed',
      estimated_delivery: 'Within 2-3 Business Days',
      created_at: new Date().toISOString()
    };

    db.orders.unshift(newOrder);
    saveData(db);
    res.status(201).json({ success: true, order: newOrder, message: 'Order placed successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/orders
 */
app.get('/api/orders', async (req, res) => {
  const { buyerId, sellerId } = req.query;

  try {
    if (isMongoConnected()) {
      let query = {};
      if (buyerId) query.buyer_id = buyerId;
      else if (sellerId) query.seller_id = sellerId;

      const orders = await Order.find(query).sort({ createdAt: -1 });
      const normalizedOrders = orders.map(normalizeItem);
      return res.json({ success: true, orders: normalizedOrders });
    }

    const db = loadData();
    let orders = db.orders;
    if (buyerId) orders = orders.filter(o => o.buyer_id === buyerId);
    else if (sellerId) orders = orders.filter(o => o.seller_id === sellerId);

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/orders/track/:code
 */
app.get('/api/orders/track/:code', async (req, res) => {
  const { code } = req.params;

  try {
    if (isMongoConnected()) {
      const order = await Order.findOne({
        $or: [
          { tracking_code: code },
          { custom_id: code },
          { _id: mongoose.Types.ObjectId.isValid(code) ? code : null }
        ]
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'No tracking record found for this code' });
      }
      return res.json({ success: true, order: normalizeItem(order) });
    }

    const db = loadData();
    const order = db.orders.find(o => o.tracking_code === code || o.id === code);
    if (!order) {
      return res.status(404).json({ success: false, message: 'No tracking record found for this code' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. VETERINARIAN APPOINTMENTS API
// ==========================================

/**
 * GET /api/vets
 */
app.get('/api/vets', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const vets = await VetProfile.find();
      const normalizedVets = vets.map(normalizeItem);
      return res.json({ success: true, vets: normalizedVets });
    }

    const db = loadData();
    res.json({ success: true, vets: db.vet_profiles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vets/appointments
 */
app.post('/api/vets/appointments', async (req, res) => {
  const { buyer_id, buyer_name, vet_id, pet_name, appointment_date, time_slot, type, notes } = req.body;
  const customId = `apt-${Date.now()}`;

  try {
    if (isMongoConnected()) {
      const vet = await VetProfile.findOne({ $or: [{ custom_id: vet_id }, { id: vet_id }, { _id: mongoose.Types.ObjectId.isValid(vet_id) ? vet_id : null }] });
      if (!vet) {
        return res.status(404).json({ success: false, message: 'Veterinarian profile not found' });
      }

      const appointment = await VetAppointment.create({
        custom_id: customId,
        buyer_id: buyer_id || 'u-buyer-1',
        buyer_name: buyer_name || 'Alex Morgan',
        vet_id: vet.custom_id || vet.id || vet._id.toString(),
        vet_name: vet.name,
        pet_name: pet_name || 'Pet',
        appointment_date,
        time_slot,
        type: type || 'General Consultation',
        status: 'Confirmed',
        notes: notes || ''
      });

      return res.status(201).json({ success: true, appointment: normalizeItem(appointment), message: `Appointment scheduled with ${vet.name}!` });
    }

    const db = loadData();
    const vet = db.vet_profiles.find(v => v.id === vet_id);
    if (!vet) {
      return res.status(404).json({ success: false, message: 'Veterinarian profile not found' });
    }

    const appointment = {
      id: customId,
      buyer_id: buyer_id || 'u-buyer-1',
      buyer_name: buyer_name || 'Alex Morgan',
      vet_id: vet.id,
      vet_name: vet.name,
      pet_name: pet_name || 'Pet',
      appointment_date,
      time_slot,
      type: type || 'General Consultation',
      status: 'Confirmed',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    db.vet_appointments.unshift(appointment);
    saveData(db);
    res.status(201).json({ success: true, appointment, message: `Appointment scheduled with ${vet.name}!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vets/appointments
 */
app.get('/api/vets/appointments', async (req, res) => {
  const { buyerId, vetId } = req.query;

  try {
    if (isMongoConnected()) {
      let query = {};
      if (buyerId) query.buyer_id = buyerId;
      else if (vetId) query.vet_id = vetId;

      const apts = await VetAppointment.find(query).sort({ createdAt: -1 });
      const normalizedApts = apts.map(normalizeItem);
      return res.json({ success: true, appointments: normalizedApts });
    }

    const db = loadData();
    let apts = db.vet_appointments;
    if (buyerId) apts = apts.filter(a => a.buyer_id === buyerId);
    else if (vetId) apts = apts.filter(a => a.vet_id === vetId);

    res.json({ success: true, appointments: apts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. PET GROOMING & TRAINING SERVICES API
// ==========================================

/**
 * GET /api/services
 */
app.get('/api/services', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const services = await GroomingService.find();
      const normalizedServices = services.map(normalizeItem);
      return res.json({ success: true, services: normalizedServices });
    }

    const db = loadData();
    res.json({ success: true, services: db.grooming_services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/services/book
 */
app.post('/api/services/book', async (req, res) => {
  const { buyer_id, buyer_name, service_id, booking_date, time_slot } = req.body;
  const customId = `grm-${Date.now()}`;

  try {
    if (isMongoConnected()) {
      const srv = await GroomingService.findOne({ $or: [{ custom_id: service_id }, { id: service_id }, { _id: mongoose.Types.ObjectId.isValid(service_id) ? service_id : null }] });
      if (!srv) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }

      const booking = await GroomingBooking.create({
        custom_id: customId,
        buyer_id: buyer_id || 'u-buyer-1',
        buyer_name: buyer_name || 'Alex Morgan',
        service_id: srv.custom_id || srv.id || srv._id.toString(),
        service_title: srv.title,
        booking_date,
        time_slot,
        status: 'Scheduled'
      });

      return res.status(201).json({ success: true, booking: normalizeItem(booking), message: `${srv.title} session booked!` });
    }

    const db = loadData();
    const srv = db.grooming_services.find(s => s.id === service_id);
    if (!srv) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const booking = {
      id: customId,
      buyer_id: buyer_id || 'u-buyer-1',
      buyer_name: buyer_name || 'Alex Morgan',
      service_id: srv.id,
      service_title: srv.title,
      booking_date,
      time_slot,
      status: 'Scheduled',
      created_at: new Date().toISOString()
    };

    db.grooming_bookings.unshift(booking);
    saveData(db);
    res.status(201).json({ success: true, booking, message: `${srv.title} session booked!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 6. CUSTOMER SUPPORT API
// ==========================================

/**
 * GET /api/support/tickets
 */
app.get('/api/support/tickets', async (req, res) => {
  const { userId } = req.query;

  try {
    if (isMongoConnected()) {
      let query = {};
      if (userId) query.user_id = userId;

      const tickets = await SupportTicket.find(query).sort({ createdAt: -1 });
      const normalizedTickets = tickets.map(normalizeItem);
      return res.json({ success: true, tickets: normalizedTickets });
    }

    const db = loadData();
    let tickets = db.support_tickets;
    if (userId) tickets = tickets.filter(t => t.user_id === userId);

    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/support/tickets
 */
app.post('/api/support/tickets', async (req, res) => {
  const { user_id, user_name, user_email, subject, message, priority } = req.body;
  const customId = `TCK-${Math.floor(100 + Math.random() * 900)}`;

  try {
    if (isMongoConnected()) {
      const ticket = await SupportTicket.create({
        custom_id: customId,
        user_id: user_id || 'u-buyer-1',
        user_name: user_name || 'Alex Morgan',
        user_email: user_email || 'buyer@petpaws.com',
        subject,
        message,
        priority: priority || 'Medium',
        status: 'In Progress',
        response: 'Thank you for reaching out. Our customer care team is reviewing your ticket and will respond shortly.'
      });

      return res.status(201).json({ success: true, ticket: normalizeItem(ticket), message: 'Support ticket submitted successfully. Ticket ID: ' + customId });
    }

    const db = loadData();
    const ticket = {
      id: customId,
      user_id: user_id || 'u-buyer-1',
      user_name: user_name || 'Alex Morgan',
      user_email: user_email || 'buyer@petpaws.com',
      subject,
      message,
      priority: priority || 'Medium',
      status: 'In Progress',
      response: 'Thank you for reaching out. Our customer care team is reviewing your ticket and will respond shortly.',
      created_at: new Date().toISOString()
    };

    db.support_tickets.unshift(ticket);
    saveData(db);
    res.status(201).json({ success: true, ticket, message: 'Support ticket submitted successfully. Ticket ID: ' + customId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 PetPaws MERN REST API Server running on port ${PORT}`);
  console.log(`==================================================`);
});
