import React, { useState, useEffect, useRef } from 'react';
import {
  BatteryCharging, CheckCircle2, Power, Loader2, AlertTriangle,
  Zap, ZapOff, Wrench, Smartphone, Terminal as TerminalIcon, Feather,
  ChevronRight, HardDrive, Monitor,
} from 'lucide-react';
import { restoreSystemComponents } from '@/lib/systemFiles';
import { writeBootState } from '@/lib/bootState';
import { getDeviceSystemKeys, markSystemInstalled } from '@/lib/installedVariant';
import { isMobileDevice } from '@/lib/deviceDetect';
import BiosBootMenu from '@/components/os/mobile/BiosBootMenu';
import BiosTildeButton from '@/components/os/mobile/BiosTildeButton';

// Shown when E:\ (the local disk / boot device) is missing. The device
// cannot start. The charger is the installation media: when it's connected
// the installer is detected and the user can choose to install or repair.
// Disconnecting the charger at any moment aborts back to the error.
//
// Phases:
//   'error'   — minimal BIOS-style "boot device could not be found"
//   'choose'  — "Install or repair EggetSystem?"
//   'version' — pick a variant to install (Lite / Mobile OS 1.0 / Terminal)
//   'setup'   — multi-step installer (or repair)
//   'done'    — restart into the chosen variant
//
// Charger state is read from the Battery API where available; browsers
// without it get a manual connect/disconnect fallback.

const VARIANT_KEY = 'eos_installed_variant';

const VARIANTS = {
  lite: {
    label: 'Lite',
    desc: 'Lightweight build for low-power devices',
    icon: Feather,
    color: 'from-emerald-500 to-green-600',
    url: '/LiteOS',
  },
  mobile: {
    label: 'Mobile OS 1.0',
    desc: 'Full touch-friendly mobile experience',
    icon: Smartphone,
    color: 'from-indigo-500 to-purple-600',
    url: '/MobileOS',
  },
  terminal: {
    label: 'Terminal',
    desc: 'Terminal version of the OS',
    icon: TerminalIcon,
    color: 'from-slate-500 to-gray-700',
    url: '/StartupTerminalMobile',
  },
  // The PC system — computers install PC + Terminal instead of the phone builds.
  desktop: {
    label: 'PC',
    desc: 'Full desktop experience with windows, taskbar, and apps',
    icon: Monitor,
    color: 'from-blue-500 to-indigo-600',
    url: '/Desktop100010101110',
  },
};

const INSTALL_STEPS = [
  { id: 'prepare', label: 'Preparing installation' },
  { id: 'check', label: 'Checking system requirements' },
  { id: 'copy', label: 'Copying system files' },
  { id: 'install', label: 'Installing system components' },
  { id: 'configure', label: 'Configuring EggetSystem' },
  { id: 'finalize', label: 'Finalizing installation' },
];

const REPAIR_STEPS = [
  { id: 'scan', label: 'Scanning system files' },
  { id: 'verify', label: 'Verifying integrity' },
  { id: 'repair', label: 'Repairing system files' },
  { id: 'restore', label: 'Restoring components' },
  { id: 'configure', label: 'Reconfiguring system' },
  { id: 'finalize', label: 'Finalizing repair' },
];

