import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wifi, WifiOff, Signal, SignalZero, Flashlight, FlashlightOff, Bell, MessageCircle, Clock, Headphones, Maximize2, Minimize2, Settings2, Wrench, Shield, Monitor, PhoneCall, Download, Baby, Moon, Sun } from 'lucide-react';
import { toast } from '@/lib/devToast';
import NotificationCenter from './NotificationCenter';
import MusicControllerCard from './MusicControllerCard';
import SystemOptionsModal from './SystemOptionsModal';
import { useEggSysOSDisabled } from '@/hooks/useEggSysOSDisabled';
import { AlertTriangle } from 'lucide-react';

export default function ControlCenter({ isOpen, onClose, wifi, mobileData, darkMode, onToggleDarkMode, onToggleWifi, onToggleMobileData, notifications, onMarkRead, onDelete, onInstallUpdate, onTestText, onTestNotification, onScheduleText, testNotifCountdown, isOwner, accountMode, onToggleAccountMode, onOpenMusic, onOpenAdmin, isAdmin, onLock, onLogout, onVRHome, onRecovery, onPowerOff, onRestart, betaMode, onOpenPCSandbox, onCallYourself, kidsMode, onEnableKidsMode, onOpenKidsControls }) {
  const eggSysOSDisabled = useEggSysOSDisabled();
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [showTestTools, setShowTestTools] = useState(false);
  const [showSystemOptions, setShowSystemOptions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  const [installPrompt, setInstallPrompt] = useState(() => window.deferredPrompt || null);
  const [isInstalledPWA, setIsInstalledPWA] = useState(() => {
    // Chrome/Edge/Android: display-mode: standalone. iOS Safari: navigator.standalone.
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    if (window.navigator?.standalone) return true;
    return false;
  });
  const streamRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Capture Chrome's install prompt; hide the button when already an installed PWA.
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIsInstalledPWA(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    // Pick up a prompt that was captured globally before this component mounted.
    const onInstallReady = () => setInstallPrompt(window.deferredPrompt);
    window.addEventListener('eggsys-install-ready', onInstallReady);
    if (window.deferredPrompt) setInstallPrompt(window.deferredPrompt);
    // React to display-mode changes (e.g. user adds to home screen mid-session)
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayModeChange = (e) => setIsInstalledPWA(e.matches);
    mq?.addEventListener?.('change', onDisplayModeChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('eggsys-install-ready', onInstallReady);
      mq?.removeEventListener?.('change', onDisplayModeChange);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') toast.success('EggetSystem installed');
      setInstallPrompt(null);
      return;
    }
    // No native prompt (iOS Safari, iframe, etc.) — show manual instructions.
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast.info(
      isIOS
        ? 'Tap Share → Add to Home Screen to install EggetSystem.'
        : 'Use your browser menu → Install app / Add to Home Screen.'
    );
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Fullscreen not supported on this device');
    }
  };

  // Clean up the torch stream when the component unmounts
  useEffect(() => {
    return () => {
      try { trackRef.current?.stop(); } catch {}
      try { streamRef.current?.getTracks?.().forEach(t => t.stop()); } catch {}
    };
  }, []);

  const toggleFlashlight = async () => {
    if (flashlightOn) {
      try { await trackRef.current?.applyConstraints({ advanced: [{ torch: false }] }); } catch {}
      try { trackRef.current?.stop(); } catch {}
      try { streamRef.current?.getTracks?.().forEach(t => t.stop()); } catch {}
      streamRef.current = null;
      trackRef.current = null;
      setFlashlightOn(false);
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Flashlight not supported on this device');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: 'environment' } }
      });
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (!capabilities?.torch) {
        track.stop();
        toast.error('Flashlight not supported on this device');
        return;
      }
      await track.applyConstraints({ advanced: [{ torch: true }] });
      streamRef.current = stream;
      trackRef.current = track;
      setFlashlightOn(true);
    } catch (e) {
      toast.error('Could not access flashlight');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-md flex items-start justify-center pt-16 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="w-full max-w-sm max-h-[80vh] overflow-auto bg-white/10 backdrop-blur-2xl rounded-3xl p-5 ring-1 ring-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">Control Center</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/15 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {eggSysOSDisabled ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-white font-semibold text-sm">Error 404</p>
                <p className="text-white/70 text-xs">Could not find "Control Center"</p>
                <p className="text-white/50 text-xs mt-2">Re-enable EggSys OS to restore access.</p>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onToggleWifi}
                className={`flex flex-col items-start gap-3 p-4 rounded-2xl transition-colors ${
                  wifi ? 'bg-blue-500' : 'bg-white/15'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  {wifi ? <Wifi className="w-5 h-5 text-white" /> : <WifiOff className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Wi-Fi</p>
                  <p className="text-white/70 text-xs">{wifi ? 'On' : 'Off'}</p>
                </div>
              </button>

              <button
                onClick={onToggleMobileData}
                className={`flex flex-col items-start gap-3 p-4 rounded-2xl transition-colors ${
                  mobileData ? 'bg-green-500' : 'bg-white/15'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  {mobileData ? <Signal className="w-5 h-5 text-white" /> : <SignalZero className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Mobile Data</p>
                  <p className="text-white/70 text-xs">{mobileData ? 'On' : 'Off'}</p>
                </div>
              </button>

              <button
                onClick={toggleFlashlight}
                className={`flex flex-col items-start gap-3 p-4 rounded-2xl transition-colors ${
                  flashlightOn ? 'bg-yellow-500' : 'bg-white/15'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  {flashlightOn ? <Flashlight className="w-5 h-5 text-white" /> : <FlashlightOff className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Flashlight</p>
                  <p className="text-white/70 text-xs">{flashlightOn ? 'On' : 'Off'}</p>
                </div>
              </button>

              <button
                onClick={onToggleDarkMode}
                className={`flex flex-col items-start gap-3 p-4 rounded-2xl transition-colors ${
                  darkMode ? 'bg-indigo-600' : 'bg-white/15'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  {darkMode ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Dark Mode</p>
                  <p className="text-white/70 text-xs">{darkMode ? 'On' : 'Off'}</p>
                </div>
              </button>

              <button
                onClick={toggleFullscreen}
                className={`flex flex-col items-start gap-3 p-4 rounded-2xl transition-colors ${
                  isFullscreen ? 'bg-blue-500' : 'bg-white/15 hover:bg-white/25'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  {isFullscreen ? <Minimize2 className="w-5 h-5 text-white" /> : <Maximize2 className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Full Screen</p>
                  <p className="text-white/70 text-xs">{isFullscreen ? 'On' : 'Off'}</p>
                </div>
              </button>

              {isAdmin && !kidsMode && (
                <button
                  onClick={onOpenAdmin}
                  className="flex flex-col items-start gap-3 p-4 rounded-2xl transition-colors bg-white/15 hover:bg-white/25"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Admin</p>
                    <p className="text-white/70 text-xs">Panel</p>
                  </div>
                </button>
              )}

              <button
                onClick={() => (kidsMode ? onOpenKidsControls?.() : onEnableKidsMode?.())}
                className={`flex flex-col items-start gap-3 p-4 rounded-2xl transition-colors ${
                  kidsMode ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-white/15 hover:bg-white/25'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Baby className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Kids Mode</p>
                  <p className="text-white/70 text-xs">{kidsMode ? 'On — tap to manage' : 'Off'}</p>
                </div>
              </button>

              <button
                onClick={() => setShowSystemOptions(true)}
                className="flex flex-col items-start gap-3 p-4 rounded-2xl transition-colors bg-white/15 hover:bg-white/25"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">System Options</p>
                  <p className="text-white/70 text-xs">Power, lock & more</p>
                </div>
              </button>

              {!isInstalledPWA && (
                <button
                  onClick={handleInstall}
                  className="flex flex-col items-start gap-3 p-4 rounded-2xl transition-colors bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Install App</p>
                    <p className="text-white/70 text-xs">Add to home screen</p>
                  </div>
                </button>
              )}

              {isOwner && !kidsMode && (
                <button
                  onClick={() => setShowTestTools(true)}
                  className="flex flex-col items-start gap-3 p-4 rounded-2xl transition-colors bg-white/15 hover:bg-white/25"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Owner Tools</p>
                    <p className="text-white/70 text-xs">Support & tests</p>
                  </div>
                </button>
              )}
            </div>

            <MusicControllerCard onOpenMusic={onOpenMusic} onClose={onClose} />
            </>
            )}

            <div className="mt-5 pt-4 border-t border-white/15">
              <h3 className="text-white font-semibold text-sm mb-3">Notifications</h3>
              <NotificationCenter
                notifications={notifications}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
                onInstallUpdate={onInstallUpdate}
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {isOpen && (
        <SystemOptionsModal
          isOpen={showSystemOptions}
          onClose={() => setShowSystemOptions(false)}
          onLock={onLock}
          onLogout={onLogout}
          onVRHome={onVRHome}
          onPowerOff={onPowerOff}
          onRestart={onRestart}
          betaMode={betaMode}
        />
      )}

      {isOpen && isOwner && (
        <AnimatePresence>
          {showTestTools && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[310] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowTestTools(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">Owner Tools</h3>
                  <button onClick={() => setShowTestTools(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <button
                  onClick={onToggleAccountMode}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-colors mb-2 ${accountMode === 'support' ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-slate-50 hover:bg-slate-100'}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Headphones className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-sm text-slate-800">Support Account</span>
                    <p className="text-xs text-slate-500">{accountMode === 'support' ? 'Active' : 'Personal'}</p>
                  </div>
                </button>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">PC Testing</p>
                  <button
                    onClick={() => { setShowTestTools(false); onOpenPCSandbox?.(); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors mb-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                      <Monitor className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-medium text-sm text-slate-800">PC Sandbox</span>
                      <p className="text-xs text-slate-500">Test desktop in landscape</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowTestTools(false); onCallYourself?.(); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors mb-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <PhoneCall className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-medium text-sm text-slate-800">Call Yourself</span>
                      <p className="text-xs text-slate-500">Ring on mobile, answer in PC</p>
                    </div>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">Notification Tests</p>
                  <div className="space-y-2">
                  <button
                    onClick={() => { setShowTestTools(false); onTestText(); }}
                    disabled={testNotifCountdown !== null}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-60"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-sm text-slate-800">
                      {testNotifCountdown !== null ? `${testNotifCountdown}s` : 'Test the text'}
                    </span>
                  </button>
                  <button
                    onClick={() => { setShowTestTools(false); onTestNotification(); }}
                    disabled={testNotifCountdown !== null}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-60"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-sm text-slate-800">
                      {testNotifCountdown !== null ? `${testNotifCountdown}s` : 'Test the notification'}
                    </span>
                  </button>
                  <button
                    onClick={() => { setShowTestTools(false); onScheduleText(); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-sm text-slate-800">Schedule a text</span>
                  </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </AnimatePresence>
  );
}