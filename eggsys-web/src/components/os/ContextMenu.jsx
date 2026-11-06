import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Monitor, Settings, Folder, Terminal, Info, Sparkles, Package } from 'lucide-react';

export default function ContextMenu({ isOpen, position, onClose, onAction }) {
  if (!isOpen) return null;

  const menuItems = [
    { id: 'refresh', label: 'Refresh Desktop', icon: RefreshCw },
    { id: 'divider1', divider: true },
    { id: 'display', label: 'Display Settings', icon: Monitor },
    { id: 'personalize', label: 'Personalization', icon: Sparkles },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'divider2', divider: true },
    { id: 'files', label: 'Open File Explorer', icon: Folder },
    { id: 'terminal', label: 'Open Terminal', icon: Terminal },
    { id: 'appstore', label: 'Open App Store', icon: Package },
    { id: 'divider3', divider: true },
    { id: 'about', label: 'About EggetSystem', icon: Info }
  ];

  const handleClick = (itemId) => {
    onAction(itemId);
    onClose();
  };

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 220),
    y: Math.min(position.y, window.innerHeight - 350)
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed z-[100] w-56 bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden py-2"
        style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      >
        {menuItems.map((item) => {
          if (item.divider) {
            return <div key={item.id} className="h-px bg-white/10 my-1 mx-3" />;
          }
          
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
            >
              <Icon className="w-4 h-4 text-gray-400" />
              {item.label}
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}