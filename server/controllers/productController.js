/**
 * Multi-Vendor Pet Products Marketplace Controller
 *
 * Responsibilities:
 * - Flexible product category & subcategory catalog
 * - Customer product browsing, search, filtering (category, pet_type, brand, price, stock), and sorting
 * - Vendor/Shopkeeper product creation, update, archiving, and variant inventory management
 * - Strict backend tenant ownership checks (Shopkeeper A can never edit/delete Shopkeeper B's products)
 * - SaaS subscription plan limit enforcement before creating new products
 * - Safety & regulatory guardrails preventing unlawful or unsafe pet items
 * - Customer listing report submission for administrative moderation
 */

const Product = require('../models/Product');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId, escapeRegex } = require('../utils/dbHelpers');
const { ensureUserBusiness, checkSubscriptionLimit, recordAuditLog } = require('../middleware/tenantMiddleware');
const { uploadBufferToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const ExpressError = require('../utils/ExpressError');

const PRODUCT_CATEGORIES = [
  {
    id: 'Food & Nutrition',
    label: 'Food, Treats & Nutrition',
    icon: '🥣',
    subcategories: ['Dry Kibble', 'Wet & Canned Food', 'Freeze-Dried & Raw', 'Training Treats', 'Dental Chews', 'Milk Replacers']
  },
  {
    id: 'Collars & Leashes',
    label: 'Collars, Harnesses & Leashes',
    icon: '🦮',
    subcategories: ['No-Pull Harnesses', 'Everyday Collars', 'Retractable & Rope Leashes', 'ID Tags & LED Collars', 'Muzzles & Head Halters']
  },
  {
    id: 'Apparel & Winter Wear',
    label: 'Clothes, Winter Wear & Boots',
    icon: '🧥',
    subcategories: ['Fleece & Knit Sweaters', 'Waterproof Raincoats', 'Insulated Winter Jackets', 'Paw-Protector Boots', 'Cooling Vests & Bandanas']
  },
  {
    id: 'Toys & Enrichment',
    label: 'Toys & Mental Enrichment',
    icon: '🎾',
    subcategories: ['Interactive Puzzle Toys', 'Heavy-Duty Chew Toys', 'Plush & Squeaky Toys', 'Catnip & Feather Teasers', 'Snuffle Mats & Fetch']
  },
  {
    id: 'Grooming & Hygiene',
    label: 'Grooming Tools & Hygiene',
    icon: '🧴',
    subcategories: ['Oatmeal & Medicated Shampoos', 'De-Shedding Brushes & Combs', 'Nail Clippers & Grinders', 'Ear & Eye Wipes', 'Paw Balms & Deodorizers']
  },
  {
    id: 'Beds & Crates',
    label: 'Beds, Blankets, Crates & Furniture',
    icon: '🛏️',
    subcategories: ['Orthopedic Memory Foam Beds', 'Calming Donut Beds', 'Cat Trees & Scratching Posts', 'Wire & Heavy-Duty Crates', 'Waterproof Throws']
  },
  {
    id: 'Bowls & Feeders',
    label: 'Bowls, Smart Feeders & Fountains',
    icon: '💧',
    subcategories: ['Stainless Steel & Ceramic Bowls', 'Slow-Feeder Maze Bowls', 'Automatic Timed Feeders', 'Filtered Water Fountains', 'Airtight Food Storage']
  },
  {
    id: 'Travel & Safety',
    label: 'Travel Carriers & Car Safety',
    icon: '🎒',
    subcategories: ['Airline-Approved Soft Carriers', 'Car Seat Covers & Hammocks', 'Crash-Tested Seatbelts', 'Pet Strollers & Backpacks', 'Portable Travel Bowls']
  },
  {
    id: 'Litter & Accessories',
    label: 'Litter, Boxes & Waste Management',
    icon: '🧹',
    subcategories: ['Clumping Clay & Tofu Litter', 'Enclosed & Top-Entry Litter Boxes', 'Self-Cleaning Litter Systems', 'Biodegradable Poop Bags', 'Enzyme Stain Eliminators']
  },
  {
    id: 'Aquarium & Bird Supplies',
    label: 'Aquarium, Bird & Small Pet Supplies',
    icon: '🐠',
    subcategories: ['Aquarium Filters & Heaters', 'Water Conditioners & Aquascaping', 'Flight Cages & Natural Perches', 'Small Animal Hay & Hutches', 'Cuttlebone & Foraging Toys']
  },
  {
    id: 'Health & Supplements',
    label: 'OTC Wellness & Supplements',
    icon: '🩺',
    subcategories: ['Hip & Joint Glucosamine', 'Omega-3 Skin & Coat Oil', 'Probiotic Digestive Chews', 'Calming Hemp & Melatonin', 'First-Aid & Recovery Cones']
  }
];

// Prohibited/unsafe terms guardrail (blocks illegal wildlife, prescription narcotics, shock/prong torture devices, etc.)
const PROHIBITED_PRODUCT_PATTERNS = [
  /prescription\s+narcotic/i,
  /ketamine/i,
  /pentobarbital/i,
  /euthanasia\s+drug/i,
  /illegal\s+wildlife/i,
  /ivory/i,
  /poison\s+bait/i,
  /strychnine/i
];

const validateSafeProduct = (title = '', description = '') => {
  const combined = `${title} ${description}`;
  for (const pattern of PROHIBITED_PRODUCT_PATTERNS) {
    if (pattern.test(combined)) {
      throw new ExpressError(
        'Product rejected by safety policy: Prescription-only controlled substances, poisons, and unlawful items are prohibited on PetPaws.',
        400
      );
    }
  }
};

const parseVariants = (rawVariants, fallbackPrice, fallbackStock) => {
  if (!rawVariants) return [];
  let parsed = rawVariants;
  if (typeof rawVariants === 'string') {
    try {
      parsed = JSON.parse(rawVariants);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(v => v && (v.label || v.size || v.color || v.pack_size))
    .map((v, idx) => {
      const label = v.label || [v.size, v.color, v.pack_size].filter(Boolean).join(' / ') || `Option ${idx + 1}`;
      return {
        variant_id: v.variant_id || `var-${idx + 1}-${Date.now().toString().slice(-4)}`,
        label: String(label).trim(),
        size: v.size ? String(v.size).trim() : '',
        color: v.color ? String(v.color).trim() : '',
        pack_size: v.pack_size ? String(v.pack_size).trim() : '',
        sku: v.sku ? String(v.sku).trim() : '',
        price: Number.isFinite(Number(v.price)) && Number(v.price) >= 0 ? Number(v.price) : Number(fallbackPrice) || 0,
        stock: Number.isFinite(Number(v.stock)) && Number(v.stock) >= 0 ? Number(v.stock) : Number(fallbackStock) || 0
      };
    });
};

const parseFeatures = (rawFeatures) => {
  if (!rawFeatures) return [];
  if (Array.isArray(rawFeatures)) {
    return rawFeatures.map(f => String(f).trim()).filter(Boolean);
  }
  if (typeof rawFeatures === 'string') {
    try {
      const parsed = JSON.parse(rawFeatures);
      if (Array.isArray(parsed)) return parsed.map(f => String(f).trim()).filter(Boolean);
    } catch {
      return rawFeatures.split(',').map(f => f.trim()).filter(Boolean);
    }
  }
  return [];
};

const resolveUploadedMedia = async (req, body) => {
  const uploadedItems = [];
  const incomingFiles = Array.isArray(req.uploadedFiles) && req.uploadedFiles.length > 0
    ? req.uploadedFiles
    : req.file && req.file.buffer
    ? [req.file]
    : [];

  if (incomingFiles.length > 0 && isCloudinaryConfigured()) {
    for (const fileObj of incomingFiles) {
      const isVideo = fileObj.mimetype && fileObj.mimetype.startsWith('video/');
      const uploaded = await uploadBufferToCloudinary(fileObj.buffer, {
        subFolder: 'products',
        resource_type: isVideo ? 'video' : 'image'
      });
      uploadedItems.push({
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
        resource_type: uploaded.resource_type === 'video' ? 'video' : 'image',
        format: uploaded.format || '',
        bytes: uploaded.bytes || fileObj.size || 0
      });
    }
  }

  let bodyMedia = [];
  if (body.media) {
    try {
      const parsed = typeof body.media === 'string' ? JSON.parse(body.media) : body.media;
      if (Array.isArray(parsed)) {
        bodyMedia = parsed
          .filter(item => item && typeof item.url === 'string' && item.url.trim())
          .map(item => ({
            url: item.url.trim(),
            public_id: item.public_id || '',
            resource_type: item.resource_type === 'video' ? 'video' : 'image',
            format: item.format || '',
            bytes: Number(item.bytes) || 0
          }));
      }
    } catch {
      bodyMedia = [];
    }
  }

  const combined = [...uploadedItems, ...bodyMedia];
  const firstImage = combined.find(m => m.resource_type === 'image');
  return {
    media: combined,
    image_url: firstImage ? firstImage.url : (body.image_url || ''),
    image_public_id: firstImage ? firstImage.public_id : (body.image_public_id || '')
  };
};

/**
 * GET /api/products/categories
 * Returns the flexible product category & subcategory catalog
 */
const getCategories = async (req, res) => {
  res.json({
    success: true,
    categories: PRODUCT_CATEGORIES
  });
};

/**
 * GET /api/products
 * Customer browsing endpoint with search, category, subcategory, pet_type, brand,
 * price range, availability filter, and sorting.
 */
const getProducts = async (req, res) => {
  const {
    category,
    subcategory,
    pet_type,
    brand,
    search,
    minPrice,
    maxPrice,
    inStock,
    businessId,
    sort = 'featured'
  } = req.query;

  let products = [];

  if (isMongoConnected()) {
    const query = {
      status: { $in: ['active', 'out_of_stock'] },
      moderation_status: 'approved'
    };
    if (category && category !== 'All') {
      query.category = category;
    }
    if (subcategory && subcategory !== 'All') {
      query.subcategory = subcategory;
    }
    if (pet_type && pet_type !== 'All') {
      query.pet_type = { $in: [pet_type, 'All Pets'] };
    }
    if (brand && brand !== 'All') {
      query.brand = new RegExp(`^${escapeRegex(brand)}$`, 'i');
    }
    if (businessId) {
      query.business_id = businessId;
    }
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
      query.status = 'active';
    }
    const docs = await Product.find(query).sort({ createdAt: -1 });
    products = docs.map(normalizeItem);
  } else {
    const db = loadData();
    products = (db.products || []).filter(
      p => (p.status === 'active' || p.status === 'out_of_stock') && (p.moderation_status || 'approved') === 'approved'
    );
    if (category && category !== 'All') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (subcategory && subcategory !== 'All') {
      products = products.filter(p => (p.subcategory || '').toLowerCase() === subcategory.toLowerCase());
    }
    if (pet_type && pet_type !== 'All') {
      products = products.filter(
        p => (p.pet_type || 'All Pets').toLowerCase() === pet_type.toLowerCase() || (p.pet_type || 'All Pets') === 'All Pets'
      );
    }
    if (brand && brand !== 'All') {
      products = products.filter(p => (p.brand || '').toLowerCase() === brand.toLowerCase());
    }
    if (businessId) {
      products = products.filter(p => p.business_id === businessId);
    }
    if (inStock === 'true') {
      products = products.filter(p => Number(p.stock) > 0 && p.status === 'active');
    }
  }

  if (search && String(search).trim()) {
    const q = String(search).toLowerCase().trim();
    products = products.filter(
      p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.subcategory || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.pet_type || '').toLowerCase().includes(q)
    );
  }

  if (minPrice !== undefined && minPrice !== '') {
    const min = Number(minPrice);
    if (Number.isFinite(min)) products = products.filter(p => Number(p.price) >= min);
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    const max = Number(maxPrice);
    if (Number.isFinite(max)) products = products.filter(p => Number(p.price) <= max);
  }

  if (sort === 'price_asc') {
    products.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sort === 'price_desc') {
    products.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sort === 'rating') {
    products.sort((a, b) => Number(b.rating || 4.8) - Number(a.rating || 4.8));
  } else if (sort === 'newest') {
    products.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
  }

  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort();

  res.json({
    success: true,
    count: products.length,
    brands,
    categories: PRODUCT_CATEGORIES,
    products
  });
};

/**
 * GET /api/products/vendor/inventory
 * Returns only the authenticated shopkeeper/seller's own business products.
 */
const getVendorInventory = async (req, res) => {
  if (!req.user || !['seller', 'shopkeeper', 'admin'].includes(req.user.role)) {
    throw new ExpressError('Only authorized shopkeeper or seller accounts can access product inventory', 403);
  }

  const { business } = await ensureUserBusiness(req.user, req.query.businessId || '');

  if (isMongoConnected()) {
    const query = req.user.role === 'admin' && req.query.all === 'true'
      ? {}
      : { $or: [{ business_id: business.id }, { seller_id: req.user.id }] };
    const docs = await Product.find(query).sort({ createdAt: -1 });
    return res.json({
      success: true,
      business,
      products: docs.map(normalizeItem)
    });
  }

  const db = loadData();
  const products = (db.products || []).filter(p => {
    if (req.user.role === 'admin' && req.query.all === 'true') return true;
    return p.business_id === business.id || p.seller_id === req.user.id;
  });

  res.json({
    success: true,
    business,
    products
  });
};

/**
 * GET /api/products/:id
 * Single product detail lookup
 */
const getProductById = async (req, res) => {
  const { id } = req.params;

  if (isMongoConnected()) {
    const doc = await findDocByAnyId(Product, id);
    if (!doc) throw new ExpressError('Product not found', 404);
    return res.json({ success: true, product: normalizeItem(doc) });
  }

  const db = loadData();
  const product = (db.products || []).find(p => p.id === id || p.custom_id === id);
  if (!product) throw new ExpressError('Product not found', 404);

  res.json({ success: true, product });
};

/**
 * POST /api/products
 * Create a new pet product listing (Shopkeeper / Seller only, enforces subscription plan limit)
 */
const createProduct = async (req, res) => {
  if (!req.user || !['seller', 'shopkeeper', 'admin'].includes(req.user.role)) {
    throw new ExpressError('Only authorized shopkeepers and sellers can create product listings', 403);
  }

  const { business } = await ensureUserBusiness(req.user);

  if (business.status === 'suspended' || business.verification_status === 'suspended') {
    throw new ExpressError('Your business account is suspended and cannot publish new products.', 403);
  }

  await checkSubscriptionLimit(business, 'product');

  const {
    title,
    category,
    subcategory,
    pet_type,
    brand,
    sku,
    price,
    compare_at_price,
    stock,
    variants,
    description,
    features,
    ingredients_or_materials,
    safety_notes
  } = req.body;

  if (!title || !String(title).trim() || !category || !String(category).trim() || price === undefined || price === '') {
    throw new ExpressError('Product title, category, and price are required', 400);
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new ExpressError('Price must be a valid non-negative number', 400);
  }

  if (stock !== undefined && stock !== '') {
    const numericStock = Number(stock);
    if (!Number.isFinite(numericStock) || numericStock < 0) {
      throw new ExpressError('Stock quantity must be a valid non-negative number', 400);
    }
  }

  validateSafeProduct(title, description);

  const parsedVariants = parseVariants(variants, numericPrice, stock);
  const totalStock = parsedVariants.length > 0
    ? parsedVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
    : (Number.isFinite(Number(stock)) && Number(stock) >= 0 ? Math.floor(Number(stock)) : 10);

  const resolvedMedia = await resolveUploadedMedia(req, req.body);
  const defaultImg = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80';
  const customId = `prod-${Date.now()}`;

  const productPayload = {
    custom_id: customId,
    business_id: business.id,
    business_name: business.name,
    seller_id: req.user.id,
    seller_name: business.name || req.user.name,
    title: String(title).trim(),
    category: String(category).trim(),
    subcategory: subcategory ? String(subcategory).trim() : 'General Supplies',
    pet_type: pet_type ? String(pet_type).trim() : 'All Pets',
    brand: brand ? String(brand).trim() : business.name || 'PetPaws Essentials',
    sku: sku ? String(sku).trim() : `SKU-${customId.slice(-6)}`,
    price: numericPrice,
    currency: 'INR',
    compare_at_price: Number(compare_at_price) > numericPrice ? Number(compare_at_price) : 0,
    stock: totalStock,
    variants: parsedVariants,
    description: description ? String(description).trim() : 'Quality-tested pet supply item.',
    features: parseFeatures(features),
    ingredients_or_materials: ingredients_or_materials ? String(ingredients_or_materials).trim() : '',
    safety_notes: safety_notes ? String(safety_notes).trim() : 'Verified pet-safe materials.',
    image_url: resolvedMedia.image_url || defaultImg,
    image_public_id: resolvedMedia.image_public_id || '',
    media: resolvedMedia.media,
    rating: 4.9,
    reviews_count: 1,
    moderation_status: 'approved',
    status: totalStock > 0 ? 'active' : 'out_of_stock'
  };

  if (isMongoConnected()) {
    const created = await Product.create(productPayload);
    await recordAuditLog({
      actor: req.user,
      business_id: business.id,
      action: 'product.created',
      target_type: 'Product',
      target_id: customId,
      details: `Created product "${productPayload.title}" in ${productPayload.category}`
    });
    return res.status(201).json({
      success: true,
      product: normalizeItem(created),
      message: 'Product published to marketplace successfully'
    });
  }

  const db = loadData();
  if (!Array.isArray(db.products)) db.products = [];
  const newProduct = {
    id: customId,
    ...productPayload,
    created_at: new Date().toISOString()
  };
  db.products.unshift(newProduct);
  saveData(db);

  await recordAuditLog({
    actor: req.user,
    business_id: business.id,
    action: 'product.created',
    target_type: 'Product',
    target_id: customId,
    details: `Created product "${productPayload.title}" in ${productPayload.category}`
  });

  res.status(201).json({
    success: true,
    product: newProduct,
    message: 'Product published to marketplace successfully'
  });
};

/**
 * PUT /api/products/:id
 * Update an existing product (Strictly restricted to the owning vendor/business or platform admin)
 */
const updateProduct = async (req, res) => {
  if (!req.user || !['seller', 'shopkeeper', 'admin'].includes(req.user.role)) {
    throw new ExpressError('Only authorized shopkeepers and sellers can update products', 403);
  }

  const { id } = req.params;
  const { business } = await ensureUserBusiness(req.user);

  const ALLOWED_FIELDS = [
    'title',
    'category',
    'subcategory',
    'pet_type',
    'brand',
    'sku',
    'price',
    'compare_at_price',
    'stock',
    'description',
    'ingredients_or_materials',
    'safety_notes',
    'image_url',
    'image_public_id',
    'status'
  ];

  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => ALLOWED_FIELDS.includes(key))
  );

  if (updates.title !== undefined && !String(updates.title).trim()) {
    throw new ExpressError('Product title cannot be empty', 400);
  }
  if (updates.category !== undefined && !String(updates.category).trim()) {
    throw new ExpressError('Product category cannot be empty', 400);
  }

  if (updates.title || updates.description) {
    validateSafeProduct(updates.title || '', updates.description || '');
  }

  if (updates.price !== undefined) {
    const numericPrice = Number(updates.price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      throw new ExpressError('Price must be a valid non-negative number', 400);
    }
    updates.price = numericPrice;
  }

  if (updates.stock !== undefined) {
    const numericStock = Number(updates.stock);
    if (!Number.isFinite(numericStock) || numericStock < 0) {
      throw new ExpressError('Stock quantity must be a valid non-negative number', 400);
    }
    updates.stock = Math.floor(numericStock);
  }

  if (req.body.variants !== undefined) {
    updates.variants = parseVariants(req.body.variants, updates.price, updates.stock);
    if (updates.variants.length > 0 && req.body.stock === undefined) {
      updates.stock = updates.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    }
  }

  if (req.body.features !== undefined) {
    updates.features = parseFeatures(req.body.features);
  }

  if (updates.stock !== undefined && !updates.status) {
    updates.status = updates.stock > 0 ? 'active' : 'out_of_stock';
  }

  const hasNewUploads =
    (req.file && req.file.buffer) ||
    (Array.isArray(req.files) && req.files.length > 0) ||
    (Array.isArray(req.uploadedFiles) && req.uploadedFiles.length > 0);
  if (hasNewUploads || req.body.media !== undefined) {
    const resolved = await resolveUploadedMedia(req, req.body);
    if (resolved.media.length > 0) updates.media = resolved.media;
    if (resolved.image_url) updates.image_url = resolved.image_url;
    if (resolved.image_public_id) updates.image_public_id = resolved.image_public_id;
  }

  if (isMongoConnected()) {
    const existing = await findDocByAnyId(Product, id);
    if (!existing) throw new ExpressError('Product not found', 404);

    const isOwner = existing.seller_id === req.user.id || existing.business_id === business.id || req.user.role === 'admin';
    if (!isOwner) {
      throw new ExpressError('Tenant isolation error: Not authorized to modify another shopkeeper\'s product', 403);
    }

    Object.assign(existing, updates);
    const saved = await existing.save();
    return res.json({
      success: true,
      product: normalizeItem(saved),
      message: 'Product updated successfully'
    });
  }

  const db = loadData();
  const idx = (db.products || []).findIndex(p => p.id === id || p.custom_id === id);
  if (idx === -1) throw new ExpressError('Product not found', 404);

  const existing = db.products[idx];
  const isOwner = existing.seller_id === req.user.id || existing.business_id === business.id || req.user.role === 'admin';
  if (!isOwner) {
    throw new ExpressError('Tenant isolation error: Not authorized to modify another shopkeeper\'s product', 403);
  }

  db.products[idx] = { ...existing, ...updates };
  saveData(db);

  res.json({
    success: true,
    product: db.products[idx],
    message: 'Product updated successfully'
  });
};

