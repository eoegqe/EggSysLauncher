import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Wrench, RotateCcw, CheckCircle2, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { missingSystemComponents, restoreSystemComponents } from '@/lib/systemFiles';

// System-level overlay for the EggetSystem Recovery Environment (EggSysRE).
// When an important system component (a required system file) is missing,
// EggSysRE takes over: it diagnoses which components are missing, restores
// them, and lets the user restart. Lives outside any app iframe/window so
// it stays open even if the Files app is closed — same pattern as
// FactoryResetLayer / RegistryEditorLayer.
export function requestEggSysRecovery() {
  window.dispatchEvent(new CustomEvent('eggsys_show_recovery'));
}

export default function EggSysRecoveryLayer() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(() => document.fullscreenElement || document.body);
  const [phase, setPhase] = useState('diagnosing'); // diagnosing | restored | error
  const [missing, setMissing] = useState([]);
  const [restoredCount, setRestoredCount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const updateTarget = () => setTarget(document.fullscreenElement || document.body);
    const show = async () => {
      if (document.fullscreenElement?.tagName === 'IFRAME') await document.exitFullscreen();
      updateTarget();
      setOpen(true);
      setPhase('diagnosing');
      setMissing([]);
      setRestoredCount(0);

      try {
        const missingComps = await missingSystemComponents();
        setMissing(missingComps);
        if (missingComps.length === 0) {
          setPhase('restored');
          return;
        }
        const { restored } = await restoreSystemComponents();
        setRestoredCount(restored);
        // Refresh any loaded file lists so the restored components appear.
        queryClient.invalidateQueries({ queryKey: ['files'] });
        queryClient.invalidateQueries({ queryKey: ['recycle-bin-files'] });
        setPhase('restored');
      } catch (e) {
        setPhase('error');
      }
    };
    window.addEventListener('eggsys_show_recovery', show);
    document.addEventListener('fullscreenchange', updateTarget);
    return () => {
      window.removeEventListener('eggsys_show_recovery', show);
      document.removeEventListener('fullscreenchange', updateTarget);
    };
  }, [queryClient]);

  if (!open) return null;

  const close = () => setOpen(false);
  const restart = () => window.location.reload();

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-gray-900 text-white flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">EggetSystem Recovery Environment</h1>
              <p className="text-sm text-gray-400">EggSysRE — diagnosing and repairing system components</p>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          {phase === 'diagnosing' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-6" />
              <h2 className="text-xl font-semibold mb-2">Checking system components…</h2>
              <p className="text-sm text-gray-400">EggSysRE is scanning for missing components.</p>
            </div>
          )}

          {phase === 'restored' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3">
                {restoredCount > 0 ? 'System components restored' : 'No missing components found'}
              </h2>
              <p className="text-sm text-gray-400 mb-6 max-w-md">
                {restoredCount > 0
                  ? `EggSysRE restored ${restoredCount} missing system component${restoredCount > 1 ? 's' : ''}. Restart to return to EggetSystem.`
                  : 'All required system components are present. You can exit recovery.'}
              </p>

              {missing.length > 0 && (
                <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl p-4 mb-8 text-left">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Restored components</p>
                  <ul className="space-y-2">
                    {missing.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        <span className="font-mono text-gray-200 flex-1">{c.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${c.required ? 'bg-red-500/20 text-red-300' : 'bg-gray-600/40 text-gray-300'}`}>
                          {c.required ? 'Required' : 'Optional'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={restart} className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart System
                </Button>
                <Button variant="outline" onClick={close} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Exit Recovery
                </Button>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Recovery failed</h2>
              <p className="text-sm text-gray-400 mb-6 max-w-md">
                EggSysRE could not restore the missing components. Try restarting, or use Factory Reset from S:\OS\EggetSystem\factory-reset.eaf.
              </p>
              <div className="flex gap-3">
                <Button onClick={restart} className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart System
                </Button>
                <Button variant="outline" onClick={close} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Exit Recovery
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    target
  );
}