import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import StatusBar from './StatusBar';
import NotificationToast from './NotificationToast';
import { WifiNetworkError, MobileDataError } from './NetworkErrorScreen';
import { wifiAppIds, mobileDataAppIds } from '@/lib/mobileAppConfigs';
import FullScreenExitZone from './FullScreenExitZone';
import SystemNavBar from './SystemNavBar';

export default function AppView({
  currentApp,
  user,
  displayedNotifications,
  onDismissNotif,
  onAnswerCall,
  onDeclineCall,
  onCardClick,
  onClose,
  onMinimize,
  onOpenRecent,
  onLaunchApp,
  onLock,
  onRefresh,
  activeCall,
  wifiEnabled,
  mobileDataEnabled,
  onOpenControlCenter,
  isOnline,
  hideStatusBarFullScreen,
  kidsMode,
}) {
  const AppComponent = currentApp.component;
  const [fullScreen, setFullScreen] = useState(false);
  const hideBar = fullScreen && hideStatusBarFullScreen;

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-gray-50">
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
      <div className="fixed top-12 left-0 right-0 z-[1100]">
        <AnimatePresence>
          {displayedNotifications.filter(n => !(n.isCall && activeCall)).map((notif) => (
            <NotificationToast
              key={notif.id}
              notif={notif}
              onDismiss={onDismissNotif}
              onAnswer={onAnswerCall}
              onDecline={onDeclineCall}
              onCardClick={onCardClick}
            />
          ))}
        </AnimatePresence>
      </div>
      {!fullScreen && user?.home_preferences?.legacy_mode !== false && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
          <div className="flex items-center gap-2">
            <currentApp.icon className="w-5 h-5 text-gray-700" />
            <h1 className="font-semibold text-gray-800 text-sm">{currentApp.title}</h1>
          </div>
          <button
            onPointerDown={(e) => { e.preventDefault(); onClose(); }}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'manipulation' }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors select-none"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-hidden relative" data-app-content>
        {wifiAppIds.includes(currentApp.id) && (!wifiEnabled || !isOnline) ? (
          <WifiNetworkError onClose={onClose} />
        ) : mobileDataAppIds.includes(currentApp.id) && !isOnline ? (
          <MobileDataError onClose={onClose} />
        ) : (
          <AppComponent onClose={onClose} onLaunchApp={onLaunchApp} esimActive={!!user?.esim?.activated} mobileDataEnabled={mobileDataEnabled} kidsMode={kidsMode} />
        )}
      </div>
      {!fullScreen && user?.home_preferences?.legacy_mode === false && (
        <SystemNavBar onHome={onMinimize} onRecent={onOpenRecent} />
      )}
    </div>
  );
}