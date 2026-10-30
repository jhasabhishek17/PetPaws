import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Marketplace from './components/Marketplace';
import PetDetailModal from './components/PetDetailModal';
import CheckoutModal from './components/CheckoutModal';
import OrdersTracking from './components/OrdersTracking';
import SellerDashboard from './components/SellerDashboard';
import BuyerDashboard from './components/BuyerDashboard';
import VetDashboard from './components/VetDashboard';
import VetSection from './components/VetSection';
import GroomingCareSection from './components/GroomingCareSection';
import CustomerSupport from './components/CustomerSupport';
import ProductsMarketplace from './components/ProductsMarketplace';
import BusinessSaaSPortal from './components/BusinessSaaSPortal';
import AuthModal from './components/AuthModal';
import FloatingQuickActions from './components/FloatingQuickActions';
import ToastContainer, { useToast } from './components/Toast';
import PawBackdrop from './components/PawBackdrop';
import { getToken, setToken, removeToken, apiGet, apiPost } from './utils/auth';
import { ShieldCheck } from 'lucide-react';

const VALID_TABS = [
  'marketplace',
  'products',
  'saas-portal',
  'seller',
  'buyer-dashboard',
  'vet-dashboard',
  'wishlist',
  'vets',
  'grooming',
  'orders',
  'support'
];

/**
 * Main PetPaws Application Component
 */
