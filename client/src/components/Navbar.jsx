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
  ShieldCheck,
  Search
} from 'lucide-react';

/**
 * Navbar Component
 * Navigation bar with role badge, view switcher, search input, and responsive mobile menu.
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

  const navItems = [
    { id: 'marketplace', label: 'Pet Marketplace', icon: ShoppingBag, role: 'all' },
    { id: 'seller', label: 'Seller Portal', icon: Store, role: 'seller' },
    { id: 'vets', label: 'Veterinarians', icon: Stethoscope, role: 'all' },
    { id: 'grooming', label: 'Grooming & Care', icon: Scissors, role: 'all' },
    { id: 'orders', label: 'Orders & Tracking', icon: Truck, role: 'all' },
    { id: 'support', label: 'Customer Support', icon: HelpCircle, role: 'all' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('marketplace')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-orange-500/20">
              🐾
            </div>
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-slate-900 via-orange-600 to-amber-600 bg-clip-text text-transparent">
                PetPaws
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">
                Verified Pets
              </span>
            </div>
          </div>

          {/* Desktop Search Bar (shown on marketplace tab) */}
          {activeTab === 'marketplace' && (
            <div className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cats, dogs, fishes, rabbits, breeds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-orange-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              // Hide seller portal if logged in as buyer/vet and not viewing demo
              if (item.id === 'seller' && currentUser && currentUser.role !== 'seller') {
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors flex items-center space-x-1.5"
                  >
                    <Icon className="w-4 h-4" />
                    <span>Become a Seller</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    isActive 
                      ? 'bg-orange-50 text-orange-600 font-semibold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Account / Login Button */}
          <div className="hidden sm:flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3 bg-slate-50 p-1.5 pr-3 rounded-full border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.name}
                  </div>
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                    currentUser.role === 'seller' 
                      ? 'bg-amber-100 text-amber-800' 
                      : currentUser.role === 'vet' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-sm font-semibold shadow-md hover:from-orange-600 hover:to-amber-600 transition-all flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Login / Register</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {activeTab === 'marketplace' && (
            <div className="my-2">
              <input
                type="text"
                placeholder="Search pets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-3 ${
                  isActive ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-100 mt-2">
            {currentUser ? (
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 uppercase">{currentUser.role}</p>
                </div>
                <button
                  onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-md"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
                className="w-full py-2.5 bg-orange-500 text-white font-semibold rounded-lg text-center text-sm shadow"
              >
                Login / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
