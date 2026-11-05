import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Images, Camera, ImagePlus, Trash2, X, Loader2, Plus, RefreshCw,
} from 'lucide-react';

// EggSys Photos — a mobile gallery. Photos are uploaded privately and their
// records are saved to the E-Account (`photos` array), so the same library
// appears on every device signed into the account.
export default function MobilePhotos({ onClose }) {
  const queryClient = useQueryClient();
  const [signedUrls, setSignedUrls] = useState({});
  const [view, setView] = useState('gallery'); // 'gallery' | 'capture'
  const [viewer, setViewer] = useState(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Zoom state for the photo viewer
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pinchRef = useRef(null); // { dist, midX, midY }
  const dragRef = useRef(null); // { startX, startY, posX, posY }
  const lastTapRef = useRef(0);
  const [uploading, setUploading] = useState(false);
  const [facing, setFacing] = useState('environment');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const photoBlobRef = useRef(null);
  const uploadInputRef = useRef(null);

  // Current user (self-contained — AppView doesn't pass user)
  const { data: user } = useQuery({
    queryKey: ['current-user-photos'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: 60000,
  });

  // Load E-Account + photo library
  const { data: eAccount, isLoading } = useQuery({
    queryKey: ['eaccount-photos', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const records = await base44.entities.EAccount.filter({ owner_email: user.email });
      return records[0] || null;
    },
    enabled: !!user?.email,
  });

  const photos = eAccount?.photos || [];
  const hasAccount = !!eAccount;

  // Resolve signed URLs for every photo so private files can render in <img>.
  useEffect(() => {
    let active = true;
    const missing = photos.filter((p) => p.file_uri && !signedUrls[p.id]);
    if (missing.length === 0) return;
    (async () => {
      const entries = await Promise.all(
        missing.map(async (p) => {
          try {
            const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
              file_uri: p.file_uri,
              expires_in: 3600,
            });
            return [p.id, signed_url];
          } catch {
            return [p.id, null];
          }
        })
      );
      if (!active) return;
      setSignedUrls((prev) => {
        const next = { ...prev };
        entries.forEach(([id, url]) => { if (url) next[id] = url; });
        return next;
      });
    })();
    return () => { active = false; };
  }, [photos, signedUrls]);

  // ---- Capture (live camera viewfinder) ----
  useEffect(() => {
    if (view !== 'capture') return;
    let active = true;
    (async () => {
      try {
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e) {
        toast.error(e.name === 'NotAllowedError' ? 'Camera permission denied' : 'Could not access camera');
        setView('gallery');
      }
    })();
    return () => { active = false; if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, [view, facing]);

  const shutter = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) { toast.error('Camera not ready'); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      photoBlobRef.current = blob;
      savePhoto(blob, `EggSys-photo-${Date.now()}.png`).then(() => {
        setView('gallery');
      });
    }, 'image/png');
  };

  const savePhoto = async (blob, filename) => {
    if (!hasAccount) { toast.error('Sign in to your E-Account to save photos'); return; }
    if (!blob) { toast.error('No image to save'); return; }
    setUploading(true);
    try {
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const newPhoto = {
        id: (crypto.randomUUID?.() || String(Date.now() + Math.random())),
        file_uri,
        name: filename,
        size: blob.size,
        added_at: new Date().toISOString(),
      };
      const updated = [...(eAccount.photos || []), newPhoto];
      await base44.entities.EAccount.update(eAccount.id, { photos: updated });
      queryClient.invalidateQueries({ queryKey: ['eaccount-photos'] });
      toast.success('Photo saved to your E-Account');
    } catch (e) {
      toast.error('Could not save photo');
    } finally {
      setUploading(false);
    }
  };

  const onUploadChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    savePhoto(file, file.name);
  };

  const deletePhoto = async (photo) => {
    try {
      const updated = photos.filter((p) => p.id !== photo.id);
      await base44.entities.EAccount.update(eAccount.id, { photos: updated });
      setSignedUrls((prev) => { const n = { ...prev }; delete n[photo.id]; return n; });
      setViewer(null);
      queryClient.invalidateQueries({ queryKey: ['eaccount-photos'] });
      toast.success('Photo deleted');
    } catch {
      toast.error('Could not delete photo');
    }
  };

  // ---- Capture view ----
  if (view === 'capture') {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex flex-col">
        <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-contain" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button onClick={() => setView('gallery')} className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <div className="safe-pb pb-6 flex items-center justify-center">
          <button
            onClick={shutter}
            disabled={uploading}
            className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-white border-4 border-white/40 flex items-center justify-center disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-7 h-7 text-black animate-spin" /> : <div className="w-14 h-14 rounded-full bg-white" />}
          </button>
        </div>
      </div>
    );
  }

  // ---- Gallery view ----
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600">
            <Images className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Photos</div>
            <div className="text-xs text-gray-500">
              {hasAccount ? `${photos.length} photo${photos.length === 1 ? '' : 's'} · E-Account` : 'E-Account required'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          disabled={!hasAccount || uploading}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white disabled:opacity-40 shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Gallery grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !hasAccount ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 text-gray-500">
            <Images className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">Sign in to your E-Account</p>
            <p className="text-xs mt-1">Photos save to your E-Account and sync across your devices.</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 text-gray-500">
            <Images className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No photos yet</p>
            <p className="text-xs mt-1">Tap + to take a photo or upload one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => { setControlsVisible(true); setScale(1); setPos({ x: 0, y: 0 }); setViewer(p); }}
                className="aspect-square rounded-md overflow-hidden bg-gray-200 relative"
              >
                {signedUrls[p.id] ? (
                  <img src={signedUrls[p.id]} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hidden upload input */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onUploadChange}
      />

      {/* Add sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-end" onClick={() => setShowAdd(false)}>
          <div className="w-full bg-white rounded-t-2xl p-4 pb-6 safe-pb" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
            <button
              onClick={() => { setShowAdd(false); setView('capture'); }}
              className="w-full flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Camera className="w-5 h-5 text-gray-700" />
              </div>
              <span className="text-sm font-medium text-gray-900">Take Photo</span>
            </button>
            <button
              onClick={() => { setShowAdd(false); uploadInputRef.current?.click(); }}
              className="w-full flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <ImagePlus className="w-5 h-5 text-gray-700" />
              </div>
              <span className="text-sm font-medium text-gray-900">Upload from Files</span>
            </button>
          </div>
        </div>
      )}

      {/* Viewer — full-screen photo with zoom + tap-to-toggle controls */}
      {viewer && (
        <div
          className="fixed inset-0 z-[300] bg-black overflow-hidden touch-none select-none"
          onPointerDown={(e) => {
            // Single tap → toggle controls; double tap → zoom toggle
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
              // double tap
              setScale((s) => (s > 1 ? 1 : 2.5));
              setPos({ x: 0, y: 0 });
              lastTapRef.current = 0;
            } else {
              lastTapRef.current = now;
              // start drag if zoomed
              if (scale > 1) {
                dragRef.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
              }
            }
          }}
          onPointerMove={(e) => {
            if (dragRef.current && scale > 1) {
              setPos({
                x: dragRef.current.posX + (e.clientX - dragRef.current.startX),
                y: dragRef.current.posY + (e.clientY - dragRef.current.startY),
              });
            }
          }}
          onPointerUp={() => {
            // If no drag happened and no double-tap, treat as tap → toggle controls
            if (dragRef.current && scale === 1) {
              setControlsVisible((v) => !v);
            }
            dragRef.current = null;
          }}
          onPointerLeave={() => { dragRef.current = null; }}
          onWheel={(e) => {
            e.preventDefault();
            setScale((s) => Math.min(Math.max(1, s - e.deltaY * 0.002), 5));
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const [t1, t2] = [e.touches[0], e.touches[1]];
              const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
              pinchRef.current = { dist, scale };
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinchRef.current) {
              const [t1, t2] = [e.touches[0], e.touches[1]];
              const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
              const newScale = Math.min(Math.max(1, (dist / pinchRef.current.dist) * pinchRef.current.scale), 5);
              setScale(newScale);
              if (newScale === 1) setPos({ x: 0, y: 0 });
            }
          }}
          onTouchEnd={() => { pinchRef.current = null; }}
        >
          {signedUrls[viewer.id] ? (
            <img
              src={signedUrls[viewer.id]}
              alt={viewer.name}
              draggable={false}
              className="w-full h-full object-cover transition-transform duration-150"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transformOrigin: 'center center',
              }}
            />
          ) : (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          )}

          {/* Top controls — fade in/out */}
          <div
            className={`absolute top-0 left-0 right-0 safe-pt pt-3 px-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent pb-6 transition-opacity duration-300 pointer-events-none ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setViewer(null); }}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white pointer-events-auto"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deletePhoto(viewer); }}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-red-400 pointer-events-auto"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom caption — fades with controls */}
          {viewer.name && (
            <div
              className={`absolute bottom-0 left-0 right-0 safe-pb pb-4 pt-6 px-4 text-center bg-gradient-to-t from-black/50 to-transparent text-xs text-white/80 transition-opacity duration-300 pointer-events-none ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
            >
              {viewer.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}