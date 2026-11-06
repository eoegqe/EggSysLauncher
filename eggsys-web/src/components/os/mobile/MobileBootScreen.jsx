import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MobileRecovery from '@/components/os/mobile/MobileRecovery';
import BiosBootMenu from '@/components/os/mobile/BiosBootMenu';
import KernelPanicScreen from '@/components/os/KernelPanicScreen';
import BootDeviceNotFoundScreen from '@/components/os/mobile/BootDeviceNotFoundScreen';
import {
  readBootState, writeBootState, isErrorState, isBootStartedNotFinished,
  isFullyBootedUnlocked, isBootFinishedNotUnlocked, bootStartedState, bootFinishedState,
  isBootDeviceNotFound, hasBootDevice, markOsInstalled,
} from '@/lib/bootState';

const LOGO_URL = "https://media.base44.com/images/public/6946b759fb67abb9152e7314/c697387e9_file_000000006d3481f5be81064990edc01f.png";

// Android-style mobile-only startup sequence:
//  0–3s  : logo only
//  3–6s  : "Powered by Theegget Creations" appears at the bottom
//  6s+   : if an activated eSIM is present, show an "EggSys wireless"
//          carrier splash briefly before completing; otherwise complete
export default function MobileBootScreen({ onBootComplete }) {
  const { data: user } = useQuery({
    queryKey: ['boot-user-mobile'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  const [showLogo, setShowLogo] = useState(false);
  const [showPowered, setShowPowered] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showBios, setShowBios] = useState(false);
  const tapCountRef = React.useRef(0);
  const tapResetTimerRef = React.useRef(null);
  const timersRef = React.useRef([]);

  // Restart path: when the Restart button triggered this boot, skip the logo
  // sequence and show only darkness while re-entering fullscreen, then hand
  // off after 2 seconds.
  const [isRestarting, setIsRestarting] = useState(() => sessionStorage.getItem('eos_restarting') === 'true');
  // Update restart: set by the Update Manager's "Restart Now". After the
  // normal restart tap-to-boot, the boot screen shows a "finishing update"
  // splash before starting up. A "revert" restart instead shows a
  // "reverting update" splash.
  const [isUpdateRestart] = useState(() => sessionStorage.getItem('eos_update_restart') === 'true');
  const [isUpdateRevert] = useState(() => sessionStorage.getItem('eos_update_revert') === 'true');
  const [isRevertAll] = useState(() => sessionStorage.getItem('eos_update_revert_all') === 'true');
  const [updateVersion] = useState(() =>
    sessionStorage.getItem('eos_update_restart_version') ||
    sessionStorage.getItem('eos_update_revert_version') ||
    ''
  );
  // splashMode: null | 'finish' | 'revert' | 'revert_all'
  const [splashMode, setSplashMode] = useState(null);

  // Boot state tracking via localStorage "Booted":
  //   "0"/missing → normal boot, "1" → boot started, "2" → boot finished.
  // On load: "1" means the previous boot never finished → boot failed →
  // recovery. "2" means already booted → skip the boot animation.
  // Restart/update flows always boot fresh (ignore the stored value).
  const BOOT_KEY = 'Booted';
  const [bootMode] = useState(() => {
    const restarting = sessionStorage.getItem('eos_restarting') === 'true';
    const updateRestart = sessionStorage.getItem('eos_update_restart') === 'true';
    const updateRevert = sessionStorage.getItem('eos_update_revert') === 'true';
    if (restarting || updateRestart || updateRevert) return 'normal';
    const v = readBootState();
    // E:\ (boot device) deleted → reinstall Download screen.
    if (isBootDeviceNotFound(v)) return 'boot_device_not_found';
    // 4–20 are error states (4 = kernel panic): re-show the panic screen.
    if (isErrorState(v)) return 'kernel_error';
    // "1" / "21-1" = boot started but never finished → boot failed → recovery.
    if (isBootStartedNotFinished(v)) return 'failed';
    // "2"/"3" (normal) and "21-2"/"21-4" (full administrator) skip the boot
    // animation. "3"/"21-4" additionally let MobileOS skip the lock screen.
    if (isFullyBootedUnlocked(v) || isBootFinishedNotUnlocked(v)) return 'skip';
    // Fresh device with no installed OS (state "0" and nothing bootable on it):
    // the device is not bootable — show the "boot device could not be found"
    // screen until the charger install flow completes. A saved custom OS counts
    // as a boot device, so the BIOS can start it instead.
    if (!hasBootDevice()) return 'boot_device_not_found';
    return 'normal';
  });

  // A failed boot enters recovery; reset the flag so a reboot from recovery
  // attempts a fresh boot instead of looping back into recovery.
  useEffect(() => {
    if (bootMode === 'failed') {
      writeBootState('0');
    }
  }, [bootMode]);

  // Already booted: skip the animation and hand off immediately. Also mark
  // the device as installed (bootstrap for devices that were set up before
  // the install marker existed).
  useEffect(() => {
    if (bootMode === 'skip') {
      markOsInstalled();
      onBootComplete();
    }
  }, [bootMode, onBootComplete]);

  // Restart path: black screen waits for a tap. The tap requests fullscreen
  // (valid user gesture) and starts a 2s timer; when the timer fires the flag
  // is cleared and the normal boot sequence begins (or the update splash first
  // when this restart came from an update/revert).
  const handleRestartTap = () => {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
    setTimeout(() => {
      sessionStorage.removeItem('eos_restarting');
      setIsRestarting(false);
      if (isUpdateRevert) setSplashMode(isRevertAll ? 'revert_all' : 'revert');
      else if (isUpdateRestart) setSplashMode('finish');
    }, 2000);
  };

  // Update splash: hold for a few seconds, then clear the flags and start up.
  useEffect(() => {
    if (!splashMode) return;
    const t = setTimeout(() => {
      sessionStorage.removeItem('eos_update_restart');
      sessionStorage.removeItem('eos_update_restart_version');
      sessionStorage.removeItem('eos_update_revert');
      sessionStorage.removeItem('eos_update_revert_version');
      sessionStorage.removeItem('eos_update_revert_all');
      setSplashMode(null);
    }, 3500);
    return () => clearTimeout(t);
  }, [splashMode]);

  useEffect(() => {
    if (isRestarting || splashMode || bootMode !== 'normal') return;
    // Boot has started — if we crash before finishing, the next load sees
    // "1" (normal) or "21-1" (full administrator mode when this device is owned).
    writeBootState(bootStartedState());
    const timers = [];
    timers.push(setTimeout(() => setShowLogo(true), 150));
    timers.push(setTimeout(() => setShowPowered(true), 3000));

    // Everything disappears, then fade to white, then hand off to the lock screen
    const startFade = () => {
      setShowLogo(false);
      setShowPowered(false);
      setFadingOut(true);
      setTimeout(() => {
        // Boot finished successfully. "2" (normal) or "21-2" (admin) — the
        // lock screen still shows; unlock advances to "3"/"21-4".
        writeBootState(bootFinishedState());
        markOsInstalled();
        onBootComplete();
      }, 700);
    };

    timers.push(setTimeout(startFade, 6000));
    timersRef.current = timers;
    return () => timers.forEach(clearTimeout);
  }, [onBootComplete, isRestarting, splashMode, bootMode]);

  // Tap the screen 5 times during startup to enter recovery mode
  const handleTap = () => {
    if (showRecovery) return;
    tapCountRef.current += 1;
    if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
    tapResetTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 1500);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      timersRef.current.forEach(clearTimeout);
      // Entering recovery counts as a fresh boot attempt — reset the boot
      // state so a reboot from recovery runs the normal sequence.
      writeBootState('0');
      setShowRecovery(true);
    }
  };

  const handleRecoveryExit = () => {
    setShowRecovery(false);
    onBootComplete();
  };

  const handleOpenBios = () => setShowBios(true);

  if (showBios) {
    return (
      <BiosBootMenu
        autoOpen
        onContinue={() => setShowBios(false)}
        onBoot={() => window.location.reload()}
      />
    );
  }

  if (isRestarting) {
    return (
      <div
        className="h-screen w-screen bg-black flex items-center justify-center select-none"
        onClick={handleRestartTap}
      >
        <span className="text-white/30 text-sm tracking-widest uppercase">Tap to boot</span>
      </div>
    );
  }

  // Boot device not found (E:\ deleted): the only recovery is the reinstall
  // Download screen reached by "plugging in" the device.
  if (bootMode === 'boot_device_not_found') {
    return <BootDeviceNotFoundScreen />;
  }

  // Kernel error state (Booted flag 4+): re-show the panic screen. The
  // panic screen's restart clears the flag via a fresh boot.
  if (bootMode === 'kernel_error') {
    return <KernelPanicScreen />;
  }

  if (splashMode) {
    const reverting = splashMode === 'revert' || splashMode === 'revert_all';
    const revertingAll = splashMode === 'revert_all';
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center select-none">
        <div className={`w-16 h-16 border-4 border-white/20 rounded-full animate-spin mb-6 ${reverting ? 'border-t-amber-400' : 'border-t-indigo-400'}`} />
        <p className="text-white text-lg font-semibold">
          {revertingAll ? 'Reverting all updates' : reverting ? 'Reverting update' : 'Finishing update'}
        </p>
        {updateVersion && (
          <p className="text-white/50 text-sm mt-1">EggetSystem {updateVersion}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen relative overflow-hidden bg-black flex items-center justify-center select-none"
      onClick={handleTap}
    >
      {/* Logo */}
      <motion.div
        className="relative flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={showLogo ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="w-64 h-28 rounded-2xl bg-black flex items-center justify-center">
          <img
            src={LOGO_URL}
            alt="EggetSystem"
            className="w-56 h-24 object-contain drop-shadow-[0_0_16px_rgba(129,140,248,0.5)]"
          />
        </div>
      </motion.div>

      {/* Bottom text */}
      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-2 px-6">
        <AnimatePresence>
          {showPowered && (
            <motion.p
              key="powered"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-white/60 text-xs tracking-[0.2em] uppercase"
            >
              Powered by Theegget Creations
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Fade to white before handing off to the lock screen */}
      <AnimatePresence>
        {fadingOut && (
          <motion.div
            className="absolute inset-0 z-20 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {showRecovery && (
        <div className="fixed inset-0 z-[100]">
          <MobileRecovery onExit={handleRecoveryExit} onOpenBios={handleOpenBios} />
        </div>
      )}

      {bootMode === 'failed' && (
        <div className="fixed inset-0 z-[100]">
          <MobileRecovery onExit={handleRecoveryExit} reason="Boot failed" onOpenBios={handleOpenBios} />
        </div>
      )}
    </div>
  );
}