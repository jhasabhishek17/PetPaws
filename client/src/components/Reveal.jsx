import React, { useEffect, useRef, useState } from 'react';

/** Fades/slides children in once they scroll into view. Falls back to visible when IntersectionObserver is missing. */
export default function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (shown || !ref.current) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div ref={ref} className={`${shown ? 'animate-riseIn' : 'opacity-0'} ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
