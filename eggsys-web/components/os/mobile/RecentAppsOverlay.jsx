import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SquareStack, Trash2, ChevronDown } from 'lucide-react';
import EggSysWord from '../EggSysWord';

export default function RecentAppsOverlay({ apps, onRestore, onCloseApp, onClearAll, onDismiss }) {
  // Auto-dismiss the overlay once the last app is closed (incl. Clear all).
  const prevCount = useRef(apps.length);
  useEffect(() => {
    if (prevCount.current > 0 && apps.length === 0) onDismiss();
    prevCount.current = apps.length;
  }, [apps.length, onDismiss]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[260] flex flex-col bg-black/40 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
    >
      <div className="flex-1 flex flex-col p-4" onClick={(e) => e.stopPropagation()}>
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <button
            onPointerDown={(e) => { e.preventDefault(); onDismiss(); }}
            className="flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
          >
            <EggSysWord height={13} />
            <ChevronDown className="w-3.5 h-3.5 text-white/80" />
          </button>
          <div className="flex items-center gap-1.5 text-white/80">
            <SquareStack className="w-4 h-4" />
            <span className="text-xs font-medium">Recent apps</span>
            <span className="text-xs text-white/40">{apps.length}</span>
          </div>
          <button
            onPointerDown={(e) => { e.preventDefault(); onDismiss(); }}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto snap-y snap-mandatory" style={{ scrollbarWidth: 'none' }}>
          {apps.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-white/40">
              <SquareStack className="w-16 h-16 opacity-30" strokeWidth={1.2} />
              <p className="text-sm">No recent apps</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-4">
              <AnimatePresence>
                {apps.map((app) => {
                  const Icon = app.icon;
                  return (
                    <motion.div
                      key={app.id}
                      layout
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, y: -160, scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="snap-center shrink-0 h-[72vh] rounded-[24px] overflow-hidden border border-white/10 shadow-2xl"
                      style={{ background: 'linear-gradient(160deg, rgba(50,22,44,0.92) 0%, rgba(18,10,24,0.96) 55%, rgba(0,0,0,0.98) 100%)' }}
                    >
                      {/* Card header */}
                      <div className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10">
                        <button
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onRestore(app); }}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${app.color || 'from-slate-600 to-slate-800'} flex items-center justify-center shadow-md shrink-0`}>
                            {Icon ? <Icon className="w-5 h-5 text-white" /> : null}
                          </div>
                          <span className="flex-1 text-sm font-medium text-white truncate">{app.title}</span>
                        </button>
                        <button
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onCloseApp(app.id); }}
                          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                          title="Close app"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      {/* Card body — tap to open, shows app snapshot */}
                      <button
                        onPointerDown={(e) => { e.preventDefault(); onRestore(app); }}
                        className="w-full h-[calc(72vh-60px)] flex items-center justify-center overflow-hidden bg-black"
                      >
                        {app.snapshotUrl ? (
                          <img src={app.snapshotUrl} alt={app.title} className="w-full h-full object-cover" draggable={false} />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 text-white/30">
                            {Icon ? <Icon className="w-12 h-12 opacity-25" strokeWidth={1.2} /> : null}
                            <span className="text-[11px]">Tap to open</span>
                          </div>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Clear all */}
        {apps.length > 0 && (
          <div className="pt-2">
            <button
              onPointerDown={(e) => { e.preventDefault(); onClearAll(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          </div>
        )}
      </div>
    </motion.div>,
    document.body
  );
}