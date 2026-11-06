import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Power } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BrickedScreen({ serviceName = 'EggSys OS' }) {
  const navigate = useNavigate();

  const powerOff = () => {
    const isMobile = window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    navigate(createPageUrl(isMobile ? 'MobilePoweredOff' : 'PoweredOff'));
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black p-4 overflow-auto">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/60 border-2 border-red-800 flex items-center justify-center mx-auto mb-6">
          <Power className="w-8 h-8 text-red-500" />
        </div>

        <h1 className="text-xl font-bold text-red-400 mb-3 tracking-tight">System failed to start</h1>
        <p className="text-sm text-gray-400 mb-6">
          A critical system service was disabled.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Error code</p>
          <p className="text-red-400 font-mono text-lg">0xE0000001</p>
        </div>

        <Button onClick={powerOff} className="w-full bg-red-700 hover:bg-red-800 text-white">
          <Power className="w-4 h-4 mr-2" />
          Power Off
        </Button>
      </div>
    </div>
  );
}