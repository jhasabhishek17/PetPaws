import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  ShoppingCart,
  Heart,
  Star,
  Filter,
  ArrowUpDown,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  ShieldCheck,
  Store,
  Truck,
  Tag,
  Flag,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { apiGet, apiPost } from '../utils/auth';
import PawLoader from './PawLoader';

const PET_TYPE_FILTERS = ['All', 'Dogs', 'Cats', 'Fishes', 'Rabbits', 'Birds'];
const MAX_PRICE_LIMIT = 10000;
const formatINR = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

export default function ProductsMarketplace({
  currentUser,
  productWishlistIds = [],
  onToggleProductWishlist,
  onRequireAuth,
  onOrderComplete,
  onNavigate,
  onAddToast
}) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filter & Sort state
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [selectedPetType, setSelectedPetType] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE_LIMIT);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');

  // Product Detail Modal & Variant Selection
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [reportReason, setReportReason] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);

  // Cart & Checkout Drawer State
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('petpaws_product_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [buyerPhone, setBuyerPhone] = useState(currentUser?.phone || '');
  const [shippingAddress, setShippingAddress] = useState(currentUser?.address || '');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetchProductsCatalog();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (!buyerPhone && currentUser.phone) setBuyerPhone(currentUser.phone);
      if (!shippingAddress && currentUser.address) setShippingAddress(currentUser.address);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('petpaws_product_cart', JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  const fetchProductsCatalog = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await apiGet('/api/products');
      if (data && data.success) {
        setProducts(data.products || []);
        setCategories(data.categories || []);
        setBrands(data.brands || []);
      } else {
        setLoadError(data?.message || 'Unable to load products from the marketplace server.');
      }
    } catch (err) {
      console.error('Error loading products marketplace:', err);
      setLoadError(err?.message || 'Network or database error while loading products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activeCategoryMeta = useMemo(() => {
    return categories.find(c => c.id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category === selectedCategory);
    }
    if (selectedSubcategory !== 'All') {
      list = list.filter(p => p.subcategory === selectedSubcategory);
    }
    if (selectedPetType !== 'All') {
      list = list.filter(p => p.pet_type === selectedPetType || p.pet_type === 'All Pets');
    }
    if (selectedBrand !== 'All') {
      list = list.filter(p => p.brand === selectedBrand);
    }
    if (inStockOnly) {
      list = list.filter(p => Number(p.stock) > 0 && p.status === 'active');
    }
    if (maxPrice < MAX_PRICE_LIMIT) {
      list = list.filter(p => Number(p.price) <= maxPrice);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        p =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.subcategory || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.business_name || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price_asc') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => Number(b.rating || 4.8) - Number(a.rating || 4.8));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
    }

    return list;
  }, [
    products,
    selectedCategory,
    selectedSubcategory,
    selectedPetType,
    selectedBrand,
    inStockOnly,
    maxPrice,
    searchQuery,
    sortBy
  ]);

  const handleOpenProductModal = (product) => {
    setActiveProduct(product);
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const firstInStock = product.variants.find(v => Number(v.stock) > 0) || product.variants[0];
      setSelectedVariantId(firstInStock.variant_id);
    } else {
      setSelectedVariantId('');
    }
    setDetailQuantity(1);
    setShowReportForm(false);
    setReportReason('');
  };

  const addToCart = (product, variantObj = null, qty = 1) => {
    if (currentUser && currentUser.id === product.seller_id) {
      onAddToast?.('Shopkeepers cannot purchase their own product listings.', 'error');
      return;
    }

    const chosenVariant =
      variantObj ||
      (Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.find(v => v.variant_id === selectedVariantId) || product.variants[0]
        : null);

    const availableStock = chosenVariant ? Number(chosenVariant.stock) : Number(product.stock);
    if (availableStock <= 0) {
      onAddToast?.('This item or variant is currently out of stock.', 'error');
      return;
    }

    const unitPrice = chosenVariant ? Number(chosenVariant.price) : Number(product.price);
    const variantId = chosenVariant ? chosenVariant.variant_id : '';
    const variantLabel = chosenVariant ? chosenVariant.label : 'Standard';
    const cartKey = `${product.id}__${variantId || 'std'}`;

    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.cartKey === cartKey);
      if (existingIdx !== -1) {
        const nextQty = Math.min(availableStock, prev[existingIdx].quantity + qty);
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: nextQty };
        return updated;
      }
      return [
        ...prev,
        {
          cartKey,
          product_id: product.id,
          title: product.title,
          brand: product.brand,
          category: product.category,
          business_name: product.business_name || product.seller_name,
          seller_id: product.seller_id,
          variant_id: variantId,
          variant_label: variantLabel,
          unit_price: unitPrice,
          max_stock: availableStock,
          quantity: Math.min(availableStock, qty),
          image_url: product.image_url
        }
      ];
    });

    onAddToast?.(`Added ${product.title} (${variantLabel}) to cart`, 'success');
  };

  const updateCartQuantity = (cartKey, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.cartKey !== cartKey) return item;
          const next = item.quantity + delta;
          if (next <= 0) return null;
          return { ...item, quantity: Math.min(item.max_stock || 20, next) };
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (cartKey) => {
    setCart(prev => prev.filter(item => item.cartKey !== cartKey));
  };

  const cartSubtotal = useMemo(() => {
    return Number(cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2));
  }, [cart]);

  const cartTax = useMemo(() => {
    return Number((cartSubtotal * 0.08).toFixed(2));
  }, [cartSubtotal]);

  const cartShipping = useMemo(() => {
    if (cart.length === 0) return 0;
    return cartSubtotal >= 999 ? 0 : 79;
  }, [cart.length, cartSubtotal]);

  const cartTotal = useMemo(() => {
    return Number((cartSubtotal + cartTax + cartShipping).toFixed(2));
  }, [cartSubtotal, cartTax, cartShipping]);

  const totalCartUnits = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    onRequireAuth('Please sign in or create an account to complete your pet supplies checkout.', () => {
      setIsCheckoutStep(true);
    });
  };

  const handlePlaceProductOrder = async (e) => {
    e.preventDefault();
    if (!buyerPhone.trim() || !shippingAddress.trim()) {
      onAddToast?.('Please enter your delivery phone number and shipping address.', 'error');
      return;
    }

    setCheckingOut(true);
    try {
      const data = await apiPost('/api/product-orders/checkout', {
        items: cart.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          variant_label: item.variant_label,
          quantity: item.quantity,
          title: item.title
        })),
        buyer_phone: buyerPhone.trim(),
        shipping_address: shippingAddress.trim(),
        payment_method: paymentMethod
      });

      if (data.success && data.order) {
        setCart([]);
        setIsCheckoutStep(false);
        setIsCartOpen(false);
        fetchProductsCatalog();
        onAddToast?.(`Product order ${data.order.id} placed! Tracking: ${data.order.tracking_code}`, 'success');
        if (onOrderComplete) onOrderComplete(data.order);
      } else {
        onAddToast?.(data.message || 'Checkout failed', 'error');
      }
    } catch (err) {
      onAddToast?.('Network error while placing product order.', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleSubmitProductReport = async (e) => {
    e.preventDefault();
    if (!activeProduct || !reportReason.trim()) return;
    try {
      const data = await apiPost(`/api/products/${encodeURIComponent(activeProduct.id)}/report`, {
        reason: reportReason.trim()
      });
      if (data.success) {
        onAddToast?.(data.message || 'Listing reported for moderation.', 'success');
        setShowReportForm(false);
        setReportReason('');
      } else {
        onAddToast?.(data.message || 'Failed to submit report', 'error');
      }
    } catch {
      onAddToast?.('Could not submit report.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Top Banner: Multi-Vendor Pet Products Marketplace */}
      <div className="bg-gradient-to-br from-[#243D36] via-[#2A4A41] to-[#1D312B] rounded-3xl p-6 sm:p-10 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#F6C06B] text-xs font-extrabold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Vendor Pet Supplies & Essentials Marketplace</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight leading-tight mb-3">
            Everything Your Pet Needs, Direct from Verified Shops 🛍️
          </h1>
          <p className="text-sm sm:text-base text-[#C5DFD2] leading-relaxed mb-6 max-w-2xl">
            Shop holistic nutrition, harnesses, winter coats, orthopedic beds, smart fountains, and enrichment toys from independent pet shopkeepers. Free shipping on orders over ₹999!
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="px-5 py-3 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-extrabold text-xs rounded-full shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Shopping Cart ({totalCartUnits})</span>
              {cartSubtotal > 0 && <span>• {formatINR(cartSubtotal)}</span>}
            </button>

            {currentUser && ['seller', 'shopkeeper', 'admin'].includes(currentUser.role) ? (
              <button
                type="button"
                onClick={() => onNavigate?.('saas-portal')}
                className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white border border-white/25 font-extrabold text-xs rounded-full flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Store className="w-4 h-4 text-[#F6C06B]" />
                <span>Manage My Shop & SaaS Portal</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onRequireAuth('Sign in or register as a Shopkeeper / Seller to open your PetPaws storefront.', () =>
                    onNavigate?.('saas-portal')
                  )
                }
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-[#F4C4B7] border border-white/20 font-bold text-xs rounded-full flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>Sell Products on PetPaws</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills Row */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#65605B]">
            Browse by Supply Category
          </h2>
          {selectedCategory !== 'All' && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedSubcategory('All');
              }}
              className="text-xs font-extrabold text-[#E07A5F] hover:underline"
            >
              Clear Category
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSelectedSubcategory('All');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center space-x-2 flex-shrink-0 border transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-[#231F20] text-white border-[#231F20] shadow-md'
                : 'bg-white text-[#4A4344] border-[#E6DCCF] hover:bg-[#FAF6F0]'
            }`}
          >
            <span>🐾</span>
            <span>All Categories ({products.length})</span>
          </button>

          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedSubcategory('All');
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center space-x-2 flex-shrink-0 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#E07A5F] text-white border-[#E07A5F] shadow-md'
                    : 'bg-white text-[#4A4344] border-[#E6DCCF] hover:bg-[#FAF6F0]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.id}</span>
              </button>
            );
          })}
        </div>

        {/* Subcategory Pills when a specific Category is active */}
        {activeCategoryMeta && Array.isArray(activeCategoryMeta.subcategories) && (
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1">
            <span className="text-[11px] font-bold text-[#8C847C] flex-shrink-0">Subcategories:</span>
            <button
              type="button"
              onClick={() => setSelectedSubcategory('All')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold flex-shrink-0 transition-all ${
                selectedSubcategory === 'All'
                  ? 'bg-[#52796F] text-white'
                  : 'bg-[#EAEFE9] text-[#2A5C4A] hover:bg-[#D1E7DD]'
              }`}
            >
              All {activeCategoryMeta.id}
            </button>
            {activeCategoryMeta.subcategories.map(sub => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubcategory(sub)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold flex-shrink-0 transition-all ${
                  selectedSubcategory === sub
                    ? 'bg-[#52796F] text-white'
                    : 'bg-white border border-[#E6DCCF] text-[#4A4344] hover:bg-[#FAF6F0]'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter & Search Control Bar */}
      <div className="bg-white rounded-3xl border border-[#EFE9DF] p-4 sm:p-5 shadow-aesthetic mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-[#8C847C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search food, harness, brand, shop..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C847C] hover:text-[#231F20]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pet Species Filter */}
          <div className="md:col-span-3 flex items-center space-x-1.5 overflow-x-auto">
            {PET_TYPE_FILTERS.map(pt => (
              <button
                key={pt}
                type="button"
                onClick={() => setSelectedPetType(pt)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold flex-shrink-0 transition-all ${
                  selectedPetType === pt
                    ? 'bg-[#52796F] text-white'
                    : 'bg-[#FAF6F0] text-[#65605B] hover:text-[#231F20]'
                }`}
              >
                {pt}
              </button>
            ))}
          </div>

          {/* Brand Filter */}
          <div className="md:col-span-2">
            <select
              aria-label="Filter by brand"
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-bold text-[#231F20] focus:outline-none focus:border-[#E07A5F]"
            >
              <option value="All">All Brands ({brands.length})</option>
              {brands.map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-3 flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-[#8C847C] flex-shrink-0" />
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-bold text-[#231F20] focus:outline-none focus:border-[#E07A5F]"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>

        {/* Price Slider & Availability Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#EFE9DF] text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-[#E07A5F]" />
              <span className="font-bold text-[#4A4344]">
                Max Price:{' '}
                <strong className="text-[#E07A5F]">
                  {maxPrice === MAX_PRICE_LIMIT ? `${formatINR(MAX_PRICE_LIMIT)}+` : formatINR(maxPrice)}
                </strong>
              </span>
              <input
                type="range"
                min="100"
                max={MAX_PRICE_LIMIT}
                step="100"
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-28 sm:w-40 accent-[#E07A5F] cursor-pointer"
              />
            </div>

            <label className="inline-flex items-center space-x-2 cursor-pointer font-bold text-[#4A4344]">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={e => setInStockOnly(e.target.checked)}
                className="rounded accent-[#52796F]"
              />
              <span>In-Stock Only</span>
            </label>
          </div>

          <div className="flex items-center space-x-3 text-[#65605B] font-semibold">
            <span>
              Showing <strong className="text-[#231F20]">{filteredProducts.length}</strong> of {products.length} products
            </span>
            {(selectedCategory !== 'All' ||
              selectedSubcategory !== 'All' ||
              selectedPetType !== 'All' ||
              selectedBrand !== 'All' ||
              inStockOnly ||
              maxPrice < MAX_PRICE_LIMIT ||
              searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedSubcategory('All');
                  setSelectedPetType('All');
                  setSelectedBrand('All');
                  setInStockOnly(false);
                  setMaxPrice(MAX_PRICE_LIMIT);
                  setSearchQuery('');
                }}
                className="text-[#E07A5F] font-extrabold hover:underline"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <PawLoader label="Loading pet products & shopkeeper catalogs…" />
      ) : loadError ? (
        <div className="bg-white rounded-3xl border border-red-200 p-10 text-center shadow-aesthetic">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-[#231F20]">Could Not Load Marketplace Products</h3>
          <p className="text-xs text-[#65605B] mt-1 mb-5 max-w-md mx-auto">{loadError}</p>
          <button
            type="button"
            onClick={fetchProductsCatalog}
            className="px-5 py-2.5 bg-[#E07A5F] hover:bg-[#D0654A] text-white text-xs font-extrabold rounded-full shadow-md cursor-pointer"
          >
            Retry Loading Products
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-12 text-center shadow-aesthetic">
          <Package className="w-12 h-12 text-[#8C847C] mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-[#231F20]">No Pet Products Match Your Filters</h3>
          <p className="text-xs text-[#65605B] mt-1 mb-5">
            Try clearing your category, brand, or price range filter to see all available pet supplies.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSelectedSubcategory('All');
              setSelectedPetType('All');
              setSelectedBrand('All');
              setInStockOnly(false);
              setMaxPrice(MAX_PRICE_LIMIT);
              setSearchQuery('');
            }}
            className="px-5 py-2.5 bg-[#E07A5F] text-white text-xs font-extrabold rounded-full shadow-md"
          >
            Show All Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const isWishlisted = productWishlistIds.includes(product.id);
            const isOut = Number(product.stock) <= 0 || product.status === 'out_of_stock';
            const hasDiscount = Number(product.compare_at_price) > Number(product.price);

            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-[#EFE9DF] overflow-hidden shadow-aesthetic hover:shadow-xl transition-all flex flex-col group"
              >
                {/* Product Image Header */}
                <div
                  className="relative h-52 bg-[#FAF6F0] overflow-hidden cursor-pointer"
                  onClick={() => handleOpenProductModal(product)}
                >
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#231F20]/80 text-white backdrop-blur-sm">
                      {product.category}
                    </span>
                    {hasDiscount && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#E07A5F] text-white shadow">
                        Save {formatINR(Number(product.compare_at_price) - Number(product.price))}
                      </span>
                    )}
                  </div>

                  {/* Wishlist Heart Button */}
                  <button
                    type="button"
                    aria-label="Save product to wishlist"
                    onClick={e => {
                      e.stopPropagation();
                      onToggleProductWishlist?.(product.id);
                    }}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer ${
                      isWishlisted
                        ? 'bg-[#E07A5F] text-white'
                        : 'bg-white/90 text-[#4A4344] hover:text-[#E07A5F]'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>

                  {isOut && (
                    <div className="absolute inset-0 bg-[#231F20]/50 flex items-center justify-center">
                      <span className="px-4 py-1.5 bg-red-600 text-white text-xs font-black rounded-full uppercase tracking-wider">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#65605B] mb-1">
                    <span className="truncate">{product.brand || 'PetPaws Essentials'}</span>
                    <span className="inline-flex items-center text-amber-600 font-extrabold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                      {product.rating || 4.8} ({product.reviews_count || 12})
                    </span>
                  </div>

                  <h3
                    onClick={() => handleOpenProductModal(product)}
                    className="text-sm font-extrabold text-[#231F20] line-clamp-2 mb-1.5 cursor-pointer hover:text-[#E07A5F] transition-colors"
                  >
                    {product.title}
                  </h3>

                  <p className="text-[11px] text-[#65605B] line-clamp-2 mb-3 flex-1">
                    {product.description}
                  </p>

                  {/* Variants indicator */}
                  {Array.isArray(product.variants) && product.variants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.variants.slice(0, 3).map(v => (
                        <span
                          key={v.variant_id}
                          className="px-2 py-0.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-lg text-[10px] font-bold text-[#4A4344]"
                        >
                          {v.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Vendor Storefront Badge */}
                  <div className="flex items-center justify-between text-[11px] text-[#65605B] pb-3 mb-3 border-b border-[#EFE9DF]">
                    <span className="inline-flex items-center truncate">
                      <Store className="w-3.5 h-3.5 text-[#52796F] mr-1 flex-shrink-0" />
                      <strong className="text-[#231F20] truncate">
                        {product.business_name || product.seller_name}
                      </strong>
                    </span>
                    <span
                      className={`font-bold ${
                        Number(product.stock) <= 5 ? 'text-amber-700' : 'text-[#2A5C4A]'
                      }`}
                    >
                      {Number(product.stock) > 0 ? `${product.stock} in stock` : 'Sold out'}
                    </span>
                  </div>

                  {/* Price & Add to Cart Action */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-lg font-black text-[#231F20] font-display">
                        {formatINR(product.price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-[#8C847C] line-through ml-1.5">
                          {formatINR(product.compare_at_price)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenProductModal(product)}
                        className="px-3 py-2 bg-[#FAF6F0] hover:bg-[#EFE9DF] text-[#231F20] text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
                      >
                        Options
                      </button>
                      <button
                        type="button"
                        disabled={isOut}
                        onClick={() => addToCart(product, product.variants?.[0] || null, 1)}
                        className="px-3.5 py-2 bg-[#E07A5F] hover:bg-[#D0654A] disabled:bg-gray-300 text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail & Variant Selector Modal */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231F20]/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#EFE9DF] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative">
            <button
              type="button"
              onClick={() => setActiveProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-[#FAF6F0] hover:bg-[#EFE9DF] text-[#231F20]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="rounded-2xl overflow-hidden border border-[#EFE9DF] bg-[#FAF6F0] h-72">
                  <img
                    src={activeProduct.image_url}
                    alt={activeProduct.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {Array.isArray(activeProduct.features) && activeProduct.features.length > 0 && (
                  <div className="mt-4 bg-[#FAF6F0] p-4 rounded-2xl border border-[#E6DCCF]">
                    <h4 className="text-xs font-extrabold uppercase text-[#4A4344] mb-2">
                      Key Product Highlights
                    </h4>
                    <ul className="space-y-1.5 text-xs text-[#231F20]">
                      {activeProduct.features.map((feat, i) => (
                        <li key={i} className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#52796F] flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-3 py-1 bg-[#EAEFE9] text-[#2A5C4A] text-[11px] font-extrabold rounded-full">
                      {activeProduct.category}
                    </span>
                    <span className="px-3 py-1 bg-[#FAF6F0] text-[#65605B] text-[11px] font-bold rounded-full">
                      For {activeProduct.pet_type || 'All Pets'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-[#231F20] font-display mb-1">
                    {activeProduct.title}
                  </h2>
                  <p className="text-xs font-bold text-[#65605B] mb-3">
                    Brand: <strong className="text-[#231F20]">{activeProduct.brand}</strong> • Sold by{' '}
                    <strong className="text-[#52796F]">{activeProduct.business_name || activeProduct.seller_name}</strong>
                  </p>

                  {(() => {
                    const chosenVar = (activeProduct.variants || []).find(v => v.variant_id === selectedVariantId);
                    const displayPrice = chosenVar ? chosenVar.price : activeProduct.price;
                    const displayStock = chosenVar ? chosenVar.stock : activeProduct.stock;

                    return (
                      <>
                        <div className="flex items-baseline space-x-3 mb-4">
                          <span className="text-3xl font-black text-[#E07A5F] font-display">
                            {formatINR(displayPrice)}
                          </span>
                          <span className="text-xs font-bold text-[#2A5C4A]">
                            ({displayStock} units available)
                          </span>
                        </div>

                        <p className="text-xs text-[#4A4344] leading-relaxed mb-4">
                          {activeProduct.description}
                        </p>

                        {/* Variant Selection Pills */}
                        {Array.isArray(activeProduct.variants) && activeProduct.variants.length > 0 && (
                          <div className="mb-4">
                            <label className="block text-xs font-extrabold text-[#231F20] mb-2">
                              Select Size / Pack Option:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {activeProduct.variants.map(v => (
                                <button
                                  key={v.variant_id}
                                  type="button"
                                  onClick={() => setSelectedVariantId(v.variant_id)}
                                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                                    selectedVariantId === v.variant_id
                                      ? 'border-[#E07A5F] bg-[#FFF5F0] font-extrabold text-[#231F20]'
                                      : 'border-[#E6DCCF] bg-white text-[#4A4344] hover:bg-[#FAF6F0]'
                                  }`}
                                >
                                  <div className="flex justify-between">
                                    <span>{v.label}</span>
                                    <span className="text-[#E07A5F] font-black">{formatINR(v.price)}</span>
                                  </div>
                                  <span className="text-[10px] text-[#65605B]">
                                    Stock: {v.stock}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeProduct.ingredients_or_materials && (
                          <div className="mb-3 text-[11px] text-[#65605B]">
                            <strong className="text-[#231F20]">Materials / Ingredients:</strong>{' '}
                            {activeProduct.ingredients_or_materials}
                          </div>
                        )}

                        {activeProduct.safety_notes && (
                          <div className="p-3 bg-[#EAEFE9]/60 border border-[#D1E7DD] rounded-xl text-[11px] text-[#2A5C4A] mb-4 flex items-start space-x-2">
                            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{activeProduct.safety_notes}</span>
                          </div>
                        )}

                        {/* Quantity & Add to Cart */}
                        <div className="flex items-center space-x-3 pt-3 border-t border-[#EFE9DF]">
                          <div className="flex items-center border border-[#E6DCCF] rounded-xl bg-[#FAF6F0]">
                            <button
                              type="button"
                              onClick={() => setDetailQuantity(q => Math.max(1, q - 1))}
                              className="p-2.5 text-[#231F20] hover:text-[#E07A5F]"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-xs font-extrabold">{detailQuantity}</span>
                            <button
                              type="button"
                              onClick={() => setDetailQuantity(q => Math.min(displayStock || 10, q + 1))}
                              className="p-2.5 text-[#231F20] hover:text-[#E07A5F]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={displayStock <= 0}
                            onClick={() => {
                              addToCart(activeProduct, chosenVar || null, detailQuantity);
                              setActiveProduct(null);
                              setIsCartOpen(true);
                            }}
                            className="flex-1 py-3 bg-[#E07A5F] hover:bg-[#D0654A] disabled:bg-gray-300 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <span>Add to Cart • {formatINR(displayPrice * detailQuantity)}</span>
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Report Listing Link for Moderation */}
                <div className="mt-4 pt-3 border-t border-[#EFE9DF] flex items-center justify-between text-[11px] text-[#8C847C]">
                  <span>SKU: {activeProduct.sku || activeProduct.id}</span>
                  <button
                    type="button"
                    onClick={() => setShowReportForm(!showReportForm)}
                    className="inline-flex items-center space-x-1 hover:text-red-600"
                  >
                    <Flag className="w-3 h-3" />
                    <span>Report Listing</span>
                  </button>
                </div>

                {showReportForm && (
                  <form onSubmit={handleSubmitProductReport} className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
                    <label className="block text-[11px] font-bold text-red-800">
                      Report this product to PetPaws Trust & Safety Moderation:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Describe safety or policy concern..."
                      value={reportReason}
                      onChange={e => setReportReason(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-red-600 text-white text-[11px] font-bold rounded-lg"
                    >
                      Submit Report
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Shopping Cart & Multi-Vendor Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#231F20]/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-[#EFE9DF] flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE9DF] mb-4">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-[#E07A5F]" />
                  <h3 className="text-lg font-black text-[#231F20] font-display">
                    {isCheckoutStep ? 'Checkout & Delivery' : `Your Pet Supplies Cart (${totalCartUnits})`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutStep(false);
                  }}
                  className="p-1.5 rounded-full bg-[#FAF6F0] hover:bg-[#EFE9DF]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart className="w-12 h-12 text-[#8C847C] mx-auto mb-3" />
                  <p className="text-sm font-bold text-[#231F20]">Your cart is empty</p>
                  <p className="text-xs text-[#65605B] mt-1">
                    Add food, harnesses, toys, or grooming supplies to get started.
                  </p>
                </div>
              ) : !isCheckoutStep ? (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div
                      key={item.cartKey}
                      className="p-3.5 rounded-2xl border border-[#EFE9DF] bg-[#FAF6F0]/60 flex items-center justify-between gap-3"
                    >
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-14 h-14 rounded-xl object-cover border border-[#E6DCCF] flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-[#231F20] truncate">{item.title}</p>
                        <p className="text-[11px] text-[#65605B]">
                          Option: <strong>{item.variant_label}</strong> • {formatINR(item.unit_price)}
                        </p>
                        <p className="text-[10px] text-[#52796F] font-bold">
                          Shop: {item.business_name}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.cartKey, -1)}
                            className="w-6 h-6 rounded-lg bg-white border border-[#E6DCCF] flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-extrabold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.cartKey, 1)}
                            className="w-6 h-6 rounded-lg bg-white border border-[#E6DCCF] flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-[#231F20]">
                          {formatINR(item.unit_price * item.quantity)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cartKey)}
                          className="text-red-500 hover:text-red-700 p-1 mt-2"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <form id="product-checkout-form" onSubmit={handlePlaceProductOrder} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#4A4344] mb-1">
                      Delivery Contact Phone
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98201 11223"
                      value={buyerPhone}
                      onChange={e => setBuyerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4344] mb-1">
                      Full Shipping Address
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Flat/House No., Street, Locality, City, State, PIN Code"
                      value={shippingAddress}
                      onChange={e => setShippingAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4344] mb-1">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['UPI', 'Card', 'NetBanking'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 rounded-xl border text-xs font-extrabold ${
                            paymentMethod === m
                              ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#E07A5F]'
                              : 'border-[#E6DCCF] text-[#65605B]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-[#EFE9DF] space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#65605B]">
                    <span>Subtotal</span>
                    <strong>{formatINR(cartSubtotal)}</strong>
                  </div>
                  <div className="flex justify-between text-[#65605B]">
                    <span>GST (8%)</span>
                    <strong>{formatINR(cartTax)}</strong>
                  </div>
                  <div className="flex justify-between text-[#65605B]">
                    <span>Shipping {cartSubtotal >= 999 && '(Free over ₹999!)'}</span>
                    <strong>{cartShipping === 0 ? 'FREE' : formatINR(cartShipping)}</strong>
                  </div>
                  <div className="flex justify-between text-sm font-black text-[#231F20] pt-2 border-t border-[#EFE9DF]">
                    <span>Total</span>
                    <span>{formatINR(cartTotal)}</span>
                  </div>
                </div>

                {!isCheckoutStep ? (
                  <button
                    type="button"
                    onClick={handleProceedToCheckout}
                    className="w-full py-3.5 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Proceed to Checkout ({formatINR(cartTotal)})
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutStep(false)}
                      className="px-4 py-3 bg-[#FAF6F0] text-[#4A4344] font-bold text-xs rounded-xl"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      form="product-checkout-form"
                      disabled={checkingOut}
                      className="flex-1 py-3 bg-[#52796F] hover:bg-[#3E5E56] text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      {checkingOut ? 'Processing Order…' : `Confirm & Pay ${formatINR(cartTotal)}`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
