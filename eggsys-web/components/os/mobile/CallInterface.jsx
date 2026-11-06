import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { WebRTCManager } from '@/lib/webrtcManager';
import { base44 } from '@/api/base44Client';
import { getHomeScreenBackground } from '@/lib/themeUtils';
import { useVerifiedMap } from '@/hooks/useVerified';
import VerifiedBadge from '@/components/os/VerifiedBadge';
import { requestPermission } from '@/lib/appPermissions';
import { toast } from '@/lib/devToast';
import CallSlideToAnswer from './CallSlideToAnswer';
import CallAvatar from './CallAvatar';
import { RingtoneAudio } from '@/lib/ringtoneAudio';

export default function CallInterface({ call, currentUser, otherUser, onEndCall, onAcceptCall, onDeclineCall, isMinimized, onMinimize }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);
  const [duration, setDuration] = useState(0);
  const [webrtc, setWebrtc] = useState(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [micInterrupted, setMicInterrupted] = useState(false);
  const [liveCall, setLiveCall] = useState(call);
  const [isNearEar, setIsNearEar] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const processedCandidatesRef = useRef(new Set());
  const lastOfferRef = useRef(null);
  const lastAnswerRef = useRef(null);
  const webrtcRef = useRef(null);
  const ringtoneRef = useRef(null);
  const ringtoneAudioRef = useRef(null);
  const { isVerified } = useVerifiedMap();

  // Keep liveCall in sync with prop changes
  useEffect(() => { setLiveCall(call); }, [call]);

  // Subscribe to this call's real-time updates for signaling
  useEffect(() => {
    if (!call?.id) return;
    const unsubscribe = base44.entities.Call.subscribe((event) => {
      if (event.data?.id === call.id) {
        setLiveCall(event.data);
      }
    });
    return () => unsubscribe();
  }, [call?.id]);

  // Call duration timer
  useEffect(() => {
    if (liveCall?.status !== 'accepted') return;
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, [liveCall?.status]);

  // Auto-decline if no answer in 30s (recipient side)
  useEffect(() => {
    if (!liveCall || liveCall.status !== 'ringing' || liveCall.recipient_username !== currentUser?.username) return;
    const timeout = setTimeout(() => onDeclineCall(), 60000);
    return () => clearTimeout(timeout);
  }, [liveCall?.id, liveCall?.status]);

  // Auto-decline outgoing call after 30s if no answer (caller side)
  useEffect(() => {
    if (!liveCall || liveCall.status !== 'ringing' || liveCall.caller_username !== currentUser?.username) return;
    if (liveCall._isTest) return;
    const timeout = setTimeout(() => onDeclineCall(), 60000);
    return () => clearTimeout(timeout);
  }, [liveCall?.id, liveCall?.status]);

  // Process incoming SDP/ICE when liveCall updates
  useEffect(() => {
    const manager = webrtcRef.current;
    if (!manager || !liveCall || liveCall._isTest) return;

    const process = async () => {
      try {
        // Process offer (from the other side) — supports renegotiation by
        // comparing against the last-seen offer instead of a one-shot flag.
        if (liveCall.webrtc_sdp && liveCall.sdp_from !== currentUser.username && liveCall.webrtc_sdp !== lastOfferRef.current) {
          lastOfferRef.current = liveCall.webrtc_sdp;
          const remoteSDP = JSON.parse(liveCall.webrtc_sdp);
          if (remoteSDP?.type === 'offer') {
            await manager.handleOffer(remoteSDP);
            await manager.createAnswer();
            const answer = manager.peerConnection.localDescription;
            await base44.entities.Call.update(liveCall.id, {
              webrtc_sdp_answer: JSON.stringify(answer),
              answer_from: currentUser.username
            });
          }
        }

        // Process answer (from the other side) — also supports renegotiation.
        if (liveCall.webrtc_sdp_answer && liveCall.answer_from !== currentUser.username && liveCall.webrtc_sdp_answer !== lastAnswerRef.current) {
          lastAnswerRef.current = liveCall.webrtc_sdp_answer;
          await manager.handleAnswer(JSON.parse(liveCall.webrtc_sdp_answer));
        }

        // Add new ICE candidates
        if (liveCall.webrtc_candidates && manager.peerConnection?.remoteDescription) {
          const candidates = JSON.parse(liveCall.webrtc_candidates);
          for (const candidate of candidates) {
            const key = JSON.stringify(candidate);
            if (!processedCandidatesRef.current.has(key)) {
              processedCandidatesRef.current.add(key);
              await manager.addIceCandidate(candidate).catch(() => {});
            }
          }
        }
      } catch (e) {
        // Swallow signaling parse errors so they don't crash the call UI
      }
    };

    process().catch(() => {});
  }, [liveCall?.webrtc_sdp, liveCall?.webrtc_sdp_answer, liveCall?.webrtc_candidates]);

  // Initialize WebRTC when call is accepted
  useEffect(() => {
    if (!liveCall || !currentUser || liveCall.status !== 'accepted' || webrtcRef.current) return;
    if (liveCall._isTest) return; // Skip WebRTC for test calls

    // Stop the ringtone BEFORE initializing WebRTC. getUserMedia switches the
    // device to the voice-call audio mode (earpiece + echo cancellation), which
    // distorts any audio still playing through it. Pausing first keeps the
    // ringtone on the clean media output while it fades.
    if (ringtoneAudioRef.current) {
      ringtoneAudioRef.current.stop();
    }

    let mounted = true;

    const init = async () => {
      try {
        const isInitiator = liveCall.caller_username === currentUser.username;
        const manager = new WebRTCManager(liveCall.id, isInitiator);

        manager.onLocalStream = (stream) => {
          if (mounted && localVideoRef.current) localVideoRef.current.srcObject = stream;
        };

        manager.onError = (type) => {
          if (type === 'mic_interrupted') setMicInterrupted(true);
        };

        manager.onRemoteStream = (stream) => {
          if (!mounted) return;
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.volume = 1;
            remoteAudioRef.current.play().catch(() => setAudioBlocked(true));
          }
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
          const hasVideo = stream.getVideoTracks().some(t => t.readyState === 'live');
          setRemoteVideoEnabled(hasVideo);
        };

        // Renegotiation: create a fresh offer whenever tracks change (initial
        // audio + later camera toggles). The initiator creates the initial
        // offer; either side may create a renegotiation offer.
        let negotiationCount = 0;
        manager.onNegotiationNeeded = async () => {
          negotiationCount++;
          if (negotiationCount === 1 && !isInitiator) return;
          try {
            await manager.createOffer();
            const offer = manager.peerConnection.localDescription;
            await base44.entities.Call.update(liveCall.id, {
              webrtc_sdp: JSON.stringify(offer),
              sdp_from: currentUser.username
            });
          } catch (e) {
            // Swallow so a failed renegotiation doesn't crash the call
          }
        };

        await manager.initialize();

        const iceCandidates = [];
        manager.peerConnection.onicecandidate = async (event) => {
          if (event.candidate) {
            iceCandidates.push(event.candidate.toJSON());
            await base44.entities.Call.update(liveCall.id, {
              webrtc_candidates: JSON.stringify(iceCandidates)
            }).catch(() => {});
          }
        };

        if (mounted) {
          webrtcRef.current = manager;
          setWebrtc(manager);
        }
      } catch (e) {
        // getUserMedia or WebRTC setup can fail (permission denied, no device).
        // Swallow so the call UI stays alive instead of crashing to a WSOD.
        console.error('[CallInterface] WebRTC init failed', e);
      }
    };

    init();

    return () => { mounted = false; };
  }, [liveCall?.status, liveCall?.id, currentUser?.username]);

  // Rhythmic vibration on incoming call: visually shake the screen and pulse
  // the device's haptic motor (if supported) while the phone is ringing.
  useEffect(() => {
    if (!liveCall || liveCall.status !== 'ringing' || liveCall.recipient_username !== currentUser?.username) return;
    if (liveCall._isTest) return;
    if (localStorage.getItem('eos_vibrate_enabled') === 'false') return;

    // Real device vibration: pattern of vibrate-pause pairs, repeated.
    const pattern = [400, 200, 400, 200, 400, 600];
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
      const interval = setInterval(() => navigator.vibrate(pattern), pattern.reduce((a, b) => a + b, 0));
      return () => { clearInterval(interval); navigator.vibrate(0); };
    }
  }, [liveCall?.id, liveCall?.status, currentUser?.username]);

  // Play ringtone on incoming call — routed through the Web Audio API so it
  // plays through the media/speaker output, NOT the call/earpiece audio route.
  useEffect(() => {
    if (!liveCall || liveCall.status !== 'ringing' || liveCall.recipient_username !== currentUser?.username) return;
    if (liveCall._isTest) return; // test toast already played the ringtone; stop when full screen opens
    if (!currentUser?.ringtone_url) return;

    if (!ringtoneAudioRef.current) {
      ringtoneAudioRef.current = new RingtoneAudio();
    }
    const ringtone = ringtoneAudioRef.current;
    ringtone.play(currentUser.ringtone_url, true);

    // Unlock blocked autoplay without rewinding the clip on a tap or swipe.
    const resume = () => ringtone.resume();
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('touchstart', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });

    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('touchstart', resume);
      window.removeEventListener('keydown', resume);
      ringtone.stop();
    };
  }, [liveCall?.id, liveCall?.status, currentUser?.ringtone_url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      webrtcRef.current?.close();
      ringtoneAudioRef.current?.destroy();
    };
  }, []);

  // Proximity-like behavior: black out the screen during an active audio call
  // (like holding the phone to your ear). Uses the real proximity sensor where
  // the browser exposes one; otherwise auto-dims after a few seconds and wakes
  // on tap, mimicking real phone behavior. Skipped while video is active.
  useEffect(() => {
    if (liveCall?.status !== 'accepted') { setIsNearEar(false); return; }
    const hasVideo = isVideoEnabled || remoteVideoEnabled;
    const deviceHandler = (e) => setIsNearEar(e.value < (e.max || 5));
    const userHandler = (e) => setIsNearEar(e.near);
    window.addEventListener('deviceproximity', deviceHandler);
    window.addEventListener('userproximity', userHandler);

    let timer = null;
    const scheduleDim = () => { if (!hasVideo) timer = setTimeout(() => setIsNearEar(true), 5000); };
    const wake = () => { setIsNearEar(false); clearTimeout(timer); scheduleDim(); };
    scheduleDim();
    window.addEventListener('touchstart', wake, { passive: true });
    window.addEventListener('click', wake);

    return () => {
      window.removeEventListener('deviceproximity', deviceHandler);
      window.removeEventListener('userproximity', userHandler);
      window.removeEventListener('touchstart', wake);
      window.removeEventListener('click', wake);
      clearTimeout(timer);
    };
  }, [liveCall?.status, isVideoEnabled, remoteVideoEnabled]);

  // Route remote call audio to the earpiece (top speaker) when the browser
  // exposes one. Best-effort: falls back to the default output otherwise.
  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el || !el.setSinkId) return;
    let cancelled = false;
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(d => d.kind === 'audiooutput');
        const earpiece = outputs.find(d => /earpiece|receiver|phone|communication/i.test(d.label));
        if (!cancelled && earpiece) {
          await el.setSinkId(earpiece.deviceId).catch(() => {});
        }
      } catch (e) {}
    })();
    return () => { cancelled = true; };
  }, [liveCall?.status]);

  // A self-call (calling yourself) has only one peer connection on one
  // device — there is no remote side to answer, so the remote stream never
  // arrives. Mirror the local camera into the remote view so you see your
  // camera on "both sides".
  const isSelfCall = liveCall?.caller_username === liveCall?.recipient_username;

  // Attach the local stream to the local <video> once it's rendered (the
  // element only mounts after isVideoEnabled flips true, which can happen
  // after onLocalStream already fired).
  useEffect(() => {
    if (isVideoEnabled && localVideoRef.current && webrtcRef.current?.localStream) {
      localVideoRef.current.srcObject = webrtcRef.current.localStream;
    }
  }, [isVideoEnabled]);

  // Attach the remote stream to the remote <video> once it's rendered.
  useEffect(() => {
    if (remoteVideoEnabled && remoteVideoRef.current && webrtcRef.current?.peerConnection) {
      const receivers = webrtcRef.current.peerConnection.getReceivers();
      const videoTrack = receivers.find(r => r.track?.kind === 'video')?.track;
      if (videoTrack) {
        const stream = new MediaStream([videoTrack]);
        remoteVideoRef.current.srcObject = stream;
      }
    }
  }, [remoteVideoEnabled]);

  // Self-call: mirror the local camera into the remote video area.
  useEffect(() => {
    if (isSelfCall && remoteVideoRef.current && webrtcRef.current?.localStream) {
      remoteVideoRef.current.srcObject = webrtcRef.current.localStream;
    }
  }, [isSelfCall, isVideoEnabled]);

  // Self-call: mirror the local mic into the remote audio element so you can
  // hear yourself. The peer connection never establishes in a self-call (the
  // offer/answer exchange is blocked by the sdp_from === currentUser check),
  // so without this the mic appears dead until the camera is turned on (which
  // only mirrors video, not audio).
  useEffect(() => {
    if (isSelfCall && remoteAudioRef.current && webrtcRef.current?.localStream) {
      remoteAudioRef.current.srcObject = webrtcRef.current?.localStream;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1;
      remoteAudioRef.current.play().catch(() => setAudioBlocked(true));
    }
  }, [isSelfCall, webrtcRef.current?.localStream]);

  const toggleVideo = async () => {
    const manager = webrtcRef.current;
    if (!manager) {
      setIsVideoEnabled(!isVideoEnabled);
      return;
    }
    try {
      if (!isVideoEnabled) {
        const granted = await requestPermission('phone', 'Phone', 'camera');
        if (granted !== 'while_using' && granted !== 'only_once') {
          toast.error('Camera permission denied');
          return;
        }
        await manager.enableVideo();
        setIsVideoEnabled(true);
        if (isSelfCall) setRemoteVideoEnabled(true);
      } else {
        await manager.disableVideo();
        setIsVideoEnabled(false);
        if (isSelfCall) setRemoteVideoEnabled(false);
      }
    } catch (e) {
      const msg = e.name === 'NotAllowedError' ? 'Camera permission denied'
        : e.name === 'OverconstrainedError' ? 'Camera not compatible with this device'
        : e.name === 'NotFoundError' ? 'No camera found'
        : 'Failed to toggle camera';
      toast.error(msg);
    }
  };

  if (!liveCall || !currentUser) return null;

  // Minimized — render nothing (the pill button in taskbar/statusbar handles re-opening)
  if (isMinimized) return null;

  const useHomeBackground = localStorage.getItem('eos_use_home_background') !== 'false';
  const bg = useHomeBackground ? getHomeScreenBackground(currentUser) : { className: 'bg-black', style: {} };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const otherUsername = liveCall.caller_username === currentUser.username ? liveCall.recipient_username : liveCall.caller_username;

  // Incoming call (ringing, recipient side)
  if (liveCall.status === 'ringing' && liveCall.recipient_username === currentUser.username) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className={`fixed inset-0 ${bg.className} z-[999] flex flex-col items-center justify-between p-4`}
        style={bg.style}
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <CallAvatar otherUser={otherUser} className="w-32 h-32 bg-white/20" iconClass="w-16 h-16" />
          </motion.div>
          <div className="text-center">
            {otherUser?.caller_id ? (
              <p className="text-white/90 text-xl font-medium flex items-center gap-1.5 justify-center">{otherUser.caller_id}{isVerified(liveCall.caller_username) && <VerifiedBadge size={16} />}</p>
            ) : (
              <>
                <p className="text-white/90 text-xl font-medium flex items-center gap-1.5 justify-center">@{liveCall.caller_username}{isVerified(liveCall.caller_username) && <VerifiedBadge size={16} />}</p>
                {otherUser?.full_name && <p className="text-white/60 text-base mt-2">{otherUser.full_name}</p>}
              </>
            )}
          </div>
        </div>
        <CallSlideToAnswer onAnswer={onAcceptCall} onDecline={onDeclineCall} />
      </motion.div>
    );
  }

  // Outgoing call (ringing, caller side)
  if (liveCall.status === 'ringing' && liveCall.caller_username === currentUser.username) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className={`fixed inset-0 ${bg.className} z-[999] flex flex-col items-center justify-center gap-8 p-4`}
        style={bg.style}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <CallAvatar otherUser={otherUser} className="w-32 h-32 bg-white/10" iconClass="w-16 h-16" />
        </motion.div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-1.5 justify-center">@{otherUsername}{isVerified(otherUsername) && <VerifiedBadge size={16} />}</h2>
          <motion.p
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="text-white/60 text-lg"
          >
            Calling...
          </motion.p>
        </div>
        <Button onClick={onEndCall} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600" size="icon">
          <PhoneOff className="w-7 h-7 text-white" />
        </Button>
      </motion.div>
    );
  }

  // Active call
  if (liveCall.status === 'accepted') {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className={`fixed inset-0 ${bg.className} z-[999] flex flex-col items-center justify-between p-6`}
        style={bg.style}
      >
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {isNearEar && <div className="absolute inset-0 bg-black z-40" />}

        {remoteVideoEnabled && (
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover [transform:scaleX(-1)]" />
        )}
        {isVideoEnabled && (
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-20 right-4 w-24 h-32 bg-black/50 rounded-lg border-2 border-white object-cover z-10 [transform:scaleX(-1)]" />
        )}

        <div className="flex-1 flex flex-col items-center justify-center gap-6 pt-8 z-20 relative">
          {!(remoteVideoEnabled || (isSelfCall && isVideoEnabled)) && (
            <>
              <CallAvatar otherUser={otherUser} className="w-32 h-32 bg-white/20" iconClass="w-16 h-16" />

              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-1.5 justify-center">{otherUser?.caller_id || `@${otherUsername}`}{isVerified(otherUsername) && <VerifiedBadge size={16} />}</h2>
                <p className="text-white/60 text-lg">{formatTime(duration)}</p>
              </div>
            </>
          )}
        </div>

        {audioBlocked && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
            <Button
              onClick={() => { remoteAudioRef.current?.play(); setAudioBlocked(false); }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-3 rounded-lg"
            >
              🔊 Tap to unmute audio
            </Button>
          </div>
        )}

        {micInterrupted && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 w-72">
            <div className="bg-red-500/90 text-white text-sm text-center px-4 py-2 rounded-lg">
              🎤 Mic was interrupted (app went to background). Rejoin the call to restore audio.
            </div>
          </div>
        )}

        <div className="flex gap-6 items-center justify-center pb-8 z-20 relative">
          <Button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              webrtcRef.current?.setMuted(next);
            }}
            className={`w-14 h-14 rounded-full ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'}`}
            size="icon"
          >
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </Button>

          <Button
            onClick={() => { webrtcRef.current?.close(); onEndCall(); }}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
            size="icon"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </Button>

          <Button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full ${isVideoEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/20 hover:bg-white/30'}`}
            size="icon"
          >
            {isVideoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
          </Button>
        </div>

        {onMinimize && (
          <button onClick={onMinimize} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/20 hover:bg-white/30">
            <Minimize2 className="w-5 h-5 text-white" />
          </button>
        )}
      </motion.div>
    );
  }

  return null;
}