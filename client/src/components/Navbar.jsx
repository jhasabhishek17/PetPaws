import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingBag,
  Package,
  Store,
  Stethoscope,
  Scissors,
  Truck,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Search,
  Heart,
  LayoutDashboard,
  ChevronDown
} from 'lucide-react';

/**
 * Navigation items configuration generator based on user role and wishlist count
 */
const getNavItems = (role, wishlistCount) => [
  { id: 'marketplace', label: 'Pets', icon: ShoppingBag, activeClass: 'bg-[#E07A5F] text-white shadow-md shadow-[#E07A5F]/25' },
  { id: 'products', label: 'Products', icon: Package, activeClass: 'bg-[#52796F] text-white shadow-md shadow-[#52796F]/25' },
  { id: 'vets', label: 'Vet Care', icon: Stethoscope, activeClass: 'bg-[#52796F] text-white shadow-md shadow-[#52796F]/25' },
  { id: 'grooming', label: 'Spa & Grooming', icon: Scissors, activeClass: 'bg-[#E07A5F] text-white shadow-md shadow-[#E07A5F]/25' },
  ...(role === 'buyer' ? [
    { id: 'wishlist', label: 'Wishlist', icon: Heart, badge: wishlistCount > 0 ? wishlistCount : null, activeClass: 'bg-[#E07A5F] text-white shadow-md shadow-[#E07A5F]/25' },
    { id: 'orders', label: 'Track Orders', icon: Truck, activeClass: 'bg-[#52796F] text-white shadow-md shadow-[#52796F]/25' },
    { id: 'buyer-dashboard', label: 'Dashboard', icon: LayoutDashboard, activeClass: 'bg-[#231F20] text-white shadow-md' }
  ] : []),
  ...(role === 'seller' ? [
    { id: 'seller', label: 'Breeder Portal', icon: Store, activeClass: 'bg-[#D97706] text-white shadow-md', customInactive: 'text-[#D97706] bg-[#FFF8EB] border border-[#F4A261]/40 hover:bg-[#F4A261]/20' },
    { id: 'saas-portal', label: 'SaaS & Shop', icon: LayoutDashboard, activeClass: 'bg-[#231F20] text-white shadow-md' }
  ] : []),
  ...(role === 'shopkeeper' || role === 'groomer' || role === 'admin' ? [
    { id: 'saas-portal', label: role === 'admin' ? 'SaaS & Admin' : 'Shop SaaS Portal', icon: Store, activeClass: 'bg-[#231F20] text-white shadow-md', customInactive: 'text-[#D97706] bg-[#FFF8EB] border border-[#F4A261]/40 hover:bg-[#F4A261]/20' }
  ] : []),
  ...(role === 'vet' ? [
    { id: 'vet-dashboard', label: 'Vet Portal', icon: LayoutDashboard, activeClass: 'bg-[#243D36] text-white shadow-md', customInactive: 'text-[#2A5C4A] bg-[#EAEFE9] border border-[#D1E7DD] hover:bg-[#D1E7DD]' },
    { id: 'saas-portal', label: 'Clinic SaaS', icon: Store, activeClass: 'bg-[#231F20] text-white shadow-md' }
  ] : []),
  { id: 'support', label: 'Support', icon: HelpCircle, activeClass: 'bg-[#E07A5F] text-white shadow-md shadow-[#E07A5F]/25' }
];

