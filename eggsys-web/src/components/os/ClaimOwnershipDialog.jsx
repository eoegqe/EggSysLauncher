import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Lock, AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isOsOwned, claimOsOwnership } from '@/lib/osOwnership';

// Full-ownership claim flow for a device, triggered by opening access.eaf
// on E:\. Asks for confirmation, then requires the account PIN (fingerprint
// is not an option). Once claimed, the device boots into full administrator
// mode (21-) on every full boot and this cannot be undone.
export default function ClaimOwnershipDialog({ onClose }) {
  const { data: user } = useQuery({
    queryKey: ['ownership-user'],
    queryFn: () => base44.auth.me(),
  });

  const alreadyOwned = isOsOwned();
  const [step, setStep] = useState(alreadyOwned ? 'already' : 'confirm');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setStep(alreadyOwned ? 'already' : 'confirm'); }, [alreadyOwned]);

  const submitPin = () => {
    setError('');
    if (!user?.pin) { setError('No PIN is set on this account. Set a PIN in Setup first.'); return; }
    if (pin.length !== 4) { setError('Enter your 4-digit PIN'); return; }
    setBusy(true);
    // Simulate a brief verification delay for the OS-feel.
    setTimeout(() => {
      if (pin === user.pin) {
        claimOsOwnership();
        setBusy(false);
        setStep('success');
      } else {
        setBusy(false);
        setError('Incorrect PIN');
        setPin('');
      }
    }, 500);
  };

  const handleDigit = (d) => {
    if (pin.length >= 4 || busy) return;
    const next = pin + d;
    setPin(next);
    setError('');
  };
  const handleDelete = () => { setPin(pin.slice(0, -1)); setError(''); };

  return (
    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">Claim Ownership</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {step === 'already' && (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Already under full ownership</h3>
              <p className="text-white/60 text-sm mb-6">This device has already claimed full ownership of EggetSystem. It boots into full administrator mode on every boot, and this cannot be undone.</p>
              <Button onClick={onClose} className="w-full bg-amber-500 hover:bg-amber-600 text-white">Close</Button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Claim full ownership?</h3>
              <p className="text-white/70 text-sm mb-4">Are you sure you want to claim full ownership of your copy of EggetSystem?</p>
              <div className="flex items-start gap-2 text-left bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-200/80 text-xs">This cannot be undone for this device. Once claimed, every boot starts in full administrator mode (state 21-), giving complete control over the OS.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1 border-white/15 bg-transparent text-white hover:bg-white/10">Cancel</Button>
                <Button onClick={() => setStep('pin')} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">Continue</Button>
              </div>
            </div>
          )}

          {step === 'pin' && (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">Enter your PIN</h3>
              <p className="text-white/50 text-xs mb-5">Fingerprint is not available for this action.</p>

              {/* PIN dots */}
              <div className="flex items-center justify-center gap-3 mb-5">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`w-3.5 h-3.5 rounded-full ${pin.length > i ? 'bg-amber-400' : 'bg-white/15'}`} />
                ))}
              </div>

              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                {['1','2','3','4','5','6','7','8','9'].map(d => (
                  <button key={d} onClick={() => handleDigit(d)} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white text-lg font-medium transition-colors">{d}</button>
                ))}
                <div />
                <button onClick={() => handleDigit('0')} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white text-lg font-medium transition-colors">0</button>
                <button onClick={handleDelete} className="h-12 rounded-xl hover:bg-white/10 text-white/70 text-sm flex items-center justify-center">⌫</button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep('confirm'); setPin(''); setError(''); }} className="flex-1 border-white/15 bg-transparent text-white hover:bg-white/10">Back</Button>
                <Button onClick={submitPin} disabled={busy || pin.length !== 4} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim'}
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/15 flex items-center justify-center mb-4">
                <Check className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Ownership claimed</h3>
              <p className="text-white/60 text-sm mb-6">This device now boots into full administrator mode on every boot. This cannot be undone.</p>
              <Button onClick={onClose} className="w-full bg-green-500 hover:bg-green-600 text-white">Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}