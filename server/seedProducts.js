/**
 * PetPaws Idempotent Sample Products Seeder (MongoDB + Local Fallback Sync)
 *
 * Usage:
 *   cd server && npm run seed:products
 *   (or: node server/seedProducts.js)
 *
 * Safety & Idempotency Guarantees:
 * - Uses existing configured MongoDB connection via server/config/db.js (reads MONGODB_URI from .env).
 * - Never embeds credentials in source code.
 * - Never deletes existing products, users, businesses, orders, pets, or appointments.
 * - Uses stable `custom_id` keys (e.g., "demo-prod-101" .. "demo-prod-120") with atomic
 *   `updateOne({ custom_id }, { $setOnInsert: ... }, { upsert: true })` so running the script
 *   multiple times never creates duplicate records or overwrites user edits/stock changes.
 * - Clearly marks all sample items as demonstration inventory (`is_demo: true`, "(Demo)" vendor names).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { loadData, saveData } = require('./db');

const User = require('./models/User');
const Business = require('./models/Business');
const BusinessMembership = require('./models/BusinessMembership');
const Product = require('./models/Product');

/**
 * Core platform accounts (including Platform Admin) ensured idempotently via $setOnInsert.
 * Existing accounts and passwords are never overwritten or reset.
 * Supports overriding initial setup password via ADMIN_INITIAL_PASSWORD / DEMO_USER_INITIAL_PASSWORD in .env.
 */
const CORE_PLATFORM_USERS = [
  {
    custom_id: 'u-admin-1',
    name: 'Platform Admin',
    email: 'admin@petpaws.com',
    role: 'admin',
    phone: '+91 98000 00001'
  },
  {
    custom_id: 'u-buyer-1',
    name: 'Aarav Sharma (Demo Buyer)',
    email: 'buyer@petpaws.com',
    role: 'buyer',
    phone: '+91 98200 11223',
    address: '42 MG Road, Bengaluru, KA 560001'
  },
  {
    custom_id: 'u-vet-1',
    name: 'Dr. Emily Carter (Demo Vet)',
    email: 'vet@petpaws.com',
    role: 'vet',
    business_id: 'biz-u-vet-1',
    phone: '+91 98200 44556'
  },
  {
    custom_id: 'u-groomer-1',
    name: 'Velvet Coat Pet Spa (Demo)',
    email: 'groomer@petpaws.com',
    role: 'groomer',
    business_id: 'biz-u-groomer-1',
    phone: '+91 98200 77889'
  }
];

const DEMO_VENDORS = [
  {
    user: {
      custom_id: 'u-seller-1',
      name: 'Paws & Tails Haven (Demo)',
      email: 'seller@petpaws.com',
      role: 'seller',
      business_id: 'biz-u-seller-1',
      phone: '+91 98201 11223',
      address: '12 Indiranagar 100 Feet Rd, Bengaluru, KA 560038',
      upi_id: 'pawstails@upi',
      bank_name: 'HDFC Bank',
      bank_account: '987654321012',
      ifsc_code: 'HDFC0001234'
    },
    business: {
      custom_id: 'biz-u-seller-1',
      name: 'Paws & Tails Haven (Demo)',
      slug: 'paws-tails-haven',
      business_type: 'pet_shop',
      owner_user_id: 'u-seller-1',
      owner_name: 'Paws & Tails Haven (Demo)',
      description: 'Demonstration pet nutrition & holistic supplies storefront for PetPaws marketplace.',
      contact_email: 'seller@petpaws.com',
      contact_phone: '+91 98201 11223',
      address: '12 Indiranagar 100 Feet Rd, Bengaluru, KA 560038',
      city: 'Bengaluru',
      registration_number: 'KA-PET-DEMO-001',
      gst_or_tax_id: '29AABCP1234F1Z5',
      verification_status: 'approved',
      subscription_plan: 'growth',
      billing_cycle: 'monthly',
      subscription_status: 'active',
      feature_limits: {
        max_products: 100,
        max_pets: 50,
        max_services: 30,
        max_team_members: 10,
        analytics_enabled: true,
        priority_support: true,
        commission_rate: 5
      },
      status: 'active'
    },
    membership: {
      custom_id: 'mem-biz-u-seller-1-u-seller-1',
      business_id: 'biz-u-seller-1',
      user_id: 'u-seller-1',
      user_name: 'Paws & Tails Haven (Demo)',
      user_email: 'seller@petpaws.com',
      role: 'owner',
      permissions: [
        'manage_products',
        'manage_orders',
        'manage_pets',
        'manage_services',
        'view_analytics',
        'manage_billing',
        'manage_settings'
      ],
      status: 'active'
    }
  },
  {
    user: {
      custom_id: 'u-shopkeeper-1',
      name: 'Whiskers & Wags Emporium (Demo)',
      email: 'shop@petpaws.com',
      role: 'shopkeeper',
      business_id: 'biz-u-shopkeeper-1',
      phone: '+91 98112 33445',
      address: '84 Linking Road, Bandra West, Mumbai, MH 400050',
      upi_id: 'whiskerswags@upi',
      bank_name: 'ICICI Bank',
      bank_account: '445566778899',
      ifsc_code: 'ICIC0000101'
    },
    business: {
      custom_id: 'biz-u-shopkeeper-1',
      name: 'Whiskers & Wags Emporium (Demo)',
      slug: 'whiskers-wags-emporium',
      business_type: 'pet_shop',
      owner_user_id: 'u-shopkeeper-1',
      owner_name: 'Whiskers & Wags Emporium (Demo)',
      description: 'Demonstration multi-category pet gear, beds, bowls, and travel accessories boutique.',
      contact_email: 'shop@petpaws.com',
      contact_phone: '+91 98112 33445',
      address: '84 Linking Road, Bandra West, Mumbai, MH 400050',
      city: 'Mumbai',
      registration_number: 'MH-SHOP-DEMO-114',
      gst_or_tax_id: '27AABCW5678G1Z2',
      verification_status: 'approved',
      subscription_plan: 'growth',
      billing_cycle: 'annual',
      subscription_status: 'active',
      feature_limits: {
        max_products: 100,
        max_pets: 30,
        max_services: 20,
        max_team_members: 10,
        analytics_enabled: true,
        priority_support: true,
        commission_rate: 5
      },
      status: 'active'
    },
    membership: {
      custom_id: 'mem-biz-u-shopkeeper-1-u-shopkeeper-1',
      business_id: 'biz-u-shopkeeper-1',
      user_id: 'u-shopkeeper-1',
      user_name: 'Whiskers & Wags Emporium (Demo)',
      user_email: 'shop@petpaws.com',
      role: 'owner',
      permissions: [
        'manage_products',
        'manage_orders',
        'manage_pets',
        'manage_services',
        'view_analytics',
        'manage_billing',
        'manage_settings'
      ],
      status: 'active'
    }
  }
];

