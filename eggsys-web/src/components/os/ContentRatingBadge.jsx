import React from 'react';
import { getRatingMeta } from '@/lib/contentRatings';
import { cn } from '@/lib/utils';

// ESRS (EggetSystem Rating Service) badge — shown on app overviews across the
// mobile and desktop app stores so every app displays its assigned content rating.
export default function ContentRatingBadge({ rating, size = 'sm', className }) {
  const m = getRatingMeta(rating);
  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };
  return (
    <span
      className={cn('inline-flex items-center rounded-full border font-semibold whitespace-nowrap', m.color, sizes[size], className)}
      title={m.description}
    >
      {m.label}
    </span>
  );
}