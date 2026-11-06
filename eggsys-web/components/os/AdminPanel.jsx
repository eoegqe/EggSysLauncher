import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AdminApp from './apps/AdminApp';
import ServerAdminPanel from './ServerAdminPanel';
import { getActiveServer } from '@/lib/serverContext';

export default function AdminPanel({ isOpen, onClose }) {
  const { data: activeServer } = useQuery({ queryKey: ['active-server'], queryFn: () => getActiveServer() });
  const inServer = !!activeServer;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full md:w-[600px] lg:w-[800px] bg-gray-900 shadow-2xl z-[110] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between p-4 border-b border-gray-800 ${inServer ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 'bg-gradient-to-r from-gray-800 to-gray-900'}`}>
              <div className="flex items-center gap-2">
                {inServer && <Crown className="w-5 h-5 text-white" />}
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {inServer ? 'Server Admin Panel' : 'Admin Panel'}
                  </h2>
                  {inServer && (
                    <p className="text-[11px] text-white/80 leading-tight">{activeServer.name}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {inServer ? <ServerAdminPanel onClose={onClose} /> : <AdminApp />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}