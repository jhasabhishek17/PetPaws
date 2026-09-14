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
import { ShieldCheck, Heart, Phone, Mail } from 'lucide-react';

/**
 * Main PetPaws Application Component
 * Manages global application state including current user role, active tab navigation,
 * pet data fetching, modal dialog states, search filters, and footer layout.
 */
export default function App() {
  // Active User State (Defaults to Demo Buyer for seamless initial experience)
  const [currentUser, setCurrentUser] = useState({
    id: "u-buyer-1",
    name: "Alex Morgan",
    email: "buyer@petpaws.com",
    role: "buyer",
    phone: "+1 (555) 234-5678",
    address: "742 Evergreen Terrace, Springfield"
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

  // Fetch pet listings on mount & tab changes
  useEffect(() => {
    fetchPets();
  }, [selectedCategory]);

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

  // Handle Order Placement completion
  const handleOrderPlaced = (order) => {
    // Refresh pets list to reflect decremented stock or auto-unlisted status
    fetchPets();
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('marketplace');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Area based on Active Tab */}
      <main className="flex-1">
        {activeTab === 'marketplace' && (
          <Marketplace
            pets={pets}
            onSelectPet={(pet) => setSelectedPet(pet)}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'seller' && (
          <SellerDashboard
            currentUser={currentUser}
          />
        )}

        {activeTab === 'vets' && (
          <VetSection
            currentUser={currentUser}
          />
        )}

        {activeTab === 'grooming' && (
          <GroomingCareSection
            currentUser={currentUser}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTracking
            currentUser={currentUser}
          />
        )}

        {activeTab === 'support' && (
          <CustomerSupport
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Modals */}
      {selectedPet && (
        <PetDetailModal
          pet={selectedPet}
          onClose={() => setSelectedPet(null)}
          onBuyNow={(pet) => {
            setSelectedPet(null);
            setCheckoutPet(pet);
          }}
        />
      )}

      {checkoutPet && (
        <CheckoutModal
          pet={checkoutPet}
          currentUser={currentUser}
          onClose={() => setCheckoutPet(null)}
          onOrderPlaced={(order) => {
            handleOrderPlaced(order);
            // Switch to orders tracking tab
            setActiveTab('orders');
          }}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            // Switch to relevant portal if seller or vet
            if (user.role === 'seller') setActiveTab('seller');
            else if (user.role === 'vet') setActiveTab('vets');
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-lg mb-3">
                <span>🐾</span>
                <span>PetPaws</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                The premier verified pet marketplace, climate-controlled transport tracking, veterinary appointment scheduling, and pet care platform.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Pet Categories</h4>
              <ul className="space-y-2">
                <li><button onClick={() => { setActiveTab('marketplace'); setSelectedCategory('Dogs'); }} className="hover:text-white">Dogs & Puppies</button></li>
                <li><button onClick={() => { setActiveTab('marketplace'); setSelectedCategory('Cats'); }} className="hover:text-white">Cats & Kittens</button></li>
                <li><button onClick={() => { setActiveTab('marketplace'); setSelectedCategory('Fishes'); }} className="hover:text-white">Aquatic Fishes</button></li>
                <li><button onClick={() => { setActiveTab('marketplace'); setSelectedCategory('Rabbits'); }} className="hover:text-white">Rabbits & Bunnies</button></li>
                <li><button onClick={() => { setActiveTab('marketplace'); setSelectedCategory('Birds'); }} className="hover:text-white">Exotic Birds</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Platform Portals</h4>
              <ul className="space-y-2">
                <li><button onClick={() => setActiveTab('seller')} className="hover:text-white">Seller Management Portal</button></li>
                <li><button onClick={() => setActiveTab('vets')} className="hover:text-white">Veterinarians Directory</button></li>
                <li><button onClick={() => setActiveTab('grooming')} className="hover:text-white">Pet Grooming & Spa</button></li>
                <li><button onClick={() => setActiveTab('orders')} className="hover:text-white">Order Tracking & Invoices</button></li>
                <li><button onClick={() => setActiveTab('support')} className="hover:text-white">Customer Support 24/7</button></li>
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
            <p className="mt-2 sm:mt-0 font-medium">Clean, Well-Commented Educational Web Project</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
