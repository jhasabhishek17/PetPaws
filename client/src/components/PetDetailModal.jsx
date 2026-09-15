import React from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  ShoppingBag, 
  User, 
  Calendar, 
  Tag, 
  Heart, 
  Sparkles,
  Stethoscope
} from 'lucide-react';

/**
 * PetDetailModal Component
 * Shows complete details for a selected pet including health status, vaccination background, 
 * seller details, stock count, and direct Buy Now purchase button.
 */
export default function PetDetailModal({ pet, onClose, onBuyNow }) {
  if (!pet) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Modal Header with Close Button */}
        <div className="relative h-64 sm:h-72 bg-slate-900 flex-shrink-0">
          <img
            src={pet.image_url}
            alt={pet.title}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/70 p-2 rounded-full backdrop-blur transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-6 right-6 text-white">
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                {pet.category}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center">
                <ShieldCheck className="w-3 h-3 mr-1" /> Health Verified
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display">{pet.title}</h2>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Key Attributes Grid */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Breed</span>
              <span className="text-sm font-bold text-slate-800">{pet.breed}</span>
            </div>
            <div className="text-center border-x border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Age</span>
              <span className="text-sm font-bold text-slate-800">{pet.age}</span>
            </div>
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Gender</span>
              <span className="text-sm font-bold text-slate-800">{pet.gender}</span>
            </div>
          </div>

          {/* Health & Vaccination Status */}
          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl">
            <div className="flex items-center space-x-2 mb-2 text-emerald-800 font-bold text-sm">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <span>Veterinary Health Certificate & Medical History</span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed font-medium">
              {pet.health_status}
            </p>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">About This Pet</h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              {pet.description}
            </p>
          </div>

          {/* Seller Information */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                🏪
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{pet.seller_name}</p>
                <p className="text-[11px] text-slate-500">Verified Seller • Rated 4.9 ★</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
              In Stock: {pet.stock} Available
            </span>
          </div>

        </div>

        {/* Modal Footer with Price and Buy Button */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Price</span>
            <span className="text-2xl font-black text-slate-900 font-display">${pet.price}</span>
          </div>

          <button
            onClick={() => onBuyNow(pet)}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center space-x-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Proceed to Buy Now</span>
          </button>
        </div>

      </div>
    </div>
  );
}