export default function BootDeviceNotFoundScreen({ initialPhase = 'error' }) {
  // Which systems this device can install: PC + Terminal on a computer,
  // Lite + Mobile OS 1.0 + Terminal on a phone.
  const isMobile = isMobileDevice();
  const deviceSystemKeys = getDeviceSystemKeys(isMobile);
  // Terminal ships as a phone build and a computer build — reboot into the one
  // that matches this device.
  const variantUrl = (key) => (key === 'terminal' && !isMobile ? '/StartupTerminal' : VARIANTS[key]?.url);
  const [phase, setPhase] = useState(initialPhase);
  const [mode, setMode] = useState(null); // 'install' | 'repair'
  const [variant, setVariant] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [batterySupported, setBatterySupported] = useState(true);
  const [abortFlash, setAbortFlash] = useState(false);
  // The BIOS is a pre-boot environment: from here it is reachable with the ~
  // key, or by tapping the on-screen ~ on a device without a keyboard. A saved
  // custom OS can be booted from it without installing anything.
  const [showBios, setShowBios] = useState(false);

  const progressTimerRef = useRef(null);
  const advanceTimerRef = useRef(null);

  const steps = mode === 'repair' ? REPAIR_STEPS : INSTALL_STEPS;

  // Request browser fullscreen on the first user interaction. The Fullscreen
  // API requires a user gesture, so we can't enter it on mount; the moment the
  // user touches the screen we go immersive (hides the Android status + nav
  // bars) to keep the OS simulation realistic.
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {}
    };
    const onFirstInteraction = () => {
      enterFullscreen();
      window.removeEventListener('pointerdown', onFirstInteraction);
    };
    window.addEventListener('pointerdown', onFirstInteraction);
    return () => window.removeEventListener('pointerdown', onFirstInteraction);
  }, []);

  // Press ~ (or tap the on-screen ~) at any point in the installer to enter the
  // BIOS boot menu.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '`' || e.key === '~' || e.code === 'Backquote') {
        e.preventDefault();
        setShowBios(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- Charger detection via the Battery API -----------------------------
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.getBattery) {
      setBatterySupported(false);
      return;
    }
    let battery;
    let mounted = true;
    navigator.getBattery().then((b) => {
      if (!mounted) return;
      battery = b;
      setIsCharging(b.charging);
      const onChargingChange = () => setIsCharging(b.charging);
      b.addEventListener('chargingchange', onChargingChange);
      b._eggsysCleanup = () => b.removeEventListener('chargingchange', onChargingChange);
    });
    return () => {
      mounted = false;
      if (battery && battery._eggsysCleanup) battery._eggsysCleanup();
    };
  }, []);

  const abort = () => {
    setPhase('error');
    setMode(null);
    setVariant(null);
    setStepIndex(0);
    setStepProgress(0);
    setAbortFlash(true);
    setTimeout(() => setAbortFlash(false), 700);
  };

  // --- Error → choose: installation media detected -----------------------
  useEffect(() => {
    if (phase === 'error' && isCharging) {
      setPhase('choose');
    }
  }, [phase, isCharging]);

  // --- Abort to error if charger disconnects (real battery only) ----------
  useEffect(() => {
    if (!batterySupported) return;
    if (['choose', 'version', 'setup'].includes(phase) && !isCharging) {
      abort();
    }
  }, [phase, isCharging, batterySupported]);

  // --- Drive the current step's progress bar -----------------------------
  useEffect(() => {
    if (phase !== 'setup') return;
    setStepProgress(0);
    progressTimerRef.current = setInterval(() => {
      setStepProgress((p) => {
        if (p >= 100) { clearInterval(progressTimerRef.current); return 100; }
        return p + Math.random() * 7;
      });
    }, 130);
    return () => clearInterval(progressTimerRef.current);
  }, [phase, stepIndex]);

  // --- Advance to the next step, or finish --------------------------------
  useEffect(() => {
    if (phase !== 'setup' || stepProgress < 100) return;
    if (stepIndex >= steps.length - 1) {
      let cancelled = false;
      (async () => {
        await restoreSystemComponents();
        // Record the system as installed: the next boot proceeds normally
        // instead of returning to this error screen, and Select OS lists it.
        if (variant) markSystemInstalled(variant);
        if (!cancelled) setPhase('done');
      })();
      return () => { cancelled = true; };
    }
    advanceTimerRef.current = setTimeout(() => {
      setStepIndex((i) => i + 1);
    }, 450);
    return () => clearTimeout(advanceTimerRef.current);
  }, [phase, stepProgress, stepIndex, variant, steps]);

  const handleReboot = () => {
    writeBootState('0');
    const v = variant || localStorage.getItem(VARIANT_KEY) || (isMobile ? 'mobile' : 'desktop');
    window.location.href = variantUrl(v) || VARIANTS.mobile.url;
  };

  const startInstall = (v) => {
    setMode('install');
    setVariant(v);
    setStepIndex(0);
    setStepProgress(0);
    setPhase('setup');
  };

  const startRepair = () => {
    setMode('repair');
    setVariant(localStorage.getItem(VARIANT_KEY) || (isMobile ? 'mobile' : 'desktop'));
    setStepIndex(0);
    setStepProgress(0);
    setPhase('setup');
  };

  // Manual fallback (no Battery API)
  const handleSimulateConnect = () => setIsCharging(true);
  const handleSimulateDisconnect = () => {
    setIsCharging(false);
    if (['choose', 'version', 'setup'].includes(phase)) abort();
  };

  const ChargerBadge = () => (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-400/30">
      <BatteryCharging className="w-4 h-4 text-green-400" />
      <span className="text-green-300 text-[11px] font-medium">Charger connected</span>
    </div>
  );

  // Opening the BIOS pauses the installer and hands the screen to the boot
  // menu; continuing returns here. Booting an OS clears the "no boot device"
  // state and starts this device's system.
  if (showBios) {
    return (
      <BiosBootMenu
        autoOpen
        onContinue={() => setShowBios(false)}
        onBoot={() => {
          writeBootState('0');
          window.location.href = isMobile ? '/MobileOS' : '/Desktop100010101110';
        }}
      />
    );
  }

  const tildeButton = <BiosTildeButton onOpen={() => setShowBios(true)} />;

  // ===== Error / "boot device could not be found" =========================
  if (phase === 'error') {
    return (
      <div className="h-screen w-screen bg-black text-gray-400 font-mono flex flex-col items-center justify-center px-6 select-none">
        <div className={`transition-opacity ${abortFlash ? 'opacity-40' : 'opacity-100'}`}>
          <p className="text-sm tracking-wide">Boot device could not be found.</p>
          <p className="text-sm tracking-wide mt-1 opacity-0 animate-pulse">_</p>
        </div>
        {!batterySupported && !isCharging && (
          <button
            onClick={handleSimulateConnect}
            className="mt-10 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 text-xs transition-colors"
          >
            <Zap className="w-3.5 h-3.5" /> Connect charger
          </button>
        )}
        <div className="fixed bottom-5 right-5 z-20">{tildeButton}</div>
      </div>
    );
  }

  // ===== Choose: Install or Repair =======================================
  if (phase === 'choose') {
    return (
      <div className="h-screen w-screen bg-black text-white flex flex-col px-6 py-10 select-none">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2 text-white/80">
            <HardDrive className="w-5 h-5" />
            <span className="text-sm font-medium">EggetSystem Installer</span>
          </div>
          <ChargerBadge />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-lg font-semibold mb-2">Install or repair EggetSystem?</p>
          <p className="text-white/40 text-xs mb-10 text-center max-w-xs">
            Installation media detected. Choose an option to continue.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => setPhase('version')}
              className="flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Install</p>
                <p className="text-white/40 text-xs">Set up a fresh copy of EggetSystem</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
            <button
              onClick={startRepair}
              className="flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Repair</p>
                <p className="text-white/40 text-xs">Fix your existing EggetSystem installation</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
          </div>
        </div>

        {!batterySupported && (
          <button
            onClick={handleSimulateDisconnect}
            className="mt-6 self-center flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 text-xs transition-colors"
          >
            <ZapOff className="w-3.5 h-3.5" /> Simulate disconnect
          </button>
        )}
        <div className="fixed bottom-5 right-5 z-20">{tildeButton}</div>
      </div>
    );
  }

  // ===== Version selection (Install path) =================================
  if (phase === 'version') {
    return (
      <div className="h-screen w-screen bg-black text-white flex flex-col px-6 py-10 select-none">
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => setPhase('choose')}
            className="text-white/50 text-xs hover:text-white/80 transition-colors"
          >
            ‹ Back
          </button>
          <ChargerBadge />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-lg font-semibold mb-2">Select version to install</p>
          <p className="text-white/40 text-xs mb-10 text-center max-w-xs">
            Choose which edition of EggetSystem to install on this device.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {Object.entries(VARIANTS).filter(([key]) => deviceSystemKeys.includes(key)).map(([key, v]) => (
              <button
                key={key}
                onClick={() => startInstall(key)}
                className="flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${v.color} flex items-center justify-center shrink-0`}>
                  <v.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{v.label}</p>
                  <p className="text-white/40 text-xs">{v.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </button>
            ))}
          </div>
        </div>

        {!batterySupported && (
          <button
            onClick={handleSimulateDisconnect}
            className="mt-6 self-center flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 text-xs transition-colors"
          >
            <ZapOff className="w-3.5 h-3.5" /> Simulate disconnect
          </button>
        )}
        <div className="fixed bottom-5 right-5 z-20">{tildeButton}</div>
      </div>
    );
  }

  // ===== Setup / multi-step installer =====================================
  if (phase === 'setup') {
    const variantLabel = VARIANTS[variant]?.label || 'EggetSystem';
    return (
      <div className="h-screen w-screen bg-black text-white flex flex-col px-6 py-10 select-none">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-white/90 text-base font-semibold">
              {mode === 'repair' ? 'Repairing EggetSystem' : `Installing ${variantLabel}`}
            </p>
            <p className="text-white/40 text-xs mt-0.5">
              {mode === 'repair' ? 'Repairing system files on the local disk' : 'Reinstalling system files to the local disk'}
            </p>
          </div>
          <ChargerBadge />
        </div>

        <div className="flex items-start gap-2 mb-6 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-400/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-200/80 text-[11px] leading-relaxed">
            Do not disconnect your charger. Removing the installation media will abort the {mode === 'repair' ? 'repair' : 'installation'} and you will have to start over.
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-3 overflow-auto">
          {steps.map((step, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : current ? (
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${done ? 'text-white/50' : current ? 'text-white' : 'text-white/30'}`}>
                    {step.label}
                  </p>
                  {current && (
                    <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all"
                        style={{ width: `${Math.min(stepProgress, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                {current && (
                  <span className="text-white/40 text-xs tabular-nums">{Math.min(Math.floor(stepProgress), 100)}%</span>
                )}
              </div>
            );
          })}
        </div>

        {!batterySupported && (
          <button
            onClick={handleSimulateDisconnect}
            className="mt-6 self-center flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 text-xs transition-colors"
          >
            <ZapOff className="w-3.5 h-3.5" /> Simulate disconnect
          </button>
        )}
        <div className="fixed bottom-5 right-5 z-20">{tildeButton}</div>
      </div>
    );
  }

  // ===== Done =============================================================
  const installedVariant = VARIANTS[variant] || VARIANTS.mobile;
  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center px-8 select-none">
      <CheckCircle2 className="w-16 h-16 text-green-400 mb-6" />
      <p className="text-lg font-semibold mb-1">
        {mode === 'repair' ? 'Repair complete' : `${installedVariant.label} installed`}
      </p>
      <p className="text-white/50 text-xs mb-8 text-center max-w-xs">
        EggetSystem was {mode === 'repair' ? 'repaired' : 'installed'} successfully. Your device will now restart.
      </p>
      <button
        onClick={handleReboot}
        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
      >
        <Power className="w-4 h-4" /> Restart now
      </button>
      <div className="fixed bottom-5 right-5 z-20">{tildeButton}</div>
    </div>
  );
}