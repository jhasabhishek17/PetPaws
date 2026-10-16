import React, { useState } from 'react';
import { 
  Heart, 
  ShieldCheck, 
  Sparkles, 
  SlidersHorizontal,
  ChevronRight,
  Eye,
  Search,
  X,
  CheckCircle2,
  Award,
  Truck,
  Stethoscope,
  Star,
  Grid,
  List,
  Lock,
  ArrowRight,
  BadgePercent
} from 'lucide-react';
import PetMatchmakerQuiz from './PetMatchmakerQuiz';
import LiveTransportRadar from './LiveTransportRadar';

/**
 * Ultra-Aesthetic Eye-Comfort PetPaws Marketplace Component
 */
export default function Marketplace({ 
  pets, 
  onSelectPet, 
  selectedCategory, 
  setSelectedCategory,
  searchQuery,
  onBuyPetRequest
}) {
  const [maxPrice, setMaxPrice] = useState(1500);
  const [favorites, setFavorites] = useState([]);
  const [onlyVaccinated, setOnlyVaccinated] = useState(false);
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const [viewMode, setViewMode] = useState('grid');
  const [showQuiz, setShowQuiz] = useState(false);

  // Category pills list with animated emojis
  const categories = [
    { id: 'All', label: 'All Pets', emoji: '🐾', anim: 'animate-floatSoft' },
    { id: 'Dogs', label: 'Dogs & Puppies', emoji: '🐶', anim: 'animate-tailWag' },
    { id: 'Cats', label: 'Cats & Kittens', emoji: '🐱', anim: 'animate-floatSoft' },
    { id: 'Fishes', label: 'Aquatic Fishes', emoji: '🐠', anim: 'animate-floatSoft' },
    { id: 'Rabbits', label: 'Rabbits & Bunnies', emoji: '🐰', anim: 'animate-floatSoft' },
    { id: 'Birds', label: 'Exotic Birds', emoji: '🦜', anim: 'animate-floatSoft' },
  ];

  // Toggle favorite pets
  const toggleFavorite = (petId, e) => {
    e.stopPropagation();
    if (favorites.includes(petId)) {
      setFavorites(favorites.filter(id => id !== petId));
    } else {
      setFavorites([...favorites, petId]);
    }
  };

  // Filter computation
  const activeSearch = localSearch || searchQuery;
  const filteredPets = (pets || []).filter((pet) => {
    if (!pet) return false;
    const petCategory = pet.category || '';
    const petTitle = pet.title || '';
    const petBreed = pet.breed || '';
    
    const matchesCategory = selectedCategory === 'All' || petCategory.toLowerCase() === selectedCategory.toLowerCase();
    const matchesPrice = (pet.price || 0) <= maxPrice;
    const matchesSearch = !activeSearch || 
      petTitle.toLowerCase().includes(activeSearch.toLowerCase()) || 
      petBreed.toLowerCase().includes(activeSearch.toLowerCase());
    
    const matchesVaccine = !onlyVaccinated || pet.health_status.toLowerCase().includes('vaccinated');

    return matchesCategory && matchesPrice && matchesSearch && matchesVaccine;
  });

  // Calculate category pet counts
  const getCategoryCount = (catId) => {
    if (catId === 'All') return (pets || []).length;
    return (pets || []).filter(p => p.category?.toLowerCase() === catId.toLowerCase()).length;
  };

  return (
    <div className="w-full bg-[#FAF6F0] bg-organic-canvas animate-fadeIn">

      {/* ====================================================================
         1. BREATHTAKING HERO SECTION (Eye-Comfort Aesthetics)
         ==================================================================== */}
      <section className="relative py-12 lg:py-20 border-b border-[#EFE9DF] overflow-hidden">
        
        {/* Soft Ambient Orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F4A261]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-[450px] h-[450px] bg-[#52796F]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column (60% / 7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-white/90 backdrop-blur-md text-[#E07A5F] border border-[#F4C4B7] rounded-full text-xs font-bold shadow-sm">
                <Sparkles className="w-4 h-4 text-[#F4A261] animate-spin" />
                <span>Ethical, 100% Vet-Certified Breeders & Care</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-[#231F20] tracking-tight font-display leading-[1.15]">
                Discover your healthy, <br />
                <span className="bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] bg-clip-text text-transparent">
                  lifelong pet companion
                </span>
              </h1>

              <p className="text-[#65605B] text-sm sm:text-base max-w-xl leading-relaxed font-medium">
                Connect with verified ethical breeders & shelters. Every pet comes with certified veterinary health records, microchipping, and climate-controlled GPS delivery tracking.
              </p>

              {/* High-Converting Aesthetic Search Bar */}
              <div className="bg-white p-3 sm:p-4 rounded-3xl border border-[#E6DCCF] shadow-aesthetic space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-[#8C847C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Golden Retriever, Persian Kitten, Guppy..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-3 bg-[#FAF6F0] border border-[#EFE9DF] text-[#231F20] placeholder-[#8C847C] rounded-2xl text-xs font-bold focus:outline-none focus:bg-white focus:border-[#E07A5F] transition-all"
                  />
                  {localSearch && (
                    <button onClick={() => setLocalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C847C]">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowQuiz(!showQuiz)}
                  className="px-6 py-3.5 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white rounded-2xl text-xs font-extrabold shadow-md shadow-[#E07A5F]/20 transition-all flex items-center justify-center space-x-1.5 flex-shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-[#FFF3EB]" />
                  <span>{showQuiz ? 'Hide Quiz' : 'Take Pet Quiz'}</span>
                </button>
              </div>

              {/* Inline Trust Stats */}
              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs font-extrabold text-[#4A4344]">
                <span className="flex items-center"><Award className="w-4 h-4 mr-1.5 text-[#E07A5F]" /> 5,000+ Verified Pets</span>
                <span className="flex items-center"><Truck className="w-4 h-4 mr-1.5 text-[#52796F]" /> Climate GPS Delivery</span>
                <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1.5 text-[#3A5A40]" /> Safe Escrow</span>
              </div>
            </div>

            {/* Right Column (40% / 5 cols): Photo & Trust Badges */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md">
                
                <img
                  src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=80"
                  alt="Happy Dog"
                  className="w-full h-[420px] object-cover rounded-3xl shadow-aesthetic border-4 border-white transform hover:scale-[1.02] transition-transform duration-500"
                />

                {/* Floating Chip 1 */}
                <div className="absolute top-6 -left-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-aesthetic border border-[#EFE9DF] flex items-center space-x-2.5 animate-floatSoft">
                  <div className="w-8 h-8 rounded-full bg-[#EAEFE9] text-[#2A5C4A] flex items-center justify-center font-bold text-xs">✓</div>
                  <div>
                    <strong className="block text-xs text-[#231F20] font-extrabold">Vet Health Guaranteed</strong>
                    <span className="text-[10px] text-[#65605B] font-medium">Certified Vaccinated</span>
                  </div>
                </div>

                {/* Floating Chip 2 */}
                <div className="absolute bottom-6 -right-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-aesthetic border border-[#EFE9DF] flex items-center space-x-2.5">
                  <span className="text-xl">⭐️ 4.9</span>
                  <div>
                    <strong className="block text-xs text-[#231F20] font-extrabold">Top Verified Breeder</strong>
                    <span className="text-[10px] text-[#65605B] font-medium">1,200+ Happy Families</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Interactive Quiz Toggle */}
      {showQuiz && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PetMatchmakerQuiz pets={pets} onSelectPet={onSelectPet} onBuyPetRequest={onBuyPetRequest} />
        </div>
      )}

      {/* ====================================================================
         2. MARKETPLACE & FILTER FEED
         ==================================================================== */}
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Category Selector Pills */}
        <div className="flex items-center space-x-2.5 overflow-x-auto no-scrollbar pb-3 mb-6">
          {categories.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4.5 py-2.5 rounded-full text-xs font-extrabold transition-all flex items-center space-x-2 min-w-max border ${
                  isActive
                    ? 'bg-[#E07A5F] text-white border-[#E07A5F] shadow-md shadow-[#E07A5F]/20'
                    : 'bg-white text-[#4A4344] border-[#EFE9DF] hover:bg-[#F3ECE0] hover:text-[#231F20]'
                }`}
              >
                <span className={`text-base ${cat.anim}`}>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#FAF6F0] text-[#65605B]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#EFE9DF] shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Price Slider */}
            <div className="flex items-center space-x-2 bg-[#FAF6F0] px-3.5 py-1.5 rounded-full border border-[#E6DCCF]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C847C]" />
              <span className="text-[#4A4344]">Max Price: <strong>${maxPrice}</strong></span>
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

        {/* Pet Cards Feed Grid */}
        {filteredPets.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EFE9DF] p-12 text-center my-8 shadow-sm">
            <div className="w-16 h-16 bg-[#FFF5F0] text-[#E07A5F] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl border border-[#F4C4B7]">
              🐶
            </div>
            <h3 className="text-lg font-bold text-[#231F20] mb-2">No Pets Match Your Active Filters</h3>
            <p className="text-[#65605B] text-sm max-w-md mx-auto mb-6">
              Try adjusting your search keyword or price slider.
            </p>
            <button
              onClick={() => { setSelectedCategory('All'); setMaxPrice(1500); setLocalSearch(''); setOnlyVaccinated(false); }}
              className="px-6 py-2.5 bg-[#231F20] text-white font-bold text-xs rounded-full hover:bg-stone-800 shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* PURE WHITE LUXURY ROUNDED-3XL PET CARDS GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPets.map((pet) => {
              const isFav = favorites.includes(pet.id);

              return (
                <div
                  key={pet.id}
                  onClick={() => onSelectPet(pet)}
                  className="bg-white rounded-3xl border border-[#EFE9DF] overflow-hidden shadow-aesthetic shadow-aesthetic-hover cursor-pointer flex flex-col justify-between group"
                >
                  {/* 4:3 Aspect Ratio Photo with Overlay Pills */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#FAF6F0]">
                    <img
                      src={pet.image_url}
                      alt={pet.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    
                    <div className="absolute top-3 left-3 bg-[#231F20]/85 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
                      {pet.category}
                    </div>

                    <button
                      onClick={(e) => toggleFavorite(pet.id, e)}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-[#8C847C] hover:text-red-500 hover:bg-white transition-all shadow-sm"
                    >
                      <Heart className={`w-4.5 h-4.5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
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
                        <span className="text-xs font-medium text-[#65605B]">Breed: <strong className="text-[#231F20]">{pet.breed}</strong></span>
                        <span className="text-xl font-black text-[#231F20] font-display">${pet.price}</span>
                      </div>

                      {/* Clean Green Vet Verification Chip */}
                      <div className="p-2.5 bg-[#EAEFE9] text-[#2A5C4A] border border-[#D1E7DD] rounded-2xl text-[11px] font-bold mb-4 flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-[#52796F] flex-shrink-0" />
                        <span className="line-clamp-1">✓ Health Guaranteed & Vaccinated</span>
                      </div>
                    </div>

                    {/* Actions: Outlined Quick View & Primary Adopt Button */}
                    <div className="pt-3 border-t border-[#EFE9DF] flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPet(pet);
                        }}
                        className="px-3.5 py-2 border border-[#E6DCCF] text-[#4A4344] font-bold text-xs rounded-xl hover:bg-[#FAF6F0] transition-all flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#8C847C]" />
                        <span>Quick View</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuyPetRequest(pet);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-[#E07A5F]/20 flex items-center space-x-1"
                      >
                        <span>Adopt Pet (${pet.price})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* COMPACT LIST VIEW LAYOUT */
          <div className="space-y-4">
            {filteredPets.map((pet) => (
              <div
                key={pet.id}
                onClick={() => onSelectPet(pet)}
                className="bg-white rounded-2xl border border-[#EFE9DF] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center space-x-4">
                  <img src={pet.image_url} alt={pet.title} className="w-20 h-20 rounded-xl object-cover" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-extrabold text-[#231F20] group-hover:text-[#E07A5F] text-base">{pet.title}</h4>
                      <span className="px-2 py-0.5 bg-[#FAF6F0] text-[#65605B] text-[10px] font-bold rounded">{pet.category}</span>
                    </div>
                    <p className="text-xs text-[#65605B] mt-1">Breed: <strong>{pet.breed}</strong> • Age: <strong>{pet.age}</strong></p>
                    <p className="text-xs text-[#2A5C4A] font-semibold mt-1 flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#52796F] mr-1" /> ✓ Health Guaranteed
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[#EFE9DF]">
                  <span className="text-xl font-black text-[#231F20] font-display">${pet.price}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBuyPetRequest(pet);
                    }}
                    className="px-4 py-2 bg-[#E07A5F] text-white font-bold text-xs rounded-xl hover:bg-[#D96B43] shadow-sm"
                  >
                    Adopt Pet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>

      {/* ====================================================================
         3. SOCIAL PROOF & GUARANTEE SECTION
         ==================================================================== */}
      <section className="py-16 bg-[#F5EFE6]/60 border-t border-[#EFE9DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="px-3.5 py-1 bg-[#EAEFE9] text-[#2A5C4A] text-xs font-bold rounded-full uppercase tracking-wider mb-3 inline-block border border-[#D1E7DD]">
              Ethical Breeder Standards & Guarantee
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#231F20] font-display">
              Why pet families trust PetPaws
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            
            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#EAEFE9] text-[#2A5C4A] flex items-center justify-center mx-auto mb-4 border border-[#D1E7DD]">
                <ShieldCheck className="w-6 h-6 text-[#52796F]" />
              </div>
              <h4 className="font-bold text-sm text-[#231F20] mb-1">Vet Certified Health</h4>
              <p className="text-xs text-[#65605B] leading-relaxed">Vaccinated, microchipped & health checked with physical medical records.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF5F0] text-[#E07A5F] flex items-center justify-center mx-auto mb-4 border border-[#F4C4B7]">
                <Truck className="w-6 h-6 text-[#E07A5F]" />
              </div>
              <h4 className="font-bold text-sm text-[#231F20] mb-1">GPS Climate Transit</h4>
              <p className="text-xs text-[#65605B] leading-relaxed">Temperature-controlled vehicles with real-time GPS tracking status.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FFFDF0] text-[#D97706] flex items-center justify-center mx-auto mb-4 border border-[#FEF9C3]">
                <Stethoscope className="w-6 h-6 text-[#D97706]" />
              </div>
              <h4 className="font-bold text-sm text-[#231F20] mb-1">24/7 Vet Telehealth</h4>
              <p className="text-xs text-[#65605B] leading-relaxed">Direct 1-on-1 video consultations with licensed veterinary specialists.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F3ECE0] text-[#4A4344] flex items-center justify-center mx-auto mb-4 border border-[#E6DCCF]">
                <Lock className="w-6 h-6 text-[#4A4344]" />
              </div>
              <h4 className="font-bold text-sm text-[#231F20] mb-1">Safe Escrow Protection</h4>
              <p className="text-xs text-[#65605B] leading-relaxed">Funds are held safely in escrow until you receive your pet in perfect health.</p>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm">
              <div className="flex items-center space-x-1 text-[#F4A261] mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#F4A261]" />)}
              </div>
              <p className="text-[#65605B] text-xs leading-relaxed mb-4">
                "We adopted our Golden Retriever puppy through PetPaws. The live GPS transport tracking let us see exactly when the vehicle arrived! The vet health certificate was 100% verified."
              </p>
              <div className="flex items-center space-x-3">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" alt="Reviewer" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h4 className="text-xs font-bold text-[#231F20]">Emily Robinson</h4>
                  <span className="text-[10px] text-[#2A5C4A] font-bold">Verified Buyer • Golden Retriever</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm">
              <div className="flex items-center space-x-1 text-[#F4A261] mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#F4A261]" />)}
              </div>
              <p className="text-[#65605B] text-xs leading-relaxed mb-4">
                "The vet consultation feature is a lifesaver. Had a question about my Persian kitten's nutrition at 10 PM and connected with Dr. Sarah within 5 minutes!"
              </p>
              <div className="flex items-center space-x-3">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" alt="Reviewer" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h4 className="text-xs font-bold text-[#231F20]">Marcus Turner</h4>
                  <span className="text-[10px] text-[#2A5C4A] font-bold">Verified Buyer • Persian Cat</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EFE9DF] shadow-sm">
              <div className="flex items-center space-x-1 text-[#F4A261] mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#F4A261]" />)}
              </div>
              <p className="text-[#65605B] text-xs leading-relaxed mb-4">
                "As a certified breeder, listing my puppies on PetPaws has been seamless. Automated stock management and instant payout updates make running my kennel easy."
              </p>
              <div className="flex items-center space-x-3">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80" alt="Reviewer" className="w-10 h-10 rounded-full object-cover" />
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
