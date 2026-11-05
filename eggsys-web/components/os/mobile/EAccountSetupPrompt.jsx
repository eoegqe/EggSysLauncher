import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, X, Loader2, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { autoSyncEAccount } from '@/lib/eaccountSync';

// Auto-syncs an E Account when a Base44 user is detected — no manual sign-up
// needed. The E Account link is stored in a cookie so it persists across
// browser sessions. Falls back to a one-tap prompt if auto-sync fails.
export default function EAccountSetupPrompt({ user, onOpenSettings }) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('eaccount_prompt_dismissed') === '1'
  );
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const queryClient = useQueryClient();

  const { data: eAccounts = [], isLoading } = useQuery({
    queryKey: ['eaccount', user?.email],
    queryFn: () => base44.entities.EAccount.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
  });

  // Auto-sync: silently create an E Account when the user is logged in
  useEffect(() => {
    if (!user?.email || eAccounts.length > 0 || synced || autoSyncing) return;
    setAutoSyncing(true);
    autoSyncEAccount(user, base44).then((result) => {
      if (result) {
        setSynced(true);
        queryClient.invalidateQueries({ queryKey: ['eaccount', user?.email] });
        queryClient.invalidateQueries({ queryKey: ['eaccount-mobile', user?.email] });
      }
    }).finally(() => setAutoSyncing(false));
  }, [user?.email, eAccounts.length, synced, autoSyncing]);

  if (isLoading || eAccounts.length > 0 || synced || dismissed) return null;

  const handleSetup = () => {
    sessionStorage.setItem('eos_settings_tab', 'eaccount');
    onOpenSettings?.();
  };

  const handleDismiss = () => {
    sessionStorage.setItem('eaccount_prompt_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center">
          {autoSyncing ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Mail className="w-8 h-8 text-white" />}
        </div>
        <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
          {autoSyncing ? 'Setting up your E Account...' : 'Create your E Account'}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          {autoSyncing
            ? 'Syncing with your Base44 account. This only takes a moment.'
            : 'Your E Account is your EggetSystem identity — it syncs your apps, files, and settings across all your devices.'}
        </p>
        {!autoSyncing && (
          <div className="space-y-2">
            <Button
              onClick={handleSetup}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              <Mail className="w-4 h-4 mr-2" /> Set up E Account
            </Button>
            <Button onClick={handleDismiss} variant="ghost" className="w-full text-gray-500">
              Maybe later
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}