/**
 * 20 Realistic Demonstration Pet Products (Prices in INR ₹)
 * Covering:
 * - Dog and cat food
 * - Pet treats
 * - Collars, leashes, and harnesses
 * - Toys
 * - Grooming supplies
 * - Beds and accessories (including apparel/rainwear)
 * - Feeding bowls & water fountains
 * - Carriers and travel accessories
 * - Litter & Aquarium supplies
 */
const SAMPLE_PRODUCTS = [
  // 1. DOG DRY FOOD
  {
    custom_id: 'demo-prod-101',
    business_id: 'biz-u-seller-1',
    business_name: 'Paws & Tails Haven (Demo)',
    seller_id: 'u-seller-1',
    seller_name: 'Paws & Tails Haven (Demo)',
    title: 'Wild Salmon & Sweet Potato Grain-Free Adult Dog Kibble',
    category: 'Food & Nutrition',
    subcategory: 'Dry Kibble',
    pet_type: 'Dogs',
    brand: 'NaturePaws Kitchen (Demo)',
    sku: 'DEMO-NP-KIB-101',
    price: 1299,
    currency: 'INR',
    compare_at_price: 1599,
    is_demo: true,
    stock: 38,
    variants: [
      { variant_id: 'var-101-1', label: '2 kg Starter Pack', pack_size: '2 kg', sku: 'DEMO-NP-KIB-2KG', price: 1299, stock: 20 },
      { variant_id: 'var-101-2', label: '6 kg Saver Bag', pack_size: '6 kg', sku: 'DEMO-NP-KIB-6KG', price: 3299, stock: 12 },
      { variant_id: 'var-101-3', label: '12 kg Breeder Sack', pack_size: '12 kg', sku: 'DEMO-NP-KIB-12KG', price: 5899, stock: 6 }
    ],
    description: 'Demonstration product: Cold-pressed, high-protein wild salmon dry dog kibble rich in Omega-3 & Omega-6 fatty acids for a lustrous coat, strong immunity, and gentle digestion.',
    features: [
      'Real Deboned Salmon #1 Ingredient',
      'Fortified with Prebiotics & Probiotics',
      'Zero Corn, Wheat, Soy, or Artificial Colors',
      'Complete & Balanced Adult Canine Nutrition'
    ],
    ingredients_or_materials: 'Deboned Salmon, Sweet Potatoes, Green Peas, Cold-Pressed Salmon Oil, Flaxseed, Chicory Root Extract, Chelated Minerals & Vitamins',
    safety_notes: 'Demonstration listing. Store in a cool, dry place and transition your dog gradually over 7 days.',
    image_url: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.9,
    reviews_count: 84,
    moderation_status: 'approved',
    status: 'active'
  },

  // 2. CAT WET FOOD
  {
    custom_id: 'demo-prod-102',
    business_id: 'biz-u-seller-1',
    business_name: 'Paws & Tails Haven (Demo)',
    seller_id: 'u-seller-1',
    seller_name: 'Paws & Tails Haven (Demo)',
    title: 'Ocean Tuna & Prawns in Savory Gravy Wet Cat Food (Pack of 12)',
    category: 'Food & Nutrition',
    subcategory: 'Wet & Canned Food',
    pet_type: 'Cats',
    brand: 'WhiskerFeast (Demo)',
    sku: 'DEMO-WF-CAT-102',
    price: 840,
    currency: 'INR',
    compare_at_price: 960,
    is_demo: true,
    stock: 45,
    variants: [
      { variant_id: 'var-102-1', label: 'Pack of 12 Pouches (12 x 85g)', pack_size: '12 Pouches', sku: 'DEMO-WF-12P', price: 840, stock: 30 },
      { variant_id: 'var-102-2', label: 'Pack of 24 Pouches (24 x 85g)', pack_size: '24 Pouches', sku: 'DEMO-WF-24P', price: 1599, stock: 15 }
    ],
    description: 'Demonstration product: Moisture-rich shredded ocean tuna and prawn fillets slow-cooked in hydrating broth with added taurine for feline heart and vision health.',
    features: [
      'High Moisture Content for Urinary Tract Health',
      'Enriched with Essential Taurine & Vitamin E',
      'Grain-Free & Carrageenan-Free Recipe',
      'Easy-Tear 85g Freshness Pouches'
    ],
    ingredients_or_materials: 'Tuna Fillets, Fish Broth, Prawns, Sunflower Oil, Taurine, Vitamin E Supplement, Minerals',
    safety_notes: 'Demonstration listing. Refrigerate unused portion after opening and serve within 24 hours.',
    image_url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.8,
    reviews_count: 63,
    moderation_status: 'approved',
    status: 'active'
  },

  // 3. PET TREATS — DENTAL CHEWS
  {
    custom_id: 'demo-prod-103',
    business_id: 'biz-u-seller-1',
    business_name: 'Paws & Tails Haven (Demo)',
    seller_id: 'u-seller-1',
    seller_name: 'Paws & Tails Haven (Demo)',
    title: 'Himalayan Yak Milk Long-Lasting Dental Chew Bars for Dogs',
    category: 'Food & Nutrition',
    subcategory: 'Dental Chews',
    pet_type: 'Dogs',
    brand: 'Himalayan Chew Co. (Demo)',
    sku: 'DEMO-HC-YAK-103',
    price: 499,
    currency: 'INR',
    compare_at_price: 599,
    is_demo: true,
    stock: 52,
    variants: [
      { variant_id: 'var-103-1', label: 'Medium Dogs (2 Bars - 140g)', pack_size: '140 g', sku: 'DEMO-HC-MED', price: 499, stock: 32 },
      { variant_id: 'var-103-2', label: 'Large Dogs (3 Bars - 300g)', pack_size: '300 g', sku: 'DEMO-HC-LRG', price: 899, stock: 20 }
    ],
    description: 'Demonstration product: Traditional smoke-dried Himalayan yak and cow milk cheese chews that naturally scrape away plaque and tartar while keeping dogs happily occupied.',
    features: [
      '100% Natural Yak & Cow Milk — 4 Simple Ingredients',
      'Lactose-Free, Gluten-Free & Easily Digestible',
      'Promotes Clean Teeth & Fresh Breath',
      'End Piece Puffs into Crunchy Treat in Microwave'
    ],
    ingredients_or_materials: 'Pasteurized Yak Milk, Cow Milk, Lime Juice, trace Himalayan Rock Salt',
    safety_notes: 'Demonstration listing. Always supervise your dog while chewing and provide fresh drinking water.',
    image_url: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.9,
    reviews_count: 91,
    moderation_status: 'approved',
    status: 'active'
  },

  // 4. PET TREATS — FREEZE-DRIED TRAINING TREATS
  {
    custom_id: 'demo-prod-104',
    business_id: 'biz-u-seller-1',
    business_name: 'Paws & Tails Haven (Demo)',
    seller_id: 'u-seller-1',
    seller_name: 'Paws & Tails Haven (Demo)',
    title: 'Freeze-Dried Single-Ingredient Chicken Breast Training Treats',
    category: 'Food & Nutrition',
    subcategory: 'Training Treats',
    pet_type: 'All Pets',
    brand: 'NaturePaws Kitchen (Demo)',
    sku: 'DEMO-NP-TRT-104',
    price: 399,
    currency: 'INR',
    compare_at_price: 499,
    is_demo: true,
    stock: 60,
    variants: [
      { variant_id: 'var-104-1', label: '75g Resealable Training Tub', pack_size: '75 g', sku: 'DEMO-NP-TRT-75', price: 399, stock: 40 },
      { variant_id: 'var-104-2', label: '150g Value Canister', pack_size: '150 g', sku: 'DEMO-NP-TRT-150', price: 699, stock: 20 }
    ],
    description: 'Demonstration product: Bite-sized, high-reward freeze-dried 100% pure chicken breast cubes ideal for puppy obedience training and picky cats.',
    features: [
      'Single Ingredient: 100% Human-Grade Chicken Breast',
      'Low Calorie (Under 2 kcal per Cube)',
      'Does Not Crumble or Leave Greasy Pockets',
      'Suitable for Both Dogs and Cats'
    ],
    ingredients_or_materials: '100% Freeze-Dried Boneless Skinless Chicken Breast',
    safety_notes: 'Demonstration listing. Feed as a reward or meal topper up to 10% of daily caloric intake.',
    image_url: 'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.8,
    reviews_count: 72,
    moderation_status: 'approved',
    status: 'active'
  },

  // 5. COLLARS, LEASHES & HARNESSES — NO-PULL HARNESS
  {
    custom_id: 'demo-prod-105',
    business_id: 'biz-u-seller-1',
    business_name: 'Paws & Tails Haven (Demo)',
    seller_id: 'u-seller-1',
    seller_name: 'Paws & Tails Haven (Demo)',
    title: 'TrailGuard Reflective No-Pull Padded Air-Mesh Dog Harness',
    category: 'Collars & Leashes',
    subcategory: 'No-Pull Harnesses',
    pet_type: 'Dogs',
    brand: 'TrailGuard Gear (Demo)',
    sku: 'DEMO-TG-HRN-105',
    price: 1199,
    currency: 'INR',
    compare_at_price: 1499,
    is_demo: true,
    stock: 29,
    variants: [
      { variant_id: 'var-105-1', label: 'Small / Forest Sage', size: 'Small', color: 'Forest Sage', sku: 'DEMO-TG-HRN-S', price: 1099, stock: 10 },
      { variant_id: 'var-105-2', label: 'Medium / Terracotta Orange', size: 'Medium', color: 'Terracotta', sku: 'DEMO-TG-HRN-M', price: 1199, stock: 12 },
      { variant_id: 'var-105-3', label: 'Large / Midnight Slate', size: 'Large', color: 'Midnight Slate', sku: 'DEMO-TG-HRN-L', price: 1349, stock: 7 }
    ],
    description: 'Demonstration product: Ergonomic breathable chest harness featuring front and back aircraft-aluminum leash attachment rings, padded traffic handle, and 3M reflective trim.',
    features: [
      'Front Chest Clip Stops Leash Pulling Safely',
      'Breathable Padded Air-Mesh Prevents Chafing',
      '360-Degree 3M Nighttime Reflective Stitching',
      '4-Point Quick-Release Adjustment Buckles'
    ],
    ingredients_or_materials: 'Ripstop 900D Oxford Nylon, Breathable Air-Mesh, Anodized Aluminum D-Rings, Duraflex Buckles',
    safety_notes: 'Demonstration listing. Ensure two fingers fit comfortably between the harness straps and your dog’s chest.',
    image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.9,
    reviews_count: 108,
    moderation_status: 'approved',
    status: 'active'
  },

  // 6. COLLARS & LEASHES — ROPE LEASH & COLLAR COMBO
  {
    custom_id: 'demo-prod-106',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'UrbanWalk Mountain Climbing Rope Leash & Neoprene Collar Set',
    category: 'Collars & Leashes',
    subcategory: 'Retractable & Rope Leashes',
    pet_type: 'Dogs',
    brand: 'TrailGuard Gear (Demo)',
    sku: 'DEMO-TG-LSH-106',
    price: 799,
    currency: 'INR',
    compare_at_price: 999,
    is_demo: true,
    stock: 34,
    variants: [
      { variant_id: 'var-106-1', label: '5 ft Leash + Medium Collar (Teal)', size: '5 ft / Medium', color: 'Teal', sku: 'DEMO-TG-LSH-M', price: 799, stock: 20 },
      { variant_id: 'var-106-2', label: '6 ft Leash + Large Collar (Crimson)', size: '6 ft / Large', color: 'Crimson', sku: 'DEMO-TG-LSH-L', price: 899, stock: 14 }
    ],
    description: 'Demonstration product: Heavy-duty 12mm rock-climbing nylon rope leash paired with a soft neoprene-lined everyday collar and 360-degree tangle-free swivel clasp.',
    features: [
      'High-Tensile 12mm Braided Climbing Rope',
      'Soft Neoprene Padded Handle Protects Hands',
      'Rustproof Zinc-Alloy Locking Carabiner Hook',
      'Includes Matching Adjustable Padded Collar'
    ],
    ingredients_or_materials: 'Braided Polyamide Climbing Rope, Neoprene Padding, Zinc-Alloy Swivel Clasp',
    safety_notes: 'Demonstration listing. Inspect clasp and stitching periodically for signs of wear.',
    image_url: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.7,
    reviews_count: 54,
    moderation_status: 'approved',
    status: 'active'
  },

  // 7. TOYS — INTERACTIVE PUZZLE BOARD
  {
    custom_id: 'demo-prod-107',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'SmartPaws Interactive Treat-Dispensing Puzzle & Slow Feeder Game',
    category: 'Toys & Enrichment',
    subcategory: 'Interactive Puzzle Toys',
    pet_type: 'All Pets',
    brand: 'SmartPaws Lab (Demo)',
    sku: 'DEMO-SP-PUZ-107',
    price: 899,
    currency: 'INR',
    compare_at_price: 1199,
    is_demo: true,
    stock: 30,
    variants: [
      { variant_id: 'var-107-1', label: 'Level 1 — Beginner Slider Board', size: 'Level 1', sku: 'DEMO-SP-PUZ-L1', price: 749, stock: 16 },
      { variant_id: 'var-107-2', label: 'Level 2 — Spin, Flip & Slide', size: 'Level 2', sku: 'DEMO-SP-PUZ-L2', price: 899, stock: 14 }
    ],
    description: 'Demonstration product: Canine and feline cognitive enrichment board with 14 hidden kibble compartments that curb boredom, destructive chewing, and gulping.',
    features: [
      '14 Multi-Step Treat Compartments',
      'Non-Slip Silicone Base Ring',
      'Food-Grade BPA, PVC & Phthalate-Free Polymer',
      'Top-Rack Dishwasher Safe for Easy Cleaning'
    ],
    ingredients_or_materials: 'Food-Safe Composite ABS Polymer, Non-Slip Silicone Pads',
    safety_notes: 'Demonstration listing. Intended for supervised mental enrichment play.',
    image_url: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.8,
    reviews_count: 93,
    moderation_status: 'approved',
    status: 'active'
  },

  // 8. TOYS — HEAVY-DUTY RUBBER CHEW & TUG SET
  {
    custom_id: 'demo-prod-108',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'TuffChew Natural Rubber Peanut-Butter Stuffable Bone & Rope Tug',
    category: 'Toys & Enrichment',
    subcategory: 'Heavy-Duty Chew Toys',
    pet_type: 'Dogs',
    brand: 'SmartPaws Lab (Demo)',
    sku: 'DEMO-SP-CHW-108',
    price: 549,
    currency: 'INR',
    compare_at_price: 699,
    is_demo: true,
    stock: 44,
    variants: [
      { variant_id: 'var-108-1', label: 'Medium Chewers', size: 'Medium', sku: 'DEMO-SP-CHW-M', price: 549, stock: 26 },
      { variant_id: 'var-108-2', label: 'XL Power Chewers', size: 'XL', sku: 'DEMO-SP-CHW-XL', price: 699, stock: 18 }
    ],
    description: 'Demonstration product: Ultra-durable natural tree rubber chew toy with hollow treat-stuffing grooves paired with a 100% braided cotton dental tug rope.',
    features: [
      'Puncture-Resistant Natural Malaysian Rubber',
      'Hollow Cavity Holds Peanut Butter or Wet Food',
      'Textured Nubs Massage Gums During Play',
      'Floats in Water for Pool & Beach Fetch'
    ],
    ingredients_or_materials: '100% Natural Non-Toxic Tree Rubber, Unbleached Braided Cotton Rope',
    safety_notes: 'Demonstration listing. Replace toy if small pieces begin to tear off.',
    image_url: 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.7,
    reviews_count: 68,
    moderation_status: 'approved',
    status: 'active'
  },

  // 9. TOYS — CATNIP FEATHER TEASER & TRACK BALL TOWER
  {
    custom_id: 'demo-prod-109',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'PurrPlay 3-Tier Spinning Ball Tower & Organic Catnip Feather Wand',
    category: 'Toys & Enrichment',
    subcategory: 'Catnip & Feather Teasers',
    pet_type: 'Cats',
    brand: 'PurrPlay Studio (Demo)',
    sku: 'DEMO-PP-CAT-109',
    price: 649,
    currency: 'INR',
    compare_at_price: 799,
    is_demo: true,
    stock: 27,
    variants: [],
    description: 'Demonstration product: Engaging 3-level spinning ball chaser tower bundled with a retractable carbon-fiber feather teaser wand and organic North American catnip pouch.',
    features: [
      '3 Spinning Track Balls Keep Indoor Cats Active',
      'Includes Telescopic Feather Wand + 3 Refill Heads',
      'Bundled with Resealable Organic Catnip Tube',
      'Non-Skid Base Stands Up to Energetic Pouncing'
    ],
    ingredients_or_materials: 'PP Resin Tower, Natural Pheasant Feathers, Organic Nepeta Cataria (Catnip)',
    safety_notes: 'Demonstration listing. Put wand away after interactive play sessions to prevent string ingestion.',
    image_url: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.9,
    reviews_count: 51,
    moderation_status: 'approved',
    status: 'active'
  },

  // 10. GROOMING SUPPLIES — OATMEAL & NEEM SHAMPOO
  {
    custom_id: 'demo-prod-110',
    business_id: 'biz-u-seller-1',
    business_name: 'Paws & Tails Haven (Demo)',
    seller_id: 'u-seller-1',
    seller_name: 'Paws & Tails Haven (Demo)',
    title: 'Botanical Colloidal Oatmeal, Neem & Aloe Soothing Pet Shampoo',
    category: 'Grooming & Hygiene',
    subcategory: 'Oatmeal & Medicated Shampoos',
    pet_type: 'All Pets',
    brand: 'PureCoat Botanics (Demo)',
    sku: 'DEMO-PC-SHM-110',
    price: 449,
    currency: 'INR',
    compare_at_price: 549,
    is_demo: true,
    stock: 46,
    variants: [
      { variant_id: 'var-110-1', label: '300 ml Flip-Top Bottle', pack_size: '300 ml', sku: 'DEMO-PC-SHM-300', price: 449, stock: 30 },
      { variant_id: 'var-110-2', label: '750 ml Salon Dispenser Pump', pack_size: '750 ml', sku: 'DEMO-PC-SHM-750', price: 899, stock: 16 }
    ],
    description: 'Demonstration product: pH-balanced, soap-free herbal pet wash formulated with colloidal oatmeal, cold-pressed neem leaf extract, and organic aloe vera for itchy or sensitive skin.',
    features: [
      'pH 7.0 Balanced Specifically for Dog & Cat Skin',
      'Calms Seasonal Itching, Dandruff & Hot Spots',
      'Sulphate-Free, Paraben-Free & Tear-Free Formula',
      'Safe to Use Alongside Spot-On Flea Treatments'
    ],
    ingredients_or_materials: 'Purified Water, Colloidal Oatmeal, Azadirachta Indica (Neem) Extract, Aloe Barbadensis Juice, Provitamin B5',
    safety_notes: 'Demonstration listing. For external coat washing only; avoid direct contact with inner ear canals.',
    image_url: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.9,
    reviews_count: 77,
    moderation_status: 'approved',
    status: 'active'
  },

  // 11. GROOMING SUPPLIES — DE-SHEDDING BRUSH & NAIL CLIPPER KIT
  {
    custom_id: 'demo-prod-111',
    business_id: 'biz-u-seller-1',
    business_name: 'Paws & Tails Haven (Demo)',
    seller_id: 'u-seller-1',
    seller_name: 'Paws & Tails Haven (Demo)',
    title: 'ProGroom One-Click Self-Cleaning Slicker Brush & Safety Nail Clipper Kit',
    category: 'Grooming & Hygiene',
    subcategory: 'De-Shedding Brushes & Combs',
    pet_type: 'All Pets',
    brand: 'PureCoat Botanics (Demo)',
    sku: 'DEMO-PC-BRS-111',
    price: 599,
    currency: 'INR',
    compare_at_price: 799,
    is_demo: true,
    stock: 36,
    variants: [],
    description: 'Demonstration product: Gentle resin-tipped stainless steel slicker brush with push-button hair release paired with a quick-stop safety guard nail trimmer and file.',
    features: [
      'Reduces Loose Shedding Hair by Up to 90%',
      'Rounded Massage Beads Protect Sensitive Skin',
      'One-Click Retractable Bristle Cleaning Button',
      'Includes Stainless Nail Clipper with Safety Guard'
    ],
    ingredients_or_materials: '304 Stainless Steel Bristles & Blades, Ergonomic TPR Non-Slip Grip',
    safety_notes: 'Demonstration listing. Brush in the direction of coat growth; avoid clipping into the pink nail quick.',
    image_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.8,
    reviews_count: 64,
    moderation_status: 'approved',
    status: 'active'
  },

  // 12. BEDS & ACCESSORIES — ORTHOPEDIC MEMORY FOAM BED
  {
    custom_id: 'demo-prod-112',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'CloudRest Orthopedic Memory Foam Bolster Sofa Pet Bed',
    category: 'Beds & Crates',
    subcategory: 'Orthopedic Memory Foam Beds',
    pet_type: 'All Pets',
    brand: 'CloudRest Living (Demo)',
    sku: 'DEMO-CR-BED-112',
    price: 2499,
    currency: 'INR',
    compare_at_price: 3199,
    is_demo: true,
    stock: 19,
    variants: [
      { variant_id: 'var-112-1', label: 'Medium (30x20 in) / Oatmeal Linen', size: 'Medium', color: 'Oatmeal Linen', sku: 'DEMO-CR-BED-M', price: 2499, stock: 11 },
      { variant_id: 'var-112-2', label: 'Large (40x30 in) / Charcoal Velvet', size: 'Large', color: 'Charcoal Velvet', sku: 'DEMO-CR-BED-L', price: 3299, stock: 8 }
    ],
    description: 'Demonstration product: Therapeutic high-density egg-crate memory foam pet mattress with 3-sided pillow bolsters, waterproof inner liner, and machine-washable outer cover.',
    features: [
      '4-Inch Orthopedic Egg-Crate Memory Foam Base',
      'Waterproof Inner Zipper Liner Protects Foam',
      'Removable Machine-Washable Quilted Cover',
      'Anti-Skid Dotted Rubber Bottom'
    ],
    ingredients_or_materials: 'CertiPUR-US Memory Foam, Quilted Micro-Velvet Linen, TPU Waterproof Liner',
    safety_notes: 'Demonstration listing. Allow 24 hours after unrolling for memory foam to expand fully.',
    image_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.9,
    reviews_count: 115,
    moderation_status: 'approved',
    status: 'active'
  },

  // 13. BEDS & ACCESSORIES — CAT TREE & SCRATCHING POST
  {
    custom_id: 'demo-prod-113',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'WhiskerLoft 120cm Multi-Level Sisal Cat Tree Condo & Hammock',
    category: 'Beds & Crates',
    subcategory: 'Cat Trees & Scratching Posts',
    pet_type: 'Cats',
    brand: 'CloudRest Living (Demo)',
    sku: 'DEMO-CR-TRE-113',
    price: 2899,
    currency: 'INR',
    compare_at_price: 3599,
    is_demo: true,
    stock: 14,
    variants: [],
    description: 'Demonstration product: Sturdy 4-tier feline activity tower with natural sisal-wrapped scratching columns, enclosed nap condo, basket hammock, and top window perch.',
    features: [
      '100% Natural Wound Sisal Rope Scratching Posts',
      'Plush Top Lookout Perch with Raised Rim',
      'Cozy Hideaway Cube + Deep Lounge Hammock',
      'Reinforced Baseboard with Anti-Tip Wall Strap'
    ],
    ingredients_or_materials: 'CARB-P2 Engineered Wood, Natural Sisal Rope, 400g Faux-Fur Plush Fabric',
    safety_notes: 'Demonstration listing. Place against a wall on a flat surface; assembly hex key included.',
    image_url: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.8,
    reviews_count: 49,
    moderation_status: 'approved',
    status: 'active'
  },

  // 14. APPAREL & ACCESSORIES — WATERPROOF MONSOON/WINTER JACKET
  {
    custom_id: 'demo-prod-114',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'Nordic Fleece-Lined Waterproof Winter & Monsoon Pet Parka',
    category: 'Apparel & Winter Wear',
    subcategory: 'Insulated Winter Jackets',
    pet_type: 'Dogs',
    brand: 'CozyHound Studio (Demo)',
    sku: 'DEMO-CH-PRK-114',
    price: 999,
    currency: 'INR',
    compare_at_price: 1299,
    is_demo: true,
    stock: 25,
    variants: [
      { variant_id: 'var-114-1', label: 'Small / Mustard Yellow', size: 'Small', color: 'Mustard Yellow', sku: 'DEMO-CH-PRK-S', price: 899, stock: 8 },
      { variant_id: 'var-114-2', label: 'Medium / Pine Green', size: 'Medium', color: 'Pine Green', sku: 'DEMO-CH-PRK-M', price: 999, stock: 10 },
      { variant_id: 'var-114-3', label: 'Large / Crimson Berry', size: 'Large', color: 'Crimson Berry', sku: 'DEMO-CH-PRK-L', price: 1149, stock: 7 }
    ],
    description: 'Demonstration product: All-weather waterproof outer shell jacket with warm sherpa fleece lining, reflective piping, and a waterproof zippered harness leash opening.',
    features: [
      'Water-Repellent & Windproof Outer Fabric',
      'Ultra-Soft Thermal Sherpa Fleece Lining',
      'Built-In Zippered Leash & Harness Portal',
      'Adjustable Hook-and-Loop Belly Closure'
    ],
    ingredients_or_materials: '100% Coated Waterproof Polyester Shell, Thermal Sherpa Fleece Interior',
    safety_notes: 'Demonstration listing. Machine wash cold on gentle cycle and air dry.',
    image_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.9,
    reviews_count: 58,
    moderation_status: 'approved',
    status: 'active'
  },

  // 15. FEEDING BOWLS & FOUNTAINS — STAINLESS STEEL WATER FOUNTAIN
  {
    custom_id: 'demo-prod-115',
    business_id: 'biz-u-seller-1',
    business_name: 'Paws & Tails Haven (Demo)',
    seller_id: 'u-seller-1',
    seller_name: 'Paws & Tails Haven (Demo)',
    title: 'AquaPure 2.5L Whisper-Quiet 304 Stainless Steel Pet Water Fountain',
    category: 'Bowls & Feeders',
    subcategory: 'Filtered Water Fountains',
    pet_type: 'All Pets',
    brand: 'AquaPure Pets (Demo)',
    sku: 'DEMO-AP-FNT-115',
    price: 1899,
    currency: 'INR',
    compare_at_price: 2399,
    is_demo: true,
    stock: 22,
    variants: [
      { variant_id: 'var-115-1', label: '2.5L Fountain + 3 Carbon Filters', pack_size: 'Standard Kit', sku: 'DEMO-AP-FNT-STD', price: 1899, stock: 15 },
      { variant_id: 'var-115-2', label: '2.5L Fountain + 9 Filter Annual Bundle', pack_size: 'Value Bundle', sku: 'DEMO-AP-FNT-BND', price: 2399, stock: 7 }
    ],
    description: 'Demonstration product: Hygienic 304 food-grade stainless steel circulating pet drinking fountain with triple-stage activated carbon filtration and dry-burn auto-shutoff pump.',
    features: [
      'Dishwasher-Safe 304 Food-Grade Stainless Steel',
      'Ultra-Quiet <25dB Submersible USB Pump',
      'LED Water-Level Window with Auto Shutoff',
      'Encourages Cats & Dogs to Drink More Water'
    ],
    ingredients_or_materials: '304 Austenitic Stainless Steel, Coconut Shell Activated Carbon, Ion-Exchange Resin',
    safety_notes: 'Demonstration listing. Rinse filter before first use and clean pump impeller every 2 weeks.',
    image_url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.8,
    reviews_count: 82,
    moderation_status: 'approved',
    status: 'active'
  },

  // 16. FEEDING BOWLS — ELEVATED BAMBOO DOUBLE BOWL DINER
  {
    custom_id: 'demo-prod-116',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'Ergonomic Bamboo Elevated Double Stainless Steel Feeding Bowls',
    category: 'Bowls & Feeders',
    subcategory: 'Stainless Steel & Ceramic Bowls',
    pet_type: 'All Pets',
    brand: 'AquaPure Pets (Demo)',
    sku: 'DEMO-AP-BWL-116',
    price: 949,
    currency: 'INR',
    compare_at_price: 1199,
    is_demo: true,
    stock: 31,
    variants: [
      { variant_id: 'var-116-1', label: 'Small — 2 x 450ml Bowls (Cats & Small Dogs)', size: '450 ml x 2', sku: 'DEMO-AP-BWL-S', price: 949, stock: 18 },
      { variant_id: 'var-116-2', label: 'Large — 2 x 900ml Bowls (Medium/Large Dogs)', size: '900 ml x 2', sku: 'DEMO-AP-BWL-L', price: 1249, stock: 13 }
    ],
    description: 'Demonstration product: Tilted 15-degree natural bamboo feeding stand with two removable mirror-polished stainless steel bowls to reduce neck strain and aid digestion.',
    features: [
      '15-Degree Ergonomic Tilt Reduces Neck Strain',
      'Water-Resistant Natural Moso Bamboo Stand',
      '2 Removable Rust-Free Stainless Steel Bowls',
      'Silicone Anti-Rattle & Non-Slip Foot Pads'
    ],
    ingredients_or_materials: 'varnished Moso Bamboo Wood, 304 Food-Grade Stainless Steel Bowls',
    safety_notes: 'Demonstration listing. Stainless bowls are dishwasher safe; wipe bamboo stand with a damp cloth.',
    image_url: 'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.8,
    reviews_count: 61,
    moderation_status: 'approved',
    status: 'active'
  },

  // 17. CARRIERS & TRAVEL ACCESSORIES — EXPANDABLE AIRLINE CARRIER
  {
    custom_id: 'demo-prod-117',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'AeroCabin Expandable Airline-Approved Soft Pet Travel Carrier',
    category: 'Travel & Safety',
    subcategory: 'Airline-Approved Soft Carriers',
    pet_type: 'All Pets',
    brand: 'AeroCabin Transit (Demo)',
    sku: 'DEMO-AC-CAR-117',
    price: 2199,
    currency: 'INR',
    compare_at_price: 2699,
    is_demo: true,
    stock: 16,
    variants: [
      { variant_id: 'var-117-1', label: 'Standard Cabin / Slate Grey', color: 'Slate Grey', sku: 'DEMO-AC-CAR-GRY', price: 2199, stock: 10 },
      { variant_id: 'var-117-2', label: 'Standard Cabin / Sage Olive', color: 'Sage Olive', sku: 'DEMO-AC-CAR-OLV', price: 2199, stock: 6 }
    ],
    description: 'Demonstration product: Under-seat cabin-compliant pet travel bag featuring dual zip-out breathable mesh expansion wings, auto-locking zippers, and a plush washable pad.',
    features: [
      'Fits Domestic & International Under-Seat Cabin Spaces',
      'Dual Zip-Out Mesh Lounging Expansion Wings',
      'Built-In Collar Safety Tether & Luggage Trolley Sleeve',
      'Claw-Resistant Ventilation Mesh on 4 Sides'
    ],
    ingredients_or_materials: '600D Ballistic Oxford Nylon, Reinforced Fiberglass Mesh, Sherpa Fleece Base Pad',
    safety_notes: 'Demonstration listing. Suitable for cats and small dogs up to 8 kg; verify airline cabin rules before flying.',
    image_url: 'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.9,
    reviews_count: 47,
    moderation_status: 'approved',
    status: 'active'
  },

  // 18. CARRIERS & TRAVEL ACCESSORIES — WATERPROOF CAR BACKSEAT HAMMOCK
  {
    custom_id: 'demo-prod-118',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'RoadRover Quilted Waterproof Car Backseat Hammock & Seatbelt Tether',
    category: 'Travel & Safety',
    subcategory: 'Car Seat Covers & Hammocks',
    pet_type: 'Dogs',
    brand: 'AeroCabin Transit (Demo)',
    sku: 'DEMO-AC-HAM-118',
    price: 1599,
    currency: 'INR',
    compare_at_price: 1999,
    is_demo: true,
    stock: 21,
    variants: [],
    description: 'Demonstration product: Heavy-duty 4-layer waterproof car seat protector hammock with mesh AC viewing window, side door flaps, and an adjustable seatbelt safety tether.',
    features: [
      '100% Waterproof 600D Quilted Oxford Surface',
      'Breathable Mesh Center Window Reduces Car Anxiety',
      'Includes Clip-In Seatbelt Safety Restraint Tether',
      'Universal Fit for Hatchbacks, Sedans & SUVs'
    ],
    ingredients_or_materials: '600D Heavy-Duty Oxford Cloth, Waterproof TPU Coating, Non-Slip PVC Backing',
    safety_notes: 'Demonstration listing. Always attach the seatbelt tether to a dog harness, never to a neck collar.',
    image_url: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.8,
    reviews_count: 53,
    moderation_status: 'approved',
    status: 'active'
  },

  // 19. LITTER & ACCESSORIES — NATURAL TOFU CAT LITTER
  {
    custom_id: 'demo-prod-119',
    business_id: 'biz-u-seller-1',
    business_name: 'Paws & Tails Haven (Demo)',
    seller_id: 'u-seller-1',
    seller_name: 'Paws & Tails Haven (Demo)',
    title: 'EcoClump Natural Green Tea Pea-Fiber Tofu Cat Litter (Dust-Free)',
    category: 'Litter & Accessories',
    subcategory: 'Clumping Clay & Tofu Litter',
    pet_type: 'Cats',
    brand: 'EcoClump Feline (Demo)',
    sku: 'DEMO-EC-LIT-119',
    price: 699,
    currency: 'INR',
    compare_at_price: 849,
    is_demo: true,
    stock: 39,
    variants: [
      { variant_id: 'var-119-1', label: '2.8 kg Single Bag (6 Litres)', pack_size: '2.8 kg', sku: 'DEMO-EC-LIT-6L', price: 699, stock: 24 },
      { variant_id: 'var-119-2', label: '8.4 kg Triple Value Pack (18 Litres)', pack_size: '8.4 kg', sku: 'DEMO-EC-LIT-18L', price: 1899, stock: 15 }
    ],
    description: 'Demonstration product: 99.9% dust-free biodegradable pea-fiber pellets that form tight clumps in 3 seconds and neutralize ammonia odors with natural green tea extract.',
    features: [
      '100% Plant-Derived Food-Grade Pea Fiber',
      'Fast 3-Second Clumping & Non-Sticking Bottom',
      'Low-Tracking 2mm Pellets Gentle on Kitten Paws',
      'Natural Green Tea Botanical Odor Lock'
    ],
    ingredients_or_materials: 'Pea Fiber, Corn Starch, Green Tea Extract, Food-Grade Guar Gum',
    safety_notes: 'Demonstration listing. Scoop solid clumps daily and store sealed bag in a dry area.',
    image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.8,
    reviews_count: 69,
    moderation_status: 'approved',
    status: 'active'
  },

  // 20. AQUARIUM & BIRD SUPPLIES — SILENT HANG-ON AQUARIUM FILTER
  {
    custom_id: 'demo-prod-120',
    business_id: 'biz-u-shopkeeper-1',
    business_name: 'Whiskers & Wags Emporium (Demo)',
    seller_id: 'u-shopkeeper-1',
    seller_name: 'Whiskers & Wags Emporium (Demo)',
    title: 'BioReef 3-Stage Silent Aquarium Hang-On Filter & Surface Skimmer',
    category: 'Aquarium & Bird Supplies',
    subcategory: 'Aquarium Filters & Heaters',
    pet_type: 'Fishes',
    brand: 'BioReef Aquatics (Demo)',
    sku: 'DEMO-BR-FLT-120',
    price: 1299,
    currency: 'INR',
    compare_at_price: 1599,
    is_demo: true,
    stock: 15,
    variants: [
      { variant_id: 'var-120-1', label: '400 L/H (Up to 100L Tank)', size: '400 L/H', sku: 'DEMO-BR-FLT-400', price: 1299, stock: 9 },
      { variant_id: 'var-120-2', label: '750 L/H (Up to 250L Tank)', size: '750 L/H', sku: 'DEMO-BR-FLT-750', price: 1799, stock: 6 }
    ],
    description: 'Demonstration product: Whisper-quiet biological, mechanical, and activated carbon waterfall filter with built-in surface oil-film skimmer for planted and freshwater aquariums.',
    features: [
      '3-Stage Mechanical, Carbon & Ceramic Bio-Filtration',
      'Built-In Surface Skimmer Removes Protein Film',
      'Adjustable Flow Dial for Betta & Shrimp Tanks',
      'Quiet <30dB Motor with Ceramic Shaft'
    ],
    ingredients_or_materials: 'Aquarium-Safe ABS Housing, Quartz Bio-Rings, Activated Carbon Cartridge',
    safety_notes: 'Demonstration listing. Prime filter chamber with aquarium water before plugging in.',
    image_url: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=800&q=80',
    image_public_id: '',
    rating: 4.9,
    reviews_count: 42,
    moderation_status: 'approved',
    status: 'active'
  }
];

