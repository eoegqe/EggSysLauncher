import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, AlertCircle, Fingerprint, Loader2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import ServerPicker from '@/components/os/ServerPicker';
import { getHomeScreenBackground } from '@/lib/themeUtils';
import { verifyFingerprint } from '@/lib/fingerprintAuth';
import { seedSystem, systemFilePresent } from '@/lib/systemFiles';
import { requestEggSysRecovery } from '@/components/os/EggSysRecoveryLayer';

export default function MobileLockScreen({ onUnlock, kidsMode = false, user: userProp }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [time, setTime] = useState(new Date());
  const [fpBusy, setFpBusy] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [signinState, setSigninState] = useState('loading');

  // The lock screen depends on signin.eaf — if the file is missing, the
  // sign-in service is unavailable and the lock screen cannot display.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const byPath = await seedSystem();
        const ok = systemFilePresent(byPath, 'E:\\EggSys\\System\\signin.eaf');
        if (!cancelled) setSigninState(ok ? 'ok' : 'missing');
      } catch {
        if (!cancelled) setSigninState('missing');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleFingerprintUnlock = async () => {
    if (fpBusy) return;
    setFpBusy(true);
    try {
      const ok = await verifyFingerprint();
      if (ok) onUnlock();
    } catch (e) {
      setError('Fingerprint not recognized');
    } finally {
      setFpBusy(false);
    }
  };

  const { data: queriedUser } = useQuery({
    queryKey: ['lock-screen-user'],
    queryFn: () => base44.auth.me(),
    enabled: !userProp,
  });
  const user = userProp || queriedUser;

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatically prompt the fingerprint passkey when the lock screen loads.
  React.useEffect(() => {
    if (!user?.fingerprint_enabled) return;
    let cancelled = false;
    const trigger = async () => {
      try {
        setFpBusy(true);
        const ok = await verifyFingerprint();
        if (!cancelled && ok) onUnlock();
      } catch (e) {
        // user dismissed or it failed — stay on lock screen
      } finally {
        if (!cancelled) setFpBusy(false);
      }
    };
    trigger();
    return () => { cancelled = true; };
  }, [user?.fingerprint_enabled]);

  const handleNumberClick = (num) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setError('');
    
    if (newPin.length === 4) {
      setTimeout(() => {
        if (user?.pin && newPin === user.pin) {
          onUnlock();
        } else if (!user?.pin) {
          onUnlock();
        } else {
          setError('Incorrect PIN');
          setPin('');
        }
      }, 100);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const bg = getHomeScreenBackground(user, 'r', kidsMode);

  if (signinState === 'loading') {
    return (
      <div className={`h-screen w-screen ${bg.className} flex flex-col items-center justify-center p-6`} style={bg.style}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }
  if (signinState === 'missing') {
    return (
      <div className={`h-screen w-screen ${bg.className} flex flex-col items-center justify-center p-6`} style={bg.style}>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center max-w-xs">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">signin.eaf not found</p>
          <p className="text-white/70 text-sm">Sign-in service unavailable. Restore signin.eaf in E:\EggSys\System to unlock.</p>
          {/* The lock screen covers the whole system, so Files — the usual way
              into EggSysRE — is out of reach. This hands over to recovery,
              which restores the missing component and offers a restart. */}
          <button
            onClick={requestEggSysRecovery}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold"
          >
            <Wrench className="w-4 h-4" />
            Restore with EggSysRE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen ${bg.className} flex flex-col items-center justify-center p-6`} style={bg.style}>
      {!showKeypad && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-12"
        >
          <div className="text-white text-6xl font-light mb-2">
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-white/80 text-lg">
            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </motion.div>
      )}

      <div className="w-full max-w-xs">
        {!showKeypad ? (
          <div className="flex flex-col items-center gap-4 mb-6">
            <button
              onClick={() => (kidsMode ? onUnlock() : setShowKeypad(true))}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center active:bg-white/30 transition-colors"
              title="Tap to unlock"
            >
              <Lock className="w-10 h-10 text-white" />
            </button>
            <p className="text-white/80 text-sm">Tap to unlock</p>
          </div>
        ) : (
        <>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center mb-6">
          {user?.profile_picture ? (
            <img 
              src={user.profile_picture} 
              alt="Profile" 
              className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          )}
          <p className="text-white/70 text-sm mb-4">Enter PIN to unlock</p>
          
          <div className="flex justify-center gap-3 mb-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  i < pin.length ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-red-300 text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="bg-white/20 backdrop-blur-sm text-white text-2xl font-light h-16 rounded-2xl active:bg-white/30 transition-colors"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleNumberClick('0')}
            className="bg-white/20 backdrop-blur-sm text-white text-2xl font-light h-16 rounded-2xl active:bg-white/30 transition-colors"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="bg-white/20 backdrop-blur-sm text-white text-lg font-light h-16 rounded-2xl active:bg-white/30 transition-colors"
          >
            ←
          </button>
        </div>

        </>)}

        <div className="flex justify-center mt-6 gap-4 items-center">
          <ServerPicker />
          {user?.fingerprint_enabled && (
            <button
              onClick={handleFingerprintUnlock}
              disabled={fpBusy}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center active:bg-white/30 transition-colors disabled:opacity-60"
              title="Unlock with fingerprint"
            >
              {fpBusy ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Fingerprint className="w-6 h-6 text-white" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}