/**
 * DELETE /api/products/:id
 * Archive or remove a product listing (Owning shopkeeper/seller or admin only)
 */
const deleteProduct = async (req, res) => {
  if (!req.user || !['seller', 'shopkeeper', 'admin'].includes(req.user.role)) {
    throw new ExpressError('Only authorized shopkeepers and sellers can archive or delete products', 403);
  }

  const { id } = req.params;
  const { archiveOnly } = req.query;
  const { business } = await ensureUserBusiness(req.user);

  if (isMongoConnected()) {
    const existing = await findDocByAnyId(Product, id);
    if (!existing) throw new ExpressError('Product not found', 404);

    const isOwner = existing.seller_id === req.user.id || existing.business_id === business.id || req.user.role === 'admin';
    if (!isOwner) {
      throw new ExpressError('Tenant isolation error: Not authorized to delete another shopkeeper\'s product', 403);
    }

    if (archiveOnly === 'true') {
      existing.status = 'archived';
      await existing.save();
      return res.json({
        success: true,
        product: normalizeItem(existing),
        message: 'Product archived from storefront'
      });
    }

    if (existing.image_public_id) {
      await deleteFromCloudinary(existing.image_public_id, 'image');
    }
    await existing.deleteOne();
    return res.json({ success: true, message: 'Product removed from inventory' });
  }

  const db = loadData();
  const idx = (db.products || []).findIndex(p => p.id === id || p.custom_id === id);
  if (idx === -1) throw new ExpressError('Product not found', 404);

  const existing = db.products[idx];
  const isOwner = existing.seller_id === req.user.id || existing.business_id === business.id || req.user.role === 'admin';
  if (!isOwner) {
    throw new ExpressError('Tenant isolation error: Not authorized to delete another shopkeeper\'s product', 403);
  }

  if (archiveOnly === 'true') {
    db.products[idx].status = 'archived';
    saveData(db);
    return res.json({
      success: true,
      product: db.products[idx],
      message: 'Product archived from storefront'
    });
  }

  db.products.splice(idx, 1);
  saveData(db);
  res.json({ success: true, message: 'Product removed from inventory' });
};

