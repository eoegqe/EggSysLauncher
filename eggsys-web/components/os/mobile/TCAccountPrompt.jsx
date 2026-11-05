import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ShieldCheck, ExternalLink, Link2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchEAccount } from '@/lib/eaccountSync';
import { fetchTCAccount, createOrLinkTCAccount, TC_ACCOUNTS_URL } from '@/lib/tcAccount';

// Blocking prompt: every signed-in user needs a TC Account. People who already
// have an E Account keep it — they just link it to their TC Account here.
export default function TCAccountPrompt({ user }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [tcEmail, setTcEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tcaccount', user?.email],
    queryFn: async () => ({
      tc: await fetchTCAccount(user, base44),
      e: await fetchEAccount(user, base44),
    }),
    enabled: !!user?.email,
  });

  if (!user?.email || isLoading || !data || data.tc) return null;

  const hasE = !!data.e && !data.e._local_guest;

  const handleSubmit = async () => {
    if (username.trim().length < 3) { toast.error('Username must be at least 3 characters'); return; }
    setSaving(true);
    try {
      await createOrLinkTCAccount(user, base44, { username, tcEmail });
      queryClient.invalidateQueries({ queryKey: ['tcaccount'] });
      queryClient.invalidateQueries({ queryKey: ['eaccount'] });
      queryClient.invalidateQueries({ queryKey: ['eaccount-mobile'] });
      toast.success(hasE ? 'E Account linked to your TC Account' : 'TC Account ready');
    } catch (e) {
      toast.error(e.message || 'Could not set up TC Account');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
          {hasE ? <Link2 className="w-8 h-8 text-white" /> : <ShieldCheck className="w-8 h-8 text-white" />}
        </div>
        <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
          {hasE ? 'Link your E Account' : 'Sign in with a TC Account'}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-4">
          {hasE
            ? `Your E Account (@${data.e.username}) stays exactly as it is. Link it to a TC Account to keep using EggetSystem.`
            : 'EggetSystem now uses TC Accounts. Create one at accounts.theegget.com, then enter its details below.'}
        </p>
        <a
          href={TC_ACCOUNTS_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1 text-sm text-indigo-600 hover:underline mb-4"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open accounts.theegget.com
        </a>
        <div className="space-y-3">
          <div>
            <Label>TC Account username</Label>
            <Input className="mt-1" placeholder="your_tc_username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <Label>TC Account email</Label>
            <Input className="mt-1" type="email" placeholder={user.email} value={tcEmail} onChange={(e) => setTcEmail(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {hasE ? 'Link E Account' : 'Continue'}
          </Button>
        </div>
        <p className="text-[11px] text-gray-400 text-center mt-4">
          Once linked, your data lives on EggetSystem and doesn't interact with accounts.theegget.com.
        </p>
      </div>
    </div>
  );
}