import React from 'react';

/** Playful loading indicator: three bouncing paw dots. */
export default function PawLoader({ label = 'Fetching the good stuff…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[#65605B]" role="status" aria-live="polite">
      <div className="flex space-x-2 text-3xl">
        {[0, 1, 2].map(i => (
          <span key={i} className="paw-bounce inline-block" style={{ animationDelay: `${i * 0.15}s` }}>🐾</span>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold">{label}</p>
    </div>
  );
}

export function PetCardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-3xl border border-[#EFE9DF] overflow-hidden">
          <div className="skeleton aspect-[4/3] rounded-none" />
          <div className="p-6 space-y-3">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