/**
 * POST /api/products/:id/report
 * Allows any authenticated customer to report a listing for moderation review
 */
const reportProduct = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to report a product listing', 401);
  }

  const { id } = req.params;
  const { reason } = req.body;
  if (!reason || !String(reason).trim()) {
    throw new ExpressError('Please provide a reason for reporting this product', 400);
  }

  const reportItem = {
    user_id: req.user.id,
    user_name: req.user.name || 'Verified User',
    reason: String(reason).trim(),
    created_at: new Date().toISOString()
  };

  if (isMongoConnected()) {
    const product = await findDocByAnyId(Product, id);
    if (!product) throw new ExpressError('Product not found', 404);
    product.reports = Array.isArray(product.reports) ? [...product.reports, reportItem] : [reportItem];
    product.report_count = product.reports.length;
    await product.save();
    await recordAuditLog({
      actor: req.user,
      business_id: product.business_id,
      action: 'product.reported',
      target_type: 'Product',
      target_id: product.custom_id || id,
      details: `Reported product "${product.title}": ${reportItem.reason}`
    });
    return res.json({
      success: true,
      message: 'Thank you. Our moderation team has received your report.'
    });
  }

  const db = loadData();
  const idx = (db.products || []).findIndex(p => p.id === id || p.custom_id === id);
  if (idx === -1) throw new ExpressError('Product not found', 404);

  const product = db.products[idx];
  product.reports = Array.isArray(product.reports) ? [...product.reports, reportItem] : [reportItem];
  product.report_count = product.reports.length;
  saveData(db);

  await recordAuditLog({
    actor: req.user,
    business_id: product.business_id,
    action: 'product.reported',
    target_type: 'Product',
    target_id: product.id,
    details: `Reported product "${product.title}": ${reportItem.reason}`
  });

  res.json({
    success: true,
    message: 'Thank you. Our moderation team has received your report.'
  });
};

module.exports = {
  PRODUCT_CATEGORIES,
  getCategories,
  getProducts,
  getVendorInventory,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  reportProduct
};
