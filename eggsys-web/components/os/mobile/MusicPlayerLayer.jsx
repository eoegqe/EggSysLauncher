import React, { useState } from 'react';
import { Minus, Home, SquareStack } from 'lucide-react';
import StatusBar from './StatusBar';
import MusicPlayer from '../apps/MusicPlayer';
import SpotifyIcon from '../SpotifyIcon';
import MusicAppIcon from '@/components/os/MusicAppIcon';
import { useMusicAppMeta } from '@/lib/musicAppMeta';
import FullScreenExitZone from './FullScreenExitZone';

export default function MusicPlayerLayer({
  active,
  onClose,
  onMinimize,
  onOpenRecent,
  onLaunchApp,
  user,
  onLock,
  onRefresh,
  activeCall,
  wifiEnabled,
  mobileDataEnabled,
  onOpenControlCenter,
  hideStatusBarFullScreen,
}) {
  const [fullScreen, setFullScreen] = useState(false);
  const isNonLegacy = user?.home_preferences?.legacy_mode === false;
  const hideBar = fullScreen && hideStatusBarFullScreen;
  // Music app branding (Music Player ↔ Spotify) — see src/lib/musicAppMeta.js
  const musicMeta = useMusicAppMeta();

  return (
    <div
      className={`fixed inset-0 z-[250] flex flex-col bg-gray-50 transition-transform duration-300 ${
        active ? '' : 'translate-y-full pointer-events-none'
      }`}
    >
      {!hideBar && (
        <div className="relative z-50">
          <StatusBar
            onLock={onLock}
            onRefresh={onRefresh}
            activeCall={activeCall}
            onReopenCall={() => window.dispatchEvent(new CustomEvent('eos_reopen_call'))}
            esimActive={!!user?.esim?.activated}
            wifiEnabled={wifiEnabled}
            mobileDataEnabled={mobileDataEnabled}
            onOpenControlCenter={onOpenControlCenter}
            appCloseButton
            fullScreen={fullScreen}
            onCloseApp={onClose}
            onEnterFullScreen={() => setFullScreen(true)}
            onExitFullScreen={() => setFullScreen(false)}
          />
        </div>
      )}
      {hideBar && (
        <FullScreenExitZone onExit={() => setFullScreen(false)} />
      )}
      {!fullScreen && !isNonLegacy && (
        <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-white/10">
          <div className="flex items-center gap-2">
            <MusicAppIcon className="w-5 h-5" />
            <h1 className="font-semibold text-white text-sm">{musicMeta.name}</h1>
          </div>
          <button
            onPointerDown={(e) => { e.preventDefault(); onClose(); }}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'manipulation' }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors select-none"
            title="Minimize"
          >
            <Minus className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-hidden relative">
        <MusicPlayer onClose={onClose} onLaunchApp={onLaunchApp} esimActive={!!user?.esim?.activated} mobileDataEnabled={mobileDataEnabled} />
      </div>
      {!fullScreen && isNonLegacy && (
        <div className="flex items-center justify-center gap-2 py-2 bg-black/20 backdrop-blur-sm text-white text-xs">
          <button
            onPointerDown={(e) => { e.preventDefault(); onMinimize(); }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/10 transition-colors select-none"
            title="Home"
          >
            <Home className="w-4 h-4 text-white" />
            <span>Home</span>
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); onOpenRecent(); }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/10 transition-colors select-none"
            title="Recent apps"
          >
            <SquareStack className="w-4 h-4 text-white" />
            <span>Recent</span>
          </button>
        </div>
      )}
    </div>
  );
}