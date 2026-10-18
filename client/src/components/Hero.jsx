import React from 'react';
import { Search, X, Sparkles, ShieldCheck, Truck, Stethoscope, Scissors, ArrowRight, Star, Heart } from 'lucide-react';
import PawBackdrop from './PawBackdrop';
import { AnimatedDog, AnimatedCat } from './PetIllustration';

const PHOTOS = {
  main: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80',
  cat: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
  puppy: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80',
};

/**
 * Full-width homepage hero: headline, search, quick links, photo collage with
 * floating chips, animated SVG pets and drifting paw prints.
 */
export default function Hero({
  searchQuery,
  setSearchQuery,
  showQuiz,
  setShowQuiz,
  onNavigate,
  petCount = 0,
  currentUser
}) {
  const quick = [
    { id: 'vets', label: 'Book a Vet', icon: Stethoscope },
    { id: 'grooming', label: 'Spa & Grooming', icon: Scissors },
  ];

  // Show Track Orders & Wishlist quick pills only to authenticated buyers
  if (currentUser?.role === 'buyer') {
    quick.push({ id: 'orders', label: 'Track Orders', icon: Truck });
    quick.push({ id: 'wishlist', label: 'My Wishlist', icon: Heart });
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#FFF3E6] via-[#FAF6F0] to-[#E2EFE8]">
      <PawBackdrop />
      <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full bg-[#F4A261]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-24 w-[480px] h-[480px] rounded-full bg-[#52796F]/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-7 animate-riseIn">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-[#F4C4B7] text-[#E07A5F] text-xs font-bold shadow-sm">
            <Sparkles className="w-4 h-4 text-[#F4A261]" /> Vet-certified pets · Trusted care · Happy homes
          </span>

          <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-[#231F20]">
            Find the pet that{' '}
            <span className="relative inline-block text-[#E07A5F]">
              feels like home
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" aria-hidden="true">
                <path d="M3 8 C70 1 140 1 297 7" stroke="#F4A261" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="text-lg text-[#65605B] max-w-xl leading-relaxed">
            Meet healthy, well-loved pets from ethical breeders — then book the vet, the spa day and the
            delivery in one friendly place.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              document.getElementById('pet-listings')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-white p-2.5 rounded-full border border-[#E6DCCF] shadow-aesthetic flex items-center gap-2 max-w-xl"
          >
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-[#8C847C] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search pets in hero"
                placeholder="Try “Golden Retriever” or “Persian kitten”"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-9 py-3 rounded-full bg-transparent text-sm font-semibold placeholder-[#A39A8E] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C847C]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-full bg-[#E07A5F] hover:bg-[#D0654A] text-white text-sm font-extrabold shadow-md shadow-[#E07A5F]/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              Find pets <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowQuiz(!showQuiz)}
              className="px-5 py-2.5 rounded-full bg-[#52796F] hover:bg-[#3F6359] text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-[#52796F]/25 transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" /> {showQuiz ? 'Hide pet quiz' : 'Take the pet match quiz'}
            </button>
            {quick.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className="px-4 py-2.5 rounded-full bg-white border border-[#E6DCCF] text-[#4A4344] text-xs font-extrabold flex items-center gap-2 hover:border-[#E07A5F] hover:text-[#E07A5F] transition-all hover:-translate-y-0.5"
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6 pt-2 text-xs font-extrabold text-[#4A4344]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#52796F]" /> Health guaranteed
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[#F4A261] fill-[#F4A261]" /> 4.9 average rating
            </span>
            {petCount > 0 && <span className="hidden sm:flex items-center gap-1.5">🐾 {petCount} pets available</span>}
          </div>
        </div>

        <div className="lg:col-span-6 relative h-[460px] sm:h-[540px] animate-riseIn" style={{ animationDelay: '150ms' }}>
          <img
            src={PHOTOS.main}
            alt="Happy dog smiling at the camera"
            className="absolute right-0 top-0 w-[72%] h-[78%] object-cover rounded-[2.5rem] border-[6px] border-white shadow-aesthetic rotate-2 hover:rotate-0 transition-transform duration-500"
          />
          <img
            src={PHOTOS.cat}
            alt="Curious tabby cat"
            className="absolute left-0 bottom-6 w-[46%] h-[44%] object-cover rounded-[2rem] border-[6px] border-white shadow-aesthetic -rotate-3 hover:rotate-0 transition-transform duration-500"
          />
          <img
            src={PHOTOS.puppy}
            alt="Golden retriever puppy"
            className="absolute right-4 bottom-0 w-[34%] h-[30%] object-cover rounded-[1.75rem] border-[6px] border-white shadow-aesthetic rotate-3 hover:rotate-0 transition-transform duration-500"
          />

          <AnimatedDog className="hidden sm:block absolute -left-4 top-2 w-32 animate-floatY" />
          <AnimatedCat className="hidden md:block absolute right-[36%] -bottom-6 w-28 animate-floatY" />

          <div className="absolute left-[8%] top-[42%] bg-white/95 backdrop-blur px-4 py-2.5 rounded-2xl shadow-aesthetic border border-[#EFE9DF] flex items-center gap-2.5 animate-floatSoft">
            <span className="w-8 h-8 rounded-full bg-[#E2EFE8] text-[#3F6359] flex items-center justify-center font-black text-sm">
              ✓
            </span>
            <div>
              <strong className="block text-xs font-extrabold text-[#231F20]">Vet checked</strong>
              <span className="text-[10px] text-[#65605B] font-medium">Fully vaccinated</span>
            </div>
          </div>
          <div className="absolute right-0 top-[80%] sm:top-[82%] bg-white/95 backdrop-blur px-4 py-2.5 rounded-2xl shadow-aesthetic border border-[#EFE9DF] flex items-center gap-2 animate-floatY">
            <span className="text-lg">⭐</span>
            <div>
              <strong className="block text-xs font-extrabold text-[#231F20]">1,200+ families</strong>
              <span className="text-[10px] text-[#65605B] font-medium">found a friend</span>
            </div>
          </div>
        </div>
      </div>

      <svg
        className="relative block w-full h-10 text-[#FAF6F0]"
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 40 C240 0 480 0 720 20 C960 40 1200 40 1440 8 V40 Z" fill="currentColor" />
      </svg>
    </section>
  );
}
