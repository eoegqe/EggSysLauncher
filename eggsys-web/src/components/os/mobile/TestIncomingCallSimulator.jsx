import React, { useState, useEffect, useRef } from 'react';
import { Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import CallInterface from '@/components/os/mobile/CallInterface';
import RingtonePlayer from '@/components/os/mobile/RingtonePlayer';

const TEST_USERNAME = 'test_call';
const DEFAULT_CALLER_ID = 'Test Call';

// Owner-only simulator: after being activated, waits 10s, then shows a
// call notification toast on the home screen just like a real incoming call.
// Tapping the toast body (not the buttons) opens the incoming call screen.
// Answer accepts the call; Decline / ending the call dismisses everything.
export default function TestIncomingCallSimulator({ active, currentUser, callerId, onComplete, esimActive = true }) {
  const [toastVisible, setToastVisible] = useState(false);
  const [liveCall, setLiveCall] = useState(null);
  const timerRef = useRef(null);
  const wasAnsweredRef = useRef(false);
  const displayName = (callerId && callerId.trim()) || DEFAULT_CALLER_ID;

  const createMissedCallNotification = () => {
    base44.entities.Notification.create({
      title: 'Missed call',
      message: `Missed call from ${displayName}`,
      recipient_username: currentUser.username,
      type: 'message',
      read: false
    }).catch(() => {});
  };

  // Start the 10s wait whenever activated
  useEffect(() => {
    if (!active) return;
    wasAnsweredRef.current = false;
    setToastVisible(false);
    setLiveCall(null);
    timerRef.current = setTimeout(() => setToastVisible(true), 10000);
    return () => clearTimeout(timerRef.current);
  }, [active]);

  // Auto-decline after 60s (ring timeout) — counts as a missed call
  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => {
      setToastVisible(false);
      createMissedCallNotification();
      onComplete();
    }, 60000);
    return () => clearTimeout(t);
  }, [toastVisible]);

  const dismissToast = () => {
    setToastVisible(false);
    createMissedCallNotification();
    onComplete();
  };

  // Tapping the toast body opens the incoming call screen (ringing state).
  // When eSIM is inactive the call cannot be answered, so the body is inert —
  // only the Decline button dismisses the toast.
  const openCallScreen = () => {
    if (!esimActive) return;
    setToastVisible(false);
    setLiveCall({
      id: `test_incoming_${Date.now()}`,
      caller_username: TEST_USERNAME,
      recipient_username: currentUser.username,
      status: 'ringing',
      _isTest: true
    });
  };

  const handleAnswer = () => {
    wasAnsweredRef.current = true;
    setToastVisible(false);
    setLiveCall({
      id: `test_incoming_${Date.now()}`,
      caller_username: TEST_USERNAME,
      recipient_username: currentUser.username,
      status: 'accepted',
      _isTest: true
    });
  };

  const handleEndCall = () => {
    if (!wasAnsweredRef.current) createMissedCallNotification();
    setLiveCall(null);
    onComplete();
  };

  // Auto-decline the live ringing call after 60s — counts as a missed call
  useEffect(() => {
    if (!liveCall || liveCall.status !== 'ringing') return;
    const t = setTimeout(() => {
      handleEndCall();
    }, 60000);
    return () => clearTimeout(t);
  }, [liveCall?.id, liveCall?.status]);

  // Live call screen (ringing or accepted) — WebRTC/DB skipped via _isTest
  if (liveCall) {
    return (
      <CallInterface
        call={liveCall}
        currentUser={currentUser}
        otherUser={{ username: TEST_USERNAME, caller_id: displayName }}
        onEndCall={handleEndCall}
        onAcceptCall={() => { wasAnsweredRef.current = true; setLiveCall(prev => prev ? { ...prev, status: 'accepted' } : prev); }}
        onDeclineCall={handleEndCall}
        isMinimized={false}
      />
    );
  }

  return (
    <>
    <RingtonePlayer active={toastVisible} ringtoneUrl={currentUser?.ringtone_url} />
    <AnimatePresence>
      {toastVisible && (
        <motion.div
          key="test-call-toast"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          onClick={openCallScreen}
          className="fixed top-12 left-2 right-2 z-[1100] bg-white rounded-2xl shadow-lg ring-1 ring-black/5 px-3 py-2.5 text-sm flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-slate-800 truncate">Incoming Call</p>
            <p className="text-xs text-slate-500 truncate">{displayName} is calling you</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); dismissToast(); }}
              className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
              title="Decline"
            >
              <Phone className="w-4 h-4 text-white rotate-[135deg]" />
            </button>
            {esimActive && (
              <button
                onClick={(e) => { e.stopPropagation(); handleAnswer(); }}
                className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
                title="Answer"
              >
                <Phone className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}