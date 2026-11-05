import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, X, UserPlus, Trash2, ShieldCheck, ArrowLeft, Baby } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/devToast';
import {
  hasKidsPin,
  getKidsPin,
  setKidsPin,
  isKidsModeEnabled,
  setKidsModeEnabled,
  getApprovedContacts,
  addApprovedContact,
  removeApprovedContact,
  getKidsUsername,
  setKidsUsername,
  THEEGGET_USERNAME,
} from '@/lib/kidsMode';

// Parental controls for Kids Mode. Gates everything behind a 4-digit PIN.
// The parent can: set/change the PIN, manage the approved-contact list, and
// turn Kids Mode off. Kids cannot get past the PIN gate.
export default function KidsParentalControls({ open, onClose, onTurnedOff, onEnabled }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [adding, setAdding] = useState('');
  const [contacts, setContacts] = useState(getApprovedContacts());
  const [kidsUsername, setKidsUsernameState] = useState(getKidsUsername());

  // Require the PIN every time the controls open — so a kid who just watched
  // a parent unlock it once can't reopen it and turn Kids Mode off.
  useEffect(() => {
    if (!open) {
      setUnlocked(false);
      setPinInput('');
      setNewPin('');
      setConfirmPin('');
      setKidsUsernameState(getKidsUsername());
    }
  }, [open]);

  if (!open) return null;

  const handleUnlock = () => {
    if (!hasKidsPin()) {
      // No PIN yet — go straight to setup.
      setUnlocked(true);
      return;
    }
    if (pinInput === getKidsPin()) {
      setUnlocked(true);
      setPinInput('');
    } else {
      toast.error('Incorrect PIN');
    }
  };

  const handleSavePin = () => {
    if (newPin.length < 4 || !/^\d{4,}$/.test(newPin)) {
      toast.error('PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }
    setKidsPin(newPin);
    setNewPin('');
    setConfirmPin('');
    // First-time PIN setup enables Kids Mode automatically, so the parent
    // doesn't have to toggle it separately.
    if (!isKidsModeEnabled()) {
      setKidsModeEnabled(true);
      onEnabled?.();
      toast.success('Kids Mode enabled');
    } else {
      toast.success('PIN set');
    }
  };

  const handleAddContact = () => {
    const u = adding.trim();
    if (!u) return;
    if (u === THEEGGET_USERNAME) {
      toast.error('Theegget is always allowed');
      return;
    }
    setContacts(addApprovedContact(u));
    setAdding('');
    toast.success(`Added @${u}`);
  };

  const handleRemoveContact = (u) => {
    setContacts(removeApprovedContact(u));
    toast.success(`Removed @${u}`);
  };

  const handleSaveUsername = () => {
    const u = kidsUsername.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (u.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    setKidsUsername(u);
    setKidsUsernameState(u);
    toast.success(`Kid's username set to @${u}`);
  };

  const handleTurnOff = () => {
    setKidsModeEnabled(false);
    toast.success('Kids Mode turned off');
    onTurnedOff?.();
    onClose?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-t-2xl sticky top-0">
          <div className="flex items-center gap-2">
            <Baby className="w-5 h-5" />
            <h2 className="font-bold">Kids Mode — Parental Controls</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!unlocked ? (
          <div className="p-6">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-3">
                <Lock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {hasKidsPin() ? 'Enter your PIN to manage Kids Mode' : 'Set up a PIN to manage Kids Mode'}
              </p>
            </div>
            <Input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="PIN"
              className="text-center text-lg tracking-widest"
              maxLength={8}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
            <Button className="w-full mt-3" onClick={handleUnlock} disabled={hasKidsPin() && !pinInput}>
              {hasKidsPin() ? 'Unlock' : 'Continue'}
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {/* PIN setup / change */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> {hasKidsPin() ? 'Change PIN' : 'Set a PIN'}
              </h3>
              <div className="space-y-2">
                <Input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="New PIN (4+ digits)"
                  maxLength={8}
                />
                <Input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Confirm PIN"
                  maxLength={8}
                />
                <Button variant="outline" className="w-full" onClick={handleSavePin} disabled={!newPin}>
                  Save PIN
                </Button>
              </div>
            </section>

            {/* Kid's username */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                <Baby className="w-4 h-4" /> Kid's username
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Your kid uses their own name in Kids Mode, separate from your account.
              </p>
              <div className="flex gap-2">
                <Input
                  value={kidsUsername}
                  onChange={(e) => setKidsUsernameState(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="username"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                />
                <Button variant="outline" onClick={handleSaveUsername} disabled={!kidsUsername.trim()}>
                  Save
                </Button>
              </div>
            </section>

            {/* Approved contacts */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Allowed contacts
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Your kid can only contact Theegget and the people you approve here.
              </p>
              <div className="flex gap-2 mb-2">
                <Input
                  value={adding}
                  onChange={(e) => setAdding(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="username"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
                />
                <Button size="icon" onClick={handleAddContact} disabled={!adding.trim()}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                    T
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">@{THEEGGET_USERNAME}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Always allowed</p>
                  </div>
                </div>
                {contacts.map((u) => (
                  <div key={u} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-zinc-800">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {u[0]?.toUpperCase()}
                    </div>
                    <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">@{u}</p>
                    <button
                      onClick={() => handleRemoveContact(u)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No extra contacts approved yet</p>
                )}
              </div>
            </section>

            {/* Turn off Kids Mode */}
            <section className="pt-2 border-t border-gray-200 dark:border-zinc-700">
              <Button variant="destructive" className="w-full" onClick={handleTurnOff}>
                Turn off Kids Mode
              </Button>
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}