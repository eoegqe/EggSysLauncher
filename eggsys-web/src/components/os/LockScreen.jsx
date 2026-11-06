import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, AlertCircle, Loader2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ServerPicker from '@/components/os/ServerPicker';
import { seedSystem, systemFilePresent } from '@/lib/systemFiles';
import { requestEggSysRecovery } from '@/components/os/EggSysRecoveryLayer';

export default function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [time, setTime] = useState(new Date());
  const [showError, setShowError] = useState(true);
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

  const { data: user } = useQuery({
    queryKey: ['current-user-lock'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      // Check if E Account exists when required
      if (!userData?.e_account) {
        // User doesn't have E Account linked, they can still log in
        // but some features may be restricted
      }
      return userData;
    }
  });

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const hideError = localStorage.getItem('hideLockScreenError');
    if (hideError === 'true') {
      setShowError(false);
    }
  }, []);

  const checkPin = (value) => {
    if (!user?.pin) {
      onUnlock();
      return;
    }
    
    if (value === user.pin) {
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  React.useEffect(() => {
    if (pin.length === 4) {
      checkPin(pin);
    }
  }, [pin]);

  const wallpaperClasses = {
    gradient: 'from-indigo-600 via-purple-600 to-pink-600',
    blue: 'from-blue-600 via-cyan-600 to-teal-600',
    sunset: 'from-orange-500 via-red-500 to-pink-600',
    forest: 'from-green-600 via-emerald-600 to-teal-700'
  };

  const selectedWallpaper = user?.preferences?.wallpaper || 'gradient';

  if (signinState === 'loading') {
    return (
      <div className={`h-screen w-screen bg-gradient-to-br ${wallpaperClasses[selectedWallpaper]} flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }
  if (signinState === 'missing') {
    return (
      <div className={`h-screen w-screen bg-gradient-to-br ${wallpaperClasses[selectedWallpaper]} flex items-center justify-center`}>
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 w-96 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-white mb-2">signin.eaf not found</h2>
          <p className="text-white/70 text-sm">Sign-in service unavailable. Restore signin.eaf in E:\EggSys\System to unlock.</p>
          {/* The lock screen covers the whole system, so Files — the usual way
              into EggSysRE — is out of reach. This hands over to recovery,
              which restores the missing component and offers a restart. */}
          <button
            onClick={requestEggSysRecovery}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white text-sm font-semibold"
          >
            <Wrench className="w-4 h-4" />
            Restore with EggSysRE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen bg-gradient-to-br ${wallpaperClasses[selectedWallpaper]} flex items-center justify-center relative overflow-hidden`}>
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1614850523011-8f49ffc73908?w=1920&h=1080&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Time Display */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-20 text-center"
      >
        <h1 className="text-8xl font-bold text-white mb-2">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-2xl text-white/80">
          {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 w-96"
      >
        <div className="flex flex-col items-center mb-6">
          {user?.profile_picture ? (
            <img 
              src={user.profile_picture} 
              alt="Profile" 
              className="w-24 h-24 rounded-full object-cover mb-4 shadow-xl border-4 border-white/30"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-xl">
              <User className="w-12 h-12 text-white" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-white">@{user?.username || user?.email || 'User'}</h2>
          <p className="text-white/70 text-sm">{user?.full_name}</p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                type="password"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => {
                  setError('');
                  setPin(e.target.value.replace(/\D/g, ''));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                className="pl-10 bg-white/10 border-white/20 text-white text-center text-2xl tracking-widest placeholder:text-white/50 focus:border-white/40"
                autoFocus
              />
            </div>
            {error && showError && (
              <div className="mt-3 bg-red-500/20 border border-red-300/30 rounded-lg p-3">
                <p className="text-red-200 text-sm text-center mb-2">{error}</p>
                <label className="flex items-center justify-center gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        localStorage.setItem('hideLockScreenError', 'true');
                        setShowError(false);
                      }
                    }}
                    className="w-3 h-3"
                  />
                  Don't show this again
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <ServerPicker />
          <button
            onClick={() => base44.auth.logout()}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}