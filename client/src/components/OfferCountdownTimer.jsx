import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/**
 * Calculates remaining time in days, hours, minutes, and seconds.
 * Returns null if no valid date, or if the date has expired.
 *
 * @param {string} endDateStr - End date string (e.g. 'YYYY-MM-DD' or ISO timestamp)
 * @returns {string|null} e.g. "02d 14h 35m 20s"
 */
export function formatOfferCountdown(endDateStr) {
  if (!endDateStr || typeof endDateStr !== 'string') return null;
  const trimmed = endDateStr.trim();
  if (!trimmed) return null;

  let endMs;
  // If date-only format (YYYY-MM-DD), target end of day UTC (23:59:59.999Z)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    endMs = new Date(`${trimmed}T23:59:59.999Z`).getTime();
  } else {
    endMs = new Date(trimmed).getTime();
  }

  if (isNaN(endMs)) return null;

  const now = Date.now();
  const diff = endMs - now;

  // When offer expires, stop countdown; do not show negative time
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * OfferCountdownTimer Component
 *
 * Displays live "Offer ends in 02d 14h 35m 20s" countdown on active pet listing offers.
 * Updates every second, automatically ceases display upon expiry, and remains hidden
 * for non-active, scheduled, or expired offers.
 */
export default function OfferCountdownTimer({ pet, variant = 'text', className = '' }) {
  const endDate = pet?.discount_info?.end_date || pet?.discount?.end_date;

  // Active offer eligibility check
  const isEligible = Boolean(
    pet &&
    pet.has_active_discount &&
    Number(pet.price) > 0 &&
    pet.discount_status !== 'scheduled' &&
    pet.discount_status !== 'expired' &&
    pet.discount_status !== 'paused' &&
    endDate
  );

  const [timeLeft, setTimeLeft] = useState(() => (isEligible ? formatOfferCountdown(endDate) : null));

  useEffect(() => {
    if (!isEligible || !endDate) {
      setTimeLeft(null);
      return;
    }

    // Immediate check
    const initial = formatOfferCountdown(endDate);
    setTimeLeft(initial);
    if (!initial) return;

    const timer = setInterval(() => {
      const formatted = formatOfferCountdown(endDate);
      setTimeLeft(formatted);
      if (!formatted) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, isEligible]);

  if (!isEligible || !timeLeft) return null;

  if (variant === 'badge') {
    return (
      <span
        className={`bg-[#231F20]/90 backdrop-blur-md text-[#F4A261] border border-[#F4A261]/50 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 whitespace-nowrap ${className}`}
        title={`Offer ends in ${timeLeft}`}
      >
        <Clock className="w-3 h-3 text-[#F4A261] animate-pulse flex-shrink-0" />
        <span>Offer ends in {timeLeft}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-extrabold text-[#E07A5F] bg-[#FFF5F0] border border-[#FCD9C8] px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap ${className}`}
      title={`Offer ends in ${timeLeft}`}
    >
      <Clock className="w-2.5 h-2.5 text-[#E07A5F] animate-pulse flex-shrink-0" />
      <span>Offer ends in {timeLeft}</span>
    </span>
  );
}
