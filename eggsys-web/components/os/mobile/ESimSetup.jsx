import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Signal, Loader2, Wifi, Trash2, PowerOff, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/devToast';
import { confirmAction } from '@/components/os/ConfirmDialog';

const SERVICE = { name: 'EggSys Mobile', color: 'from-indigo-500 to-purple-600' };

export default function ESimSetup({ user, onActivated, variant = 'settings' }) {
  const [localEsim, setLocalEsim] = useState(null);
  const existing = localEsim || user?.esim;
  const [activating, setActivating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const isDark = variant === 'setup';
  const cardCls = isDark
    ? 'bg-white/10 backdrop-blur-lg rounded-3xl p-6'
    : 'bg-white rounded-xl border p-4';
  const headingCls = isDark ? 'text-white' : 'text-gray-800';
  const subCls = isDark ? 'text-white/70' : 'text-gray-500';

  const persist = async (data) => {
    await base44.auth.updateMe({ esim: data });
    setLocalEsim(data);
    onActivated?.();
  };

  const handleActivate = async () => {
    setActivating(true);
    await new Promise((r) => setTimeout(r, 2200));
    try {
      await persist({
        activated: true,
        carrier: SERVICE.name,
        activated_at: new Date().toISOString()
      });
      toast.success(`eSIM activated with ${SERVICE.name}`);
    } catch (e) {
      toast.error('Failed to activate eSIM');
    } finally {
      setActivating(false);
    }
  };

  const handleDisable = async () => {
    if (!await confirmAction("Disable eSIM? You'll keep the eSIM but won't be able to call or message until you re-enable it.")) return;
    setBusy(true);
    try {
      await persist({ ...existing, activated: false, disabled_at: new Date().toISOString() });
      toast.success('eSIM disabled');
    } catch (e) {
      toast.error('Failed to disable eSIM');
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      const { disabled_at, ...rest } = existing;
      await persist({ ...rest, activated: true });
      toast.success('eSIM re-enabled');
    } catch (e) {
      toast.error('Failed to re-enable eSIM');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!await confirmAction("Remove eSIM? This deletes the eSIM entirely — you'll need to activate a new one to call or message again.")) return;
    setBusy(true);
    try {
      await persist(null);
      toast.success('eSIM removed');
    } catch (e) {
      toast.error('Failed to remove eSIM');
    } finally {
      setBusy(false);
    }
  };

  const isActive = existing?.activated;
  const isDisabled = existing && !existing.activated;

  if (isActive || isDisabled) {
    const badge = isActive
      ? { label: 'Active', cls: isDark ? 'bg-green-400/20 text-green-200' : 'bg-green-100 text-green-700' }
      : { label: 'Disabled', cls: isDark ? 'bg-amber-400/20 text-amber-200' : 'bg-amber-100 text-amber-700' };
    return (
      <div className="space-y-4">
        <div className={`${cardCls}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${SERVICE.color} flex items-center justify-center shadow-lg flex-shrink-0 ${isDisabled ? 'opacity-50' : ''}`}>
              <Signal className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${headingCls}`}>{existing.carrier || SERVICE.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
              </div>
              <p className={`text-sm ${subCls} mt-0.5`}>EggetSystem mobile service</p>
            </div>
          </div>
          <div className={`grid grid-cols-2 gap-3 ${isDark ? 'bg-white/5 rounded-2xl p-3' : 'bg-gray-50 rounded-xl p-3'}`}>
            <div>
              <p className={`text-xs ${subCls} flex items-center gap-1`}><Signal className="w-3 h-3" /> Signal</p>
              <p className={`text-sm font-semibold ${headingCls}`}>{isActive ? (isOnline ? 'Excellent' : 'No signal') : 'Off'}</p>
            </div>
            <div>
              <p className={`text-xs ${subCls} flex items-center gap-1`}><Wifi className="w-3 h-3" /> Data</p>
              <p className={`text-sm font-semibold ${headingCls}`}>{isActive ? '5G · Unlimited' : 'Off'}</p>
            </div>
          </div>
        </div>
        {variant === 'settings' && (
          <div className="grid grid-cols-2 gap-3">
            {isActive ? (
              <Button onClick={handleDisable} variant="outline" disabled={busy} className="text-amber-600 border-amber-200">
                <PowerOff className="w-4 h-4 mr-2" />
                Disable
              </Button>
            ) : (
              <Button onClick={handleEnable} disabled={busy} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                <Power className="w-4 h-4 mr-2" />
                Re-enable
              </Button>
            )}
            <Button onClick={handleRemove} variant="outline" disabled={busy} className="text-red-600 border-red-200">
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${cardCls}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${SERVICE.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
          <Signal className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className={`font-semibold ${headingCls}`}>Activate your eSIM</h3>
          <p className={`text-sm ${subCls}`}>Required to send messages and make calls</p>
        </div>
      </div>

      <div className={`mb-5 p-3 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${SERVICE.color} flex items-center justify-center shadow flex-shrink-0`}>
            <Signal className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className={`font-semibold text-sm ${headingCls}`}>{SERVICE.name}</p>
            <p className={`text-xs ${subCls}`}>EggetSystem locked mobile service</p>
          </div>
        </div>
      </div>

      <Button
        onClick={handleActivate}
        disabled={activating}
        className={`w-full ${isDark ? 'bg-white text-purple-600 hover:bg-white/90' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'}`}
      >
        {activating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Activating eSIM...
          </>
        ) : (
          <>
            <Signal className="w-4 h-4 mr-2" />
            Activate eSIM
          </>
        )}
      </Button>
    </div>
  );
}