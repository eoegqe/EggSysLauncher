import React from 'react';

// Base44 Editor brand icon — uses the official Base44 logo image on a white rounded tile.
// Self-contained (like SpotifyIcon), so it can drop into any icon slot.
const LOGO_URL = 'https://media.base44.com/images/public/6946b759fb67abb9152e7314/0118e8091_Base44-Logo2.jpg';

export default function Base44EditorIcon({ className, size, ...props }) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <div
      className={`${className || ''} rounded-2xl bg-white flex items-center justify-center overflow-hidden`}
      style={style}
      role="img"
      aria-label="Base44 Editor"
      {...props}
    >
      <img
        src={LOGO_URL}
        alt="Base44 Editor"
        className="w-[78%] h-[78%] object-contain"
        draggable={false}
      />
    </div>
  );
}