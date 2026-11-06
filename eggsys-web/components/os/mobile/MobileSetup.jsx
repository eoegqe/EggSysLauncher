import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/devToast';
import { motion, AnimatePresence } from 'framer-motion';
import { processReferral } from '@/lib/referralUtils';
import ESimSetup from './ESimSetup';
import EggSysWord from '@/components/os/EggSysWord';
import { completeGuestSetup } from '@/lib/guestSetup';
import { fetchEAccount } from '@/lib/eaccountSync';

const wallpaperOptions = [
  { id: 'gradient', name: 'Purple', bg: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600' },
  { id: 'blue', name: 'Blue', bg: 'bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600' },
  { id: 'sunset', name: 'Sunset', bg: 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-600' },
  { id: 'forest', name: 'Forest', bg: 'bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700' }
];

export default function MobileSetup({ onComplete, guest = false }) {
  const [step, setStep] = useState(1);
  const [wallpaper, setWallpaper] = useState('gradient');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleComplete = async () => {
    if (step === 2 && pin && pin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }

    if (step === 2 && pin && pin.length !== 4) {
      toast.error('PIN must be 4 digits');
      return;
    }

    try {
      if (guest) {
        // Guests have no Base44 user record — persist setup locally.
        completeGuestSetup({ preferences: { wallpaper }, pin: pin || null });
        toast.success('Setup complete!');
        onComplete();
        return;
      }
      await base44.auth.updateMe({
        setup_completed: true,
        preferences: { wallpaper },
      });
      // Save the PIN to the E-Account so it syncs across all devices on
      // this account (special case: PIN lives on the E-Account, not the
      // Base44 user record, and is re-synced on every unlock).
      if (pin) {
        try {
          const me = await base44.auth.me();
          const acct = await fetchEAccount(me, base44);
          if (acct) await base44.entities.EAccount.update(acct.id, { pin });
        } catch (e) {
          console.warn('Failed to save PIN to E-Account', e);
        }
      }
      // Process any pending referral
      const freshUser = await base44.auth.me();
      await processReferral(freshUser);
      toast.success('Setup complete!');
      onComplete();
    } catch (error) {
      toast.error('Setup failed');
    }
  };

  const nextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      handleComplete();
    }
  };

  return (
    <div className={`h-screen w-screen ${wallpaperOptions.find(w => w.id === wallpaper)?.bg} flex flex-col p-6`}>
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Welcome to <EggSysWord height={28} /></h1>
                <p className="text-white/80 mb-4">Let's personalize your experience</p>
                <div className="bg-blue-500/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20 mb-4">
                  <p className="text-white text-sm">
                    📱 <strong>Note:</strong> For the best experience, please use the PC edition of <EggSysWord height={12} />. Come back on a computer! For now, you can use this mobile version.
                  </p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Choose Wallpaper</h2>
                <div className="grid grid-cols-2 gap-3">
                  {wallpaperOptions.map((wp) => (
                    <button
                      key={wp.id}
                      onClick={() => setWallpaper(wp.id)}
                      className={`h-24 rounded-xl ${wp.bg} flex items-end p-3 border-2 transition-all ${
                        wallpaper === wp.id ? 'border-white scale-105' : 'border-transparent'
                      }`}
                    >
                      <span className="text-white text-sm font-medium">{wp.name}</span>
                      {wallpaper === wp.id && (
                        <Check className="w-5 h-5 text-white ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ESimSetup user={null} variant="setup" onActivated={() => {}} />
              <p className="text-white/60 text-xs text-center mt-4">You can skip this and set it up later in Settings → Mobile Network</p>
            </motion.div>
          ) : (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6">
                <h2 className="text-lg font-semibold text-white mb-2">Set Lock Screen PIN</h2>
                <p className="text-white/70 text-sm mb-4">Optional: Protect your device with a 4-digit PIN</p>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">PIN (Optional)</Label>
                    <Input
                      type="password"
                      maxLength={4}
                      placeholder="Enter 4 digits"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="mt-1 bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    />
                  </div>
                  {pin && (
                    <div>
                      <Label className="text-white">Confirm PIN</Label>
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="Confirm PIN"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="mt-1 bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between pt-6">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all ${
                s === step ? 'bg-white w-8' : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={nextStep}
          className="bg-white text-purple-600 hover:bg-white/90"
        >
          {step === 3 ? 'Finish' : 'Next'}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}