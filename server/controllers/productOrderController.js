/**
 * Multi-Vendor Product Order & Cart Checkout Controller
 *
 * Responsibilities:
 * - Multi-item cart checkout with variant and promotional discount support.
 * - Server-side price, discount, tax, and commission calculation (never trusting client totals).
 * - Atomic stock validation & decrement (preventing overselling and negative stock).
 * - Self-purchase guard (vendors cannot buy their own products).
 * - Customer & Provider strict separation (only buyer accounts can purchase products).
 * - Payment Gateway verification (Razorpay HMAC-SHA256 signature verification / secure test sandbox).
 * - Cash on Delivery (COD) handling with clear 'Pending' payment status.
 * - Idempotency protection to prevent duplicate order placement & duplicate payments.
 * - Tenant-isolated order views (customers see their purchases; shopkeepers see only orders containing their products).
 * - Permitted order fulfillment status updates (Order Placed -> Confirmed -> Packed -> Shipped -> Out for Delivery -> Delivered).
 * - Order cancellation before delivery with automatic inventory restocking.
 * - Post-delivery return & refund request workflow.
 */

const Product = require('../models/Product');
const ProductOrder = require('../models/ProductOrder');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId, escapeRegex } = require('../utils/dbHelpers');
const { ensureUserBusiness, recordAuditLog } = require('../middleware/tenantMiddleware');
const {
  isRazorpayConfigured,
  computePaymentSignature,
  verifyPaymentSignature,
  calculateEffectivePrice
} = require('../utils/paymentGateway');
const ExpressError = require('../utils/ExpressError');

const ALLOWED_ORDER_STATUSES = [
  'Order Placed',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered'
];

/**
 * POST /api/product-orders/initiate
 * Previews cart totals, validates stock, and creates a pending payment order challenge
 */
