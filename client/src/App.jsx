import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Marketplace from './components/Marketplace';
import PetDetailModal from './components/PetDetailModal';
import CheckoutModal from './components/CheckoutModal';
import OrdersTracking from './components/OrdersTracking';
import SellerDashboard from './components/SellerDashboard';
import VetSection from './components/VetSection';
import GroomingCareSection from './components/GroomingCareSection';
import CustomerSupport from './components/CustomerSupport';
import AuthModal from './components/AuthModal';
import FloatingQuickActions from './components/FloatingQuickActions';
import { ShieldCheck, Sparkles, Lock, ArrowRight, Heart, Phone, Mail } from 'lucide-react';

/**
 * Main PetPaws Application Component
 * 
 * Features Guest Mode by default (currentUser = null).
 * Includes Floating Quick Actions Widget (Pet Quiz Matchmaker, Live Transport Radar, Vet Telehealth).
 */
export default function App() {
  // Guest Mode by default: currentUser starts as null
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('petpaws_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Navigation and Filter state
  const [activeTab, setActiveTab] = useState('marketplace'); // 'marketplace', 'seller', 'vets', 'grooming', 'orders', 'support'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Pet Data and Modal state
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null); // Detail modal
  const [checkoutPet, setCheckoutPet] = useState(null); // Checkout modal
  const [isAuthOpen, setIsAuthOpen] = useState(false); // Auth modal
  const [authMessage, setAuthMessage] = useState(''); // Custom auth prompt message
  const [pendingAction, setPendingAction] = useState(null); // Post-login callback action

  // Fetch pet listings on mount & category filter changes
  useEffect(() => {
    fetchPets();
  }, [selectedCategory]);

  // Persist user session to localStorage when changed
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('petpaws_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('petpaws_user');
    }
  }, [currentUser]);

  const fetchPets = async () => {
    try {
      const res = await fetch('/api/pets');
      const data = await res.json();
      if (data.success) {
        setPets(data.pets);
      }
    } catch (err) {
      console.error("Error fetching pet listings:", err);
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

  // Handle Login success
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
    setAuthMessage('');

    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    } else {
      if (user.role === 'seller') setActiveTab('seller');
      else if (user.role === 'vet') setActiveTab('vets');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('petpaws_user');
    setActiveTab('marketplace');
  };

  // Handle Order Placement completion
  const handleOrderPlaced = (order) => {
    fetchPets();
    setActiveTab('orders');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Top Animated Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthMessage('');
          setIsAuthOpen(true);
        }}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Dynamic View Content */}
      <main className="flex-1">
        {activeTab === 'marketplace' && (
          <Marketplace
            pets={pets}
            onSelectPet={(pet) => setSelectedPet(pet)}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onBuyPetRequest={(pet) => {
              requireAuth(`Please log in or create an account to purchase ${pet.title}.`, () => {
                setCheckoutPet(pet);
              });
            }}
          />
        )}

        {activeTab === 'seller' && (
          currentUser ? (
            <SellerDashboard currentUser={currentUser} />
          ) : (
            <GuestProtectedView
              title="Seller & Breeder Management Portal"
              description="List your verified pets, manage stock inventory, track earnings, and setup payout bank details."
              onLoginRequest={() => requireAuth('Please log in as a Breeder or Seller to access the Seller Dashboard.', () => setActiveTab('seller'))}
            />
          )
        )}

        {activeTab === 'vets' && (
          <VetSection
            currentUser={currentUser}
            onRequireAuth={(msg, callback) => requireAuth(msg, callback)}
          />
        )}

        {activeTab === 'grooming' && (
          <GroomingCareSection
            currentUser={currentUser}
            onRequireAuth={(msg, callback) => requireAuth(msg, callback)}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTracking
            currentUser={currentUser}
            onRequireAuth={(msg, callback) => requireAuth(msg, callback)}
          />
        )}

        {activeTab === 'support' && (
          <CustomerSupport
            currentUser={currentUser}
            onRequireAuth={(msg, callback) => requireAuth(msg, callback)}
          />
        )}
      </main>

      {/* Floating Interactive Hub Bar */}
      <FloatingQuickActions
        onOpenQuiz={() => setActiveTab('marketplace')}
        onOpenRadar={() => setActiveTab('marketplace')}
        onOpenVet={() => setActiveTab('vets')}
      />

      {/* Interactive Pet Details Modal */}
      {selectedPet && (
        <PetDetailModal
          pet={selectedPet}
          onClose={() => setSelectedPet(null)}
          onBuyNow={(pet) => {
            setSelectedPet(null);
            requireAuth(`Please log in or register to buy ${pet.title}.`, () => {
              setCheckoutPet(pet);
            });
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
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800 mt-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-lg mb-3">
                <span className="animate-bounce">🐾</span>
                <span className="bg-gradient-to-r from-indigo-400 to-amber-300 bg-clip-text text-transparent font-extrabold">PetPaws</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                The premier verified pet marketplace, climate-controlled transport tracking, veterinary appointment scheduling, and pet care platform.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Pet Categories</h4>
              <ul className="space-y-2">
                <li><button onClick={() => { setActiveTab('marketplace'); setSelectedCategory('Dogs'); }} className="hover:text-indigo-400 transition-colors">Dogs & Puppies</button></li>
                <li><button onClick={() => { setActiveTab('marketplace'); setSelectedCategory('Cats'); }} className="hover:text-indigo-400 transition-colors">Cats & Kittens</button></li>
                <li><button onClick={() => { setActiveTab('marketplace'); setSelectedCategory('Fishes'); }} className="hover:text-indigo-400 transition-colors">Aquatic Fishes</button></li>
                <li><button onClick={() => { setActiveTab('marketplace'); setSelectedCategory('Rabbits'); }} className="hover:text-indigo-400 transition-colors">Rabbits & Bunnies</button></li>
                <li><button onClick={() => { setActiveTab('marketplace'); setSelectedCategory('Birds'); }} className="hover:text-orange-400 transition-colors">Exotic Birds</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Platform Portals</h4>
              <ul className="space-y-2">
                <li><button onClick={() => setActiveTab('seller')} className="hover:text-indigo-400 transition-colors">Seller Management Portal</button></li>
                <li><button onClick={() => setActiveTab('vets')} className="hover:text-indigo-400 transition-colors">Veterinarians Directory</button></li>
                <li><button onClick={() => setActiveTab('grooming')} className="hover:text-indigo-400 transition-colors">Pet Grooming & Spa</button></li>
                <li><button onClick={() => setActiveTab('orders')} className="hover:text-indigo-400 transition-colors">Order Tracking & Invoices</button></li>
                <li><button onClick={() => setActiveTab('support')} className="hover:text-indigo-400 transition-colors">Customer Support 24/7</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Health & Ethical Commitment</h4>
              <p className="text-slate-400 leading-relaxed mb-3">
                All pet listings require verified veterinary health certificates, microchipping, and ethical breeding standards.
              </p>
              <div className="flex items-center text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4 mr-1.5" /> 100% Health Guarantee
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-center flex flex-col sm:flex-row items-center justify-between text-slate-500">
            <p>© {new Date().getFullYear()} PetPaws Marketplace & Care Inc. All rights reserved.</p>
            <p className="mt-2 sm:mt-0 font-medium">Clean, Production-Ready Luxury Web Platform</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

/**
 * Guest Banner for Protected Features
 */
function GuestProtectedView({ title, description, onLoginRequest }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xl relative overflow-hidden">
        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-600/30 animate-pulseGlow">
          <Lock className="w-10 h-10" />
        </div>
        <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
          Authentication Required
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">{title}</h2>
        <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
          {description}
        </p>
        <button
          onClick={onLoginRequest}
          className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold rounded-full shadow-lg hover:from-indigo-700 transition-all transform hover:-translate-y-0.5 flex items-center justify-center mx-auto space-x-2"
        >
          <span>Log In or Create Account</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
