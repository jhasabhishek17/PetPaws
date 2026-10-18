/**
 * PetPaws demo data seeder (safe + repeatable)
 *
 *   npm run seed:demo            -> insert demo records that don't exist yet
 *   npm run seed:demo -- --remove -> delete ONLY the demo records (custom_id starting with "demo-")
 *
 * Safety rules:
 *  - Every demo record has a custom_id starting with "demo-" (seller/vet names also say "(Demo)").
 *  - Records are inserted with upsert + $setOnInsert, so re-running never duplicates or overwrites anything.
 *  - Real users, pets, orders, etc. are never modified or deleted.
 *  - Demo logins: demo-buyer@petpaws.demo / demo-seller@petpaws.demo / demo-vet@petpaws.demo, password "password123".
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const User = require('./models/User');
const Pet = require('./models/Pet');
const Order = require('./models/Order');
const VetProfile = require('./models/VetProfile');
const VetAppointment = require('./models/VetAppointment');
const GroomingService = require('./models/GroomingService');
const GroomingBooking = require('./models/GroomingBooking');
const SupportTicket = require('./models/SupportTicket');

const U = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

const BUYER = { id: 'demo-buyer-1', name: 'Maya Fernandez', email: 'demo-buyer@petpaws.demo' };
const BUYER2 = { id: 'demo-buyer-2', name: 'Liam Chen', email: 'demo-buyer2@petpaws.demo' };
const SELLER = { id: 'demo-seller-1', name: 'Sunny Meadows Kennel (Demo)' };
const SELLER2 = { id: 'demo-seller-2', name: 'Whisker Haven Cattery (Demo)' };

const makeUsers = async () => {
  const password = await bcrypt.hash('password123', 10);
  return [
    { id: BUYER.id, name: BUYER.name, email: BUYER.email, password, role: 'buyer', phone: '+1 (555) 010-0001', address: '18 Maple Lane, Portland, OR' },
    { id: BUYER2.id, name: BUYER2.name, email: BUYER2.email, password, role: 'buyer', phone: '+1 (555) 010-0002', address: '77 Harbor St, Seattle, WA' },
    { id: SELLER.id, name: SELLER.name, email: 'demo-seller@petpaws.demo', password, role: 'seller', phone: '+1 (555) 010-0100', address: '200 Meadow Rd, Austin, TX', upi_id: 'sunnymeadows@upi', bank_name: 'Demo Bank', bank_account: '000011112222', ifsc_code: 'DEMO0000001' },
    { id: SELLER2.id, name: SELLER2.name, email: 'demo-seller2@petpaws.demo', password, role: 'seller', phone: '+1 (555) 010-0200', address: '9 Birch Ave, Denver, CO', upi_id: 'whiskerhaven@upi' },
    { id: 'demo-vet-user-1', name: 'Dr. Priya Raman (Demo)', email: 'demo-vet@petpaws.demo', password, role: 'vet', phone: '+1 (555) 010-0300', address: '12 Care Blvd, Austin, TX' },
  ];
};

const H = 'Fully Vaccinated, De-wormed, Microchipped, Health Certificate Included';
const pet = (n, seller, title, category, price, age, breed, gender, description, img, stock = 1, status = 'active', health = H) => ({
  id: `demo-pet-${n}`, seller_id: seller.id, seller_name: seller.name, title, category, price, age, breed, gender,
  health_status: health, description, image_url: U(img), stock, status, created_at: daysAgo(30 - n),
});

const pets = [
  pet(1, SELLER, 'Biscuit the Golden Puppy', 'Dogs', 450, '10 Weeks', 'Golden Retriever', 'Male', 'Fluffy, gentle and endlessly curious. Raised around children and already crate-trained.', '1552053831-71594a27632d', 2),
  pet(2, SELLER, 'Mochi the Frenchie', 'Dogs', 780, '12 Weeks', 'French Bulldog', 'Female', 'Sweet-natured couch companion with a big personality. Loves belly rubs and short walks.', '1583511655857-d19b40a7a54e', 1),
  pet(3, SELLER, 'Scout the Husky', 'Dogs', 620, '4 Months', 'Siberian Husky', 'Male', 'Bright blue eyes and boundless energy. Best suited to active families with a fenced yard.', '1605568427561-40dd23c2acea', 1),
  pet(4, SELLER, 'Waffles the Corgi', 'Dogs', 690, '3 Months', 'Pembroke Welsh Corgi', 'Female', 'Short legs, huge heart. Already knows sit and paw.', '1612536057832-2ff7ead58194', 1),
  pet(5, SELLER2, 'Luna the Persian', 'Cats', 520, '5 Months', 'Persian', 'Female', 'Calm, silky-coated lap cat. Litter trained and used to gentle grooming.', '1573865526739-10659fec78a5', 1),
  pet(6, SELLER2, 'Oliver the Tabby', 'Cats', 260, '4 Months', 'Domestic Shorthair', 'Male', 'Playful tabby who greets everyone at the door. Great with other cats.', '1514888286974-6c03e2ca1dba', 3),
  pet(7, SELLER2, 'Nimbus the Kitten', 'Cats', 340, '9 Weeks', 'British Shorthair', 'Female', 'Round-faced and cuddly. Comes with starter kit and 2 weeks of food.', '1592194996308-7b43878e84a6', 1),
  pet(8, SELLER2, 'Clover the Bunny', 'Rabbits', 85, '8 Weeks', 'Holland Lop', 'Female', 'Soft floppy-eared bunny who loves fresh greens and being petted.', '1585110396000-c9ffd4e4b308', 2, 'active', 'Health-checked, Spayed-ready, Vet Certificate Included'),
  pet(9, SELLER, 'Pip the Cockatiel', 'Birds', 140, '6 Months', 'Cockatiel', 'Male', 'Whistles three tunes already. Hand-tamed and comfortable perching on shoulders.', '1522926193341-e9ffd686c60f', 2, 'active', 'Avian Vet Checked, Banded, Health Certificate Included'),
  pet(10, SELLER, 'Sunny the Betta', 'Fishes', 25, '5 Months', 'Betta Splendens', 'Male', 'Vivid orange fins and a calm temperament. Includes care guide and heater tips.', '1522069169874-c58ec4b76be5', 6, 'active', 'Disease-free, Quarantined 14 Days'),
  pet(11, SELLER, 'Goldie & Friends', 'Fishes', 40, '4 Months', 'Fancy Goldfish', 'Mixed', 'A trio of healthy fancy goldfish, perfect for a 40-gallon tank.', '1524704654690-b56c05c78a00', 4, 'active', 'Disease-free, Quarantined 14 Days'),
  pet(12, SELLER2, 'Beau the Beagle', 'Dogs', 380, '5 Months', 'Beagle', 'Male', 'Nose-first explorer with a happy howl. Needs lots of walks and snacks.', '1505628346881-b72b27e84530', 0, 'sold'),
];

const orderOf = (n, buyer, p, status, daysOld, method = 'UPI') => {
  const tax = Math.round(p.price * 0.08);
  return {
    id: `demo-ORD-${1000 + n}`, buyer_id: buyer.id, buyer_name: buyer.name, buyer_email: buyer.email,
    buyer_phone: '+1 (555) 010-0001', shipping_address: '18 Maple Lane, Portland, OR',
    pet_id: p.id, pet_title: p.title, pet_category: p.category, pet_image: p.image_url,
    seller_id: p.seller_id, seller_name: p.seller_name, price: p.price, tax, total_amount: p.price + tax,
    payment_method: method, payment_status: 'Completed', tracking_code: `DEMO-TRACK-${2000 + n}`,
    tracking_status: status,
    estimated_delivery: status === 'Delivered' ? 'Delivered' : 'Within 2-3 Business Days',
    created_at: daysAgo(daysOld),
  };
};

const orders = [
  orderOf(1, BUYER, pets[11], 'Delivered', 18),
  orderOf(2, BUYER, pets[4], 'In Transit', 2, 'Card'),
  orderOf(3, BUYER, pets[7], 'Order Placed', 0, 'NetBanking'),
  orderOf(4, BUYER2, pets[0], 'In Transit', 1),
  orderOf(5, BUYER2, pets[9], 'Delivered', 9, 'Card'),
];

const vets = [
  { id: 'demo-vet-1', user_id: 'demo-vet-user-1', name: 'Dr. Priya Raman, DVM (Demo)', specialization: 'Small Animal & Preventive Care', experience: '9 Years', qualifications: 'DVM, Cornell University', clinic_address: 'Pawsitive Care Hospital, Austin, TX', consultation_fee: 45, rating: 4.9, reviews_count: 212, image_url: U('1559839734-2b71ea197ec2', 600), bio: 'Loves puppy first-visits, nutrition planning and gentle handling for nervous pets.', available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], available_slots: ['09:30 AM', '11:00 AM', '02:00 PM', '04:30 PM'] },
  { id: 'demo-vet-2', user_id: 'demo-vet-user-2', name: 'Dr. Marcus Bell, DVM (Demo)', specialization: 'Feline Medicine & Dentistry', experience: '12 Years', qualifications: 'DVM, UC Davis; Feline Dentistry Cert.', clinic_address: 'Whisker Wellness Clinic, Denver, CO', consultation_fee: 55, rating: 4.8, reviews_count: 167, image_url: U('1612349317150-e413f6a5b16d', 600), bio: 'Cat-friendly practitioner focusing on dental health, senior cat care and stress-free visits.', available_days: ['Tuesday', 'Thursday', 'Saturday'], available_slots: ['10:00 AM', '12:00 PM', '03:00 PM'] },
  { id: 'demo-vet-3', user_id: 'demo-vet-user-3', name: 'Dr. Aiko Tanaka, DVM (Demo)', specialization: 'Exotics, Birds & Aquatic Health', experience: '7 Years', qualifications: 'DVM, Tokyo University of Agriculture', clinic_address: 'Feather & Fin Exotics, Seattle, WA', consultation_fee: 60, rating: 4.7, reviews_count: 98, image_url: U('1537368910025-700350fe46c7', 600), bio: 'Rabbits, parrots, fish and reptiles — exotic pets deserve expert care too.', available_days: ['Monday', 'Wednesday', 'Friday', 'Saturday'], available_slots: ['09:00 AM', '01:00 PM', '03:30 PM'] },
];

const appointments = [
  { id: 'demo-apt-1', buyer_id: BUYER.id, buyer_name: BUYER.name, vet_id: 'demo-vet-1', vet_name: vets[0].name, pet_name: 'Biscuit (Golden Retriever)', appointment_date: daysAhead(3), time_slot: '11:00 AM', type: 'Puppy Vaccination', status: 'Confirmed', notes: 'Second round of vaccines', created_at: daysAgo(1) },
  { id: 'demo-apt-2', buyer_id: BUYER.id, buyer_name: BUYER.name, vet_id: 'demo-vet-2', vet_name: vets[1].name, pet_name: 'Luna (Persian)', appointment_date: daysAhead(7), time_slot: '12:00 PM', type: 'Dental Check', status: 'Pending', notes: 'Bad breath lately', created_at: daysAgo(0) },
  { id: 'demo-apt-3', buyer_id: BUYER.id, buyer_name: BUYER.name, vet_id: 'demo-vet-1', vet_name: vets[0].name, pet_name: 'Clover (Holland Lop)', appointment_date: daysAhead(-12), time_slot: '02:00 PM', type: 'Wellness Exam', status: 'Completed', notes: 'All healthy', created_at: daysAgo(20) },
];

const services = [
  { id: 'demo-srv-1', title: 'Royal Spa & Hydrobath', category: 'Grooming', price: 55, duration: '90 Mins', description: 'Warm organic shampoo, fluff blow-dry, ear cleaning, nail trim and a paw-pad massage.', image_url: U('1516734212186-a967f81ad0d7', 600) },
  { id: 'demo-srv-2', title: 'Puppy Obedience Starter', category: 'Training', price: 80, duration: '60 Mins', description: 'Positive-reinforcement session covering sit, stay, leash manners and crate comfort.', image_url: U('1587300003388-59208cc962cb', 600) },
  { id: 'demo-srv-3', title: 'Cat Cut & Calm Groom', category: 'Grooming', price: 48, duration: '60 Mins', description: 'Low-stress brush-out, de-matting, nail trim and a soothing lavender rinse.', image_url: U('1548681528-6a5c45b66b42', 600) },
  { id: 'demo-srv-4', title: 'Daycare & Play Day', category: 'Daycare', price: 35, duration: '8 Hours', description: 'Supervised social play, nap time and a photo update at lunch.', image_url: U('1601758228041-f3b2795255f1', 600) },
];

const bookings = [
  { id: 'demo-grm-1', buyer_id: BUYER.id, buyer_name: BUYER.name, service_id: 'demo-srv-1', service_title: services[0].title, booking_date: daysAhead(2), time_slot: '10:00 AM', status: 'Scheduled', created_at: daysAgo(1) },
  { id: 'demo-grm-2', buyer_id: BUYER.id, buyer_name: BUYER.name, service_id: 'demo-srv-2', service_title: services[1].title, booking_date: daysAhead(-8), time_slot: '02:00 PM', status: 'Completed', created_at: daysAgo(14) },
];

const tickets = [
  { id: 'demo-TCK-1', user_id: BUYER.id, user_name: BUYER.name, user_email: BUYER.email, subject: 'Where is my kitten delivery?', message: 'My tracking code shows In Transit since yesterday. Can you share an ETA?', priority: 'High', status: 'In Progress', response: 'Our transport partner confirms arrival tomorrow morning. We will notify you on pickup.', created_at: daysAgo(1) },
  { id: 'demo-TCK-2', user_id: BUYER.id, user_name: BUYER.name, user_email: BUYER.email, subject: 'Feeding schedule for a 10-week puppy', message: 'How many meals a day should Biscuit have?', priority: 'Low', status: 'Resolved', response: 'Three small meals a day until 4 months. Our vets can build a full plan — book a consult any time!', created_at: daysAgo(6) },
  { id: 'demo-TCK-3', user_id: BUYER2.id, user_name: BUYER2.name, user_email: BUYER2.email, subject: 'Invoice needs a company name', message: 'Please add our business name to the invoice for order demo-ORD-1005.', priority: 'Medium', status: 'In Progress', response: 'Thanks for reaching out. Our customer care team is reviewing your ticket and will respond shortly.', created_at: daysAgo(0) },
];

const upsertAll = async (Model, rows, label) => {
  let created = 0;
  for (const r of rows) {
    const { id, ...rest } = r;
    const res = await Model.updateOne({ custom_id: id }, { $setOnInsert: { ...rest, custom_id: id } }, { upsert: true });
    if (res.upsertedCount) created += 1;
  }
  console.log(`  ${label}: ${created} added, ${rows.length - created} already present`);
};

const run = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error('Could not connect to MongoDB. Start mongod and check MONGODB_URI in server/.env.');
    process.exit(1);
  }

  const models = [User, Pet, Order, VetProfile, VetAppointment, GroomingService, GroomingBooking, SupportTicket];

  if (process.argv.includes('--remove')) {
    for (const M of models) {
      const r = await M.deleteMany({ custom_id: /^demo-/ });
      console.log(`  ${M.modelName}: removed ${r.deletedCount} demo records`);
    }
    await mongoose.connection.close();
    return;
  }

  console.log('Seeding demo data (existing records are never touched)...');
  await upsertAll(User, await makeUsers(), 'Users');
  await upsertAll(Pet, pets, 'Pets');
  await upsertAll(Order, orders, 'Orders');
  await upsertAll(VetProfile, vets, 'Vet profiles');
  await upsertAll(VetAppointment, appointments, 'Vet appointments');
  await upsertAll(GroomingService, services, 'Grooming services');
  await upsertAll(GroomingBooking, bookings, 'Grooming bookings');
  await upsertAll(SupportTicket, tickets, 'Support tickets');
  console.log('Done. Demo logins (password "password123"): demo-buyer@petpaws.demo, demo-seller@petpaws.demo, demo-vet@petpaws.demo');
  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error('Demo seed failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});
