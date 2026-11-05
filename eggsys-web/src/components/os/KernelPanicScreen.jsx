import React, { useEffect, useRef, useState } from 'react';
import { createPageUrl } from '@/utils';

export default function KernelPanicScreen() {
  let reason = 'a system operation did not succeed';
  try {
    const stored = sessionStorage.getItem('eos_kernel_panic_reason');
    if (stored) reason = stored;
  } catch {}

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const [taps, setTaps] = useState(0);
  const tapTimer = useRef(null);

  const restart = () => {
    try { sessionStorage.removeItem('eos_kernel_panic_reason'); } catch {}
    sessionStorage.setItem('eos_restarting', 'true');
    window.location.href = createPageUrl('SelectOS');
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); restart(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // On mobile, require two taps within 1.5s to restart (avoids accidental
  // restarts from a single stray tap).
  const handleTap = () => {
    if (!isMobile) return;
    const next = taps + 1;
    setTaps(next);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (next >= 2) {
      restart();
      return;
    }
    tapTimer.current = setTimeout(() => setTaps(0), 1500);
  };

  return (
    <div
      onClick={handleTap}
      className="w-screen h-screen bg-black text-red-500 font-mono flex flex-col items-center justify-center p-6 select-none"
    >
      <div className="max-w-2xl w-full space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">
          kernel panic: {reason}
        </h1>
        <p className="text-gray-500 text-sm">
          EggSys has been powered down to prevent damage to your system.
        </p>
        <p className="text-gray-400 text-sm mt-8 animate-pulse">
          {isMobile
            ? (taps === 1 ? 'Tap once more to restart.' : 'Tap twice to restart.')
            : 'Press Enter to restart.'}
        </p>
      </div>
    </div>
  );
}