/**
 * Synchronizes the sample products and demo vendor accounts into local petpaws_data.json
 * idempotently without removing any user-created records.
 */
const syncLocalJsonFallback = () => {
  try {
    const db = loadData();
    if (!Array.isArray(db.products)) db.products = [];
    if (!Array.isArray(db.businesses)) db.businesses = [];
    if (!Array.isArray(db.business_memberships)) db.business_memberships = [];

    // Remove legacy USD prod-201..prod-210 only if they are unmodified seed placeholders,
    // and upsert demo-prod-101..120 idempotently by custom_id.
    const legacySeedIds = new Set([
      'prod-201', 'prod-202', 'prod-203', 'prod-204', 'prod-205',
      'prod-206', 'prod-207', 'prod-208', 'prod-209', 'prod-210'
    ]);
    db.products = db.products.filter(p => !legacySeedIds.has(p.custom_id || p.id));

    let localInserted = 0;
    let localSkipped = 0;

    for (const prod of SAMPLE_PRODUCTS) {
      const existsIdx = db.products.findIndex(
        p => p.custom_id === prod.custom_id || p.id === prod.custom_id
      );
      if (existsIdx === -1) {
        db.products.push({
          id: prod.custom_id,
          ...prod,
          created_at: new Date().toISOString()
        });
        localInserted += 1;
      } else {
        localSkipped += 1;
      }
    }

    saveData(db);
    return { localInserted, localSkipped, totalLocal: db.products.length };
  } catch (err) {
    return { localInserted: 0, localSkipped: 0, totalLocal: 0, error: err.message };
  }
};

