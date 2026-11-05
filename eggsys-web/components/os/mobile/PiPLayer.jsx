import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, Phone, Video } from 'lucide-react';
import { _registerPiPSetter, closePiP } from '@/lib/pipManager';

/**
 * OS-shell-level PiP layer. Renders all active PiP windows as draggable
 * floating mini-cards. Must be mounted once at the MobileOS root so the
 * windows persist across home-screen navigation.
 */
export default function PiPLayer() {
  const [state, setState] = useState({ items: [] });
  const [positions, setPositions] = useState({});
  const dragRef = useRef(null);

  useEffect(() => {
    return _registerPiPSetter(setState);
  }, []);

  // Stagger multiple PiP windows vertically so they don't overlap.
  useEffect(() => {
    state.items.forEach((item, idx) => {
      if (!positions[item.id]) {
        setPositions((prev) => ({
          ...prev,
          [item.id]: {
            x: 16,
            y: 80 + idx * 160,
          },
        }));
      }
    });
  }, [state.items]);

  const handleDragStart = useCallback((e, id) => {
    e.preventDefault();
    const startX = e.touches ? e.touches[0].clientX : e.clientX;
    const startY = e.touches ? e.touches[0].clientY : e.clientY;
    const pos = positions[id] || { x: 16, y: 80 };
    const offsetX = startX - pos.x;
    const offsetY = startY - pos.y;

    const onMove = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const nx = Math.max(0, Math.min(window.innerWidth - 160, cx - offsetX));
      const ny = Math.max(0, Math.min(window.innerHeight - 120, cy - offsetY));
      setPositions((prev) => ({ ...prev, [id]: { x: nx, y: ny } }));
    };
    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [positions]);

  if (!state.items.length) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9600] pointer-events-none">
      <AnimatePresence>
        {state.items.map((item) => {
          const pos = positions[item.id] || { x: 16, y: 80 };
          const Icon = item.type === 'video' ? Video : Phone;
          const accent = item.type === 'video'
            ? 'from-blue-500 to-indigo-600'
            : 'from-green-500 to-emerald-600';
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ left: pos.x, top: pos.y }}
              className="absolute pointer-events-auto"
            >
              <div className="w-[150px] rounded-2xl overflow-hidden shadow-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/15">
                {/* Header — drag handle */}
                <div
                  className={`flex items-center justify-between px-2 py-1.5 bg-gradient-to-r ${accent} cursor-grab active:cursor-grabbing touch-none`}
                  onMouseDown={(e) => handleDragStart(e, item.id)}
                  onTouchStart={(e) => handleDragStart(e, item.id)}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="w-3 h-3 text-white shrink-0" />
                    <span className="text-[10px] font-semibold text-white truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => {
                        if (item.onExpand) item.onExpand();
                        closePiP(item.id);
                      }}
                      className="p-1 rounded hover:bg-white/20 transition-colors"
                    >
                      <Maximize2 className="w-3 h-3 text-white" />
                    </button>
                    <button
                      onClick={() => closePiP(item.id)}
                      className="p-1 rounded hover:bg-white/20 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
                {/* Content */}
                <div className="h-[100px] relative overflow-hidden bg-black">
                  {item.render?.()}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}