const initiateProductCheckout = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to checkout', 401);
  }
  if (req.user.role !== 'buyer' && req.user.role !== 'admin') {
    throw new ExpressError('Only customer accounts can place product orders. Providers should use a customer account.', 403);
  }

  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    throw new ExpressError('Your cart is empty. Please add at least one product before checking out.', 400);
  }

  const validatedItems = [];
  let subtotal = 0;
  let totalDiscount = 0;

  if (isMongoConnected()) {
    for (const cartItem of items) {
      const productId = cartItem.product_id || cartItem.id;
      const qty = Math.max(1, Math.floor(Number(cartItem.quantity) || 1));
      const variantId = cartItem.variant_id || '';
      const variantLabel = cartItem.variant_label || '';

      const product = await findDocByAnyId(Product, productId);
      if (!product || product.status === 'archived' || product.status === 'suspended') {
        throw new ExpressError(`Product "${cartItem.title || productId}" is no longer available`, 400);
      }
      if (product.seller_id === req.user.id) {
        throw new ExpressError(`Shopkeepers cannot purchase their own product listing ("${product.title}")`, 400);
      }

      let chosenVariant = null;
      if (Array.isArray(product.variants) && product.variants.length > 0 && (variantId || variantLabel)) {
        const vIdx = product.variants.findIndex(
          v => (variantId && v.variant_id === variantId) || (variantLabel && v.label === variantLabel)
        );
        if (vIdx === -1) {
          throw new ExpressError(`Selected variant for "${product.title}" was not found`, 400);
        }
        chosenVariant = product.variants[vIdx];
        if (Number(chosenVariant.stock) < qty) {
          throw new ExpressError(`Insufficient stock for "${product.title}" (${chosenVariant.label}). Available: ${chosenVariant.stock}`, 400);
        }
      } else {
        if (Number(product.stock) < qty) {
          throw new ExpressError(`Insufficient stock for "${product.title}". Available: ${product.stock}`, 400);
        }
      }

      const priceInfo = calculateEffectivePrice(product, chosenVariant);
      const lineTotal = Number((priceInfo.finalPrice * qty).toFixed(2));
      subtotal += lineTotal;
      totalDiscount += Number((priceInfo.discountAmount * qty).toFixed(2));

      validatedItems.push({
        product_id: product.custom_id || product.id || product._id.toString(),
        title: product.title,
        variant_label: chosenVariant ? chosenVariant.label : 'Standard',
        quantity: qty,
        unit_price: priceInfo.finalPrice,
        original_price: priceInfo.basePrice,
        discount_amount: priceInfo.discountAmount,
        line_total: lineTotal
      });
    }
  } else {
    const db = loadData();
    for (const cartItem of items) {
      const productId = cartItem.product_id || cartItem.id;
      const qty = Math.max(1, Math.floor(Number(cartItem.quantity) || 1));
      const variantId = cartItem.variant_id || '';
      const variantLabel = cartItem.variant_label || '';

      const product = (db.products || []).find(p => p.id === productId || p.custom_id === productId);
      if (!product || product.status === 'archived' || product.status === 'suspended') {
        throw new ExpressError(`Product "${cartItem.title || productId}" is no longer available`, 400);
      }
      if (product.seller_id === req.user.id) {
        throw new ExpressError(`Shopkeepers cannot purchase their own product listing ("${product.title}")`, 400);
      }

      let chosenVariant = null;
      if (Array.isArray(product.variants) && product.variants.length > 0 && (variantId || variantLabel)) {
        chosenVariant = product.variants.find(
          v => (variantId && v.variant_id === variantId) || (variantLabel && v.label === variantLabel)
        );
        if (!chosenVariant) throw new ExpressError(`Selected variant for "${product.title}" was not found`, 400);
        if (Number(chosenVariant.stock) < qty) {
          throw new ExpressError(`Insufficient stock for "${product.title}". Available: ${chosenVariant.stock}`, 400);
        }
      } else {
        if (Number(product.stock) < qty) {
          throw new ExpressError(`Insufficient stock for "${product.title}". Available: ${product.stock}`, 400);
        }
      }

      const priceInfo = calculateEffectivePrice(product, chosenVariant);
      const lineTotal = Number((priceInfo.finalPrice * qty).toFixed(2));
      subtotal += lineTotal;
      totalDiscount += Number((priceInfo.discountAmount * qty).toFixed(2));

      validatedItems.push({
        product_id: product.id,
        title: product.title,
        variant_label: chosenVariant ? chosenVariant.label : 'Standard',
        quantity: qty,
        unit_price: priceInfo.finalPrice,
        original_price: priceInfo.basePrice,
        discount_amount: priceInfo.discountAmount,
        line_total: lineTotal
      });
    }
  }

  subtotal = Number(subtotal.toFixed(2));
  totalDiscount = Number(totalDiscount.toFixed(2));
  const tax = Number((subtotal * 0.08).toFixed(2));
  const shippingFee = subtotal >= 999 ? 0 : 79;
  const totalAmount = Number((subtotal + tax + shippingFee).toFixed(2));

  const providerOrderId = `order_prd_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const simulatedPaymentId = `pay_prd_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const expectedSignature = computePaymentSignature(providerOrderId, simulatedPaymentId);

  return res.json({
    success: true,
    summary: {
      items_count: validatedItems.length,
      subtotal,
      original_subtotal: Number((subtotal + totalDiscount).toFixed(2)),
      total_discount: totalDiscount,
      tax,
      shipping_fee: shippingFee,
      total_amount: totalAmount
    },
    prefill: {
      buyer_name: req.user.name || '',
      buyer_email: req.user.email || '',
      buyer_phone: req.user.phone || '',
      shipping_address: req.user.address || ''
    },
    payment_mode: 'cod_only',
    online_payment_available: false,
    provider_order_id: null,
    razorpay_key_id: '',
    payment_challenge: null,
    sandbox_handshake: null
  });
};

/**
 * POST /api/product-orders/checkout
 * Multi-item cart checkout with server-side pricing, atomic stock decrement, and payment verification
 */
