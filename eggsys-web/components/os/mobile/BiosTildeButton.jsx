import React from 'react';

// The pre-boot "press ~ for BIOS" affordance. The BIOS boot menu is normally
// reached with the ~ key; touch devices have no keyboard, so this tappable ~
// is the same entry point (e.g. from the installer screen).
export default function BiosTildeButton({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      title="Open BIOS"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/35 hover:text-white/70 font-mono text-xs transition-colors"
    >
      <span className="text-sm leading-none">~</span>
      <span className="text-[10px] tracking-wider">BIOS</span>
    </button>
  );
}