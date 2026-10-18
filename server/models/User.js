/**
 * User Mongoose Model
 * 
 * Represents system users including Buyers, Sellers/Breeders, and Veterinarians.
 * Stores core credentials, contact information, role permissions, and payout settings.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Unique human-readable identifier (e.g., u-buyer-1, u-seller-2)
  custom_id: { 
    type: String, 
    unique: true, 
    index: true 
  },
  // Full Name of the user or breeder
  name: { 
    type: String, 
    required: [true, 'User name is required'],
    trim: true 
  },
  // Email address used for authentication and notifications
  email: { 
    type: String, 
    required: [true, 'Email address is required'], 
    unique: true, 
    lowercase: true,
    trim: true 
  },
  // Password string
  password: { 
    type: String, 
    required: [true, 'Password is required'] 
  },
  // System role: buyer, seller (breeder), or vet (veterinarian)
  role: { 
    type: String, 
    enum: ['buyer', 'seller', 'vet'], 
    default: 'buyer' 
  },
  // Phone contact number
  phone: { 
    type: String, 
    default: '' 
  },
  // Physical shipping address or clinic location
  address: { 
    type: String, 
    default: '' 
  },
  // UPI ID for seller earnings payouts
  upi_id: { 
    type: String, 
    default: '' 
  },
  // Bank details for direct wire payouts
  bank_name: { 
    type: String, 
    default: '' 
  },
  bank_account: { 
    type: String, 
    default: '' 
  },
  ifsc_code: { 
    type: String, 
    default: '' 
  },
  // Saved pet listing IDs for buyer wishlist
  wishlist: {
    type: [String],
    default: []
  }
}, {
  // Automatically creates createdAt and updatedAt timestamps
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