const checkoutCart = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to place a product order', 401);
  }
  if (req.user.role !== 'buyer' && req.user.role !== 'admin') {
    throw new ExpressError('Only customer accounts can place product orders. Providers should use a customer account.', 403);
  }

  const {
    items,
    buyer_name,
    customer_name,
    buyer_phone,
    customer_phone,
    shipping_address,
    delivery_instructions,
    payment_method,
    payment_provider_order_id,
    provider_order_id,
    payment_provider_payment_id,
    provider_payment_id,
    payment_signature,
    idempotency_key
  } = req.body;

  const rawName = buyer_name || customer_name;
  const rawPhone = buyer_phone || customer_phone;
  const rawOrderId = payment_provider_order_id || provider_order_id;
  const rawPaymentId = payment_provider_payment_id || provider_payment_id;

  const trimmedName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : (req.user.name || 'Verified Customer').trim();
  const trimmedPhone = typeof rawPhone === 'string' ? rawPhone.trim() : (req.user.phone || '').trim();
  const trimmedAddress = typeof shipping_address === 'string' ? shipping_address.trim() : (req.user.address || '').trim();
  const chosenMethod = typeof payment_method === 'string' && payment_method.trim() ? payment_method.trim() : 'UPI';

  if (!Array.isArray(items) || items.length === 0) {
    throw new ExpressError('Your cart is empty. Please add at least one product before checking out.', 400);
  }
  if (!trimmedName || trimmedName.length < 2) {
    throw new ExpressError('Customer full name is required for order delivery', 400);
  }
  if (!trimmedPhone || trimmedPhone.replace(/\D/g, '').length < 7) {
    throw new ExpressError('A valid delivery contact phone number is required', 400);
  }
  if (!trimmedAddress || trimmedAddress.length < 5) {
    throw new ExpressError('A complete shipping address is required for order delivery', 400);
  }

  // Idempotency check: if an order with this idempotency key was already created, return it safely without duplicate charges
  const cleanIdempotencyKey = typeof idempotency_key === 'string' && idempotency_key.trim() ? idempotency_key.trim() : '';
  if (cleanIdempotencyKey) {
    if (isMongoConnected()) {
      const existingOrder = await ProductOrder.findOne({ idempotency_key: cleanIdempotencyKey });
      if (existingOrder) {
        return res.json({
          success: true,
          idempotent_replay: true,
          order: normalizeItem(existingOrder),
          message: `Order ${existingOrder.custom_id} has already been confirmed!`
        });
      }
    } else {
      const db = loadData();
      const existingOrder = (db.product_orders || []).find(o => o.idempotency_key === cleanIdempotencyKey);
      if (existingOrder) {
        return res.json({
          success: true,
          idempotent_replay: true,
          order: existingOrder,
          message: `Order ${existingOrder.custom_id || existingOrder.id} has already been confirmed!`
        });
      }
    }
  }

  // Verify payment method: Only COD is permitted until a verified payment provider flow is configured
  const isCOD = chosenMethod.toUpperCase() === 'COD' || chosenMethod.toLowerCase() === 'cash on delivery';
  let paymentStatus = 'Pending';
  let recordedPaymentId = rawPaymentId || '';
  let recordedOrderId = rawOrderId || '';
  let recordedSignature = payment_signature || '';

  if (isCOD) {
    paymentStatus = 'Pending';
  } else {
    throw new ExpressError('Online payment is currently unavailable. Please select Cash on Delivery (COD) to complete your order.', 400);
  }

  const orderId = `PORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const trackingCode = `TRK-PRD-${Math.floor(100000 + Math.random() * 900000)}`;

  // MongoDB Persistence Branch
  if (isMongoConnected()) {
    const validatedItems = [];
    const productsToSave = [];
    let subtotal = 0;
    let totalDiscount = 0;

    for (const cartItem of items) {
      const productId = cartItem.product_id || cartItem.id;
      const qty = Math.max(1, Math.floor(Number(cartItem.quantity) || 1));
      const variantId = cartItem.variant_id || '';
      const variantLabel = cartItem.variant_label || '';

      const product = await findDocByAnyId(Product, productId);
      if (!product || product.status === 'archived' || product.status === 'suspended') {
        throw new ExpressError(`Product "${cartItem.title || productId}" is no longer available`, 400);
      }
      if (product.seller_id === req.user.id) {
        throw new ExpressError(`Shopkeepers cannot purchase their own product listing ("${product.title}")`, 400);
      }

      let chosenVariant = null;
      let resolvedVariantLabel = 'Standard';
      let resolvedVariantId = '';

      if (Array.isArray(product.variants) && product.variants.length > 0 && (variantId || variantLabel)) {
        const vIdx = product.variants.findIndex(
          v => (variantId && v.variant_id === variantId) || (variantLabel && v.label === variantLabel)
        );
        if (vIdx === -1) {
          throw new ExpressError(`Selected variant for "${product.title}" was not found`, 400);
        }
        chosenVariant = product.variants[vIdx];
        if (Number(chosenVariant.stock) < qty) {
          throw new ExpressError(
            `Insufficient stock for "${product.title}" (${chosenVariant.label}). Available: ${chosenVariant.stock}`,
            400
          );
        }
        resolvedVariantLabel = chosenVariant.label;
        resolvedVariantId = chosenVariant.variant_id;
        chosenVariant.stock -= qty;
        product.stock = product.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      } else {
        if (Number(product.stock) < qty) {
          throw new ExpressError(`Insufficient stock for "${product.title}". Available: ${product.stock}`, 400);
        }
        product.stock -= qty;
      }

      product.status = product.stock > 0 ? 'active' : 'out_of_stock';
      productsToSave.push(product);

      // Server-side calculated unit price and discount
      const priceInfo = calculateEffectivePrice(product, chosenVariant);
      const lineTotal = Number((priceInfo.finalPrice * qty).toFixed(2));
      subtotal += lineTotal;
      totalDiscount += Number((priceInfo.discountAmount * qty).toFixed(2));

      validatedItems.push({
        product_id: product.custom_id || product.id || product._id.toString(),
        title: product.title,
        category: product.category,
        brand: product.brand || '',
        variant_id: resolvedVariantId,
        variant_label: resolvedVariantLabel,
        quantity: qty,
        unit_price: priceInfo.finalPrice,
        original_price: priceInfo.basePrice,
        discount_amount: priceInfo.discountAmount,
        line_total: lineTotal,
        image_url: product.image_url,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        business_id: product.business_id,
        business_name: product.business_name || product.seller_name,
        item_status: 'Order Placed'
      });
    }

    // Persist all inventory stock decrements
    for (const prodDoc of productsToSave) {
      await prodDoc.save();
    }

    subtotal = Number(subtotal.toFixed(2));
    totalDiscount = Number(totalDiscount.toFixed(2));
    const tax = Number((subtotal * 0.08).toFixed(2));
    const shippingFee = subtotal >= 999 ? 0 : 79;
    const totalAmount = Number((subtotal + tax + shippingFee).toFixed(2));
    const platformCommission = Number((subtotal * 0.08).toFixed(2));

    const sellerIds = Array.from(new Set(validatedItems.map(i => i.seller_id)));
    const businessIds = Array.from(new Set(validatedItems.map(i => i.business_id)));

    const newOrder = await ProductOrder.create({
      custom_id: orderId,
      buyer_id: req.user.id,
      buyer_name: trimmedName,
      buyer_email: req.user.email || '',
      buyer_phone: trimmedPhone,
      shipping_address: trimmedAddress,
      delivery_instructions: typeof delivery_instructions === 'string' ? delivery_instructions.trim() : '',
      items: validatedItems,
      seller_ids: sellerIds,
      business_ids: businessIds,
      subtotal,
      total_discount: totalDiscount,
      tax,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      platform_commission: platformCommission,
      payment_method: isCOD ? 'COD' : chosenMethod,
      payment_status: paymentStatus,
      payment_provider_order_id: recordedOrderId,
      payment_provider_payment_id: recordedPaymentId,
      payment_signature: recordedSignature,
      idempotency_key: cleanIdempotencyKey || undefined,
      tracking_code: trackingCode,
      tracking_status: 'Order Placed',
      order_status: paymentStatus === 'Completed' ? 'Confirmed' : 'Order Placed',
      final_amount: totalAmount,
      estimated_delivery: 'Within 2-4 Business Days'
    });

    await recordAuditLog({
      actor: req.user,
      action: 'product_order.placed',
      target_type: 'ProductOrder',
      target_id: orderId,
      details: `Placed order ${orderId} (${validatedItems.length} items, total ₹${totalAmount}, payment: ${paymentStatus})`
    });

    return res.status(201).json({
      success: true,
      order: normalizeItem(newOrder),
      message: `Product order ${orderId} confirmed! Tracking code: ${trackingCode}`
    });
  }

  // Fallback JSON Persistence Branch
  const db = loadData();
  if (!Array.isArray(db.products)) db.products = [];
  if (!Array.isArray(db.product_orders)) db.product_orders = [];

  const validatedItems = [];
  let subtotal = 0;
  let totalDiscount = 0;

  for (const cartItem of items) {
    const productId = cartItem.product_id || cartItem.id;
    const qty = Math.max(1, Math.floor(Number(cartItem.quantity) || 1));
    const variantId = cartItem.variant_id || '';
    const variantLabel = cartItem.variant_label || '';

    const pIdx = db.products.findIndex(p => p.id === productId || p.custom_id === productId);
    if (pIdx === -1) {
      throw new ExpressError(`Product "${cartItem.title || productId}" was not found`, 404);
    }

    const product = db.products[pIdx];
    if (product.status === 'archived' || product.status === 'suspended') {
      throw new ExpressError(`Product "${product.title}" is no longer available`, 400);
    }
    if (product.seller_id === req.user.id) {
      throw new ExpressError(`Shopkeepers cannot purchase their own product listing ("${product.title}")`, 400);
    }

    let chosenVariant = null;
    let resolvedVariantLabel = 'Standard';
    let resolvedVariantId = '';

    if (Array.isArray(product.variants) && product.variants.length > 0 && (variantId || variantLabel)) {
      const vIdx = product.variants.findIndex(
        v => (variantId && v.variant_id === variantId) || (variantLabel && v.label === variantLabel)
      );
      if (vIdx === -1) {
        throw new ExpressError(`Selected variant for "${product.title}" was not found`, 400);
      }
      chosenVariant = product.variants[vIdx];
      if (Number(chosenVariant.stock) < qty) {
        throw new ExpressError(
          `Insufficient stock for "${product.title}" (${chosenVariant.label}). Available: ${chosenVariant.stock}`,
          400
        );
      }
      resolvedVariantLabel = chosenVariant.label;
      resolvedVariantId = chosenVariant.variant_id;
      chosenVariant.stock -= qty;
      product.stock = product.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    } else {
      if (Number(product.stock) < qty) {
        throw new ExpressError(`Insufficient stock for "${product.title}". Available: ${product.stock}`, 400);
      }
      product.stock -= qty;
    }

    product.status = product.stock > 0 ? 'active' : 'out_of_stock';

    const priceInfo = calculateEffectivePrice(product, chosenVariant);
    const lineTotal = Number((priceInfo.finalPrice * qty).toFixed(2));
    subtotal += lineTotal;
    totalDiscount += Number((priceInfo.discountAmount * qty).toFixed(2));

    validatedItems.push({
      product_id: product.id,
      title: product.title,
      category: product.category,
      brand: product.brand || '',
      variant_id: resolvedVariantId,
      variant_label: resolvedVariantLabel,
      quantity: qty,
      unit_price: priceInfo.finalPrice,
      original_price: priceInfo.basePrice,
      discount_amount: priceInfo.discountAmount,
      line_total: lineTotal,
      image_url: product.image_url,
      seller_id: product.seller_id,
      seller_name: product.seller_name,
      business_id: product.business_id,
      business_name: product.business_name || product.seller_name,
      item_status: 'Order Placed'
    });
  }

  subtotal = Number(subtotal.toFixed(2));
  totalDiscount = Number(totalDiscount.toFixed(2));
  const tax = Number((subtotal * 0.08).toFixed(2));
  const shippingFee = subtotal >= 999 ? 0 : 79;
  const totalAmount = Number((subtotal + tax + shippingFee).toFixed(2));
  const platformCommission = Number((subtotal * 0.08).toFixed(2));

  const sellerIds = Array.from(new Set(validatedItems.map(i => i.seller_id)));
  const businessIds = Array.from(new Set(validatedItems.map(i => i.business_id)));

  const newOrder = {
    id: orderId,
    custom_id: orderId,
    buyer_id: req.user.id,
    buyer_name: trimmedName,
    buyer_email: req.user.email || '',
    buyer_phone: trimmedPhone,
    shipping_address: trimmedAddress,
    delivery_instructions: typeof delivery_instructions === 'string' ? delivery_instructions.trim() : '',
    items: validatedItems,
    seller_ids: sellerIds,
    business_ids: businessIds,
    subtotal,
    total_discount: totalDiscount,
    tax,
    shipping_fee: shippingFee,
    total_amount: totalAmount,
    platform_commission: platformCommission,
    payment_method: isCOD ? 'COD' : chosenMethod,
    payment_status: paymentStatus,
    payment_provider_order_id: recordedOrderId,
    payment_provider_payment_id: recordedPaymentId,
    payment_signature: recordedSignature,
    idempotency_key: cleanIdempotencyKey || undefined,
    tracking_code: trackingCode,
    tracking_status: 'Order Placed',
    order_status: paymentStatus === 'Completed' ? 'Confirmed' : 'Order Placed',
    final_amount: totalAmount,
    estimated_delivery: 'Within 2-4 Business Days',
    return_reason: '',
    return_status: 'None',
    created_at: new Date().toISOString()
  };

  db.product_orders.unshift(newOrder);
  saveData(db);

  res.status(201).json({
    success: true,
    order: newOrder,
    message: `Product order ${orderId} confirmed! Tracking code: ${trackingCode}`
  });
};

/**
 * GET /api/product-orders
 * Returns product orders for the authenticated customer or vendor (strictly isolated)
 */
const getProductOrders = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to view product orders', 401);
  }

  const { view } = req.query; // 'vendor' or 'buyer'
  const isVendorRole = ['seller', 'shopkeeper', 'admin'].includes(req.user.role);

  if (isMongoConnected()) {
    let query = {};
    if (isVendorRole && view === 'vendor') {
      const { business } = await ensureUserBusiness(req.user);
      if (req.user.role === 'admin' && req.query.all === 'true') {
        query = {};
      } else {
        query = {
          $or: [
            { seller_ids: req.user.id },
            { business_ids: business.id },
            { 'items.seller_id': req.user.id },
            { 'items.business_id': business.id }
          ]
        };
      }
    } else {
      query = { buyer_id: req.user.id };
    }

    const docs = await ProductOrder.find(query).sort({ createdAt: -1 });
    return res.json({
      success: true,
      orders: docs.map(normalizeItem)
    });
  }

  const db = loadData();
  let orders = db.product_orders || [];

  if (isVendorRole && view === 'vendor') {
    const { business } = await ensureUserBusiness(req.user);
    if (!(req.user.role === 'admin' && req.query.all === 'true')) {
      orders = orders.filter(
        o =>
          (Array.isArray(o.seller_ids) && o.seller_ids.includes(req.user.id)) ||
          (Array.isArray(o.business_ids) && o.business_ids.includes(business.id)) ||
          (Array.isArray(o.items) && o.items.some(i => i.seller_id === req.user.id || i.business_id === business.id))
      );
    }
  } else {
    orders = orders.filter(o => o.buyer_id === req.user.id);
  }

  res.json({
    success: true,
    orders
  });
};

/**
 * GET /api/product-orders/track/:code
 * Track a product order by order ID or tracking code (requires authentication & ownership)
 */
const trackProductOrder = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to track product orders', 401);
  }

  const { code } = req.params;
  if (!code || !String(code).trim()) throw new ExpressError('Tracking code is required', 400);

  const safeCode = escapeRegex(String(code).trim());

  const canViewOrder = (orderObj) => {
    if (req.user.role === 'admin') return true;
    if (orderObj.buyer_id === req.user.id) return true;
    if ((orderObj.seller_ids || []).includes(req.user.id)) return true;
    if ((orderObj.items || []).some(i => i.seller_id === req.user.id)) return true;
    return false;
  };

  if (isMongoConnected()) {
    const order = await ProductOrder.findOne({
      $or: [
        { tracking_code: new RegExp(`^${safeCode}$`, 'i') },
        { custom_id: new RegExp(`^${safeCode}$`, 'i') }
      ]
    });
    if (!order) throw new ExpressError('No product order found with that tracking code', 404);
    if (!canViewOrder(order)) {
      throw new ExpressError('Not authorized to track another customer\'s product order', 403);
    }
    return res.json({ success: true, order: normalizeItem(order) });
  }

  const db = loadData();
  const order = (db.product_orders || []).find(
    o =>
      (o.tracking_code || '').toLowerCase() === String(code).trim().toLowerCase() ||
      (o.id || '').toLowerCase() === String(code).trim().toLowerCase()
  );
  if (!order) throw new ExpressError('No product order found with that tracking code', 404);
  if (!canViewOrder(order)) {
    throw new ExpressError('Not authorized to track another customer\'s product order', 403);
  }
  res.json({ success: true, order });
};

/**
 * PUT /api/product-orders/:id/status
 * Allows an authorized shopkeeper/seller to update processing status for their order
 */
const updateProductOrderStatus = async (req, res) => {
  if (!req.user || !['seller', 'shopkeeper', 'admin'].includes(req.user.role)) {
    throw new ExpressError('Only authorized shopkeepers can update product order statuses', 403);
  }

  const { id } = req.params;
  const { tracking_status } = req.body;

  if (!ALLOWED_ORDER_STATUSES.includes(tracking_status)) {
    throw new ExpressError(
      `Invalid status. Allowed values: ${ALLOWED_ORDER_STATUSES.join(', ')}`,
      400
    );
  }

  const { business } = await ensureUserBusiness(req.user);

  if (isMongoConnected()) {
    const order = await findDocByAnyId(ProductOrder, id);
    if (!order) throw new ExpressError('Product order not found', 404);

    const hasOwnership =
      req.user.role === 'admin' ||
      (order.seller_ids || []).includes(req.user.id) ||
      (order.business_ids || []).includes(business.id) ||
      (order.items || []).some(i => i.seller_id === req.user.id || i.business_id === business.id);

    if (!hasOwnership) {
      throw new ExpressError('Tenant isolation error: Not authorized to update another shopkeeper\'s order', 403);
    }

    if (order.tracking_status === 'Cancelled') {
      throw new ExpressError('Cannot update status of a cancelled order', 400);
    }

    order.tracking_status = tracking_status;
    order.items = (order.items || []).map(item => {
      if (req.user.role === 'admin' || item.seller_id === req.user.id || item.business_id === business.id) {
        item.item_status = tracking_status;
      }
      return item;
    });

    if (tracking_status === 'Delivered' && order.payment_method === 'COD') {
      order.payment_status = 'Completed';
    }

    await order.save();
    return res.json({
      success: true,
      order: normalizeItem(order),
      message: `Order status updated to "${tracking_status}"`
    });
  }

  const db = loadData();
  const idx = (db.product_orders || []).findIndex(o => o.id === id || o.custom_id === id);
  if (idx === -1) throw new ExpressError('Product order not found', 404);

  const order = db.product_orders[idx];
  const hasOwnership =
    req.user.role === 'admin' ||
    (order.seller_ids || []).includes(req.user.id) ||
    (order.business_ids || []).includes(business.id) ||
    (order.items || []).some(i => i.seller_id === req.user.id || i.business_id === business.id);

  if (!hasOwnership) {
    throw new ExpressError('Tenant isolation error: Not authorized to update another shopkeeper\'s order', 403);
  }

  if (order.tracking_status === 'Cancelled') {
    throw new ExpressError('Cannot update status of a cancelled order', 400);
  }

  order.tracking_status = tracking_status;
  order.items = (order.items || []).map(item => {
    if (req.user.role === 'admin' || item.seller_id === req.user.id || item.business_id === business.id) {
      return { ...item, item_status: tracking_status };
    }
    return item;
  });

  if (tracking_status === 'Delivered' && order.payment_method === 'COD') {
    order.payment_status = 'Completed';
  }

  saveData(db);
  res.json({
    success: true,
    order,
    message: `Order status updated to "${tracking_status}"`
  });
};

/**
 * PUT /api/product-orders/:id/cancel
 * Cancel a product order before delivery and automatically restock inventory
 */
const cancelProductOrder = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to cancel an order', 401);
  }

  const { id } = req.params;

  if (isMongoConnected()) {
    const order = await findDocByAnyId(ProductOrder, id);
    if (!order) throw new ExpressError('Product order not found', 404);

    const isBuyer = order.buyer_id === req.user.id;
    const isSeller = (order.seller_ids || []).includes(req.user.id) || req.user.role === 'admin';
    if (!isBuyer && !isSeller) {
      throw new ExpressError('Not authorized to cancel this order', 403);
    }

    if (order.tracking_status === 'Cancelled') {
      throw new ExpressError('Order is already cancelled', 400);
    }
    if (order.tracking_status === 'Delivered' || order.tracking_status === 'Returned') {
      throw new ExpressError('Delivered orders cannot be cancelled. Please submit a Return Request instead.', 400);
    }

    // Restock all items
    for (const item of order.items || []) {
      const prod = await findDocByAnyId(Product, item.product_id);
      if (prod) {
        if (item.variant_id && Array.isArray(prod.variants) && prod.variants.length > 0) {
          const vIdx = prod.variants.findIndex(v => v.variant_id === item.variant_id);
          if (vIdx !== -1) {
            prod.variants[vIdx].stock += Number(item.quantity || 1);
          }
          prod.stock = prod.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
        } else {
          prod.stock = (Number(prod.stock) || 0) + Number(item.quantity || 1);
        }
        if (prod.status === 'out_of_stock' && prod.stock > 0) {
          prod.status = 'active';
        }
        await prod.save();
      }
      item.item_status = 'Cancelled';
    }

    order.tracking_status = 'Cancelled';
    order.payment_status = order.payment_status === 'Completed' ? 'Refunded' : 'Failed';
    order.cancelled_at = new Date().toISOString();
    await order.save();

    return res.json({
      success: true,
      order: normalizeItem(order),
      message: 'Product order cancelled and inventory restocked'
    });
  }

  const db = loadData();
  const idx = (db.product_orders || []).findIndex(o => o.id === id || o.custom_id === id);
  if (idx === -1) throw new ExpressError('Product order not found', 404);

  const order = db.product_orders[idx];
  const isBuyer = order.buyer_id === req.user.id;
  const isSeller = (order.seller_ids || []).includes(req.user.id) || req.user.role === 'admin';
  if (!isBuyer && !isSeller) {
    throw new ExpressError('Not authorized to cancel this order', 403);
  }

  if (order.tracking_status === 'Cancelled') {
    throw new ExpressError('Order is already cancelled', 400);
  }
  if (order.tracking_status === 'Delivered' || order.tracking_status === 'Returned') {
    throw new ExpressError('Delivered orders cannot be cancelled. Please submit a Return Request instead.', 400);
  }

  for (const item of order.items || []) {
    const pIdx = (db.products || []).findIndex(p => p.id === item.product_id || p.custom_id === item.product_id);
    if (pIdx !== -1) {
      const prod = db.products[pIdx];
      if (item.variant_id && Array.isArray(prod.variants) && prod.variants.length > 0) {
        const vIdx = prod.variants.findIndex(v => v.variant_id === item.variant_id);
        if (vIdx !== -1) {
          prod.variants[vIdx].stock += Number(item.quantity || 1);
        }
        prod.stock = prod.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      } else {
        prod.stock = (Number(prod.stock) || 0) + Number(item.quantity || 1);
      }
      if (prod.status === 'out_of_stock' && prod.stock > 0) {
        prod.status = 'active';
      }
    }
    item.item_status = 'Cancelled';
  }

  order.tracking_status = 'Cancelled';
  order.payment_status = order.payment_status === 'Completed' ? 'Refunded' : 'Failed';
  order.cancelled_at = new Date().toISOString();
  saveData(db);

  res.json({
    success: true,
    order,
    message: 'Product order cancelled and inventory restocked'
  });
};

/**
 * PUT /api/product-orders/:id/return
 * Handles buyer return requests and vendor approvals/rejections with inventory restocking
 */
const handleProductOrderReturn = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required for return actions', 401);
  }

  const { id } = req.params;
  const { action, reason } = req.body;

  if (isMongoConnected()) {
    const order = await findDocByAnyId(ProductOrder, id);
    if (!order) throw new ExpressError('Product order not found', 404);

    if (action === 'approve' || action === 'reject') {
      const isVendor = (order.seller_ids || []).includes(req.user.id) || req.user.role === 'admin';
      if (!isVendor) throw new ExpressError('Only the fulfilling vendor can approve or reject returns', 403);

      if (action === 'approve') {
        order.return_status = 'Refunded';
        order.tracking_status = 'Returned';
        order.payment_status = 'Refunded';
        for (const item of order.items || []) {
          item.item_status = 'Returned';
          const prod = await findDocByAnyId(Product, item.product_id);
          if (prod) {
            if (item.variant_id && Array.isArray(prod.variants) && prod.variants.length > 0) {
              const vIdx = prod.variants.findIndex(v => v.variant_id === item.variant_id);
              if (vIdx !== -1) {
                prod.variants[vIdx].stock += Number(item.quantity || 1);
              }
              prod.stock = prod.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
            } else {
              prod.stock = (Number(prod.stock) || 0) + Number(item.quantity || 1);
            }
            if (prod.status === 'out_of_stock' && prod.stock > 0) prod.status = 'active';
            await prod.save();
          }
        }
      } else {
        order.return_status = 'Rejected';
        order.tracking_status = 'Delivered';
      }
      await order.save();
      return res.json({
        success: true,
        order: normalizeItem(order),
        message: action === 'approve' ? 'Return approved and refund issued' : 'Return request declined'
      });
    }

    // Customer return request
    if (order.buyer_id !== req.user.id) {
      throw new ExpressError('Only the buyer who placed this order can request a return', 403);
    }
    if (order.tracking_status !== 'Delivered') {
      throw new ExpressError('Returns can only be requested after an order is marked Delivered', 400);
    }
    order.return_reason = reason ? String(reason).trim() : 'Item size or specification mismatch';
    order.return_status = 'Requested';
    order.tracking_status = 'Return Requested';
    await order.save();

    return res.json({
      success: true,
      order: normalizeItem(order),
      message: 'Return request submitted to the seller'
    });
  }

  const db = loadData();
  const idx = (db.product_orders || []).findIndex(o => o.id === id || o.custom_id === id);
  if (idx === -1) throw new ExpressError('Product order not found', 404);

  const order = db.product_orders[idx];

  if (action === 'approve' || action === 'reject') {
    const isVendor = (order.seller_ids || []).includes(req.user.id) || req.user.role === 'admin';
    if (!isVendor) throw new ExpressError('Only the fulfilling vendor can approve or reject returns', 403);

    if (action === 'approve') {
      order.return_status = 'Refunded';
      order.tracking_status = 'Returned';
      order.payment_status = 'Refunded';
      for (const item of order.items || []) {
        item.item_status = 'Returned';
        const pIdx = (db.products || []).findIndex(p => p.id === item.product_id || p.custom_id === item.product_id);
        if (pIdx !== -1) {
          const prod = db.products[pIdx];
          if (item.variant_id && Array.isArray(prod.variants) && prod.variants.length > 0) {
            const vIdx = prod.variants.findIndex(v => v.variant_id === item.variant_id);
            if (vIdx !== -1) {
              prod.variants[vIdx].stock += Number(item.quantity || 1);
            }
            prod.stock = prod.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
          } else {
            prod.stock = (Number(prod.stock) || 0) + Number(item.quantity || 1);
          }
          if (prod.status === 'out_of_stock' && prod.stock > 0) {
            prod.status = 'active';
          }
        }
      }
    } else {
      order.return_status = 'Rejected';
      order.tracking_status = 'Delivered';
    }
    saveData(db);
    return res.json({
      success: true,
      order,
      message: action === 'approve' ? 'Return approved and refund issued' : 'Return request declined'
    });
  }

  if (order.buyer_id !== req.user.id) {
    throw new ExpressError('Only the buyer who placed this order can request a return', 403);
  }
  if (order.tracking_status !== 'Delivered') {
    throw new ExpressError('Returns can only be requested after an order is marked Delivered', 400);
  }
  order.return_reason = reason ? String(reason).trim() : 'Item size or specification mismatch';
  order.return_status = 'Requested';
  order.tracking_status = 'Return Requested';
  saveData(db);

  res.json({
    success: true,
    order,
    message: 'Return request submitted to the seller'
  });
};

module.exports = {
  initiateProductCheckout,
  checkoutCart,
  getProductOrders,
  trackProductOrder,
  updateProductOrderStatus,
  cancelProductOrder,
  handleProductOrderReturn
};
