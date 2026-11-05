import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Shown by system services when the "EggSys OS" service is disabled.
// Mirrors a generic "page failed to load" error.
export default function EggSysOSFailure({ title = 'EggSys OS' }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-800 mb-1">Error 404</h2>
      <p className="text-sm text-gray-500">Could not find "{title}"</p>
      <p className="text-xs text-gray-400 mt-3 max-w-xs">
        This service is unavailable because EggSys OS is disabled. Re-enable EggSys OS to restore access.
      </p>
    </div>
  );
}