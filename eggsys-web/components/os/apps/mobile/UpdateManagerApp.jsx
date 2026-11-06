import React from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/lib/devToast';
import { triggerKernelPanic } from '@/lib/kernelPanic';
import UpdateManager from '@/components/os/UpdateManager';
import UpdateManagerHome from '@/components/os/apps/mobile/UpdateManagerHome';

// Module-level stash for the update the user tapped to install. The
// `eos_open_update_manager` event sets this before launching the app so
// the app instance (rendered by AppView) can read it without props.
let _pendingUpdate = null;
export function setPendingUpdate(update) { _pendingUpdate = update; }

/**
 * Update Manager presented as a launchable system service ("EggSys OS").
 * Renders the full-screen UpdateManager overlay and performs the actual
 * OS version bump + history append on completion.
 */
export default function UpdateManagerApp({ onClose }) {
  const update = _pendingUpdate;

  const handleComplete = async () => {
    if (!update) { onClose?.(); return; }
    try {
      const me = await base44.auth.me();
      const newHistory = [
        ...(me?.update_history || []),
        { version: update.version, installed_date: new Date().toISOString(), status: 'success' }
      ];
      await base44.auth.updateMe({ os_version: update.version, update_history: newHistory });
      toast.success('Update installed!');
      _pendingUpdate = null;
      // Restart through the startup screen: reuse the system-options restart
      // flag (black "tap to boot" path) and add an update-restart flag so the
      // boot screen shows a "finishing update" splash before starting up.
      sessionStorage.setItem('eos_restarting', 'true');
      sessionStorage.setItem('eos_update_restart', 'true');
      sessionStorage.setItem('eos_update_restart_version', update.version || '');
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      _pendingUpdate = null;
      triggerKernelPanic('a system operation did not succeed');
    }
  };

  const handleCancel = () => {
    _pendingUpdate = null;
    onClose?.();
  };

  // Revert: roll back to a previous version, then restart through the startup
  // screen with the "reverting update" splash.
  const handleRevert = async () => {
    try {
      const me = await base44.auth.me();
      const fullHistory = me?.update_history || [];
      // Revert removes the latest (current) install from the list and rolls
      // back to the highest version still remaining (or 1.0.0 if none).
      const trimmedHistory = fullHistory.slice(0, -1);
      const newVersion = trimmedHistory.length > 0
        ? trimmedHistory[trimmedHistory.length - 1].version
        : '1.0.0';
      await base44.auth.updateMe({ os_version: newVersion, update_history: trimmedHistory });
      _pendingUpdate = null;
      sessionStorage.setItem('eos_restarting', 'true');
      sessionStorage.setItem('eos_update_revert', 'true');
      sessionStorage.setItem('eos_update_revert_version', newVersion || '');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      triggerKernelPanic('a system operation did not succeed');
    }
  };

  // Revert all: roll back every installed update to the original base version
  // (the earliest entry in history, or 1.0.0), then restart with the
  // "reverting all updates" splash.
  const handleRevertAll = async () => {
    try {
      const me = await base44.auth.me();
      const fullHistory = me?.update_history || [];
      const baseVersion = (fullHistory[0] && fullHistory[0].version) || '1.0.0';
      // Reverting all wipes the entire update log clean — no history remains.
      await base44.auth.updateMe({ os_version: baseVersion, update_history: [] });
      _pendingUpdate = null;
      sessionStorage.setItem('eos_restarting', 'true');
      sessionStorage.setItem('eos_update_revert', 'true');
      sessionStorage.setItem('eos_update_revert_all', 'true');
      sessionStorage.setItem('eos_update_revert_version', baseVersion || '');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      triggerKernelPanic('a system operation did not succeed');
    }
  };

  if (!update) {
    // No pending install — show the update manager home (version + history + revert).
    return <UpdateManagerHome onRevert={handleRevert} onRevertAll={handleRevertAll} onClose={onClose} />;
  }

  return (
    <UpdateManager
      update={update}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}