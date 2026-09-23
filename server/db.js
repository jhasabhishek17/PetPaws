const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DATA_FILE = path.join(__dirname, 'petpaws_data.json');

/**
 * Load raw data from petpaws_data.json
 */
const loadData = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {
        users: [],
        pets: [],
        orders: [],
        vet_profiles: [],
        vet_appointments: [],
        grooming_services: [],
        grooming_bookings: [],
        support_tickets: []
      };
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON DB file:', error);
    return {
      users: [],
      pets: [],
      orders: [],
      vet_profiles: [],
      vet_appointments: [],
      grooming_services: [],
      grooming_bookings: [],
      support_tickets: []
    };
  }
};

/**
 * Save data to petpaws_data.json
 */
const saveData = (data) => {
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
