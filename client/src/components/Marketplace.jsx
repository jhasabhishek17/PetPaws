import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  ShieldCheck, 
  Tag, 
  Sparkles, 
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';

/**
 * Marketplace Component
 * Displays pet animal categories (Dogs, Cats, Fishes, Rabbits, Birds), search & filters,
 * health verification badges, stock status, and pet details modal launcher.
 */
export default function Marketplace({ 
  pets, 
  onSelectPet, 
  selectedCategory, 
  setSelectedCategory,
  searchQuery 
}) {
  const [maxPrice, setMaxPrice] = useState(1000);
  const [favorites, setFavorites] = useState([]);

  // Pet categories list
  const categories = [
    { id: 'All', label: 'All Pets', emoji: '🐾' },
    { id: 'Dogs', label: 'Dogs & Puppies', emoji: '🐶' },
    { id: 'Cats', label: 'Cats & Kittens', emoji: '🐱' },
    { id: 'Fishes', label: 'Aquatic Fishes', emoji: '🐠' },
    { id: 'Rabbits', label: 'Rabbits & Bunnies', emoji: '🐰' },
    { id: 'Birds', label: 'Exotic Birds', emoji: '🦜' },
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

  // Filtered pets computation
  const filteredPets = (pets || []).filter((pet) => {
    if (!pet) return false;
    const petCategory = pet.category || '';
    const petTitle = pet.title || '';
    const petBreed = pet.breed || '';
    
    const matchesCategory = selectedCategory === 'All' || petCategory.toLowerCase() === selectedCategory.toLowerCase();
    const matchesPrice = (pet.price || 0) <= maxPrice;
    const matchesSearch = !searchQuery || 
      petTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
      petBreed.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesPrice && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      
      {/* Banner / Hero Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-orange-950 to-amber-950 text-white p-8 md:p-12 mb-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold text-orange-300 mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Verified Ethical Breeders & Health Checked Pets</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-display mb-4">
            Find Your Perfect <br />
            <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
              Companion & Pet Family
            </span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Browse healthy cats, dogs, fishes, rabbits & birds with transparent health certificates, seller verification, live order tracking, and billing invoice details.
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-200">
            <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-400" /> 100% Health Checked</span>
            <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1.5 text-amber-400" /> Live Pet Transport Tracking</span>
            <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1.5 text-orange-400" /> Instant Vet Consultation</span>
          </div>
        </div>

        {/* Decorative background image overlay */}
        <div className="absolute top-0 right-0 bottom-0 w-1/2 opacity-20 hidden md:block pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=1000&q=80" 
            alt="Pets" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center justify-between mb-6 pb-2 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center space-x-2 min-w-max">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center space-x-2 border ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
              }`}
            >
              <span className="text-base">{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Price Slider Filter */}
        <div className="hidden lg:flex items-center space-x-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm min-w-max">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Max Price: ${maxPrice}</span>
          <input
            type="range"
            min="30"
            max="1000"
            step="10"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-24 accent-orange-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Pet Listings Grid */}
      {filteredPets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-8">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🐶
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Pets Found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
            We couldn't find any pets matching your active filter criteria or search query.
          </p>
          <button
            onClick={() => { setSelectedCategory('All'); setMaxPrice(1000); }}
            className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-full hover:bg-slate-800"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPets.map((pet) => {
            const isFav = favorites.includes(pet.id);

            return (
              <div
                key={pet.id}
                onClick={() => onSelectPet(pet)}
                className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
              >
                {/* Image Container with Badges */}
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  <img
                    src={pet.image_url}
                    alt={pet.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Category Pill */}
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/10">
                    {pet.category}
                  </div>

                  {/* Stock Tag */}
                  <div className="absolute bottom-3 left-3 bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md shadow">
                    Stock: {pet.stock} Available
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => toggleFavorite(pet.id, e)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-white transition-all shadow"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {pet.title}
                      </h3>
                      <span className="text-lg font-black text-slate-900 font-display">
                        ${pet.price}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500 mb-3">
                      <span>Breed: <strong>{pet.breed}</strong></span>
                      <span>•</span>
                      <span>Age: <strong>{pet.age}</strong></span>
                    </div>

                    {/* Health Tag */}
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 mb-4 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="line-clamp-1">{pet.health_status}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Seller: <strong className="text-slate-700">{pet.seller_name}</strong>
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPet(pet);
                      }}
                      className="px-3.5 py-1.5 bg-orange-50 text-orange-600 font-bold text-xs rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-all flex items-center space-x-1"
                    >
                      <span>Details & Buy</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
