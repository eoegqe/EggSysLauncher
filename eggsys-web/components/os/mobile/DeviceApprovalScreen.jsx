import React, { useState, useEffect, useCallback } from 'react';
import { getDeviceId, getDeviceLabel } from '@/lib/deviceId';
import { checkApprovalStatus } from '@/lib/deviceApproval';
import { ShieldCheck, Smartphone, Monitor, Loader2, RefreshCw } from 'lucide-react';
import EggSysWord from '@/components/os/EggSysWord';

// Gate shown during boot when 2FA-by-device is on and this device hasn't
// been approved yet. Polls until an approved device approves it, or shows
// a "denied" state if the request was rejected.
export default function DeviceApprovalScreen({ approvedOthers = [], onApproved, onDenied }) {
  const [status, setStatus] = useState('pending'); // pending | missing
  const [polling, setPolling] = useState(true);

  const poll = useCallback(async () => {
    try {
      const res = await checkApprovalStatus();
      if (res.status === 'approved') {
        setPolling(false);
        onApproved();
      } else if (res.status === 'missing') {
        setStatus('missing');
        setPolling(false);
        // Denied — log this device out after a short beat so the user sees why.
        setTimeout(() => onDenied?.(), 2500);
      } else {
        setStatus('pending');
      }
    } catch { /* keep polling */ }
  }, [onApproved, onDenied]);

  useEffect(() => {
    if (!polling) return;
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [polling, poll]);

  const myLabel = getDeviceLabel(getDeviceId());

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white px-6 text-center">
      <EggSysWord className="h-7 mb-8 opacity-90" />

      {status === 'pending' ? (
        <>
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-5">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">Device Approval Required</h1>
          <p className="text-sm text-zinc-400 max-w-xs mb-6">
            Two-factor authentication is on. Approve <span className="text-white font-semibold">{myLabel}</span> from one of your already-approved devices to continue.
          </p>

          <div className="flex items-center gap-2 text-amber-400 text-sm mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for approval…</span>
          </div>

          {approvedOthers.length > 0 && (
            <div className="w-full max-w-xs space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide text-left mb-1">Waiting for</p>
              {approvedOthers.map((d) => {
                const Icon = d.platform === 'mobile' ? Smartphone : Monitor;
                return (
                  <div key={d.device_id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 text-left">
                    <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.label || d.device_id}</p>
                      <p className="text-xs text-zinc-500 capitalize">{d.platform || 'device'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-zinc-600 mt-8 max-w-xs">
            On your approved device: Settings → E Account → Device Approvals.
          </p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mb-5">
            <RefreshCw className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-sm text-zinc-400 max-w-xs mb-6">
            The approval request for <span className="text-white font-semibold">{myLabel}</span> was denied. You'll be signed out shortly.
          </p>
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Signing out…</span>
          </div>
        </>
      )}
    </div>
  );
}