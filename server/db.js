const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DATA_FILE = path.join(__dirname, 'petpaws_data.json');

const DEFAULT_DB_SHAPE = () => ({
  users: [],
  businesses: [],
  business_memberships: [],
  subscription_transactions: [],
  audit_logs: [],
  pets: [],
  products: [],
  orders: [],
  product_orders: [],
  vet_profiles: [
    {
      id: 'vet-01',
      custom_id: 'vet-01',
      user_id: 'u-vet-1',
      name: 'Dr. Emily Carter',
      specialization: 'Small Animal & Preventive Care',
      experience: '8 Years',
      qualifications: 'DVM, Board Certified Veterinarian',
      clinic_address: 'PetPaws Veterinary Wellness Center',
      consultation_fee: 450,
      rating: 4.9,
      reviews_count: 42,
      image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
      bio: 'Dedicated veterinary specialist providing telehealth and in-clinic preventive care.',
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      available_slots: ['09:30 AM', '11:00 AM', '02:00 PM', '04:30 PM']
    }
  ],
  vet_appointments: [],
  grooming_services: [],
  grooming_bookings: [],
  support_tickets: [],
  otp_rate_limits: []
});

/**
 * Load raw data from petpaws_data.json
 */
const loadData = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database unavailable: local JSON fallback is disabled in production.');
  }
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return DEFAULT_DB_SHAPE();
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    const defaults = DEFAULT_DB_SHAPE();
    if (!Array.isArray(parsed.vet_profiles) || parsed.vet_profiles.length === 0) {
      parsed.vet_profiles = defaults.vet_profiles;
    }
    return { ...defaults, ...parsed };
  } catch (error) {
    console.error('Error reading JSON DB file:', error);
    return DEFAULT_DB_SHAPE();
  }
};

/**
 * Save data to petpaws_data.json
 */
const saveData = (data) => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database unavailable: local JSON fallback is disabled in production.');
  }
  try {
    const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (error) {
    console.error('Error writing JSON DB file:', error);
  }
};

/**
 * Check if Mongoose connection is active
 */
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = {
  loadData,
  saveData,
  isMongoConnected
};
