import React from 'react';
import { Home, SquareStack } from 'lucide-react';

// The persistent in-app navigation bar (Home + Recent). Rendered both inside
// open apps (AppView) and on the home screen so it never hides.
export default function SystemNavBar({ onHome, onRecent, homeDisabled = false, hideHome = false, matchDock = false }) {
  const barClass = matchDock
    ? 'flex items-center justify-center gap-2 py-2 bg-white/10 backdrop-blur-xl border-t border-white/20 text-white text-xs'
    : 'flex items-center justify-center gap-2 py-2 bg-black/20 backdrop-blur-sm text-white text-xs';

  return (
    <div className={barClass}>
      {!hideHome && (
        <button
          onPointerDown={(e) => { e.preventDefault(); if (!homeDisabled) onHome?.(); }}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: 'manipulation' }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/10 transition-colors select-none ${homeDisabled ? 'opacity-50' : ''}`}
          title="Home"
        >
          <Home className="w-4 h-4 text-white" />
          <span>Home</span>
        </button>
      )}
      <button
        onPointerDown={(e) => { e.preventDefault(); onRecent?.(); }}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'manipulation' }}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/10 transition-colors select-none"
        title="Recent apps"
      >
        <SquareStack className="w-4 h-4 text-white" />
        <span>Recent</span>
      </button>
    </div>
  );
}