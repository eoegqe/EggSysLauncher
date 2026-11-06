import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Play, X, Monitor, ChevronRight, ChevronUp, ChevronDown, Loader2, Settings as SettingsIcon, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { parseOSFile, scanOSForThreats } from '@/lib/osFileFormat';
import {
  getCustomOSes, saveCustomOS, deleteCustomOS, getActiveOSId, setActiveOSId,
  getBiosSettings, setBiosSettings, getBootOrder, setBootOrder,
} from '@/lib/customOSStorage';

// The EggSys BIOS boot menu. On startup a brief black screen appears — press
// ~ (or tap) to open the paused BIOS menu. From there you can add a custom OS
// via a .os file (saved to localStorage) and choose which OS to boot.
// The OS picker (boot manager) only shows once a second OS is installed.
export default function BiosBootMenu({ onContinue, onBoot, autoOpen = false }) {
  const [menuOpen, setMenuOpen] = useState(autoOpen);
  const [oses, setOses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState('menu'); // 'menu' | 'settings'
  const [biosSettings, setBiosSettingsState] = useState(() => getBiosSettings());
  const [bootOrder, setBootOrderState] = useState(() => getBootOrder());
  const [bootBlocked, setBootBlocked] = useState(null); // { osName, threats }
  const [bootConfirm, setBootConfirm] = useState(null); // { id, os } pending boot confirmation
  const fileInputRef = useRef(null);
  const autoTimer = useRef(null);
  const openedRef = useRef(false);

  const refresh = () => {
    setOses(getCustomOSes());
    setActiveId(getActiveOSId());
    setBootOrderState(getBootOrder());
  };

  const moveBoot = (idx, dir) => {
    const next = [...bootOrder];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setBootOrder(next);
    setBootOrderState(next);
  };

  // The OS that boots when pressing Continue (top of boot order).
  const defaultBootId = bootOrder[0] === 'eggsys' ? null : bootOrder[0];

  useEffect(() => {
    const list = getCustomOSes();
    setOses(list);
    setActiveId(getActiveOSId());
    // Opened directly (e.g. from recovery) or a second OS is installed.
    if (autoOpen || list.length >= 1) {
      openedRef.current = true;
      setMenuOpen(true);
    } else {
      // Otherwise auto-continue after a one-second window unless ~ is pressed.
      autoTimer.current = setTimeout(() => {
        if (!openedRef.current) onContinue();
      }, 1000);
    }
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [onContinue]);

  const openMenu = () => {
    if (openedRef.current) return;
    openedRef.current = true;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setMenuOpen(true);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '`' || e.key === '~' || e.code === 'Backquote') {
        e.preventDefault();
        openMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdding(true);
    setError('');
    try {
      const os = await parseOSFile(file);
      saveCustomOS(os);
      setActiveOSId(os.id);
      refresh();
    } catch (err) {
      setError(err.message || 'Failed to load .os file');
    } finally {
      setAdding(false);
      e.target.value = '';
    }
  };

  const boot = (id) => {
    // Default EggSys is always trusted — no warning.
    if (!id) {
      setActiveOSId(null);
      if (onBoot) onBoot();
      else onContinue();
      return;
    }
    const os = oses.find(o => o.id === id);
    if (biosSettings.secure_boot && os) {
      const threats = scanOSForThreats(os);
      if (threats.length) {
        setBootBlocked({ osName: os.name, threats });
        return;
      }
    }
    // BIOS security is a basic pre-boot check, not a full security system.
    // Warn the user before handing control to a custom OS — choose carefully.
    setBootConfirm({ id, os });
  };

  const confirmBoot = () => {
    const { id } = bootConfirm;
    setBootConfirm(null);
    setActiveOSId(id);
    if (onBoot) onBoot();
    else onContinue();
  };

  const removeOS = (id) => {
    deleteCustomOS(id);
    refresh();
  };

  // BIOS menu (paused)
  if (menuOpen) {
    // --- Secure Boot blocked a custom OS from booting ---
    if (bootBlocked) {
      return (
        <div className="fixed inset-0 bg-black text-green-400 font-mono z-[10000] flex flex-col">
          <div className="border-b border-green-500/30 px-5 py-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h1 className="text-lg font-bold tracking-widest text-red-400">SECURE BOOT</h1>
          </div>
          <div className="flex-1 overflow-auto p-5 space-y-4">
            <p className="text-red-300 text-sm">
              Booting <span className="font-bold">{bootBlocked.osName}</span> was blocked by Secure Boot.
            </p>
            <p className="text-green-600/70 text-xs uppercase tracking-wider">Threats detected</p>
            <ul className="space-y-1.5">
              {bootBlocked.threats.map((t, i) => (
                <li key={i} className="text-red-400/90 text-xs flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="text-green-700/50 text-[11px] pt-2">
              Disable Secure Boot in BIOS Settings to boot this OS anyway (not recommended).
            </p>
          </div>
          <div className="border-t border-green-500/30 px-5 py-3 flex justify-between items-center">
            <button
              onClick={() => setBootBlocked(null)}
              className="flex items-center gap-1 px-4 py-2 text-green-300 text-sm hover:text-green-200"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => {
                const next = setBiosSettings({ secure_boot: false });
                setBiosSettingsState(next);
                setBootBlocked(null);
              }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm"
            >
              Disable Secure Boot
            </button>
          </div>
        </div>
      );
    }

    // --- Boot confirmation warning ---
    if (bootConfirm) {
      return (
        <div className="fixed inset-0 bg-black text-green-400 font-mono z-[10000] flex flex-col">
          <div className="border-b border-green-500/30 px-5 py-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-yellow-400" />
            <h1 className="text-lg font-bold tracking-widest text-yellow-400">BOOT WARNING</h1>
          </div>
          <div className="flex-1 overflow-auto p-5 space-y-4">
            <p className="text-green-300 text-sm">
              Do you want to boot into <span className="font-bold">{bootConfirm.os?.name}</span>?
            </p>
            <p className="text-yellow-400/80 text-xs">
              Make sure you trust who gave you this OS file.
            </p>
          </div>
          <div className="border-t border-green-500/30 px-5 py-3 flex justify-between items-center">
            <button
              onClick={() => setBootConfirm(null)}
              className="flex items-center gap-1 px-4 py-2 text-green-300 text-sm hover:text-green-200"
            >
              <ArrowLeft className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={confirmBoot}
              className="flex items-center gap-1 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm"
            >
              Boot <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    // --- BIOS Settings ---
    if (view === 'settings') {
      return (
        <div className="fixed inset-0 bg-black text-green-400 font-mono z-[10000] flex flex-col">
          <div className="border-b border-green-500/30 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setView('menu')} className="text-green-500/60 hover:text-green-400">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <SettingsIcon className="w-5 h-5" />
              <h1 className="text-lg font-bold tracking-widest">BIOS SETTINGS</h1>
            </div>
            <button onClick={() => onContinue()} className="text-green-500/60 hover:text-green-400 text-sm">
              Esc to continue
            </button>
          </div>
          <div className="flex-1 overflow-auto p-5 space-y-6">
            <div className="border border-green-500/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {biosSettings.secure_boot
                    ? <ShieldCheck className="w-5 h-5 text-green-400 mt-0.5" />
                    : <ShieldAlert className="w-5 h-5 text-yellow-500/80 mt-0.5" />}
                  <div>
                    <p className="text-green-300 font-semibold">Secure Boot</p>
                    <p className="text-green-600/60 text-xs mt-1 leading-relaxed">
                      Scans custom OS files for dangerous code before booting. Recommended.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = setBiosSettings({ secure_boot: !biosSettings.secure_boot });
                    setBiosSettingsState(next);
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${biosSettings.secure_boot ? 'bg-green-500/80' : 'bg-green-500/20'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-black transition-transform ${biosSettings.secure_boot ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>

            <div className="border border-green-500/30 p-4">
              <p className="text-green-500/60 text-xs uppercase tracking-wider mb-3">Boot Order</p>
              <div className="space-y-2">
                {bootOrder.map((id, idx) => {
                  const isEgg = id === 'eggsys';
                  const os = isEgg ? null : oses.find(o => o.id === id);
                  const name = isEgg ? 'EggSys (Default OS)' : (os?.name || id);
                  return (
                    <div key={id} className="flex items-center gap-2 px-3 py-2 border border-green-500/20">
                      <span className="text-green-500/50 text-xs w-5">{idx + 1}.</span>
                      <span className="text-green-300 text-sm flex-1 truncate">{name}</span>
                      <button
                        onClick={() => moveBoot(idx, -1)}
                        disabled={idx === 0}
                        className="text-green-500/60 hover:text-green-400 disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveBoot(idx, 1)}
                        disabled={idx === bootOrder.length - 1}
                        className="text-green-500/60 hover:text-green-400 disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-green-700/50 text-[11px] mt-2">The first item boots when you press Continue.</p>
            </div>
          </div>
          <div className="border-t border-green-500/30 px-5 py-3 flex justify-between items-center">
            <p className="text-green-700/50 text-[11px]">Settings are saved to this device</p>
            <button
              onClick={() => setView('menu')}
              className="flex items-center gap-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to menu
            </button>
          </div>
        </div>
      );
    }

    // --- Main BIOS menu ---
    return (
      <div className="fixed inset-0 bg-black text-green-400 font-mono z-[10000] flex flex-col">
        <div className="border-b border-green-500/30 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            <h1 className="text-lg font-bold tracking-widest">EGGSYS BIOS</h1>
            {biosSettings.secure_boot && (
              <span className="flex items-center gap-1 text-green-500/70 text-[11px] ml-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Secure Boot
              </span>
            )}
          </div>
          <button onClick={() => onContinue()} className="text-green-500/60 hover:text-green-400 text-sm">
            Esc to continue
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-6">
          <div>
            <p className="text-green-500/60 text-xs uppercase tracking-wider mb-3">Boot Selection</p>
            <div className="space-y-2">
              {/* Default EggSys */}
              <button
                onClick={() => boot(null)}
                className="w-full flex items-center justify-between px-4 py-3 border border-green-500/30 hover:bg-green-500/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Play className="w-4 h-4 text-green-500/70" />
                  <div>
                    <p className="text-green-300 font-semibold">EggSys</p>
                    <p className="text-green-600/60 text-xs">Default OS</p>
                  </div>
                </div>
                {bootOrder[0] === 'eggsys' && <span className="text-green-500/50 text-xs">1st</span>}
              </button>

              {/* Custom OSes */}
              {oses.map((os) => (
                <div key={os.id} className="flex items-center border border-green-500/30 hover:bg-green-500/10 transition-colors">
                  <button onClick={() => boot(os.id)} className="flex-1 flex items-center gap-3 px-4 py-3 text-left">
                    <Play className="w-4 h-4 text-green-500/70" />
                    <div>
                      <p className="text-green-300 font-semibold flex items-center gap-2">
                        {os.name}
                        {os.carrier_locked && <span className="text-yellow-500/80 text-[10px]">LOCKED</span>}
                      </p>
                      <p className="text-green-600/60 text-xs">v{os.version} · {os.system_apps.length} apps · {os.system_services.length} services</p>
                    </div>
                  </button>
                  {activeId === os.id && <span className="text-green-500/50 text-xs pr-2">active</span>}
                  {bootOrder[0] === os.id && <span className="text-green-500/50 text-xs pr-2">1st</span>}
                  <button
                    onClick={() => removeOS(os.id)}
                    className="px-3 py-3 text-red-500/60 hover:text-red-400 border-l border-green-500/20"
                    title="Remove OS"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-green-500/60 text-xs uppercase tracking-wider mb-3">Configure</p>
            <button
              onClick={() => setView('settings')}
              className="flex items-center gap-3 px-4 py-3 border border-green-500/30 hover:bg-green-500/10 transition-colors w-full text-left"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="text-green-300">BIOS Settings</span>
              <span className="ml-auto text-green-500/40 text-xs flex items-center gap-2">
                {biosSettings.secure_boot ? (
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Secure Boot on</span>
                ) : (
                  <span className="text-yellow-500/70">Secure Boot off</span>
                )}
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          </div>

          <div>
            <p className="text-green-500/60 text-xs uppercase tracking-wider mb-3">Install</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={adding}
              className="flex items-center gap-3 px-4 py-3 border border-green-500/30 hover:bg-green-500/10 transition-colors w-full text-left disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span className="text-green-300">Add OS via .sys / .os file</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".sys,.os,.json,application/json,application/zip"
              className="hidden"
              onChange={handleFile}
            />
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            <p className="text-green-700/50 text-[11px] mt-2">
              The .os file is saved to this device's local storage and only loads its system apps/services when booted.
            </p>
          </div>
        </div>

        <div className="border-t border-green-500/30 px-5 py-3 flex justify-between items-center">
          <p className="text-green-700/50 text-[11px]">↑↓ select · Enter to boot · Del to remove</p>
          <button
            onClick={() => boot(defaultBootId)}
            className="flex items-center gap-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Black screen — the startup window where you press ~ (or tap) for BIOS
  return (
    <div
      className="fixed inset-0 bg-black z-[10000] flex items-center justify-center"
      onClick={openMenu}
    >
      <p className="text-white/25 text-sm animate-pulse select-none">Press ~ for BIOS</p>
    </div>
  );
}