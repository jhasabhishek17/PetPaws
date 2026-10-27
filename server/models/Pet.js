/**
 * Pet Listing Mongoose Model
 * 
 * Stores marketplace pet listings including title, price, category, breed, age, gender,
 * seller reference, health verification status, media (image/video URLs & Cloudinary public IDs),
 * stock count, and active availability status.
 */

const mongoose = require('mongoose');

const mediaItemSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, default: '' },
  resource_type: { type: String, enum: ['image', 'video'], default: 'image' }
}, { _id: false });

const petSchema = new mongoose.Schema({
  // Unique custom identifier (e.g., pet-101, pet-1726000000)
  custom_id: { 
    type: String, 
    unique: true, 
    index: true 
  },
  // Reference identifier of the seller user
  seller_id: { 
    type: String, 
    required: [true, 'Seller ID is required'] 
  },
  // Display name of breeder or seller
  seller_name: { 
    type: String, 
    default: 'Verified Seller' 
  },
  // Title of the pet listing
  title: { 
    type: String, 
    required: [true, 'Pet title is required'],
    trim: true 
  },
  // Category (Dogs, Cats, Fishes, Rabbits, Birds)
  category: { 
    type: String, 
    required: [true, 'Category is required'], 
    default: 'Dogs' 
  },
  // Price in USD
  price: { 
    type: Number, 
    required: [true, 'Price is required'], 
    default: 0 
  },
  // Age string (e.g. 12 Weeks, 1 Year)
  age: { 
    type: String, 
    default: 'Young' 
  },
  // Breed identifier (e.g. Golden Retriever, Persian Cat)
  breed: { 
    type: String, 
    default: 'Mixed' 
  },
  // Gender (Male / Female)
  gender: { 
    type: String, 
    default: 'Male' 
  },
  // Health & Vaccination verification status
  health_status: { 
    type: String, 
    default: 'Health Checked & Vaccinated' 
  },
  // Detailed description of personality and care needs
  description: { 
    type: String, 
    default: '' 
  },
  // Primary image URL for thumbnail and detail display (Cloudinary URL or optional Unsplash fallback)
  image_url: { 
    type: String, 
    default: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80' 
  },
  // Cloudinary public_id for the primary image
  image_public_id: {
    type: String,
    default: ''
  },
  // Optional video URL (Cloudinary video upload)
  video_url: {
    type: String,
    default: ''
  },
  // Cloudinary public_id for the video
  video_public_id: {
    type: String,
    default: ''
  },
  // Primary media type indicator
  media_type: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  // Structured list of uploaded media assets
  media: {
    type: [mediaItemSchema],
    default: []
  },
  // Number of available pets in stock
  stock: { 
    type: Number, 
    default: 1 
  },
  // Listing status: active, sold, or unlisted
  status: { 
    type: String, 
    enum: ['active', 'sold', 'unlisted'], 
    default: 'active' 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Pet', petSchema);
