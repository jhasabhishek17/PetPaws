import React, { useState } from 'react';
import {
  Heart,
  ShieldCheck,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  Truck,
  Stethoscope,
  Star,
  Grid,
  List,
  Lock,
  Store,
  X
} from 'lucide-react';
import PetMatchmakerQuiz from './PetMatchmakerQuiz';
import Hero from './Hero';
import Reveal from './Reveal';
import { PetCardSkeleton } from './PawLoader';

/**
 * Reusable Pet Card item supporting both Grid and List layouts
 */
function PetCardItem({
  pet,
  idx,
  viewMode,
  isWishlisted,
  isOwnListing,
  isSoldOut,
  isBuyer,
  onSelectPet,
  onToggleWishlist,
  onBuyPetRequest
}) {
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelectPet(pet)}
        className="bg-white rounded-2xl border border-[#EFE9DF] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
      >
        <div className="flex items-center space-x-4">
          <img src={pet.image_url} alt={pet.title} className="w-20 h-20 rounded-xl object-cover" />
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-extrabold text-[#231F20] group-hover:text-[#E07A5F] text-base">
                {pet.title}
              </h4>
              <span className="px-2 py-0.5 bg-[#FAF6F0] text-[#65605B] text-[10px] font-bold rounded">
                {pet.category}
              </span>
            </div>
            <p className="text-xs text-[#65605B] mt-1">
              Breed: <strong>{pet.breed}</strong> • Age: <strong>{pet.age}</strong>
            </p>
            <p className="text-[11px] text-[#4A4344] mt-1">
              Owner: <strong>{pet.seller_name || 'Verified Breeder'}</strong> • Seller ID:{' '}
              <span className="font-mono">{pet.seller_id}</span>
            </p>
            <p className="text-xs text-[#2A5C4A] font-semibold mt-1 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-[#52796F] mr-1" /> ✓ Health Guaranteed
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[#EFE9DF]">
          <span className="text-xl font-black text-[#231F20] font-display">${pet.price}</span>
          {isBuyer && (
            <button
              type="button"
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist?.(pet.id);
              }}
              className="p-2 rounded-full bg-[#FAF6F0] border border-[#E6DCCF] text-[#8C847C] hover:text-red-500"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          )}

          {isOwnListing ? (
            <span
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-[#F3ECE0] text-[#65605B] border border-[#E6DCCF] font-bold text-xs rounded-xl"
            >
              Your Listing
            </span>
          ) : (
            <button
              type="button"
              disabled={isSoldOut}
              onClick={(e) => {
                e.stopPropagation();
                onBuyPetRequest(pet);
              }}
              className="px-4 py-2 bg-[#E07A5F] hover:bg-[#D96B43] disabled:opacity-50 text-white font-bold text-xs rounded-xl"
            >
              {isSoldOut ? 'Sold out' : `Adopt ($${pet.price})`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div
      style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
      onClick={() => onSelectPet(pet)}
      className="bg-white rounded-3xl border border-[#EFE9DF] overflow-hidden shadow-aesthetic card-lift animate-riseIn cursor-pointer flex flex-col justify-between group"
    >
      {/* 4:3 Aspect Ratio Photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#FAF6F0]">
        {pet.video_url && pet.media_type === 'video' ? (
          <video
            src={pet.video_url}
            poster={pet.image_url}
            muted
            loop
            playsInline
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <img
            src={pet.image_url}
            alt={pet.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-[#231F20]/45 flex items-center justify-center">
            <span className="px-4 py-1.5 bg-white text-[#231F20] font-extrabold text-xs rounded-full rotate-[-6deg]">
              Found a home 💛
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="bg-[#231F20]/85 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
            {pet.category}
          </span>
          {pet.video_url && (
            <span className="bg-[#E07A5F]/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
              🎬 Video
            </span>
          )}
          {Array.isArray(pet.media) && pet.media.filter((m) => m.resource_type === 'image').length > 1 && (
            <span className="bg-white/90 backdrop-blur-md text-[#231F20] text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
              📷 {pet.media.filter((m) => m.resource_type === 'image').length}
            </span>
          )}
        </div>

        {isBuyer && (
          <button
            type="button"
            aria-label={isWishlisted ? `Remove ${pet.title} from wishlist` : `Save ${pet.title} to wishlist`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist?.(pet.id);
            }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-[#8C847C] hover:text-red-500 hover:bg-white transition-all shadow-sm"
            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart className={`w-4.5 h-4.5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        )}
      </div>

      {/* Card Info Content */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Name & Age */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-lg font-extrabold text-[#231F20] group-hover:text-[#E07A5F] transition-colors line-clamp-1">
              {pet.title}
            </h3>
            <span className="text-xs font-bold bg-[#FAF6F0] text-[#4A4344] px-2.5 py-0.5 rounded-full border border-[#E6DCCF]">
              {pet.age}
            </span>
          </div>

          {/* Breed & Price */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#65605B]">
              Breed: <strong className="text-[#231F20]">{pet.breed}</strong>
            </span>
            <span className="text-xl font-black text-[#231F20] font-display">${pet.price}</span>
          </div>

          {/* Health Guarantee Chip */}
          <div className="p-2.5 bg-[#EAEFE9] text-[#2A5C4A] border border-[#D1E7DD] rounded-2xl text-[11px] font-bold mb-4 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#52796F] flex-shrink-0" />
            <span className="line-clamp-1">✓ Health Guaranteed & Vaccinated</span>
          </div>
        </div>

        {/* Card Actions */}
        <div className="pt-3 border-t border-[#EFE9DF] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectPet(pet);
            }}
            className="px-3.5 py-2 border border-[#E6DCCF] text-[#4A4344] font-bold text-xs rounded-xl hover:bg-[#FAF6F0] transition-all flex items-center space-x-1"
          >
            <Eye className="w-3.5 h-3.5 text-[#8C847C]" />
            <span>Quick View</span>
          </button>

          {isOwnListing ? (
            <span
              onClick={(e) => e.stopPropagation()}
              className="px-3.5 py-2 bg-[#F3ECE0] text-[#65605B] border border-[#E6DCCF] font-extrabold text-xs rounded-xl cursor-not-allowed"
              title="Sellers cannot purchase their own listings"
            >
              Your Listing (Owner)
            </span>
          ) : (
            <button
              type="button"
              disabled={isSoldOut}
              onClick={(e) => {
                e.stopPropagation();
                onBuyPetRequest(pet);
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-[#E07A5F]/20 flex items-center space-x-1"
            >
              <span>{isSoldOut ? 'Sold out' : `Adopt Pet ($${pet.price})`}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Marketplace({
  pets,
  currentUser,
  wishlistIds = [],
  onToggleWishlist,
  onSelectPet,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  onBuyPetRequest,
  loading = false,
  onNavigate = () => {}
}) {
  const [maxPrice, setMaxPrice] = useState(1500);
  const [onlyVaccinated, setOnlyVaccinated] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [showQuiz, setShowQuiz] = useState(false);

  const isBuyer = currentUser?.role === 'buyer';

  // Category pills list with animated emojis
  const categories = [
    { id: 'All', label: 'All Pets', emoji: '🐾', anim: 'animate-floatSoft' },
    { id: 'Dogs', label: 'Dogs & Puppies', emoji: '🐶', anim: 'animate-tailWag' },
    { id: 'Cats', label: 'Cats & Kittens', emoji: '🐱', anim: 'animate-floatSoft' },
    { id: 'Fishes', label: 'Aquatic Fishes', emoji: '🐠', anim: 'animate-floatSoft' },
    { id: 'Rabbits', label: 'Rabbits & Bunnies', emoji: '🐰', anim: 'animate-floatSoft' },
    { id: 'Birds', label: 'Exotic Birds', emoji: '🦜', anim: 'animate-floatSoft' }
  ];

  // Filter computation synchronized with Navbar & Hero searchQuery
  const activeSearch = (searchQuery || '').trim().toLowerCase();
  const filteredPets = (pets || []).filter((pet) => {
    if (!pet) return false;
    const petCategory = pet.category || '';
    const petTitle = pet.title || '';
    const petBreed = pet.breed || '';
    const petDesc = pet.description || '';
    const petSeller = pet.seller_name || '';

    const matchesCategory =
      selectedCategory === 'All' || petCategory.toLowerCase() === selectedCategory.toLowerCase();
    const matchesPrice = (pet.price || 0) <= maxPrice;
    const matchesSearch =
      !activeSearch ||
      petTitle.toLowerCase().includes(activeSearch) ||
      petBreed.toLowerCase().includes(activeSearch) ||
      petCategory.toLowerCase().includes(activeSearch) ||
      petDesc.toLowerCase().includes(activeSearch) ||
      petSeller.toLowerCase().includes(activeSearch);

    const matchesVaccine =
      !onlyVaccinated || (pet.health_status || '').toLowerCase().includes('vaccinated');

    return matchesCategory && matchesPrice && matchesSearch && matchesVaccine;
  });

  const getCategoryCount = (catId) => {
    if (catId === 'All') return (pets || []).length;
    return (pets || []).filter((p) => p.category?.toLowerCase() === catId.toLowerCase()).length;
  };

  return (
    <div className="w-full bg-[#FAF6F0] bg-organic-canvas animate-fadeIn">
      <Hero
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showQuiz={showQuiz}
        setShowQuiz={setShowQuiz}
        onNavigate={onNavigate}
        petCount={(pets || []).filter((p) => p.status !== 'sold').length}
        currentUser={currentUser}
      />

      {/* Interactive Quiz Toggle */}
      {showQuiz && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PetMatchmakerQuiz
            pets={pets}
            currentUser={currentUser}
            onSelectPet={onSelectPet}
            onBuyPetRequest={onBuyPetRequest}
          />
        </div>
      )}

      {/* Main Catalog Section */}
      <section id="pet-listings" className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-10">
        
        {/* Category Pills Navigation */}
        <div className="flex items-center space-x-3 overflow-x-auto pb-4 mb-6 no-scrollbar">
          {categories.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all shadow-sm ${
                  isSelected
                    ? 'bg-[#E07A5F] text-white shadow-md shadow-[#E07A5F]/25 scale-102'
                    : 'bg-white text-[#4A4344] hover:bg-[#F3ECE0] border border-[#E6DCCF]'
                }`}
              >
                <span className={`text-base ${cat.anim}`}>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-white text-[#E07A5F]' : 'bg-[#FAF6F0] text-[#65605B]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Search Filter Chip */}
        {searchQuery && (
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF5F0] border border-[#F4C4B7] text-xs font-extrabold text-[#E07A5F]">
              <span>Search filter: “{searchQuery}”</span>
              <button
                type="button"
                aria-label="Clear search filter"
                onClick={() => setSearchQuery('')}
                className="hover:text-[#231F20]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#EFE9DF] shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold">
          <div className="flex flex-wrap items-center gap-3">
            {/* Price Slider */}
            <div className="flex items-center space-x-2 bg-[#FAF6F0] px-3.5 py-1.5 rounded-full border border-[#E6DCCF]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C847C]" />
              <span className="text-[#4A4344]">
                Max Price: <strong>${maxPrice}</strong>
              </span>
              <input
                type="range"
                min="50"
                max="1500"
                step="25"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-24 accent-[#E07A5F] cursor-pointer"
              />
            </div>

            {/* Vaccinated Toggle */}
            <label className="flex items-center space-x-2 bg-[#FAF6F0] px-3.5 py-1.5 rounded-full border border-[#E6DCCF] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyVaccinated}
                onChange={(e) => setOnlyVaccinated(e.target.checked)}
                className="rounded text-[#E07A5F] focus:ring-[#E07A5F]"
              />
              <span className="text-[#4A4344]">Vaccinated Only</span>
            </label>
          </div>

          {/* Results Count & Layout Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-[#65605B] font-medium">
              Showing <strong>{filteredPets.length}</strong> available listings
            </span>

            <div className="flex items-center space-x-1 bg-[#FAF6F0] p-1 rounded-lg border border-[#E6DCCF]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-[#231F20] shadow-sm' : 'text-[#8C847C] hover:text-[#231F20]'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white text-[#231F20] shadow-sm' : 'text-[#8C847C] hover:text-[#231F20]'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Pet Cards Feed */}
        {loading && (pets || []).length === 0 ? (
          <PetCardSkeleton />
        ) : filteredPets.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EFE9DF] p-12 text-center my-8 shadow-sm">
            <div className="w-16 h-16 bg-[#FFF5F0] text-[#E07A5F] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl border border-[#F4C4B7]">
              🐶
            </div>
            <h3 className="text-lg font-bold text-[#231F20] mb-2">No Pets Match Your Active Filters</h3>
            <p className="text-[#65605B] text-sm max-w-md mx-auto mb-6">
              Try adjusting your search keyword or price slider.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setMaxPrice(1500);
                setSearchQuery('');
                setOnlyVaccinated(false);
              }}
              className="px-6 py-2.5 bg-[#231F20] text-white font-bold text-xs rounded-full hover:bg-stone-800 shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
            {filteredPets.map((pet, idx) => (
              <PetCardItem
                key={pet.id}
                pet={pet}
                idx={idx}
                viewMode={viewMode}
                isWishlisted={wishlistIds.includes(pet.id)}
                isOwnListing={Boolean(currentUser && currentUser.id === pet.seller_id)}
                isSoldOut={pet.status === 'sold' || Number(pet.stock) === 0}
                isBuyer={isBuyer}
                onSelectPet={onSelectPet}
                onToggleWishlist={onToggleWishlist}
                onBuyPetRequest={onBuyPetRequest}
              />
            ))}
          </div>
        )}
      </section>

      {/* Trust & Guarantee Section */}
      <section className="py-16 bg-[#F5EFE6]/60 border-t border-[#EFE9DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-xl mx-auto mb-12">
            <span className="px-3.5 py-1 bg-[#EAEFE9] text-[#2A5C4A] text-xs font-bold rounded-full uppercase tracking-wider mb-3 inline-block border border-[#D1E7DD]">
              Ethical Breeder Standards & Guarantee
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#231F20] font-display">
              Why pet families trust PetPaws
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm text-center card-lift">
              <div className="w-12 h-12 rounded-2xl bg-[#EAEFE9] text-[#2A5C4A] flex items-center justify-center mx-auto mb-4 border border-[#D1E7DD]">
                <ShieldCheck className="w-6 h-6 text-[#52796F]" />
              </div>
              <h4 className="font-bold text-sm text-[#231F20] mb-1">Vet Certified Health</h4>
              <p className="text-xs text-[#65605B] leading-relaxed">
                Vaccinated, microchipped & health checked with physical medical records.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm text-center card-lift">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF5F0] text-[#E07A5F] flex items-center justify-center mx-auto mb-4 border border-[#F4C4B7]">
                <Truck className="w-6 h-6 text-[#E07A5F]" />
              </div>
              <h4 className="font-bold text-sm text-[#231F20] mb-1">GPS Climate Transit</h4>
              <p className="text-xs text-[#65605B] leading-relaxed">
                Temperature-controlled vehicles with real-time GPS tracking status.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm text-center card-lift">
              <div className="w-12 h-12 rounded-2xl bg-[#FFFDF0] text-[#D97706] flex items-center justify-center mx-auto mb-4 border border-[#FEF9C3]">
                <Stethoscope className="w-6 h-6 text-[#D97706]" />
              </div>
              <h4 className="font-bold text-sm text-[#231F20] mb-1">24/7 Vet Telehealth</h4>
              <p className="text-xs text-[#65605B] leading-relaxed">
                Direct 1-on-1 video consultations with licensed veterinary specialists.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm text-center card-lift">
              <div className="w-12 h-12 rounded-2xl bg-[#F3ECE0] text-[#4A4344] flex items-center justify-center mx-auto mb-4 border border-[#E6DCCF]">
                <Lock className="w-6 h-6 text-[#4A4344]" />
              </div>
              <h4 className="font-bold text-sm text-[#231F20] mb-1">Safe Escrow Protection</h4>
              <p className="text-xs text-[#65605B] leading-relaxed">
                Funds are held safely in escrow until you receive your pet in perfect health.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm card-lift">
              <div className="flex items-center space-x-1 text-[#F4A261] mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#F4A261]" />
                ))}
              </div>
              <p className="text-[#65605B] text-xs leading-relaxed mb-4">
                "We adopted our Golden Retriever puppy through PetPaws. The live GPS transport tracking let us see
                exactly when the vehicle arrived! The vet health certificate was 100% verified."
              </p>
              <div className="flex items-center space-x-3">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                  alt="Reviewer"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-[#231F20]">Emily Robinson</h4>
                  <span className="text-[10px] text-[#2A5C4A] font-bold">Verified Buyer • Golden Retriever</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm card-lift">
              <div className="flex items-center space-x-1 text-[#F4A261] mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#F4A261]" />
                ))}
              </div>
              <p className="text-[#65605B] text-xs leading-relaxed mb-4">
                "The vet consultation feature is a lifesaver. Had a question about my Persian kitten's nutrition at 10
                PM and connected with Dr. Sarah within 5 minutes!"
              </p>
              <div className="flex items-center space-x-3">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
                  alt="Reviewer"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-[#231F20]">Marcus Turner</h4>
                  <span className="text-[10px] text-[#2A5C4A] font-bold">Verified Buyer • Persian Cat</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm card-lift">
              <div className="flex items-center space-x-1 text-[#F4A261] mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#F4A261]" />
                ))}
              </div>
              <p className="text-[#65605B] text-xs leading-relaxed mb-4">
                "As a certified breeder, listing my puppies on PetPaws has been seamless. Automated stock management
                and instant payout updates make running my kennel easy."
              </p>
              <div className="flex items-center space-x-3">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
                  alt="Reviewer"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-[#231F20]">David Kennel</h4>
                  <span className="text-[10px] text-[#E07A5F] font-bold">Verified Breeder • Happy Tails Kennel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
