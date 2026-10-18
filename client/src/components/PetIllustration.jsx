import React from 'react';

/**
 * Lightweight animated SVG pets (no animation library needed).
 * Tail wags, eyes blink, body gently floats. Animations are disabled by prefers-reduced-motion in index.css.
 */
export function AnimatedDog({ className = '' }) {
  return (
    <svg viewBox="0 0 240 220" className={className} role="img" aria-label="Animated happy dog">
      <ellipse cx="120" cy="208" rx="70" ry="8" fill="#231F20" opacity=".08" />
      <g className="pet-tail" style={{ transformOrigin: '176px 150px' }}>
        <path d="M172 154 C206 132 214 108 200 92 C196 112 186 126 168 136 Z" fill="#E8A46B" />
      </g>
      <rect x="70" y="120" width="104" height="70" rx="38" fill="#F2B880" />
      <rect x="82" y="170" width="22" height="30" rx="11" fill="#F2B880" />
      <rect x="140" y="170" width="22" height="30" rx="11" fill="#F2B880" />
      <ellipse cx="93" cy="199" rx="14" ry="7" fill="#E8A46B" />
      <ellipse cx="151" cy="199" rx="14" ry="7" fill="#E8A46B" />
      <circle cx="120" cy="88" r="54" fill="#F7C896" />
      <path d="M72 62 C44 62 36 112 58 126 C70 118 78 96 80 74 Z" fill="#C97F4A" />
      <path d="M168 62 C196 62 204 112 182 126 C170 118 162 96 160 74 Z" fill="#C97F4A" />
      <ellipse cx="120" cy="108" rx="30" ry="22" fill="#FFF1DD" />
      <g className="pet-blink" style={{ transformOrigin: '120px 84px' }}>
        <circle cx="98" cy="84" r="7" fill="#231F20" />
        <circle cx="142" cy="84" r="7" fill="#231F20" />
        <circle cx="100" cy="82" r="2.2" fill="#fff" />
        <circle cx="144" cy="82" r="2.2" fill="#fff" />
      </g>
      <ellipse cx="120" cy="100" rx="10" ry="7" fill="#3A2A25" />
      <path d="M120 107 V114 M108 116 Q120 126 132 116" stroke="#3A2A25" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M112 120 Q120 140 128 120 Z" fill="#E07A5F" />
      <circle cx="82" cy="104" r="7" fill="#E07A5F" opacity=".25" />
      <circle cx="158" cy="104" r="7" fill="#E07A5F" opacity=".25" />
    </svg>
  );
}

export function AnimatedCat({ className = '' }) {
  return (
    <svg viewBox="0 0 240 220" className={className} role="img" aria-label="Animated curious cat">
      <ellipse cx="120" cy="208" rx="66" ry="8" fill="#231F20" opacity=".08" />
      <g className="pet-tail" style={{ transformOrigin: '176px 170px' }}>
        <path d="M172 176 C222 170 226 120 204 108 C206 134 192 152 168 156 Z" fill="#8FA9A0" />
      </g>
      <rect x="72" y="120" width="98" height="72" rx="36" fill="#A8C1B6" />
      <rect x="84" y="172" width="20" height="28" rx="10" fill="#A8C1B6" />
      <rect x="138" y="172" width="20" height="28" rx="10" fill="#A8C1B6" />
      <path d="M72 60 L74 14 L110 42 Z" fill="#A8C1B6" />
      <path d="M170 60 L168 14 L132 42 Z" fill="#A8C1B6" />
      <path d="M79 48 L80 28 L97 42 Z" fill="#F4C4B7" />
      <path d="M163 48 L162 28 L145 42 Z" fill="#F4C4B7" />
      <circle cx="121" cy="88" r="52" fill="#B9D0C5" />
      <path d="M121 38 V52 M104 42 L107 54 M138 42 L135 54" stroke="#8FA9A0" strokeWidth="4" strokeLinecap="round" />
      <g className="pet-blink" style={{ transformOrigin: '121px 86px' }}>
        <ellipse cx="99" cy="86" rx="8" ry="10" fill="#F4D58D" />
        <ellipse cx="143" cy="86" rx="8" ry="10" fill="#F4D58D" />
        <ellipse cx="99" cy="86" rx="3" ry="8" fill="#231F20" />
        <ellipse cx="143" cy="86" rx="3" ry="8" fill="#231F20" />
      </g>
      <path d="M115 104 H127 L121 111 Z" fill="#E07A5F" />
      <path d="M121 111 Q112 120 104 114 M121 111 Q130 120 138 114" stroke="#5E766C" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M60 100 H90 M60 110 L88 106 M182 100 H152 M182 110 L154 106" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}
