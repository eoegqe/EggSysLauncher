import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import CallInterface from './CallInterface';
import { openPiP, closePiP, hasPiP } from '@/lib/pipManager';

export default function GlobalCallMonitor({ currentUser, onActiveCallChange, platform, currentApp }) {
  const [activeCall, setActiveCall] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [users, setUsers] = useState([]);
  const activeCallRef = useRef(null);
  const callNotificationRef = useRef(null);
  const acceptedCallIdsRef = useRef(new Set());
  const missedCallNotifiedRef = useRef(new Set());
  const [showCallFromNotif, setShowCallFromNotif] = useState(false);
  const callSwRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Listen for reopen event from taskbar/statusbar
  useEffect(() => {
    const handler = () => {
      setIsMinimized(false);
      closePiP(`call-${activeCallRef.current?.id}`);
    };
    window.addEventListener('eos_reopen_call', handler);
    return () => window.removeEventListener('eos_reopen_call', handler);
  }, []);

  // Register a dedicated service worker for incoming-call notifications so
  // we can handle notificationclick (tap) to reveal the call screen. Also
  // listen for focus/visibility — tapping the notification focuses the app,
  // which reveals the call screen.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/call-sw.js', { scope: '/call-sw/' })
      .then(reg => { callSwRef.current = reg; })
      .catch(() => {});

    const onMessage = (event) => {
      if (event.data?.type === 'CALL_NOTIFICATION_CLICK') setShowCallFromNotif(true);
    };
    const showCall = () => {
      const call = activeCallRef.current;
      if (call && call.status === 'ringing' && call.recipient_username === currentUser?.username) {
        setShowCallFromNotif(true);
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') showCall(); };

    navigator.serviceWorker.addEventListener('message', onMessage);
    window.addEventListener('focus', showCall);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
      window.removeEventListener('focus', showCall);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUser?.username]);

  // Reset the notification-tap gate when the active call changes
  useEffect(() => {
    setShowCallFromNotif(false);
  }, [activeCall?.id]);

  // Load users once
  useEffect(() => {
    if (!currentUser?.username) return;
    base44.entities.User.list().then(setUsers);
  }, [currentUser?.username]);

  // Subscribe to Call entity changes in real-time
  useEffect(() => {
    if (!currentUser?.username) return;

    const unsubscribe = base44.entities.Call.subscribe((event) => {
      const call = event.data;
      if (!call) return;

      const isMyCall = call.caller_username === currentUser.username ||
                       call.recipient_username === currentUser.username;
      if (!isMyCall) return;

      // Auto-decline incoming calls from blocked users
      if (call.status === 'ringing' &&
          call.recipient_username === currentUser.username &&
          (currentUser.blocked_usernames || []).includes(call.caller_username)) {
        base44.entities.Call.update(call.id, { status: 'declined', ended_at: new Date().toISOString() }).catch(() => {});
        return;
      }

      if (call.status === 'ringing' || call.status === 'accepted') {
        setActiveCall(call);
        setIsMinimized(false); // always un-minimize on new/updated call
        if (call.status === 'accepted') {
          acceptedCallIdsRef.current.add(call.id);
          if (callNotificationRef.current) {
            callNotificationRef.current.close();
            callNotificationRef.current = null;
          }
          // Call answered — delete the incoming-call notification
          base44.entities.Notification.deleteMany({ related_id: call.id, recipient_username: currentUser.username }).catch(() => {});
        }
      } else if (call.status === 'ended' || call.status === 'declined') {
        if (callNotificationRef.current) {
          callNotificationRef.current.close();
          callNotificationRef.current = null;
        }
        // Call declined — delete the incoming-call notification
        if (call.status === 'declined') {
          base44.entities.Notification.deleteMany({ related_id: call.id, recipient_username: currentUser.username }).catch(() => {});
        }
        // Missed call: recipient never accepted the call
        if (call.status === 'ended' &&
            call.recipient_username === currentUser.username &&
            !acceptedCallIdsRef.current.has(call.id) &&
            !missedCallNotifiedRef.current.has(call.id)) {
          missedCallNotifiedRef.current.add(call.id);
          base44.entities.Notification.create({
            title: 'Missed call',
            message: `Missed call from @${call.caller_username}`,
            recipient_username: currentUser.username,
            type: 'message',
            related_id: call.id,
            read: false
          }).catch(() => {});
        }

        if (sessionStorage.getItem('eos_outgoing_call') === call.id) sessionStorage.removeItem('eos_outgoing_call');
        if (sessionStorage.getItem('eos_accepted_call') === call.id) sessionStorage.removeItem('eos_accepted_call');
        if (activeCallRef.current?.id === call.id) {
          setActiveCall(null);
          setIsMinimized(false);
        }
      }
    });

    const fetchExisting = async () => {
      const allCalls = await base44.entities.Call.list('-created_date', 20);
      const myCall = allCalls.find(c =>
        (c.caller_username === currentUser.username || c.recipient_username === currentUser.username) &&
        (c.status === 'ringing' || c.status === 'accepted')
      );
      if (myCall) setActiveCall(myCall);
    };
    fetchExisting();

    return () => unsubscribe();
  }, [currentUser?.username]);

  // Desktop notification for incoming calls
  const notifiedCallIdRef = useRef(null);
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'ringing' || activeCall.recipient_username !== currentUser?.username) return;
    if (notifiedCallIdRef.current === activeCall.id) return;
    // On PC the call UI always appears directly, so no toast is required.
    if (platform === 'desktop') return;
    // Self-call: the caller side shows the call screen directly — no notification.
    if (activeCall.caller_username === activeCall.recipient_username) return;
    // On the home screen the call screen appears directly — no notification needed.
    if (!currentApp) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    notifiedCallIdRef.current = activeCall.id;

    let cancelled = false;
    const caller = users.find(u => u.username === activeCall.caller_username);
    const body = `${caller?.caller_id || caller?.full_name || `@${activeCall.caller_username}`} is calling you`;
    const tag = `call-${activeCall.id}`;
    const notifOptions = { body, tag, requireInteraction: true };

    // PWA/Chrome web app forbids `new Notification(...)` ("Illegal constructor").
    // Prefer the service-worker path; fall back to the constructor only where
    // it's legal. Either way, never throw — a failed OS notification must not
    // crash the call screen.
    (async () => {
      let swReg = callSwRef.current;
      if (!swReg && 'serviceWorker' in navigator) {
        try { swReg = await navigator.serviceWorker.getRegistration(); } catch {}
      }

      const handle = {
        close: async () => {
          try {
            if (swReg && typeof swReg.getNotifications === 'function') {
              const list = await swReg.getNotifications({ tag });
              list.forEach(n => n.close());
            }
          } catch {}
          try { handle.constructorClose?.(); } catch {}
        },
        constructorClose: null
      };

      try {
        if (swReg && typeof swReg.showNotification === 'function') {
          await swReg.showNotification('Incoming Call', notifOptions);
        } else {
          const n = new Notification('Incoming Call', notifOptions);
          handle.constructorClose = () => n.close();
          n.onclose = () => clearTimeout(autoClose);
          n.onclick = () => { n.close(); setShowCallFromNotif(true); };
        }
      } catch {}

      if (cancelled) { handle.close(); return; }
      callNotificationRef.current = handle;

      const autoClose = setTimeout(() => {
        handle.close();
        callNotificationRef.current = null;
      }, 35000);
    })();

    return () => { cancelled = true; };
  }, [activeCall?.id, activeCall?.status, users]);

  // Auto-decline unanswered incoming calls after 60s (recipient side only).
  // Setting status to 'ended' lets the existing missed-call logic fire.
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'ringing') return;
    if (activeCall.recipient_username !== currentUser?.username) return;
    const timer = setTimeout(() => {
      base44.entities.Call.update(activeCall.id, { status: 'ended', ended_at: new Date().toISOString() }).catch(() => {});
    }, 60000);
    return () => clearTimeout(timer);
  }, [activeCall?.id, activeCall?.status, currentUser?.username]);

  // Determine whether to show the call UI (pure calculation, no side effects)
  const isCallerOfCall = activeCall?.caller_username === currentUser.username;
  const isRecipientOfCall = activeCall?.recipient_username === currentUser.username;
  const shouldShowCallUI = (() => {
    if (!activeCall) return false;
    if (activeCall.status === 'ringing') {
      if (isCallerOfCall && sessionStorage.getItem('eos_outgoing_call') === activeCall.id) return true;
      if (isRecipientOfCall) {
        if (platform === 'desktop') return true;
        if (!('Notification' in window) || Notification.permission !== 'granted') return true;
        // On the home screen (no app open), show the call screen directly.
        // Inside an app, show a notification instead — the call screen appears
        // when the user taps the notification or returns to the home screen.
        if (!currentApp) return true;
        return showCallFromNotif;
      }
      if (isCallerOfCall) return sessionStorage.getItem('eos_outgoing_call') === activeCall.id;
    }
    if (activeCall.status === 'accepted') {
      return sessionStorage.getItem('eos_outgoing_call') === activeCall.id ||
             sessionStorage.getItem('eos_accepted_call') === activeCall.id;
    }
    return false;
  })();

  // Notify parent of live-call state via effect (NOT during render — calling
  // a parent setState during render triggers "Cannot update a component
  // while rendering a different component" and can crash the app).
  useEffect(() => {
    if (onActiveCallChange) {
      onActiveCallChange(shouldShowCallUI ? activeCall : null);
    }
  }, [shouldShowCallUI, activeCall, onActiveCallChange]);

  // Dismiss the notification once the call screen is revealed (either via
  // notification tap or by returning to the home screen where the call UI
  // appears directly).
  useEffect(() => {
    if (shouldShowCallUI && callNotificationRef.current) {
      callNotificationRef.current.close();
      callNotificationRef.current = null;
    }
  }, [showCallFromNotif, shouldShowCallUI]);

  if (!activeCall || !currentUser?.username || !shouldShowCallUI) {
    return null;
  }

  const otherUser = activeCall.caller_username === currentUser.username
    ? users.find(u => u.username === activeCall.recipient_username)
    : users.find(u => u.username === activeCall.caller_username);

  const otherUsername = activeCall.caller_username === currentUser.username
    ? activeCall.recipient_username
    : activeCall.caller_username;

  // Self-test call: caller === recipient. When the PC Sandbox is open, keep
  // the mobile call UI hidden so the user answers from the sandbox instead.
  const isSelfCall = activeCall.caller_username === currentUser.username &&
                     activeCall.recipient_username === currentUser.username;
  if (isSelfCall && sessionStorage.getItem('eos_pc_sandbox_open') === 'true') {
    return null;
  }

  return (
    <CallInterface
      call={activeCall}
      currentUser={currentUser}
      otherUser={otherUser || { username: otherUsername }}
      isMinimized={isMinimized}
      onMinimize={() => {
        setIsMinimized(true);
        // Open a PiP mini-window for the active call
        const callId = activeCall.id;
        const otherUsername = activeCall.caller_username === currentUser.username
          ? activeCall.recipient_username
          : activeCall.caller_username;
        openPiP({
          id: `call-${callId}`,
          title: `Call · @${otherUsername}`,
          type: 'call',
          render: () => (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-green-600 to-emerald-700 gap-1.5">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold text-white">
                {otherUsername?.[0]?.toUpperCase()}
              </div>
              <p className="text-[10px] text-white/80 font-medium">@{otherUsername}</p>
              <p className="text-[9px] text-white/50">Tap to return</p>
            </div>
          ),
          onExpand: () => {
            setIsMinimized(false);
          },
          onClose: async () => {
            await base44.entities.Call.update(callId, { status: 'ended', ended_at: new Date().toISOString() });
            sessionStorage.removeItem('eos_outgoing_call');
            sessionStorage.removeItem('eos_accepted_call');
            setActiveCall(null);
            setIsMinimized(false);
          },
        });
      }}
      onMaximize={() => setIsMinimized(false)}
      onEndCall={async () => {
        await base44.entities.Call.update(activeCall.id, { status: 'ended', ended_at: new Date().toISOString() });
        sessionStorage.removeItem('eos_outgoing_call');
        sessionStorage.removeItem('eos_accepted_call');
        setActiveCall(null);
        setIsMinimized(false);
      }}
      onAcceptCall={async () => {
        const updated = await base44.entities.Call.update(activeCall.id, { status: 'accepted' });
        sessionStorage.setItem('eos_accepted_call', activeCall.id);
        sessionStorage.removeItem('eos_outgoing_call');
        setActiveCall(updated);
      }}
      onDeclineCall={async () => {
        await base44.entities.Call.update(activeCall.id, { status: 'declined', ended_at: new Date().toISOString() });
        sessionStorage.removeItem('eos_accepted_call');
        setActiveCall(null);
        setIsMinimized(false);
      }}
    />
  );
}