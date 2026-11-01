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
  vet_profiles: [],
  vet_appointments: [],
  grooming_services: [],
  grooming_bookings: [],
  support_tickets: []
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
    return { ...DEFAULT_DB_SHAPE(), ...parsed };
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
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
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
