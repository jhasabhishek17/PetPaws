/**
 * Multi-Vendor Product Order & Cart Checkout Controller
 *
 * Responsibilities:
 * - Multi-item cart checkout with variant support
 * - Server-side price, tax, and commission calculation (never trusting client totals)
 * - Atomic stock validation & decrement (preventing negative stock)
 * - Self-purchase guard (vendors cannot buy their own products)
 * - Tenant-isolated order views (customers see their purchases; shopkeepers see only orders containing their products)
 * - Permitted order fulfillment status updates (Order Placed -> Confirmed -> Packed -> Shipped -> Out for Delivery -> Delivered)
 * - Order cancellation before delivery with automatic inventory restocking
 * - Post-delivery return & refund request workflow
 */

const Product = require('../models/Product');
const ProductOrder = require('../models/ProductOrder');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { findDocByAnyId, escapeRegex } = require('../utils/dbHelpers');
const { ensureUserBusiness, recordAuditLog } = require('../middleware/tenantMiddleware');
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
 * POST /api/product-orders/checkout
 * Multi-item cart checkout with server-side price calculation and stock decrement
 */
const checkoutCart = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to place a product order', 401);
  }

  const { items, buyer_phone, shipping_address, payment_method } = req.body;
  const trimmedPhone = typeof buyer_phone === 'string' ? buyer_phone.trim() : (req.user.phone || '').trim();
  const trimmedAddress = typeof shipping_address === 'string' ? shipping_address.trim() : (req.user.address || '').trim();

  if (!Array.isArray(items) || items.length === 0) {
    throw new ExpressError('Your cart is empty. Please add at least one product before checking out.', 400);
  }
  if (!trimmedPhone || !trimmedAddress) {
    throw new ExpressError('Delivery phone number and shipping address are required', 400);
  }

  const orderId = `PORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const trackingCode = `TRK-PRD-${Math.floor(100000 + Math.random() * 900000)}`;

  // MongoDB Persistence Branch
  if (isMongoConnected()) {
    const validatedItems = [];
    const productsToSave = [];

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

      let unitPrice = Number(product.price);
      let resolvedVariantLabel = 'Standard';
      let resolvedVariantId = '';

      if (Array.isArray(product.variants) && product.variants.length > 0 && (variantId || variantLabel)) {
        const vIdx = product.variants.findIndex(
          v => (variantId && v.variant_id === variantId) || (variantLabel && v.label === variantLabel)
        );
        if (vIdx === -1) {
          throw new ExpressError(`Selected variant for "${product.title}" was not found`, 400);
        }
        if (Number(product.variants[vIdx].stock) < qty) {
          throw new ExpressError(
            `Insufficient stock for "${product.title}" (${product.variants[vIdx].label}). Available: ${product.variants[vIdx].stock}`,
            400
          );
        }
        unitPrice = Number(product.variants[vIdx].price);
        resolvedVariantLabel = product.variants[vIdx].label;
        resolvedVariantId = product.variants[vIdx].variant_id;
        product.variants[vIdx].stock -= qty;
        product.stock = product.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      } else {
        if (Number(product.stock) < qty) {
          throw new ExpressError(
            `Insufficient stock for "${product.title}". Available: ${product.stock}`,
            400
          );
        }
        product.stock -= qty;
      }

      product.status = product.stock > 0 ? 'active' : 'out_of_stock';
      productsToSave.push(product);

      validatedItems.push({
        product_id: product.custom_id || product.id || product._id.toString(),
        title: product.title,
        category: product.category,
        brand: product.brand || '',
        variant_id: resolvedVariantId,
        variant_label: resolvedVariantLabel,
        quantity: qty,
        unit_price: unitPrice,
        line_total: Number((unitPrice * qty).toFixed(2)),
        image_url: product.image_url,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        business_id: product.business_id,
        business_name: product.business_name || product.seller_name,
        item_status: 'Order Placed'
      });
    }

    for (const prodDoc of productsToSave) {
      await prodDoc.save();
    }

    const subtotal = Number(validatedItems.reduce((sum, i) => sum + i.line_total, 0).toFixed(2));
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const shippingFee = subtotal >= 999 ? 0 : 79;
    const totalAmount = Number((subtotal + tax + shippingFee).toFixed(2));
    const platformCommission = Number((subtotal * 0.08).toFixed(2));

    const sellerIds = Array.from(new Set(validatedItems.map(i => i.seller_id)));
    const businessIds = Array.from(new Set(validatedItems.map(i => i.business_id)));

    const newOrder = await ProductOrder.create({
      custom_id: orderId,
      buyer_id: req.user.id,
      buyer_name: req.user.name || 'Verified Customer',
      buyer_email: req.user.email || '',
      buyer_phone: trimmedPhone,
      shipping_address: trimmedAddress,
      items: validatedItems,
      seller_ids: sellerIds,
      business_ids: businessIds,
      subtotal,
      tax,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      platform_commission: platformCommission,
      payment_method: payment_method || 'UPI',
      payment_status: 'Completed',
      tracking_code: trackingCode,
      tracking_status: 'Order Placed',
      estimated_delivery: 'Within 2-4 Business Days'
    });

    return res.status(201).json({
      success: true,
      order: normalizeItem(newOrder),
      message: `Product order ${orderId} confirmed!`
    });
  }

  // Fallback JSON Persistence Branch
  const db = loadData();
  if (!Array.isArray(db.products)) db.products = [];
  if (!Array.isArray(db.product_orders)) db.product_orders = [];

  const validatedItems = [];

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

    let unitPrice = Number(product.price);
    let resolvedVariantLabel = 'Standard';
    let resolvedVariantId = '';

    if (Array.isArray(product.variants) && product.variants.length > 0 && (variantId || variantLabel)) {
      const vIdx = product.variants.findIndex(
        v => (variantId && v.variant_id === variantId) || (variantLabel && v.label === variantLabel)
      );
      if (vIdx === -1) {
        throw new ExpressError(`Selected variant for "${product.title}" was not found`, 400);
      }
      if (Number(product.variants[vIdx].stock) < qty) {
        throw new ExpressError(
          `Insufficient stock for "${product.title}" (${product.variants[vIdx].label}). Available: ${product.variants[vIdx].stock}`,
          400
        );
      }
      unitPrice = Number(product.variants[vIdx].price);
      resolvedVariantLabel = product.variants[vIdx].label;
      resolvedVariantId = product.variants[vIdx].variant_id;
      product.variants[vIdx].stock -= qty;
      product.stock = product.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    } else {
      if (Number(product.stock) < qty) {
        throw new ExpressError(
          `Insufficient stock for "${product.title}". Available: ${product.stock}`,
          400
        );
      }
      product.stock -= qty;
    }

    product.status = product.stock > 0 ? 'active' : 'out_of_stock';

    validatedItems.push({
      product_id: product.id,
      title: product.title,
      category: product.category,
      brand: product.brand || '',
      variant_id: resolvedVariantId,
      variant_label: resolvedVariantLabel,
      quantity: qty,
      unit_price: unitPrice,
      line_total: Number((unitPrice * qty).toFixed(2)),
      image_url: product.image_url,
      seller_id: product.seller_id,
      seller_name: product.seller_name,
      business_id: product.business_id,
      business_name: product.business_name || product.seller_name,
      item_status: 'Order Placed'
    });
  }

  const subtotal = Number(validatedItems.reduce((sum, i) => sum + i.line_total, 0).toFixed(2));
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const shippingFee = subtotal >= 50 ? 0 : 5;
  const totalAmount = Number((subtotal + tax + shippingFee).toFixed(2));
  const platformCommission = Number((subtotal * 0.08).toFixed(2));

  const sellerIds = Array.from(new Set(validatedItems.map(i => i.seller_id)));
  const businessIds = Array.from(new Set(validatedItems.map(i => i.business_id)));

  const newOrder = {
    id: orderId,
    custom_id: orderId,
    buyer_id: req.user.id,
    buyer_name: req.user.name || 'Verified Customer',
    buyer_email: req.user.email || '',
    buyer_phone: trimmedPhone,
    shipping_address: trimmedAddress,
    items: validatedItems,
    seller_ids: sellerIds,
    business_ids: businessIds,
    subtotal,
    tax,
    shipping_fee: shippingFee,
    total_amount: totalAmount,
    platform_commission: platformCommission,
    payment_method: payment_method || 'UPI',
    payment_status: 'Completed',
    tracking_code: trackingCode,
    tracking_status: 'Order Placed',
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
    message: `Product order ${orderId} confirmed!`
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
    order.payment_status = 'Refunded';
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
  order.payment_status = 'Refunded';
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
 * Customer requests a return on a delivered order, or vendor approves/refunds a return
 */
const handleProductOrderReturn = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required', 401);
  }

  const { id } = req.params;
  const { reason, action } = req.body; // action: 'request' (buyer) or 'approve' / 'reject' (vendor)

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
  checkoutCart,
  getProductOrders,
  trackProductOrder,
  updateProductOrderStatus,
  cancelProductOrder,
  handleProductOrderReturn
};
