import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function OfflineScreen() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center z-[9999]">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md px-6"
      >
        <motion.div
          animate={{ 
            rotate: [0, -10, 10, -10, 0],
          }}
          transition={{ 
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 2
          }}
          className="w-24 h-24 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center"
        >
          <WifiOff className="w-12 h-12 text-red-400" />
        </motion.div>

        <h1 className="text-3xl font-bold text-white mb-3">You're Offline</h1>
        <p className="text-gray-400 mb-8">
          Looks like you've lost your internet connection. Check your network and try again.
        </p>

        <Button
          onClick={handleRetry}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </Button>

        <p className="text-xs text-gray-500 mt-6">
          EggetSystem requires an active internet connection to function properly.
        </p>
      </motion.div>
    </div>
  );
}