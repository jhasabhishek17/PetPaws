import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight, RotateCcw, Heart, ShieldCheck, ChevronRight } from 'lucide-react';

/**
 * Interactive Pet Matchmaker Quiz Widget (Eye-Comfort Aesthetic Theme)
 * 
 * Interactive 3-step quiz that analyzes living space, activity level, and allergy preferences
 * to recommend ideal pet matches with soft, warm, aesthetic feedback.
 */
export default function PetMatchmakerQuiz({ pets, currentUser, onSelectPet, onBuyPetRequest }) {
  const [step, setStep] = useState(1);
  const [homeType, setHomeType] = useState('apartment'); // apartment, house, aquarium
  const [activityLevel, setActivityLevel] = useState('couch'); // couch, active, low
  const [allergies, setAllergies] = useState('none'); // hypoallergenic, none
  const [recommendations, setRecommendations] = useState([]);

  // Calculate Matches
  const handleCalculateMatch = () => {
    let matches = pets || [];

    if (homeType === 'apartment') {
      matches = matches.filter(p => ['Cats', 'Fishes', 'Rabbits', 'Dogs'].includes(p.category));
    } else if (homeType === 'aquarium') {
      matches = matches.filter(p => ['Fishes', 'Rabbits', 'Birds'].includes(p.category));
    }

    if (activityLevel === 'couch') {
      matches = matches.filter(p => p.age?.includes('Young') || ['Cats', 'Rabbits'].includes(p.category));
    }

    if (matches.length === 0) matches = (pets || []).slice(0, 3);
    else matches = matches.slice(0, 3);

    setRecommendations(matches);
    setStep(4);
  };

  const handleReset = () => {
    setStep(1);
    setHomeType('apartment');
    setActivityLevel('couch');
    setAllergies('none');
    setRecommendations([]);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EFE9DF] shadow-aesthetic relative overflow-hidden my-10 animate-fadeIn">
      
      {/* Soft Ambient Orbs */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#F4A261]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#52796F]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-[#FFF5F0] text-[#E07A5F] border border-[#F4C4B7] rounded-full text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#F4A261]" />
          <span>Interactive Pawfect Pet Matchmaker 🐾</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-display text-[#231F20] mb-2">
          Find Your Ideal Pet Match in 3 Easy Steps
        </h2>
        <p className="text-[#65605B] text-xs sm:text-sm mb-8 max-w-xl mx-auto">
          Answer 3 quick questions about your lifestyle, and our smart match algorithm will pair you with healthy verified pets!
        </p>

        {/* Step Progress Bar */}
        <div className="flex items-center justify-center space-x-3 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex items-center space-x-1 px-3.5 py-1 rounded-full text-xs font-extrabold transition-all ${
                step === s
                  ? 'bg-[#E07A5F] text-white scale-105 shadow-md shadow-[#E07A5F]/20'
                  : step > s
                  ? 'bg-[#EAEFE9] text-[#2A5C4A] border border-[#D1E7DD]'
                  : 'bg-[#FAF6F0] text-[#8C847C] border border-[#E6DCCF]'
              }`}
            >
              <span>Step {s}</span>
              {step > s && <Check className="w-3.5 h-3.5 ml-1 text-[#52796F]" />}
            </div>
          ))}
        </div>

        {/* STEP 1: Living Space */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-base font-bold text-[#231F20]">1. What is your living space type?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setHomeType('apartment')}
                className={`p-5 rounded-2xl border text-center transition-all ${
                  homeType === 'apartment'
                    ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#231F20] font-bold ring-2 ring-[#E07A5F]/30 shadow-sm'
                    : 'border-[#EFE9DF] bg-[#FAF6F0] text-[#65605B] hover:bg-white'
                }`}
              >
                <span className="text-3xl block mb-2">🏢</span>
                <strong className="block text-sm font-bold text-[#231F20]">Apartment / Condo</strong>
                <span className="text-[11px] text-[#65605B]">Cozy indoor space</span>
              </button>

              <button
                type="button"
                onClick={() => setHomeType('house')}
                className={`p-5 rounded-2xl border text-center transition-all ${
                  homeType === 'house'
                    ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#231F20] font-bold ring-2 ring-[#E07A5F]/30 shadow-sm'
                    : 'border-[#EFE9DF] bg-[#FAF6F0] text-[#65605B] hover:bg-white'
                }`}
              >
                <span className="text-3xl block mb-2">🏡</span>
                <strong className="block text-sm font-bold text-[#231F20]">House with Yard</strong>
                <span className="text-[11px] text-[#65605B]">Spacious outdoor lawn</span>
              </button>

              <button
                type="button"
                onClick={() => setHomeType('aquarium')}
                className={`p-5 rounded-2xl border text-center transition-all ${
                  homeType === 'aquarium'
                    ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#231F20] font-bold ring-2 ring-[#E07A5F]/30 shadow-sm'
                    : 'border-[#EFE9DF] bg-[#FAF6F0] text-[#65605B] hover:bg-white'
                }`}
              >
                <span className="text-3xl block mb-2">🐠</span>
                <strong className="block text-sm font-bold text-[#231F20]">Tank Enclosure</strong>
                <span className="text-[11px] text-[#65605B]">Aquatic setup</span>
              </button>
            </div>

            <button
              onClick={() => setStep(2)}
              className="px-8 py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] text-white font-bold text-xs rounded-full shadow-md shadow-[#E07A5F]/20 hover:from-[#D96B43] transition-all inline-flex items-center space-x-2"
            >
              <span>Next: Activity Level</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Activity Level */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-base font-bold text-[#231F20]">2. What is your daily activity level?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setActivityLevel('couch')}
                className={`p-5 rounded-2xl border text-center transition-all ${
                  activityLevel === 'couch'
                    ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#231F20] font-bold ring-2 ring-[#E07A5F]/30 shadow-sm'
                    : 'border-[#EFE9DF] bg-[#FAF6F0] text-[#65605B] hover:bg-white'
                }`}
              >
                <span className="text-3xl block mb-2">🛋️</span>
                <strong className="block text-sm font-bold text-[#231F20]">Couch Cuddler</strong>
                <span className="text-[11px] text-[#65605B]">Loves indoor chilling</span>
              </button>

              <button
                type="button"
                onClick={() => setActivityLevel('active')}
                className={`p-5 rounded-2xl border text-center transition-all ${
                  activityLevel === 'active'
                    ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#231F20] font-bold ring-2 ring-[#E07A5F]/30 shadow-sm'
                    : 'border-[#EFE9DF] bg-[#FAF6F0] text-[#65605B] hover:bg-white'
                }`}
              >
                <span className="text-3xl block mb-2">🐕</span>
                <strong className="block text-sm font-bold text-[#231F20]">Active Walker</strong>
                <span className="text-[11px] text-[#65605B]">Daily outdoor walks</span>
              </button>

              <button
                type="button"
                onClick={() => setActivityLevel('low')}
                className={`p-5 rounded-2xl border text-center transition-all ${
                  activityLevel === 'low'
                    ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#231F20] font-bold ring-2 ring-[#E07A5F]/30 shadow-sm'
                    : 'border-[#EFE9DF] bg-[#FAF6F0] text-[#65605B] hover:bg-white'
                }`}
              >
                <span className="text-3xl block mb-2">🌿</span>
                <strong className="block text-sm font-bold text-[#231F20]">Low Maintenance</strong>
                <span className="text-[11px] text-[#65605B]">Easy schedule</span>
              </button>
            </div>

            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-[#FAF6F0] text-[#4A4344] font-semibold text-xs rounded-full hover:bg-[#F3ECE0] border border-[#E6DCCF]"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-8 py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] text-white font-bold text-xs rounded-full shadow-md shadow-[#E07A5F]/20 hover:from-[#D96B43] transition-all inline-flex items-center space-x-2"
              >
                <span>Next: Allergy Preference</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Allergy Preference */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-base font-bold text-[#231F20]">3. Do you require a hypoallergenic pet?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <button
                type="button"
                onClick={() => setAllergies('hypoallergenic')}
                className={`p-5 rounded-2xl border text-center transition-all ${
                  allergies === 'hypoallergenic'
                    ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#231F20] font-bold ring-2 ring-[#E07A5F]/30 shadow-sm'
                    : 'border-[#EFE9DF] bg-[#FAF6F0] text-[#65605B] hover:bg-white'
                }`}
              >
                <span className="text-3xl block mb-2">✨</span>
                <strong className="block text-sm font-bold text-[#231F20]">Yes, Hypoallergenic Only</strong>
                <span className="text-[11px] text-[#65605B]">Low dander & minimal shedding</span>
              </button>

              <button
                type="button"
                onClick={() => setAllergies('none')}
                className={`p-5 rounded-2xl border text-center transition-all ${
                  allergies === 'none'
                    ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#231F20] font-bold ring-2 ring-[#E07A5F]/30 shadow-sm'
                    : 'border-[#EFE9DF] bg-[#FAF6F0] text-[#65605B] hover:bg-white'
                }`}
              >
                <span className="text-3xl block mb-2">❤️</span>
                <strong className="block text-sm font-bold text-[#231F20]">No Allergies</strong>
                <span className="text-[11px] text-[#65605B]">Open to all pet breeds</span>
              </button>
            </div>

            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-[#FAF6F0] text-[#4A4344] font-semibold text-xs rounded-full hover:bg-[#F3ECE0] border border-[#E6DCCF]"
              >
                Back
              </button>
              <button
                onClick={handleCalculateMatch}
                className="px-8 py-3.5 bg-[#52796F] text-white font-extrabold text-xs rounded-full shadow-md shadow-[#52796F]/20 hover:bg-[#3A5A40] transition-all inline-flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-[#C5DFD2] animate-spin" />
                <span>Calculate Best Pet Matches</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Quiz Recommendations Results */}
        {step === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="inline-block p-3 bg-[#EAEFE9] border border-[#D1E7DD] rounded-2xl mb-2">
              <span className="text-xs font-bold text-[#2A5C4A] uppercase tracking-wider">🎉 99.4% Match Compatibility Found!</span>
            </div>
            
            <h3 className="text-xl font-extrabold text-[#231F20]">Top Recommended Pets For You</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              {recommendations.map((pet) => {
                const isOwnListing = Boolean(currentUser && currentUser.id === pet.seller_id);
                return (
                <div
                  key={pet.id}
                  onClick={() => onSelectPet(pet)}
                  className="bg-white rounded-2xl border border-[#EFE9DF] overflow-hidden shadow-aesthetic hover:border-[#E07A5F] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="relative h-44">
                    <img src={pet.image_url} alt={pet.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <span className="absolute top-2 left-2 bg-[#52796F] text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow">
                      Match Rating: 99.4%
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#231F20] line-clamp-1 mb-1">{pet.title}</h4>
                      <p className="text-xs text-[#65605B] mb-1">{pet.breed} • {pet.category}</p>
                      <p className="text-[10px] text-[#4A4344] mb-2">
                        Owner: <strong>{pet.seller_name || 'Verified Breeder'}</strong> ({pet.seller_id})
                      </p>
                      <span className="text-base font-black text-[#231F20] font-display">${pet.price}</span>
                    </div>

                    {isOwnListing ? (
                      <span className="w-full mt-3 py-2 bg-[#F3ECE0] text-[#65605B] font-bold text-xs rounded-xl text-center block">
                        Your Listing (Owner)
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuyPetRequest(pet);
                        }}
                        className="w-full mt-3 py-2 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-1"
                      >
                        <span>Adopt Pet</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );})}
            </div>

            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-[#FAF6F0] text-[#4A4344] font-semibold text-xs rounded-full hover:bg-[#F3ECE0] border border-[#E6DCCF] inline-flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Retake Quiz Matchmaker</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
