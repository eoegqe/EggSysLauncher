import React from 'react';
import { WifiOff, Signal } from 'lucide-react';

export function WifiNetworkError({ onClose }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center mb-5">
        <WifiOff className="w-10 h-10 text-slate-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Unable to connect to the network</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">
        Wi-Fi is turned off. Turn on Wi-Fi from Control Center to use this app.
      </p>
      <button
        onClick={onClose}
        className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
      >
        OK
      </button>
    </div>
  );
}

export function MobileDataError({ onClose }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center mb-5">
        <Signal className="w-10 h-10 text-slate-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Cannot connect to mobile network</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">
        Mobile data is turned off. Turn on Mobile Data from Control Center to use this app.
      </p>
      <button
        onClick={onClose}
        className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
      >
        OK
      </button>
    </div>
  );
}