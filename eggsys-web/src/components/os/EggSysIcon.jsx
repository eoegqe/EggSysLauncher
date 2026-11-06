import React from 'react';

const EGGSYS_LOGO_URL = 'https://media.base44.com/images/public/6946b759fb67abb9152e7314/c697387e9_file_000000006d3481f5be81064990edc01f.png';

// EggetSystem brand icon — the logo is a horizontal wordmark on a black
// background, so it fills its parent container with black and uses
// object-contain to keep the full "EggetSystem" text visible (never cropped
// into a square). Used when an app or service sets its icon to "EggSys".
export default function EggSysIcon({ className, size, ...props }) {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-[inherit]">
      <img
        src={EGGSYS_LOGO_URL}
        alt="EggetSystem"
        className="w-full h-full object-contain"
        draggable={false}
        {...props}
      />
    </div>
  );
}