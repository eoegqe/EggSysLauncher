import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Power, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/lib/devToast';
import { restoreSystemFiles } from '@/lib/systemFiles';

const ACTIONS = [
  { id: 'reinstall-system', label: 'Reinstall all system files', danger: false },
  { id: 'bios', label: 'BIOS boot menu', danger: false },
  { id: 'restart', label: 'Reboot system now', danger: false },
  { id: 'clear-apps', label: 'Wipe cache partition', danger: true },
  { id: 'clear-files', label: 'Wipe user files', danger: true },
  { id: 'factory-reset', label: 'Wipe data/factory reset', danger: true },
];

export default function MobileRecovery({ onExit, reason, onOpenBios }) {
  const [selected, setSelected] = useState(0);
  const [confirmAction, setConfirmAction] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [restartToast, setRestartToast] = useState(false);
  const queryClient = useQueryClient();
  // Result/error toasts from system actions only show in Developer Mode
  const isDevMode = localStorage.getItem('eos_dev_options_enabled') === 'true';

  // Force fullscreen when entering recovery mode
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) { /* ignore */ }
    };
    enterFullscreen();
  }, []);

  const handleAction = async (action) => {
    setProcessing(true);
    try {
      if (action === 'reinstall-system') {
        await restoreSystemFiles();
        if (isDevMode) toast.success('System files reinstalled');
        await base44.auth.updateMe({ in_recovery_mode: false });
        setTimeout(() => window.location.reload(), 1500);
        return;
      } else if (action === 'bios') {
        onOpenBios?.();
        return;
      } else if (action === 'restart') {
        await base44.auth.updateMe({ in_recovery_mode: false });
        if (isDevMode) setRestartToast(true);
        setTimeout(() => window.location.reload(), 1500);
      } else if (action === 'clear-apps') {
        const apps = await base44.entities.InstalledApp.list();
        await Promise.all(apps.map(app => base44.entities.InstalledApp.delete(app.id)));
        if (isDevMode) toast.success('Cache partition wiped');
        setConfirmAction(null);
      } else if (action === 'clear-files') {
        const files = await base44.entities.File.list();
        const userFiles = files.filter(f => !f.path?.startsWith('/EggetSystem'));
        await Promise.all(userFiles.map(file => base44.entities.File.delete(file.id)));
        if (isDevMode) toast.success('User files wiped');
        setConfirmAction(null);
      } else if (action === 'factory-reset') {
        const [apps, files] = await Promise.all([
          base44.entities.InstalledApp.list(),
          base44.entities.File.list()
        ]);
        await Promise.all([
          ...apps.map(app => base44.entities.InstalledApp.delete(app.id)),
          ...files.map(file => base44.entities.File.delete(file.id))
        ]);
        await base44.auth.updateMe({
          setup_completed: false,
          pinned_apps: [],
          pin: null,
          preferences: null,
          os_version: '1.0.0',
          in_recovery_mode: false
        });
        localStorage.clear();
        if (isDevMode) toast.success('Factory reset complete');
        setTimeout(() => base44.auth.logout(), 1000);
      }
    } catch (error) {
      if (isDevMode) toast.error('Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const move = (dir) => {
    setSelected((s) => Math.max(0, Math.min(ACTIONS.length - 1, s + dir)));
  };
  const choose = () => {
    const action = ACTIONS[selected];
    if (!action || processing) return;
    if (action.danger) setConfirmAction(action.id);
    else handleAction(action.id);
  };

  // Keyboard navigation (desktop preview / physical keyboard)
  useEffect(() => {
    if (confirmAction) return;
    const onKey = (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, confirmAction, processing]);

  // --- Confirmation screen ---
  if (confirmAction) {
    const action = ACTIONS.find(a => a.id === confirmAction);
    return (
      <div className="h-screen w-screen bg-zinc-950 flex flex-col select-none">
        <div className="flex-1 flex flex-col justify-center px-6">
          <p className="text-white font-bold text-lg mb-2">{action.label}?</p>
          <p className="text-zinc-400 text-sm mb-1">This action cannot be undone.</p>
          <p className="text-zinc-500 text-sm mb-8">All affected data will be permanently lost.</p>
          <div className="space-y-3">
            <button
              onClick={() => handleAction(confirmAction)}
              disabled={processing}
              className="w-full text-left py-3 px-4 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Yes — confirm'}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              disabled={processing}
              className="w-full text-left py-3 px-4 rounded-xl text-zinc-200 bg-white/5 hover:bg-white/10 font-semibold disabled:opacity-50"
            >
              No — go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main recovery menu ---
  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col select-none">
      {/* EggetSystem restart toast */}
      {restartToast && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow-2xl">
            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
            <span className="text-black font-medium text-sm">Restarting...</span>
          </div>
        </div>
      )}
      {/* Header block */}
      <div className="px-6 pt-12 pb-4">
        <p className="font-bold text-white text-xl leading-tight">EggetSystem Recovery</p>
        <p className="text-zinc-500 text-xs mt-3 leading-relaxed">EggetSystem/Mobile/Mobile</p>
        <p className="text-zinc-500 text-xs leading-relaxed">EGG-1.0.0/ES.1.0.0/v1A7J-0</p>
        <p className="text-zinc-500 text-xs leading-relaxed">user/release-keys</p>
        <p className="text-zinc-400 text-sm mt-4 leading-relaxed">Use volume up/down and power.</p>
        {reason && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/60 border border-red-800/70">
            <p className="text-red-400 font-bold text-sm">{reason}</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 mx-6" />

      {/* Menu list — Android-style highlight bar selection */}
      <div className="flex-1 flex flex-col justify-center">
        {ACTIONS.map((action, i) => (
          <button
            key={action.id}
            onClick={() => setSelected(i)}
            className={`w-full text-left py-3.5 px-6 font-medium transition-colors ${
              i === selected ? 'bg-blue-600 text-white' : 'text-zinc-200 hover:bg-white/5'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 pb-2">
        <p className="text-zinc-600 text-xs">EggetSystem API: 3</p>
      </div>

      {/* Volume keys — scroll the selection */}
      <div className="grid grid-cols-2 gap-px bg-white/10 border-t border-white/10">
        <button
          onClick={() => move(-1)}
          className="bg-zinc-950 py-3.5 flex flex-col items-center gap-1 active:bg-blue-600 active:text-white text-zinc-300"
        >
          <ChevronUp className="w-5 h-5" />
          <span className="text-[10px] font-bold tracking-wide">VOL UP</span>
        </button>
        <button
          onClick={() => move(1)}
          className="bg-zinc-950 py-3.5 flex flex-col items-center gap-1 active:bg-blue-600 active:text-white text-zinc-300"
        >
          <ChevronDown className="w-5 h-5" />
          <span className="text-[10px] font-bold tracking-wide">VOL DOWN</span>
        </button>
      </div>

      {/* Power — select the highlighted option */}
      <button
        onClick={choose}
        disabled={processing}
        className="w-full bg-blue-600 text-white py-4 flex items-center justify-center gap-2 font-semibold disabled:opacity-50 active:bg-blue-700"
      >
        <Power className="w-5 h-5" />
        <span>{processing ? 'PROCESSING…' : 'SELECT'}</span>
      </button>
    </div>
  );
}