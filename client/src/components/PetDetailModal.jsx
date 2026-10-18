import React, { useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ShoppingBag,
  Heart,
  Stethoscope
} from 'lucide-react';

/**
 * PetDetailModal Component (Eye-Comfort Aesthetic)
 */
export default function PetDetailModal({
  pet,
  currentUser,
  wishlistIds = [],
  onToggleWishlist,
  onClose,
  onBuyNow
}) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!pet) return null;

  const isBuyer = currentUser?.role === 'buyer';
  const isWishlisted = wishlistIds.includes(pet.id);
  const isOwnListing = Boolean(currentUser && currentUser.id === pet.seller_id);
  const isSoldOut = pet.stock === 0 || pet.status === 'sold';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={pet.title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231F20]/40 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-aesthetic max-w-2xl w-full overflow-hidden border border-[#EFE9DF] max-h-[90vh] flex flex-col"
      >
        {/* Modal Header with Close Button */}
        <div className="relative h-64 sm:h-72 bg-[#FAF6F0] flex-shrink-0">
          <img
            src={pet.image_url}
            alt={pet.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#231F20]/80 via-transparent to-black/20" />

          <div className="absolute top-4 right-4 flex items-center space-x-2">
            {isBuyer && (
              <button
                type="button"
                onClick={() => onToggleWishlist?.(pet.id)}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                className="text-white bg-black/40 hover:bg-black/70 p-2 rounded-full backdrop-blur transition-all"
                title={isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-white bg-black/40 hover:bg-black/70 p-2 rounded-full backdrop-blur transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-4 left-6 right-6 text-white">
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 bg-[#E07A5F] text-white text-xs font-bold rounded-full shadow">
                {pet.category}
              </span>
              <span className="px-2.5 py-0.5 bg-[#52796F] text-white text-xs font-bold rounded-full flex items-center shadow">
                <ShieldCheck className="w-3 h-3 mr-1" /> Health Verified
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white">{pet.title}</h2>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Attributes Grid */}
          <div className="grid grid-cols-3 gap-3 bg-[#FAF6F0] p-4 rounded-2xl border border-[#E6DCCF]">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C847C] block mb-0.5">Breed</span>
              <span className="text-sm font-bold text-[#231F20]">{pet.breed}</span>
            </div>
            <div className="text-center border-x border-[#E6DCCF]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C847C] block mb-0.5">Age</span>
              <span className="text-sm font-bold text-[#231F20]">{pet.age}</span>
            </div>
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C847C] block mb-0.5">Gender</span>
              <span className="text-sm font-bold text-[#231F20]">{pet.gender}</span>
            </div>
          </div>

          {/* Health & Vaccination Status */}
          <div className="bg-[#EAEFE9] border border-[#D1E7DD] p-4 rounded-2xl">
            <div className="flex items-center space-x-2 mb-2 text-[#2A5C4A] font-bold text-sm">
              <Stethoscope className="w-4 h-4 text-[#52796F]" />
              <span>Veterinary Health Certificate & Medical History</span>
            </div>
            <p className="text-xs text-[#2A5C4A] leading-relaxed font-medium">
              {pet.health_status}
            </p>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold text-[#231F20] mb-2">About This Pet</h3>
            <p className="text-[#65605B] text-xs sm:text-sm leading-relaxed">
              {pet.description}
            </p>
          </div>

          {/* Public Seller Information (name & public seller ID only) */}
          <div className="flex items-center justify-between p-4 bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF5F0] text-[#E07A5F] border border-[#F4C4B7] flex items-center justify-center font-bold text-sm">
                🏪
              </div>
              <div>
                <p className="text-xs font-bold text-[#231F20]">
                  Owner: {pet.seller_name || 'Verified Breeder'}
                </p>
                <p className="text-[11px] text-[#65605B]">
                  Public Seller ID: <span className="font-mono font-bold text-[#231F20]">{pet.seller_id}</span> • Verified Breeder
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#2A5C4A] bg-[#EAEFE9] px-2.5 py-1 rounded-full border border-[#D1E7DD]">
              In Stock: {pet.stock} Available
            </span>
          </div>
        </div>

        {/* Modal Footer with Price and Buy Button */}
        <div className="p-6 bg-[#FAF6F0] border-t border-[#E6DCCF] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#65605B] font-medium block">Total Price</span>
            <span className="text-2xl font-black text-[#231F20] font-display">${pet.price}</span>
          </div>

          {isOwnListing ? (
            <span className="px-5 py-3 bg-[#F3ECE0] text-[#65605B] border border-[#E6DCCF] font-extrabold text-xs rounded-xl">
              Your Listing (Owner Cannot Purchase)
            </span>
          ) : (
            <button
              onClick={() => onBuyNow(pet)}
              disabled={isSoldOut}
              className="px-6 py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all flex items-center space-x-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isSoldOut ? 'Sold Out' : 'Proceed to Buy Now'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
