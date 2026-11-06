import React, { useState, useRef, useEffect } from 'react';

// Transparent strip at the top of the screen. Press and hold for `holdMs`
// to trigger `onExit` (used to exit full screen when the status bar is hidden).
export default function FullScreenExitZone({ onExit, holdMs = 3000 }) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(0);

  const clearHold = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setProgress(0);
  };

  const tick = () => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / holdMs, 1);
    setProgress(pct);
    if (pct < 1) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      clearHold();
      onExit();
    }, holdMs);
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => clearHold(), []);

  return (
    <div
      className="absolute top-0 left-0 right-0 h-10 z-[200] touch-none"
      onPointerDown={handlePointerDown}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
      onPointerLeave={clearHold}
    >
      {progress > 0 && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-white/70 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}
    </div>
  );
}