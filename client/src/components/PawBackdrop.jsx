import React from 'react';

const PAW = (
  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
    <ellipse cx="32" cy="42" rx="14" ry="11" />
    <ellipse cx="14" cy="26" rx="6" ry="8" transform="rotate(-20 14 26)" />
    <ellipse cx="26" cy="15" rx="6" ry="8" transform="rotate(-6 26 15)" />
    <ellipse cx="40" cy="15" rx="6" ry="8" transform="rotate(6 40 15)" />
    <ellipse cx="52" cy="26" rx="6" ry="8" transform="rotate(20 52 26)" />
  </svg>
);

// [left %, size px, delay s, duration s, rotation deg]
const PAWS = [
  [6, 34, 0, 16, -20], [18, 22, 4, 13, 15], [31, 40, 8, 18, -35], [46, 26, 2, 15, 25],
  [60, 36, 6, 17, -10], [73, 24, 10, 14, 30], [86, 38, 1, 19, -25], [94, 20, 7, 12, 10],
];

/** Decorative floating paw prints. Hidden entirely for reduced-motion users via CSS. */
export default function PawBackdrop({ className = '', tone = 'text-[#52796F]' }) {
  return (
    <div className={`paw-backdrop absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {PAWS.map(([left, size, delay, dur, rot], i) => (
        <span
          key={i}
          className={`absolute bottom-[-60px] animate-drift ${tone}`}
          style={{ left: `${left}%`, width: size, height: size, animationDelay: `${delay}s`, animationDuration: `${dur}s`, '--r': `${rot}deg` }}
        >
          {PAW}
        </span>
      ))}
    </div>
  );
}
