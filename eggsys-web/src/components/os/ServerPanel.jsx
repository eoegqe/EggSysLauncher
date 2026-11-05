import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ServerDashboard from '@/pages/ServerDashboard';

export default function ServerPanel({ isOpen, onClose }) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full md:w-[600px] lg:w-[800px] bg-gray-900 shadow-2xl z-[310] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-amber-500 to-yellow-600">
              <h2 className="text-xl font-bold text-white">Server Panel</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <ServerDashboard embedded onClose={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}