/**
 * Product Mongoose Model (Multi-Vendor Pet Products Marketplace)
 *
 * Represents physical pet supplies sold by independent shopkeepers and pet businesses
 * across flexible categories (Food, Collars & Leashes, Apparel, Toys, Grooming Supplies,
 * Beds & Crates, Bowls & Feeders, Travel & Safety, Litter, Aquarium & Bird Supplies, etc.).
 * Supports product variants (size, color, pack size), Cloudinary media galleries,
 * inventory tracking, and administrative moderation.
 */

const mongoose = require('mongoose');

const mediaItemSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, default: '' },
  resource_type: { type: String, enum: ['image', 'video'], default: 'image' },
  format: { type: String, default: '' },
  bytes: { type: Number, default: 0 }
}, { _id: false });

const productVariantSchema = new mongoose.Schema({
  variant_id: { type: String, required: true },
  label: { type: String, required: true }, // e.g., "Medium / Ocean Blue" or "3 kg Pack"
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  pack_size: { type: String, default: '' },
  sku: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 10 }
}, { _id: false });

const productReportSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  user_name: { type: String, default: '' },
  reason: { type: String, required: true },
  created_at: { type: String, default: () => new Date().toISOString() }
}, { _id: false });

const productDiscountSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  value: {
    type: Number,
    min: 0,
    default: 0
  },
  start_date: {
    type: String,
    default: ''
  },
  end_date: {
    type: String,
    default: ''
  },
  is_active: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  }
}, { _id: false });

const productReviewSchema = new mongoose.Schema({
  review_id: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    required: true
  },
  user_name: {
    type: String,
    default: 'Verified Customer'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  verified_purchase: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: String,
    default: () => new Date().toISOString()
  }
}, { _id: false });

const productSchema = new mongoose.Schema({
  custom_id: {
    type: String,
    unique: true,
    index: true
  },
  business_id: {
    type: String,
    required: true,
    index: true
  },
  business_name: {
    type: String,
    default: ''
  },
  seller_id: {
    type: String,
    required: true,
    index: true
  },
  seller_name: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    index: true
  },
  subcategory: {
    type: String,
    default: ''
  },
  pet_type: {
    type: String,
    default: 'All Pets' // Dogs, Cats, Birds, Fishes, Rabbits, All Pets
  },
  brand: {
    type: String,
    default: 'PetPaws Essentials',
    trim: true
  },
  sku: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR'
  },
  compare_at_price: {
    type: Number,
    default: 0
  },
  is_demo: {
    type: Boolean,
    default: false
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 10
  },
  variants: {
    type: [productVariantSchema],
    default: []
  },
  description: {
    type: String,
    default: ''
  },
  features: {
    type: [String],
    default: []
  },
  ingredients_or_materials: {
    type: String,
    default: ''
  },
  safety_notes: {
    type: String,
    default: 'Verified pet-safe materials. Keep packaging away from unattended pets.'
  },
  image_url: {
    type: String,
    default: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80'
  },
  image_public_id: {
    type: String,
    default: ''
  },
  media: {
    type: [mediaItemSchema],
    default: []
  },
  discount: {
    type: productDiscountSchema,
    default: null
  },
  reviews: {
    type: [productReviewSchema],
    default: []
  },
  rating: {
    type: Number,
    default: 4.8
  },
  reviews_count: {
    type: Number,
    default: 12
  },
  moderation_status: {
    type: String,
    enum: ['approved', 'pending', 'rejected', 'suspended'],
    default: 'approved'
  },
  moderation_notes: {
    type: String,
    default: ''
  },
  report_count: {
    type: Number,
    default: 0
  },
  reports: {
    type: [productReportSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'out_of_stock', 'archived', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
