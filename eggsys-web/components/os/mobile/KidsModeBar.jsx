import React from 'react';
import { Baby, Lock } from 'lucide-react';

// Small banner shown on the mobile home screen while Kids Mode is on.
// Tapping the lock opens the PIN-gated parental controls panel.
export default function KidsModeBar({ onOpenControls }) {
  return (
    <button
      onClick={onOpenControls}
      className="w-full mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-100 text-xs font-medium active:scale-[0.99] transition-transform"
    >
      <Baby className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">Kids Mode is on — only approved contacts can be reached</span>
      <Lock className="w-3.5 h-3.5 shrink-0" />
    </button>
  );
}