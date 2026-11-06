import React from 'react';

// A 4-point star path centered at (cx, cy) with outer radius R.
function starPath(cx, cy, R) {
  const r = R * 0.32;
  const pts = [
    [cx, cy - R],
    [cx + r, cy - r],
    [cx + R, cy],
    [cx + r, cy + r],
    [cx, cy + R],
    [cx - r, cy + r],
    [cx - R, cy],
    [cx - r, cy - r]
  ];
  return 'M' + pts.map(p => p.map(n => +n.toFixed(2)).join(' ')).join(' L ') + ' Z';
}

// A "fancier" crown with stars on the tips — used for the Owner role so it's
// visually distinct from the co-owner's plain (starless) lucide Crown.
export default function CrownStars({ className = '', size = 16, strokeWidth = 2, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* crown body */}
      <path d="M5 16 L3 7 L8.5 11 L12 5 L15.5 11 L21 7 L19 16 Z" />
      <line x1="5" y1="16" x2="19" y2="16" />
      <line x1="6.5" y1="19" x2="17.5" y2="19" />
      {/* stars on the three tips */}
      <g fill="currentColor" stroke="none">
        <path d={starPath(3, 5, 1.7)} />
        <path d={starPath(12, 3, 1.9)} />
        <path d={starPath(21, 5, 1.7)} />
      </g>
    </svg>
  );
}