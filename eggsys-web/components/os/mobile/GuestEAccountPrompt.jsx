import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, X, Loader2, User, Sparkles, UserCog, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import EggSysWord from '@/components/os/EggSysWord';
import { createLocalGuestEAccount, updateLocalGuestEAccountUsername } from '@/lib/eaccountSync';

const DISMISS_KEY = 'eos_guest_eaccount_dismissed';

// Shows a guest (not signed into Base44) a choice: set up an E-Account
// themselves, have one created automatically (username changeable later),
// or stay signed out. The account is persisted locally via cookie/cache.
export default function GuestEAccountPrompt() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(() => sessionStorage.getItem(DISMISS_KEY) !== '1');
  const [view, setView] = useState('choose'); // 'choose' | 'manual' | 'done'
  const [username, setUsername] = useState('');
  const [created, setCreated] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['eaccount-mobile'] });
    queryClient.invalidateQueries({ queryKey: ['eaccount'] });
  };

  const handleAuto = () => {
    const acct = createLocalGuestEAccount();
    setCreated(acct);
    setEditName(acct.username);
    setView('done');
    invalidate();
    toast.success('E Account created');
  };

  const handleManual = () => {
    const name = username.trim();
    if (name.length < 3) { toast.error('Username must be at least 3 characters'); return; }
    setSaving(true);
    const acct = createLocalGuestEAccount(name);
    setSaving(false);
    setCreated(acct);
    setEditName(acct.username);
    setView('done');
    invalidate();
    toast.success('E Account created');
  };

  const handleSaveUsername = () => {
    const name = editName.trim();
    if (name.length < 3) { toast.error('Username must be at least 3 characters'); return; }
    const updated = updateLocalGuestEAccountUsername(name);
    if (updated) {
      setCreated(updated);
      invalidate();
      toast.success('Username updated');
    }
  };

  const handleStayOut = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
        <button onClick={handleClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        {view === 'choose' && (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Create your E Account</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Your E Account is your <EggSysWord height={12} /> identity. It's saved to this device via cookies — no sign-in required.
            </p>
            <div className="space-y-2">
              <Button onClick={() => setView('manual')} variant="outline" className="w-full justify-start">
                <UserCog className="w-4 h-4 mr-2" /> Set it up myself
              </Button>
              <Button onClick={handleAuto} className="w-full justify-start bg-gradient-to-r from-emerald-500 to-teal-600">
                <Sparkles className="w-4 h-4 mr-2" /> Create automatically
              </Button>
              <Button onClick={handleStayOut} variant="ghost" className="w-full text-gray-500">
                Stay signed out
              </Button>
            </div>
          </>
        )}

        {view === 'manual' && (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Choose a username</h2>
            <p className="text-sm text-gray-500 text-center mb-6">You can change this later.</p>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                autoFocus
                placeholder="egget_user123"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManual()}
              />
              <Button onClick={handleManual} disabled={saving} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Create E Account
              </Button>
              <Button onClick={() => setView('choose')} variant="ghost" className="w-full text-gray-500">Back</Button>
            </div>
          </>
        )}

        {view === 'done' && created && (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">E Account ready!</h2>
            <p className="text-sm text-gray-500 text-center mb-6">Saved to this device. You can change your username anytime.</p>
            <div className="space-y-2">
              <Label>Username</Label>
              <div className="flex gap-2">
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
                <Button onClick={handleSaveUsername} variant="outline">Save</Button>
              </div>
              <Button onClick={handleClose} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600">Done</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}