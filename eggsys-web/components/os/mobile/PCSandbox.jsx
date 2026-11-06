import React, { useEffect } from 'react';
import { X, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

// PC Sandbox — renders the Desktop OS in a landscape iframe so owners can
// test PC features from a phone. Sits above the landscape warning (z-99999)
// so it stays usable in landscape orientation.
export default function PCSandbox({ onClose }) {
  // Mark the sandbox as open so the mobile GlobalCallMonitor hides its call
  // UI for self-test calls — the user answers from the Desktop iframe instead.
  useEffect(() => {
    sessionStorage.setItem('eos_pc_sandbox_open', 'true');
    return () => sessionStorage.removeItem('eos_pc_sandbox_open');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-black flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur z-10">
        <div className="flex items-center gap-2 text-white">
          <Monitor className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold">PC Sandbox</span>
          <span className="text-[10px] text-white/50 hidden sm:inline">
            Rotate to landscape for the full experience
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/15 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Desktop iframe — fills the rest of the screen */}
      <div className="flex-1 relative bg-black">
        <iframe
          src="/Desktop100010101110?pc_sandbox=1"
          title="PC Sandbox"
          className="absolute inset-0 w-full h-full border-0"
          allow="camera; microphone; autoplay; fullscreen; display-capture"
        />
      </div>
    </motion.div>
  );
}