export default function Navbar({
  currentUser,
  onOpenAuth,
  onLogout,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  wishlistCount = 0
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [userDropdownOpen]);

  const triggerSearchNavigation = (queryText) => {
    setSearchQuery(queryText);
    if (activeTab !== 'marketplace') {
      setActiveTab('marketplace');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (activeTab !== 'marketplace') {
      setActiveTab('marketplace');
    }
    setTimeout(() => {
      document.getElementById('pet-listings')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const navItems = getNavItems(currentUser?.role, wishlistCount);

  return (
    <header className="sticky top-0 z-40 glass-ultra border-b border-[#EFE9DF] shadow-sm transition-all">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-5 xl:px-6">
        <div className="flex items-center justify-between min-h-16 sm:min-h-20 py-2 gap-1.5 xl:gap-2.5">
          
          {/* Brand Logo & Name */}
          <div
            className="flex items-center space-x-2 cursor-pointer group flex-shrink-0"
            onClick={() => setActiveTab('marketplace')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#E07A5F] via-[#F4A261] to-[#E76F51] text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-md shadow-[#E07A5F]/20 group-hover:scale-105 transition-all">
              🐾
            </div>
            <div>
              <span className="text-lg sm:text-xl xl:text-2xl font-black tracking-tight text-[#231F20] font-display flex items-center">
                Pet<span className="text-[#E07A5F]">Paws</span>
              </span>
              <p className="text-[10px] text-[#65605B] font-semibold -mt-1 hidden sm:block lg:hidden 2xl:block tracking-wide">
                Certified Pet Adoption & Care
              </p>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center w-28 lg:w-32 xl:w-44 2xl:w-56 flex-shrink min-w-[105px] mx-1 xl:mx-2"
          >
            <div className="relative w-full">
              <button
                type="submit"
                aria-label="Submit search"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C847C] hover:text-[#E07A5F] transition-colors p-1"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <input
                type="text"
                aria-label="Search pet listings"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => triggerSearchNavigation(e.target.value)}
                className="w-full pl-8 pr-6 py-1.5 bg-[#F3ECE0]/80 border border-[#E6DCCF] rounded-full text-xs font-semibold text-[#231F20] placeholder-[#8C847C] focus:outline-none focus:bg-white focus:border-[#E07A5F] transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8C847C] hover:text-[#231F20]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex flex-wrap items-center justify-center gap-1 flex-1 min-w-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const baseInactive = item.customInactive || 'text-[#4A4344] hover:text-[#231F20] hover:bg-[#F3ECE0]';

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2 xl:px-2.5 py-1.5 rounded-full text-[11px] xl:text-xs font-extrabold transition-all flex items-center space-x-1 whitespace-nowrap flex-shrink-0 ${
                    isActive ? item.activeClass : baseInactive
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${item.id === 'wishlist' && wishlistCount > 0 ? 'fill-current' : ''}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-white text-[#E07A5F]' : 'bg-[#FFF5F0] text-[#E07A5F] border border-[#F4C4B7]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Desktop User Account Pill & Dedicated Unclipped Logout Button */}
          <div className="hidden lg:flex items-center space-x-1.5 flex-shrink-0 relative" ref={dropdownRef}>
            {currentUser ? (
              <div className="relative">
                <div className="flex items-center bg-[#F3ECE0] pl-1.5 pr-1.5 py-1 rounded-full border border-[#E6DCCF] shadow-xs">
                  {/* Clickable user profile badge that opens user dropdown */}
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-expanded={userDropdownOpen}
                    aria-label="User account menu"
                    className="flex items-center space-x-1.5 hover:opacity-85 transition-opacity text-left cursor-pointer focus:outline-none"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#E07A5F] to-[#F4A261] text-white flex items-center justify-center text-xs font-extrabold shadow-xs flex-shrink-0">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="text-left leading-tight pr-0.5">
                      <span
                        className="text-[11px] xl:text-xs font-extrabold text-[#231F20] block max-w-[85px] xl:max-w-[120px] 2xl:max-w-[180px] truncate"
                        title={currentUser.name}
                      >
                        {currentUser.name}
                      </span>
                      <span className="text-[9px] font-bold uppercase text-[#65605B] block">
                        {currentUser.role}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#65605B] flex-shrink-0 transition-transform duration-200 ${
                        userDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dedicated, fully visible, unclipped Logout button */}
                  <button
                    type="button"
                    onClick={onLogout}
                    title={`Sign out of ${currentUser.name}`}
                    aria-label="Logout"
                    className="ml-1 px-2 xl:px-2.5 py-1.5 text-[11px] xl:text-xs font-extrabold text-red-700 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-full flex items-center space-x-1 transition-all shadow-xs cursor-pointer flex-shrink-0 whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>

                {/* User Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#EFE9DF] py-3 px-3 z-50 animate-fadeIn">
                    <div className="flex items-center space-x-3 pb-3 mb-2 border-b border-[#EFE9DF] px-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E07A5F] to-[#F4A261] text-white flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-extrabold text-[#231F20] break-words">
                          {currentUser.name}
                        </div>
                        <div className="text-[11px] text-[#65605B] truncate">
                          {currentUser.email}
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-[#FAF6F0] text-[#65605B] border border-[#E6DCCF] rounded-full text-[9px] font-bold uppercase">
                          {currentUser.role} account
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 mb-2">
                      {currentUser.role === 'buyer' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('buyer-dashboard');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-[#4A4344] hover:bg-[#FAF6F0] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                          >
                            <LayoutDashboard className="w-4 h-4 text-[#52796F]" />
                            <span>My Buyer Dashboard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('orders');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-[#4A4344] hover:bg-[#FAF6F0] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                          >
                            <Truck className="w-4 h-4 text-[#52796F]" />
                            <span>Track My Orders</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('wishlist');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-[#4A4344] hover:bg-[#FAF6F0] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                          >
                            <Heart className="w-4 h-4 text-[#E07A5F]" />
                            <span>Saved Wishlist ({wishlistCount})</span>
                          </button>
                        </>
                      )}

                      {(currentUser.role === 'seller' || currentUser.role === 'shopkeeper' || currentUser.role === 'groomer' || currentUser.role === 'admin') && (
                        <>
                          {currentUser.role === 'seller' && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('seller');
                                setUserDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-[#D97706] hover:bg-[#FFF8EB] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                            >
                              <Store className="w-4 h-4 text-[#D97706]" />
                              <span>Pet Breeder Portal</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('saas-portal');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-[#231F20] hover:bg-[#FAF6F0] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                          >
                            <LayoutDashboard className="w-4 h-4 text-[#E07A5F]" />
                            <span>Business SaaS & Products Hub</span>
                          </button>
                        </>
                      )}

                      {currentUser.role === 'vet' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('vet-dashboard');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-[#2A5C4A] hover:bg-[#EAEFE9] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#2A5C4A]" />
                          <span>Veterinary Clinic Portal</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('support');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-[#4A4344] hover:bg-[#FAF6F0] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4 text-[#8C847C]" />
                        <span>Customer Help & Tickets</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-[#EFE9DF]">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-5 py-2.5 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white rounded-full text-xs font-extrabold shadow-md shadow-[#E07A5F]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Actions: Profile Pill, Search Toggle, and Hamburger */}
          <div className="flex items-center space-x-1.5 lg:hidden flex-shrink-0">
            {currentUser ? (
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="User account badge"
                  className="flex items-center space-x-1.5 bg-[#F3ECE0] px-2 py-1 rounded-full border border-[#E6DCCF] text-left cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#E07A5F] to-[#F4A261] text-white flex items-center justify-center text-[10px] font-extrabold flex-shrink-0">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span
                    className="text-xs font-bold text-[#231F20] max-w-[80px] sm:max-w-[110px] truncate"
                    title={currentUser.name}
                  >
                    {currentUser.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Logout"
                  title={`Sign out of ${currentUser.name}`}
                  className="px-2 sm:px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-extrabold flex items-center space-x-1 transition-colors shadow-xs cursor-pointer flex-shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                  <span className="text-xs font-extrabold">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 bg-[#E07A5F] hover:bg-[#D0654A] text-white rounded-full text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}

            <button
              type="button"
              aria-label="Toggle mobile search"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="p-1.5 sm:p-2 text-[#4A4344] rounded-xl hover:bg-[#F3ECE0] md:hidden cursor-pointer"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 sm:p-2 text-[#4A4344] rounded-xl hover:bg-[#F3ECE0] cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Input Drawer */}
        {mobileSearchOpen && (
          <form onSubmit={handleSearchSubmit} className="md:hidden pb-3 animate-fadeIn">
            <div className="relative flex items-center">
              <button
                type="submit"
                aria-label="Search pets mobile"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4344]"
              >
                <Search className="w-4 h-4" />
              </button>
              <input
                type="text"
                placeholder="Search breed, pet, category..."
                value={searchQuery}
                onChange={(e) => triggerSearchNavigation(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-[#F3ECE0] border border-[#E6DCCF] rounded-full text-xs font-semibold text-[#231F20]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C847C]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#EFE9DF] bg-white px-4 pt-3 pb-4 space-y-1 animate-fadeIn">
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
                className={`w-full text-left px-3 py-2 text-xs font-extrabold rounded-xl flex items-center justify-between ${
                  isActive ? 'bg-[#FAF6F0] text-[#E07A5F]' : 'text-[#231F20] hover:bg-[#FAF6F0]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-[10px] font-black bg-[#FFF5F0] text-[#E07A5F] border border-[#F4C4B7] rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
