import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import JoinServerModal from '@/components/os/JoinServerModal';
import EggSysWord from '@/components/os/EggSysWord';
import RecoveryMode from '@/components/os/RecoveryMode';

const LOGO_URL = "https://media.base44.com/images/public/6946b759fb67abb9152e7314/c697387e9_file_000000006d3481f5be81064990edc01f.png";

const bootSequence = [
  { time: 0,    text: 'Initializing EggetSystem', progress: 0 },
  { time: 700,  text: 'Loading kernel modules', progress: 12 },
  { time: 1400, text: 'Mounting file systems', progress: 28 },
  { time: 2100, text: 'Initializing hardware drivers', progress: 42 },
  { time: 2800, text: 'Starting system services', progress: 58 },
  { time: 3500, text: 'Establishing network connections', progress: 72 },
  { time: 4200, text: 'Loading desktop environment', progress: 86 },
  { time: 4900, text: 'Finalizing startup', progress: 96 },
  { time: 5600, text: 'Welcome', progress: 100 }
];

export default function BootScreen({ onBootComplete }) {
  const { data: user } = useQuery({
    queryKey: ['boot-user'],
    queryFn: () => base44.auth.me(),
    retry: false
  });
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState(bootSequence[0].text);
  const [showLogo, setShowLogo] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const bootTimersRef = React.useRef([]);

  useEffect(() => {
    const t = setTimeout(() => setShowLogo(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Press [S] during boot to join a custom server
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === 's' && !showJoinModal) {
        e.preventDefault();
        setShowJoinModal(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showJoinModal]);

  useEffect(() => {
    const timers = [];
    bootSequence.forEach(({ time, text, progress }) => {
      timers.push(setTimeout(() => {
        setLoadingText(text);
        setProgress(progress);
      }, time));
    });
    timers.push(setTimeout(() => onBootComplete(), 6200));
    bootTimersRef.current = timers;
    return () => timers.forEach(clearTimeout);
  }, [onBootComplete]);

  // Press [~] during boot to enter recovery mode (pauses startup until exited)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '`' || e.key === '~') {
        if (!showRecovery) {
          e.preventDefault();
          bootTimersRef.current.forEach(clearTimeout);
          setShowRecovery(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showRecovery]);

  const handleRecoveryExit = () => {
    setShowRecovery(false);
    onBootComplete();
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#05060a] flex items-center justify-center select-none">
      {/* Ambient gradient glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vmax] h-[60vmax] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.18),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[40vmax] h-[40vmax] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.12),transparent_60%)] blur-3xl" />
        <div className="absolute top-0 right-0 w-[35vmax] h-[35vmax] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.12),transparent_60%)] blur-3xl" />
      </motion.div>

      {/* Subtle grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '56px 56px'
        }}
      />

      <div className="relative flex flex-col items-center px-6">
        {/* Logo with pulsing ring */}
        <motion.div
          className="relative mb-10"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={showLogo ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glow behind logo */}
          <motion.div
            className="absolute inset-0 rounded-full bg-indigo-500/30 blur-2xl"
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative w-56 h-28 rounded-2xl bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <img
              src={LOGO_URL}
              alt="EggetSystem Logo"
              className="w-48 h-20 object-contain drop-shadow-[0_0_18px_rgba(129,140,248,0.6)]"
            />
          </div>
        </motion.div>



        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={showLogo ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="text-indigo-300/70 text-sm tracking-[0.3em] uppercase mb-10"
        >
          Operating System
        </motion.p>

        {/* Loading text */}
        <div className="h-6 mb-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingText}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-slate-300 text-sm font-medium"
            >
              {loadingText}
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-block"
              >
                ...
              </motion.span>
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress track */}
        <div className="w-72 sm:w-96">
          <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-400"
              style={{ boxShadow: '0 0 12px rgba(129,140,248,0.7)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-indigo-300/60 text-[11px] tracking-wider">
              v{user?.os_version || '1.0.0'}
            </span>
            <span className="text-slate-400 text-[11px] tabular-nums tracking-wider">
              {progress}%
            </span>
          </div>
        </div>

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={showLogo ? { opacity: 1 } : {}}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-slate-600 text-[11px] mt-12 tracking-wider flex items-center gap-1"
        >
          © <EggSysWord height={11} /> · Theegget Creations
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={showLogo ? { opacity: 1 } : {}}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="text-indigo-400/40 text-[10px] mt-2 tracking-wider"
        >
          Press [S] to join a custom server
        </motion.p>

        {showSkip && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onBootComplete}
            className="mt-8 px-5 py-2 rounded-full text-xs font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
          >
            Skip Startup
          </motion.button>
        )}
      </div>

      <JoinServerModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />

      {showRecovery && <RecoveryMode onExit={handleRecoveryExit} />}
    </div>
  );
}