import React from 'react';

const SPOTIFY_LOGO_URL = 'https://media.base44.com/images/public/6946b759fb67abb9152e7314/3c260fb8d_Screenshot_20260828-022717.png';

// Spotify brand icon — renders the official Spotify logo image, filling
// whatever container/size the caller passes.
export default function SpotifyIcon({ className, size, ...props }) {
  return (
    <img
      src={SPOTIFY_LOGO_URL}
      alt="Spotify"
      className={`${className || ''} rounded-2xl object-cover`}
      width={size}
      height={size}
      draggable={false}
      {...props}
    />
  );
}