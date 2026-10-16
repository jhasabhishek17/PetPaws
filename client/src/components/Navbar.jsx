import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Store, 
  Stethoscope, 
  Scissors, 
  Truck, 
  HelpCircle, 
  User, 
  LogOut, 
  Menu, 
  X,
  Search,
  ChevronDown,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

/**
 * Ultra-Aesthetic Eye-Comfort Navbar Component
 */
export default function Navbar({ 
  currentUser, 
  onOpenAuth, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  searchQuery, 
  setSearchQuery 
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 glass-ultra border-b border-[#EFE9DF] shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => setActiveTab('marketplace')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E07A5F] via-[#F4A261] to-[#E76F51] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-[#E07A5F]/20 group-hover:scale-105 transition-all">
              🐾
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black text-[#231F20] tracking-tight font-display">
                  PetPaws
                </span>
                <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-bold bg-[#EAEFE9] text-[#2A5C4A] border border-[#D1E7DD] rounded-full">
                  <ShieldCheck className="w-3 h-3 text-[#52796F]" />
                  <span>Verified</span>
                </span>
              </div>
              <span className="text-[10px] text-[#65605B] font-semibold hidden md:block">Verified Pets & Eye-Comfort Care</span>
            </div>
          </div>

          {/* Search Trigger Input in Navbar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C847C]" />
              <input
                type="text"
                placeholder="Search Golden Retriever, Persian Kitten, Guppy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F3ECE0]/70 border border-[#E6DCCF] rounded-full text-xs font-semibold text-[#231F20] placeholder-[#8C847C] focus:outline-none focus:bg-white focus:border-[#E07A5F] transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="hidden lg:flex items-center space-x-1.5">
            
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === 'marketplace' 
                  ? 'bg-[#E07A5F] text-white shadow-md shadow-[#E07A5F]/25' 
                  : 'text-[#4A4344] hover:text-[#231F20] hover:bg-[#F3ECE0]'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Marketplace</span>
            </button>

            <button
              onClick={() => setActiveTab('vets')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === 'vets' 
                  ? 'bg-[#52796F] text-white shadow-md shadow-[#52796F]/25' 
                  : 'text-[#4A4344] hover:text-[#231F20] hover:bg-[#F3ECE0]'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Vet Care</span>
            </button>

            <button
              onClick={() => setActiveTab('grooming')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === 'grooming' 
                  ? 'bg-[#E07A5F] text-white shadow-md shadow-[#E07A5F]/25' 
                  : 'text-[#4A4344] hover:text-[#231F20] hover:bg-[#F3ECE0]'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>Spa & Grooming</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === 'orders' 
                  ? 'bg-[#52796F] text-white shadow-md shadow-[#52796F]/25' 
                  : 'text-[#4A4344] hover:text-[#231F20] hover:bg-[#F3ECE0]'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Track Order</span>
            </button>
          </nav>

          {/* User Account / Action */}
          <div className="hidden sm:flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('seller')}
              className="text-xs font-extrabold text-[#4A4344] hover:text-[#231F20] hover:bg-[#F3ECE0] px-3.5 py-2 rounded-full transition-all flex items-center space-x-1.5"
            >
              <Store className="w-4 h-4 text-[#8C847C]" />
              <span>Seller Portal</span>
            </button>

            {currentUser ? (
              <div className="flex items-center space-x-2.5 bg-[#F3ECE0] p-1.5 pr-3.5 rounded-full border border-[#E6DCCF]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#E07A5F] to-[#F4A261] text-white flex items-center justify-center text-xs font-bold shadow">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-bold text-[#231F20]">{currentUser.name}</span>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1 text-[#8C847C] hover:text-red-600 rounded-full hover:bg-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-5 py-2.5 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white rounded-full text-xs font-extrabold shadow-md shadow-[#E07A5F]/20 transition-all flex items-center space-x-1.5 transform hover:scale-105"
              >
                <User className="w-4 h-4" />
                <span>Sign In / Join</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#4A4344] rounded-xl hover:bg-[#F3ECE0]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#EFE9DF] bg-white px-4 pt-3 pb-4 space-y-1 animate-fadeIn">
          <button onClick={() => { setActiveTab('marketplace'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-extrabold text-[#231F20]">Marketplace</button>
          <button onClick={() => { setActiveTab('vets'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-extrabold text-[#231F20]">24/7 Vet Telehealth</button>
          <button onClick={() => { setActiveTab('grooming'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-extrabold text-[#231F20]">Spa & Grooming</button>
          <button onClick={() => { setActiveTab('orders'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-extrabold text-[#231F20]">Track Order</button>
          <button onClick={() => { setActiveTab('seller'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-extrabold text-[#231F20]">Seller Portal</button>

          <div className="pt-3 border-t border-[#EFE9DF]">
            {currentUser ? (
              <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="w-full py-2 bg-red-50 text-red-700 font-extrabold text-xs rounded-xl">Logout ({currentUser.name})</button>
            ) : (
              <button onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }} className="w-full py-2.5 bg-[#E07A5F] text-white font-extrabold text-xs rounded-full">Sign In / Join</button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