const seedSampleProducts = async () => {
  console.log('==============================================================');
  console.log('🐾 PetPaws Idempotent Sample Products Seeder (INR Catalog)');
  console.log('==============================================================');

  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Could not connect to MongoDB. Check MONGODB_URI in server/.env and network access.');
    process.exit(1);
  }

  try {
    const dbName = mongoose.connection.name;
    const collectionName = Product.collection.name;
    console.log(`📦 Connected Database : ${dbName}`);
    console.log(`📁 Target Collection  : ${collectionName}`);

    // 1. Ensure Core Platform Accounts (including Platform Admin) & Demo Vendors exist idempotently
    // Uses $setOnInsert exclusively so existing users and passwords are NEVER overwritten or reset.
    const defaultDemoPassword = process.env.DEMO_USER_INITIAL_PASSWORD;

    if (!defaultDemoPassword) {
      throw new Error('DEMO_USER_INITIAL_PASSWORD must be set before seeding demo accounts.');
    }
    const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD;

        if (!adminInitialPassword) {
          throw new Error('ADMIN_INITIAL_PASSWORD must be set before seeding platform admin accounts.');
        }
    const hashedDemoPassword = await bcrypt.hash(defaultDemoPassword, 10);
    const hashedAdminPassword = await bcrypt.hash(adminInitialPassword, 10);

    let coreUsersInserted = 0;
    let coreUsersExisting = 0;
    const now = new Date();
    for (const coreUser of CORE_PLATFORM_USERS) {
      const passwordHash = coreUser.role === 'admin' ? hashedAdminPassword : hashedDemoPassword;
      const userRes = await User.updateOne(
        { $or: [{ custom_id: coreUser.custom_id }, { email: coreUser.email }] },
        {
          $setOnInsert: {
            ...coreUser,
            password: passwordHash,
            createdAt: now,
            updatedAt: now
          }
        },
        { upsert: true, timestamps: false }
      );
      if (userRes.upsertedCount && userRes.upsertedCount > 0) {
        coreUsersInserted += 1;
      } else {
        coreUsersExisting += 1;
      }
    }

    for (const vendor of DEMO_VENDORS) {
      await User.updateOne(
        { $or: [{ custom_id: vendor.user.custom_id }, { email: vendor.user.email }] },
        {
          $setOnInsert: {
            ...vendor.user,
            password: hashedDemoPassword,
            createdAt: now,
            updatedAt: now
          }
        },
        { upsert: true, timestamps: false }
      );

      await Business.updateOne(
        { $or: [{ custom_id: vendor.business.custom_id }, { slug: vendor.business.slug }] },
        { $setOnInsert: { ...vendor.business, createdAt: now, updatedAt: now } },
        { upsert: true, timestamps: false }
      );

      await BusinessMembership.updateOne(
        { custom_id: vendor.membership.custom_id },
        { $setOnInsert: { ...vendor.membership, createdAt: now, updatedAt: now } },
        { upsert: true, timestamps: false }
      );
    }
    console.log(`✅ Verified core platform & vendor accounts (${coreUsersInserted} inserted, ${coreUsersExisting} already present)`);

    // 2. Idempotently upsert all 20 sample products by custom_id
    let insertedCount = 0;
    let alreadyPresentCount = 0;

    for (const productData of SAMPLE_PRODUCTS) {
      const result = await Product.updateOne(
        { custom_id: productData.custom_id },
        { $setOnInsert: productData },
        { upsert: true }
      );

      if (result.upsertedCount && result.upsertedCount > 0) {
        insertedCount += 1;
      } else {
        alreadyPresentCount += 1;
      }
    }

    const totalInMongo = await Product.countDocuments();

    // 3. Also keep local fallback JSON synchronized for offline dev
    const localSync = syncLocalJsonFallback();

    console.log('--------------------------------------------------------------');
    console.log(`✅ Sample Products Inserted       : ${insertedCount}`);
    console.log(`ℹ️  Sample Products Already Present: ${alreadyPresentCount}`);
    console.log(`📊 Total Products in MongoDB      : ${totalInMongo}`);
    console.log(`💾 Local Fallback Sync            : ${localSync.localInserted} added, ${localSync.localSkipped} existing`);
    console.log('==============================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding sample products:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

if (require.main === module) {
  seedSampleProducts();
}

module.exports = { SAMPLE_PRODUCTS, DEMO_VENDORS, CORE_PLATFORM_USERS, seedSampleProducts, syncLocalJsonFallback };
