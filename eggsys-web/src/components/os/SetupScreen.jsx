import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Monitor, Palette, Pin, ArrowRight, Check, Lock, Cloud, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from '@/lib/devToast';
import { processReferral } from '@/lib/referralUtils';

const wallpaperOptions = [
  { id: 'gradient', name: 'Purple Gradient', bg: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600' },
  { id: 'blue', name: 'Ocean Blue', bg: 'bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600' },
  { id: 'sunset', name: 'Sunset', bg: 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-600' },
  { id: 'forest', name: 'Forest', bg: 'bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700' }
];

const suggestedApps = [
  { id: 'files', name: 'File Explorer', icon: '📁', description: 'Manage your files' },
  { id: 'browser', name: 'Browser', icon: '🌐', description: 'Browse the web' },
  { id: 'terminal', name: 'Terminal', icon: '⌨️', description: 'Command line interface' },
  { id: 'appcreator', name: 'App Creator', icon: '✨', description: 'Create custom apps' },
  { id: 'appstore', name: 'App Store', icon: '📦', description: 'Install new apps' },
  { id: 'settings', name: 'Settings', icon: '⚙️', description: 'System settings' }
];

export default function SetupScreen({ onComplete }) {
   const [step, setStep] = useState(1);
   const [selectedWallpaper, setSelectedWallpaper] = useState('gradient');
   const [username, setUsername] = useState('');
   const [usernameError, setUsernameError] = useState('');
   const [pinnedApps, setPinnedApps] = useState(['files', 'browser', 'appstore']);
   const [pin, setPin] = useState('');
   const [confirmPin, setConfirmPin] = useState('');
   const [eAccount, setEAccount] = useState({ email: '', password: '' });
   const [isCompleting, setIsCompleting] = useState(false);

  const togglePin = (appId) => {
    setPinnedApps(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  const handleContinue = async () => {
    if (step === 2) {
      setUsernameError('');
      if (!username.trim()) {
        setUsernameError('Username is required');
        return;
      }
      if (username.length < 3 || username.length > 20) {
        setUsernameError('Username must be 3-20 characters');
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        setUsernameError('Username can only contain letters, numbers, underscores, and hyphens');
        return;
      }
    } else if (step === 3) {
      if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        toast.error('PIN must be 4 digits');
        return;
      }
      if (pin !== confirmPin) {
        toast.error('PINs do not match');
        return;
      }
    }
    setStep(step + 1);
  };

  const completeSetup = async () => {
    setIsCompleting(true);
    try {
      const updateData = {
        setup_completed: true,
        username: username,
        pinned_apps: pinnedApps,
        pin: pin,
        os_version: '1.0.0',
        preferences: {
          wallpaper: selectedWallpaper,
          theme: 'default'
        }
      };

      // Only add E Account if provided
      if (eAccount.email && eAccount.password) {
        updateData.e_account = eAccount;
      }

      await base44.auth.updateMe(updateData);
      // Process any pending referral
      const freshUser = await base44.auth.me();
      await processReferral(freshUser);
      onComplete();
    } catch (error) {
      console.error('Setup failed:', error);
      toast.error('Setup failed: ' + error.message);
      setIsCompleting(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center p-8 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-4"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome to EggetSystem</h1>
              <p className="text-white/80 mt-1">Let's personalize your experience</p>
            </div>
          </motion.div>
          
          {/* Progress */}
          <div className="flex gap-2 mt-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className={`h-1.5 rounded-full flex-1 transition-all ${
                  i <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Monitor className="w-8 h-8 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-800">Choose Your Wallpaper</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {wallpaperOptions.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => setSelectedWallpaper(wp.id)}
                    className={`relative h-40 rounded-xl overflow-hidden border-4 transition-all ${
                      selectedWallpaper === wp.id 
                        ? 'border-indigo-500 ring-4 ring-indigo-100 scale-105' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-full h-full ${wp.bg}`} />
                    {selectedWallpaper === wp.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="bg-white rounded-full p-2">
                          <Check className="w-6 h-6 text-indigo-600" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm text-white text-sm p-3 font-medium">
                      {wp.name}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <User className="w-8 h-8 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-800">Create Your Username</h2>
              </div>

              <p className="text-gray-600 mb-6">
                Choose a unique username to personalize your account
              </p>

              <div className="max-w-md mx-auto space-y-6">
                <div>
                  <label className="text-gray-700 font-medium mb-2 block">Username</label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setUsernameError('');
                    }}
                    placeholder="e.g., cool_user"
                    className="text-base"
                  />
                  {usernameError && <p className="text-red-500 text-sm mt-2">{usernameError}</p>}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-800 text-sm">
                    💡 Your username will be used for messaging and profiles. Use 3-20 characters with letters, numbers, underscores, or hyphens.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-8 h-8 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-800">Create Your Security PIN</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                Set a 4-digit PIN to secure your screen
              </p>

              <div className="max-w-md mx-auto space-y-6">
                <div>
                  <label className="text-gray-700 font-medium mb-2 block">Enter PIN</label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="____"
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                
                <div>
                  <label className="text-gray-700 font-medium mb-2 block">Confirm PIN</label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="____"
                    className="text-center text-2xl tracking-widest"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-800 text-sm">
                    💡 Remember your PIN! You'll need it to unlock your screen.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Pin className="w-8 h-8 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-800">Pin Your Favorite Apps</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                Select apps to pin to your taskbar for quick access
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {suggestedApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => togglePin(app.id)}
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
                      pinnedApps.includes(app.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl">{app.icon}</div>
                      {pinnedApps.includes(app.id) && (
                        <div className="bg-indigo-600 rounded-full p-1">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{app.name}</h3>
                    <p className="text-xs text-gray-500">{app.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Cloud className="w-8 h-8 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-800">E Account (Optional)</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                Link your E Account to sync files across devices with ECloud. You can skip this and set it up later in Settings.
              </p>

              <div className="max-w-md mx-auto space-y-6">
                <div>
                  <label className="text-gray-700 font-medium mb-2 block">E Account Email</label>
                  <Input
                    type="email"
                    value={eAccount.email}
                    onChange={(e) => setEAccount({ ...eAccount, email: e.target.value })}
                    placeholder="your@email.com"
                    className="text-base"
                  />
                </div>
                
                <div>
                  <label className="text-gray-700 font-medium mb-2 block">E Account Password</label>
                  <Input
                    type="password"
                    value={eAccount.password}
                    onChange={(e) => setEAccount({ ...eAccount, password: e.target.value })}
                    placeholder="••••••••"
                    className="text-base"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-800 text-sm">
                    💡 E Account enables ECloud file syncing across all your devices. You can skip this step and set it up later in Settings.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center space-y-6"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-6">
                <Check className="w-12 h-12 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-gray-800">You're All Set!</h2>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Your personalized EggetSystem experience is ready. Let's get started!
              </p>

              <div className="bg-gray-50 rounded-xl p-6 max-w-md mx-auto text-left">
                <h3 className="font-semibold text-gray-800 mb-3">Your Setup:</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username: @{username}
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Wallpaper: {wallpaperOptions.find(w => w.id === selectedWallpaper)?.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Security PIN: ••••
                  </div>
                  <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4" />
                    Pinned Apps: {pinnedApps.length} apps
                  </div>
                  {eAccount.email && (
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      E Account: Connected
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t bg-gray-50 flex justify-between">
          {step > 1 && step < 6 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          {step === 5 && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep(6)}
                className="text-gray-500"
              >
                Skip
              </Button>
              <Button
                onClick={handleContinue}
                className="ml-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
          {step < 5 && (
            <Button
              onClick={handleContinue}
              className="ml-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          {step === 6 && (
            <Button
              onClick={completeSetup}
              disabled={isCompleting}
              className="ml-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isCompleting ? 'Setting up...' : 'Start Using EggetSystem'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}