export default function App() {
  const { toasts, addToast, removeToast } = useToast();

  // Guest Mode by default: currentUser starts as null unless persisted in localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('petpaws_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Navigation and Filter state (synced with window.location.hash)
  const [activeTab, setActiveTab] = useState(() => {
    const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '');
    return VALID_TABS.includes(h) ? h : 'marketplace';
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Pet Data and Modal state
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState(null); // Detail modal
  const [checkoutPet, setCheckoutPet] = useState(null); // Checkout modal
  const [isAuthOpen, setIsAuthOpen] = useState(false); // Auth modal
  const [authMessage, setAuthMessage] = useState(''); // Custom auth prompt message
  const [pendingAction, setPendingAction] = useState(null); // Post-login callback action

  // Persisted Buyer Wishlist state
  const [wishlistIds, setWishlistIds] = useState([]);
  const [wishlistPets, setWishlistPets] = useState([]);
  const [productWishlistIds, setProductWishlistIds] = useState([]);

  // Listen to browser navigation (Back / Forward buttons) and hash changes
  useEffect(() => {
    // If user enters with no hash, anchor history entry with #marketplace
    if (typeof window !== 'undefined' && (!window.location.hash || window.location.hash === '#')) {
      window.history.replaceState(null, '', '#marketplace');
    }

    const handleLocationChange = () => {
      // Dismiss any open modal overlay when navigating history
      setSelectedPet(null);
      setCheckoutPet(null);
      setIsAuthOpen(false);

      const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '');
      if (VALID_TABS.includes(h)) {
        setActiveTab(h);
      } else if (!h) {
        setActiveTab('marketplace');
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Update URL hash when activeTab changes, pushing a new history entry so browser Back works
  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const current = window.location.hash.replace('#', '');
      if (current !== tab) {
        window.history.pushState(null, '', `#${tab}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Verify persisted session token on initial mount so expired or missing tokens sign out cleanly
  useEffect(() => {
    if (!currentUser) return;
    if (!getToken()) {
      setCurrentUser(null);
      localStorage.removeItem('petpaws_user');
      return;
    }
    let cancelled = false;
    apiGet('/api/auth/me')
      .then((data) => {
        if (cancelled) return;
        if (data && data.success && data.user) {
          setCurrentUser(data.user);
        } else if (data && data.statusCode === 401) {
          removeToken();
          setCurrentUser(null);
          localStorage.removeItem('petpaws_user');
        }
      })
      .catch(() => {
        // Network error: preserve offline state rather than forcibly logging out
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch pet listings on mount & category filter changes
  useEffect(() => {
    fetchPets();
  }, [selectedCategory]);

  // Persist user session to localStorage and load buyer wishlist when logged in as buyer
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('petpaws_user', JSON.stringify(currentUser));
      if (currentUser.role === 'buyer') {
        fetchWishlist();
      } else {
        setWishlistIds([]);
        setWishlistPets([]);
        setProductWishlistIds([]);
      }
    } else {
      localStorage.removeItem('petpaws_user');
      setWishlistIds([]);
      setWishlistPets([]);
      setProductWishlistIds([]);
    }
  }, [currentUser]);

  const fetchPets = async () => {
    try {
      const data = await apiGet('/api/pets');
      if (data.success) {
        setPets(data.pets);
      }
    } catch (err) {
      console.error('Error fetching pet listings:', err);
    } finally {
      setPetsLoading(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      const data = await apiGet('/api/auth/wishlist');
      if (data.success) {
        setWishlistIds(data.wishlistIds || []);
        setWishlistPets(data.pets || []);
        setProductWishlistIds(data.productWishlistIds || []);
      }
    } catch (err) {
      console.error('Error loading buyer wishlist:', err);
    }
  };

  const handleToggleProductWishlist = async (productId) => {
    if (!currentUser) {
      requireAuth('Please sign in to save pet products to your wishlist.', () => {});
      return;
    }
    try {
      const data = await apiPost(`/api/auth/product-wishlist/${encodeURIComponent(productId)}`, {});
      if (data.success) {
        setProductWishlistIds(data.productWishlistIds || []);
        addToast(data.message || 'Product wishlist updated', 'success');
      } else {
        addToast(data.message || 'Could not update product wishlist', 'error');
      }
    } catch {
      addToast('Failed to update product wishlist', 'error');
    }
  };

  const handleToggleWishlist = async (petId) => {
    if (!currentUser || currentUser.role !== 'buyer') {
      addToast('Only authenticated buyer accounts can save pets to a wishlist.', 'error');
      return;
    }
    try {
      const data = await apiPost(`/api/auth/wishlist/${encodeURIComponent(petId)}`, {});
      if (data.success) {
        setWishlistIds(data.wishlistIds || []);
        setWishlistPets(data.pets || []);
        addToast(data.message || (data.added ? 'Added to wishlist' : 'Removed from wishlist'), 'success');
      } else {
        addToast(data.message || 'Failed to update wishlist', 'error');
      }
    } catch (err) {
      addToast('Failed to update wishlist', 'error');
    }
  };

  /**
   * Protected Action Enforcer
   * Checks if user is logged in before executing sensitive actions (buy, book, list).
   */
  const requireAuth = (message, actionCallback) => {
    if (currentUser) {
      actionCallback();
    } else {
      setAuthMessage(message || 'Please log in or create an account to proceed.');
      setPendingAction(() => actionCallback);
      setIsAuthOpen(true);
    }
  };

  const handleBuyPetRequest = (pet) => {
    if (currentUser && currentUser.id === pet.seller_id) {
      addToast('Sellers cannot order their own pet listings.', 'error');
      return;
    }
    requireAuth(`Please log in or create an account to purchase ${pet.title}.`, () => {
      setCheckoutPet(pet);
    });
  };

  // Handle Login success
  const handleLoginSuccess = (user, token) => {
    if (token) setToken(token);
    setCurrentUser(user);
    setIsAuthOpen(false);
    setAuthMessage('');
    addToast(`Welcome back, ${user.name}!`, 'success');

    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    } else {
      if (user.role === 'seller') handleSelectTab('seller');
      else if (user.role === 'shopkeeper' || user.role === 'groomer' || user.role === 'admin') handleSelectTab('saas-portal');
      else if (user.role === 'vet') handleSelectTab('vet-dashboard');
      else if (user.role === 'buyer') handleSelectTab('marketplace');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    removeToken();
    setCurrentUser(null);
    setWishlistIds([]);
    setWishlistPets([]);
    setProductWishlistIds([]);
    localStorage.removeItem('petpaws_user');
    handleSelectTab('marketplace');
    addToast('Signed out successfully.', 'info');
  };


  // Automatically log out after 30 minutes of inactivity
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId;

    const resetInactivityTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
      }, 30 * 60 * 1000);
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [currentUser]);


  // Handle Order Placement completion
  const handleOrderPlaced = (order) => {
    fetchPets();
    addToast(`Order ${order.id} placed! Tracking: ${order.tracking_code}`, 'success');
    handleSelectTab('orders');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F0] text-[#231F20] font-sans selection:bg-[#E07A5F] selection:text-white">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Top Animated Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthMessage('');
          setIsAuthOpen(true);
        }}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        wishlistCount={wishlistIds.length}
      />

      {/* Main Dynamic View Content */}
      <main className="flex-1">
        {activeTab === 'marketplace' && (
          <Marketplace
            pets={pets}
            currentUser={currentUser}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onSelectPet={(pet) => setSelectedPet(pet)}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            loading={petsLoading}
            onNavigate={handleSelectTab}
            onBuyPetRequest={handleBuyPetRequest}
          />
        )}

        {activeTab === 'products' && (
          <ProductsMarketplace
            currentUser={currentUser}
            productWishlistIds={productWishlistIds}
            onToggleProductWishlist={handleToggleProductWishlist}
            onRequireAuth={(msg, callback) => requireAuth(msg, callback)}
            onOrderComplete={() => handleSelectTab('orders')}
            onNavigate={handleSelectTab}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'saas-portal' && (
          <BusinessSaaSPortal
            currentUser={currentUser}
            onOpenAuth={() => {
              setAuthMessage('Please sign in with a Business, Shopkeeper, Seller, or Admin account.');
              setIsAuthOpen(true);
            }}
            onNavigate={handleSelectTab}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'seller' && (
          <SellerDashboard
            currentUser={currentUser}
            onPetsChanged={fetchPets}
            onUserUpdated={(updated) => setCurrentUser(updated)}
            onOpenAuth={() => {
              setAuthMessage('Please sign in with a Seller account to access the Seller Portal.');
              setIsAuthOpen(true);
            }}
            onAddToast={addToast}
          />
        )}

        {(activeTab === 'buyer-dashboard' || activeTab === 'wishlist') && (
          <BuyerDashboard
            currentUser={currentUser}
            initialSection={activeTab === 'wishlist' ? 'wishlist' : 'overview'}
            wishlistPets={wishlistPets}
            onToggleWishlist={handleToggleWishlist}
            onSelectPet={(pet) => setSelectedPet(pet)}
            onBuyPetRequest={handleBuyPetRequest}
            onNavigate={handleSelectTab}
            onUserUpdated={(updated) => setCurrentUser(updated)}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'vet-dashboard' && (
          <VetDashboard
            currentUser={currentUser}
            onNavigate={handleSelectTab}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'vets' && (
          <VetSection
            currentUser={currentUser}
            onRequireAuth={(msg, callback) => requireAuth(msg, callback)}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'grooming' && (
          <GroomingCareSection
            currentUser={currentUser}
            onRequireAuth={(msg, callback) => requireAuth(msg, callback)}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTracking
            currentUser={currentUser}
            onOpenAuth={() => {
              setAuthMessage('Please sign in to view your private order tracking & invoices.');
              setIsAuthOpen(true);
            }}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'support' && (
          <CustomerSupport
            currentUser={currentUser}
            onRequireAuth={(msg, callback) => requireAuth(msg, callback)}
            onAddToast={addToast}
          />
        )}
      </main>

      {/* Floating Interactive Hub Bar */}
      <FloatingQuickActions
        currentUser={currentUser}
        onOpenQuiz={() => handleSelectTab('marketplace')}
        onOpenRadar={() => handleSelectTab('orders')}
        onOpenVet={() => handleSelectTab('vets')}
      />

      {/* Interactive Pet Details Modal */}
      {selectedPet && (
        <PetDetailModal
          pet={selectedPet}
          currentUser={currentUser}
          wishlistIds={wishlistIds}
          onToggleWishlist={handleToggleWishlist}
          onClose={() => setSelectedPet(null)}
          onBuyNow={(pet) => {
            setSelectedPet(null);
            handleBuyPetRequest(pet);
          }}
        />
      )}

      {/* Checkout Wizard Modal */}
      {checkoutPet && (
        <CheckoutModal
          pet={checkoutPet}
          currentUser={currentUser}
          onClose={() => setCheckoutPet(null)}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      {/* Animated Auth & Login/Register Modal */}
      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          message={authMessage}
          onClose={() => {
            setIsAuthOpen(false);
            setAuthMessage('');
          }}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Animated Footer */}
      <footer className="bg-[#243D36] text-[#C5DFD2] text-xs py-14 mt-12 relative overflow-hidden">
        <PawBackdrop tone="text-white/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-lg mb-3">
                <span className="animate-bounce">🐾</span>
                <span className="text-[#F4C4B7] font-extrabold font-display text-2xl">PetPaws</span>
              </div>
              <p className="text-[#C5DFD2] leading-relaxed">
                The premier verified pet marketplace, climate-controlled transport tracking, veterinary appointment scheduling, and pet care platform.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Pet Categories</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => {
                      handleSelectTab('marketplace');
                      setSelectedCategory('Dogs');
                    }}
                    className="hover:text-[#F4C4B7] transition-colors"
                  >
                    Dogs & Puppies
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      handleSelectTab('marketplace');
                      setSelectedCategory('Cats');
                    }}
                    className="hover:text-[#F4C4B7] transition-colors"
                  >
                    Cats & Kittens
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      handleSelectTab('marketplace');
                      setSelectedCategory('Fishes');
                    }}
                    className="hover:text-[#F4C4B7] transition-colors"
                  >
                    Aquatic Fishes
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      handleSelectTab('marketplace');
                      setSelectedCategory('Rabbits');
                    }}
                    className="hover:text-[#F4C4B7] transition-colors"
                  >
                    Rabbits & Bunnies
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      handleSelectTab('marketplace');
                      setSelectedCategory('Birds');
                    }}
                    className="hover:text-[#F4C4B7] transition-colors"
                  >
                    Exotic Birds
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Platform Services</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => handleSelectTab('marketplace')} className="hover:text-[#F4C4B7] transition-colors">
                    Verified Pet Marketplace
                  </button>
                </li>
                <li>
                  <button onClick={() => handleSelectTab('vets')} className="hover:text-[#F4C4B7] transition-colors">
                    Veterinarians Directory
                  </button>
                </li>
                <li>
                  <button onClick={() => handleSelectTab('grooming')} className="hover:text-[#F4C4B7] transition-colors">
                    Pet Grooming & Spa
                  </button>
                </li>
                {currentUser?.role === 'buyer' && (
                  <>
                    <li>
                      <button onClick={() => handleSelectTab('wishlist')} className="hover:text-[#F4C4B7] transition-colors">
                        My Saved Wishlist
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleSelectTab('orders')} className="hover:text-[#F4C4B7] transition-colors">
                        Order Tracking & Invoices
                      </button>
                    </li>
                  </>
                )}
                {currentUser?.role === 'seller' && (
                  <li>
                    <button onClick={() => handleSelectTab('seller')} className="hover:text-[#F4C4B7] transition-colors">
                      Seller Management Portal
                    </button>
                  </li>
                )}
                {currentUser?.role === 'vet' && (
                  <li>
                    <button onClick={() => handleSelectTab('vet-dashboard')} className="hover:text-[#F4C4B7] transition-colors">
                      Veterinarian Clinical Portal
                    </button>
                  </li>
                )}
                <li>
                  <button onClick={() => handleSelectTab('support')} className="hover:text-[#F4C4B7] transition-colors">
                    Customer Support 24/7
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Health & Ethical Commitment</h4>
              <p className="text-[#C5DFD2] leading-relaxed mb-3">
                All pet listings require verified veterinary health certificates, microchipping, and ethical breeding standards.
              </p>
              <div className="flex items-center text-[#F6C06B] font-bold">
                <ShieldCheck className="w-4 h-4 mr-1.5" /> 100% Health Guarantee
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 text-center flex flex-col sm:flex-row items-center justify-between text-[#9CC5B1]">
            <p>© {new Date().getFullYear()} PetPaws Marketplace & Care Inc. All rights reserved.</p>
            <p className="mt-2 sm:mt-0 font-medium">Made with 🐾 for pets and the people who love them</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
