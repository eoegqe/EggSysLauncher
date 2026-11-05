import React from 'react';
import { Phone, MessageCircle, Contact, Camera, Crown, Lock } from 'lucide-react';

const LOGO = 'https://media.base44.com/images/public/6946b759fb67abb9152e7314/c697387e9_file_000000006d3481f5be81064990edc01f.png';

// Tablet-only left dock. Replaces the phone bottom nav bar on tablets so the
// home screen reads as a tablet OS instead of a stretched phone.
export default function TabletSidebar({ kidsMode, activeServer, onOpenServerPanel, onLaunchApp, onLock }) {
  const items = [
    { id: 'phone', label: 'Phone', icon: Phone },
    ...(kidsMode ? [] : [{ id: 'messages', label: 'Messages', icon: MessageCircle }]),
    { id: 'contacts', label: 'Contacts', icon: Contact },
    { id: 'camera', label: 'Camera', icon: Camera },
  ];

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-black/25 backdrop-blur-xl border-r border-white/15">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
        <img src={LOGO} alt="EggetSystem" className="w-7 h-7 rounded object-contain" />
        <span className="text-white font-semibold text-sm tracking-tight">EggetSystem</span>
      </div>

      <div className="flex-1 flex flex-col gap-1 p-3">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onLaunchApp(it.id)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-white/90 hover:bg-white/10 active:bg-white/20 transition"
          >
            <it.icon className="w-6 h-6 shrink-0" />
            <span className="text-sm font-medium">{it.label}</span>
          </button>
        ))}
        {activeServer && (
          <button
            onClick={onOpenServerPanel}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-white/90 hover:bg-white/10 active:bg-white/20 transition"
          >
            <Crown className="w-6 h-6 shrink-0 text-amber-300" />
            <span className="text-sm font-medium">Server</span>
          </button>
        )}
      </div>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={onLock}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-white/90 hover:bg-white/10 active:bg-white/20 transition"
        >
          <Lock className="w-5 h-5" />
          <span className="text-sm font-medium">Lock</span>
        </button>
      </div>
    </aside>
  );
}