import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEsdcCommands } from '@/hooks/useEsdcCommands';
import { getDeviceLabel, appBelongsToDevice } from '@/lib/deviceId';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X, Smartphone, Monitor, RefreshCw, Power, Info, Terminal as TerminalIcon,
  Download, Trash2, ToggleLeft, ToggleRight, Cpu, HardDrive, Plug, Unplug,
} from 'lucide-react';

// ESDC visual menu — a point-and-click alternative to the `esdc` terminal
// commands. Opened by the `esdc vismenu` command (which dispatches the
// `eggsys-open-vismenu` window event). Reuses the same hook so every action
// here maps 1:1 to a real ESDC command.
export default function EggSysVisMenuLayer() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState([]);
  const [tab, setTab] = useState('device');

  const {
    esdcCommand, remote, user, devices, installedApps,
    eggSysApps, publishedApps, localDeviceId,
  } = useEsdcCommands();

  useEffect(() => {
    const openHandler = () => { setOpen(true); setOutput(['ESDC visual menu ready.']); };
    const closeHandler = () => setOpen(false);
    window.addEventListener('eggsys-open-vismenu', openHandler);
    window.addEventListener('eggsys-close-vismenu', closeHandler);
    return () => {
      window.removeEventListener('eggsys-open-vismenu', openHandler);
      window.removeEventListener('eggsys-close-vismenu', closeHandler);
    };
  }, []);

  const run = async (args) => {
    setBusy(true);
    try {
      const lines = await esdcCommand(args);
      setOutput(Array.isArray(lines) ? lines : [String(lines)]);
    } catch (e) {
      setOutput(['error: ' + (e?.message || e)]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const tid = remote || localDeviceId;
  const targetLabel = remote
    ? `${getDeviceLabel(remote)} (remote)`
    : `${getDeviceLabel(localDeviceId)} (local)`;

  const knownDeviceIds = (() => {
    const ids = new Set([localDeviceId]);
    devices.forEach((d) => { if (d.device_id) ids.add(d.device_id); });
    installedApps.forEach((a) => { if (a.device_id) ids.add(a.device_id); });
    return Array.from(ids);
  })();

  const appsOnTarget = installedApps.filter((a) =>
    remote ? a.device_id === tid : appBelongsToDevice(a, tid)
  );
  const disabledServices = user?.disabled_services || [];
  const services = eggSysApps.filter((a) => a.app_type === 'service');
  const installable = [
    ...eggSysApps.filter((a) => a.app_type !== 'service'),
    ...publishedApps,
  ];
  const alreadyInstalledIds = new Set(appsOnTarget.map((a) => a.app_id));

  const devicePlatform = (id) =>
    devices.find((d) => d.device_id === id)?.platform === 'mobile' ? 'mobile' : 'desktop';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6">
      <div className="w-full max-w-2xl h-[85vh] max-h-[680px] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
              <TerminalIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">ESDC Visual Menu</div>
              <div className="text-xs text-zinc-400 leading-tight truncate">
                Target: <span className="text-emerald-400 font-mono">{targetLabel}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white shrink-0" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 rounded-none border-b border-zinc-800 bg-zinc-950/40 px-2 h-10">
            <TabsTrigger value="device" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-400">
              <HardDrive className="w-4 h-4 mr-1.5" /> Device
            </TabsTrigger>
            <TabsTrigger value="apps" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-400">
              <Cpu className="w-4 h-4 mr-1.5" /> Apps
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-400">
              <Power className="w-4 h-4 mr-1.5" /> System
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {/* DEVICE TAB */}
              {tab === 'device' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Devices attached</h3>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 text-zinc-300"
                        onClick={() => run(['devices'])}>
                        <TerminalIcon className="w-3 h-3 mr-1" /> List
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {knownDeviceIds.length === 0 && (
                        <p className="text-sm text-zinc-500 px-2 py-3">No devices registered yet.</p>
                      )}
                      {knownDeviceIds.map((id) => {
                        const isLocal = id === localDeviceId;
                        const isCurrent = id === tid;
                        const isMobile = devicePlatform(id) === 'mobile';
                        return (
                          <div key={id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${isCurrent ? 'border-emerald-700 bg-emerald-950/30' : 'border-zinc-800 bg-zinc-900/40'}`}>
                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-zinc-800 shrink-0">
                              {isMobile ? <Smartphone className="w-4 h-4 text-zinc-300" /> : <Monitor className="w-4 h-4 text-zinc-300" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{getDeviceLabel(id)}</div>
                              <div className="text-xs text-zinc-500 font-mono truncate">{id}</div>
                            </div>
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                              {isLocal ? 'local' : 'remote'}
                            </span>
                            {isCurrent ? (
                              <span className="text-xs text-emerald-400 font-medium shrink-0">Current</span>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400 hover:bg-emerald-950/40 shrink-0"
                                disabled={busy} onClick={() => run(['connect', id])}>
                                <Plug className="w-3 h-3 mr-1" /> Connect
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {remote && (
                    <Button variant="outline" className="w-full border-zinc-700 text-zinc-300"
                      disabled={busy} onClick={() => run(['disconnect'])}>
                      <Unplug className="w-4 h-4 mr-2" /> Disconnect from remote
                    </Button>
                  )}
                </>
              )}

              {/* APPS TAB */}
              {tab === 'apps' && (
                <>
                  {/* Installed */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Installed on {targetLabel} ({appsOnTarget.length})
                      </h3>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 text-zinc-300"
                        onClick={() => run(['pm', 'list'])}>
                        <TerminalIcon className="w-3 h-3 mr-1" /> List
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {appsOnTarget.length === 0 && (
                        <p className="text-sm text-zinc-500 px-2 py-3">No apps installed on this device.</p>
                      )}
                      {appsOnTarget.map((a) => (
                        <div key={a.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-zinc-800 shrink-0">
                            <Cpu className="w-4 h-4 text-zinc-300" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{a.name}</div>
                            <div className="text-xs text-zinc-500 font-mono truncate">{a.app_id}</div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:bg-red-950/40 shrink-0"
                            disabled={busy} onClick={() => run(['pm', 'uninstall', a.app_id])}>
                            <Trash2 className="w-3 h-3 mr-1" /> Uninstall
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Services (disable/enable) */}
                  {services.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">System services</h3>
                      <div className="space-y-1.5">
                        {services.map((s) => {
                          const isDisabled = disabledServices.includes(s.app_id);
                          return (
                            <div key={s.app_id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-zinc-800 shrink-0">
                                <Cpu className="w-4 h-4 text-zinc-300" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">{s.name}</div>
                                <div className="text-xs text-zinc-500 font-mono truncate">{s.app_id}</div>
                              </div>
                              {isDisabled ? (
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400 hover:bg-emerald-950/40 shrink-0"
                                  disabled={busy} onClick={() => run(['pm', 'enable', s.app_id])}>
                                  <ToggleLeft className="w-4 h-4 mr-1" /> Enable
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-400 hover:bg-amber-950/40 shrink-0"
                                  disabled={busy} onClick={() => run(['pm', 'disable', s.app_id])}>
                                  <ToggleRight className="w-4 h-4 mr-1" /> Disable
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Install from store */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Install from store</h3>
                    <div className="space-y-1.5">
                      {installable.length === 0 && (
                        <p className="text-sm text-zinc-500 px-2 py-3">No apps available to install.</p>
                      )}
                      {installable.map((s, i) => {
                        const installed = alreadyInstalledIds.has(s.app_id);
                        return (
                          <div key={s.app_id || `app-${i}`} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-zinc-800 shrink-0">
                              <Cpu className="w-4 h-4 text-zinc-300" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{s.name}</div>
                              <div className="text-xs text-zinc-500 font-mono truncate">{s.app_id}</div>
                            </div>
                            {installed ? (
                              <span className="text-xs text-zinc-500 shrink-0">Installed</span>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400 hover:bg-emerald-950/40 shrink-0"
                                disabled={busy} onClick={() => run(['pm', 'install', s.app_id])}>
                                <Download className="w-3 h-3 mr-1" /> Install
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* SYSTEM TAB */}
              {tab === 'system' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    disabled={busy} onClick={() => run(['refresh'])}>
                    <RefreshCw className="w-5 h-5" />
                    <span className="text-xs">Refresh</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    disabled={busy} onClick={() => run(['reboot'])}>
                    <Power className="w-5 h-5" />
                    <span className="text-xs">Reboot</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    disabled={busy} onClick={() => run(['dumpsys'])}>
                    <Info className="w-5 h-5" />
                    <span className="text-xs">Diagnostics</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    disabled={busy} onClick={() => run(['logcat'])}>
                    <TerminalIcon className="w-5 h-5" />
                    <span className="text-xs">System Log</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-zinc-700 text-zinc-200 hover:bg-zinc-800 col-span-2"
                    disabled={busy} onClick={() => run(['shell'])}>
                    <Cpu className="w-5 h-5" />
                    <span className="text-xs">Shell info</span>
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </Tabs>

        {/* Output console */}
        <div className="border-t border-zinc-800 bg-black/50">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">Output</span>
            {busy && <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />}
          </div>
          <ScrollArea className="h-24 px-3 pb-2">
            <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
              {output.length ? output.join('\n') : '—'}
            </pre>
          </ScrollArea>
        </div>
      </div>
    </div>,
    document.body
  );
}