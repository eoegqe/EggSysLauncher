import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';

// A bottom-anchored slide control: drag the knob left to decline, right to
// answer. The knob snaps back if released before reaching either end.
export default function CallSlideToAnswer({ onAnswer, onDecline, disabled }) {
  const trackRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const x = useMotionValue(0);
  const [committed, setCommitted] = useState(false);

  useEffect(() => {
    const measure = () => {
      if (trackRef.current) setTrackWidth(trackRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const handleDragEnd = (_, info) => {
    if (committed) return;
    const knob = 64; // knob width
    const max = trackWidth ? (trackWidth - knob) / 2 : 120;
    if (info.offset.x <= -max * 0.85) {
      setCommitted(true);
      animate(x, -max, { duration: 0.12 });
      onDecline?.();
    } else if (info.offset.x >= max * 0.85) {
      setCommitted(true);
      animate(x, max, { duration: 0.12 });
      onAnswer?.();
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
    }
  };

  const max = trackWidth ? (trackWidth - 64) / 2 : 120;
  // Fade the end labels as the knob moves away from center toward either side.
  const labelOpacity = useTransform(x, [-max || -120, 0, max || 120], [0, 1, 0]);

  return (
    <div className="w-full px-6 pb-8 pt-2 select-none">
      <div
        ref={trackRef}
        className="relative w-full h-16 rounded-full overflow-hidden flex items-center"
        style={{
          background: 'linear-gradient(90deg, rgba(239,68,68,0.55) 0%, rgba(255,255,255,0.12) 50%, rgba(34,197,94,0.55) 100%)'
        }}
      >
        {/* End labels — fade out as the knob slides away from center */}
        <motion.div style={{ opacity: labelOpacity }} className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-white/90 text-xs font-semibold pointer-events-none">
          <PhoneOff className="w-4 h-4" />
          <span>Decline</span>
        </motion.div>
        <motion.div style={{ opacity: labelOpacity }} className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-white/90 text-xs font-semibold pointer-events-none">
          <span>Answer</span>
          <Phone className="w-4 h-4" />
        </motion.div>

        {/* Draggable knob */}
        <motion.div
          drag="x"
          dragConstraints={{ left: -max, right: max }}
          dragElastic={0.04}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="absolute left-1/2 top-1/2 -ml-8 -mt-8 w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing"
          data-testid="call-slide-knob"
        >
          <div className="flex items-center gap-0.5 text-slate-700">
            <span className="text-lg leading-none">‹</span>
            <span className="text-lg leading-none">›</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}