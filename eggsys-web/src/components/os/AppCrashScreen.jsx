import React from 'react';
import { Server } from 'lucide-react';

export default function AppCrashScreen({ appName, serviceName, onClose }) {
  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="p-4 bg-gradient-to-r from-gray-500 to-slate-600 text-white">
        <h2 className="text-xl font-bold">{appName}</h2>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Server className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">{serviceName} could not open</h3>
          <p className="text-sm text-gray-500">app not installed</p>
        </div>
      </div>
    </div>
  );
}