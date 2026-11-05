import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, AlertCircle, Cloud, Loader2 } from 'lucide-react';
import { toast } from '@/lib/devToast';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { requestPermission } from '@/lib/appPermissions';

export default function MobileCamera() {
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [saving, setSaving] = useState(false);
  const photoBlobRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const granted = await requestPermission('camera', 'Camera', 'camera');
        if (granted !== 'while_using' && granted !== 'only_once') { setError('Camera permission denied'); return; }
        if (stream) stream.getTracks().forEach(t => t.stop());
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e) {
        setError(e.name === 'NotAllowedError' ? 'Camera permission denied' : 'Could not access camera');
      }
    }
    start();
    return () => { active = false; };
  }, [facingMode]);

  useEffect(() => () => { if (stream) stream.getTracks().forEach(t => t.stop()); }, [stream]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      toast.error('Camera not ready');
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => { photoBlobRef.current = blob; }, 'image/png');
    const dataUrl = canvas.toDataURL('image/png');
    setPhoto(dataUrl);
  };

  const saveToECloud = async () => {
    if (!photo || saving) return;
    setSaving(true);
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
      const filename = `EggSys-photo-${stamp}.png`;
      const blob = photoBlobRef.current;
      if (!blob) { toast.error('Photo not ready, try retaking'); return; }
      const file = new File([blob], filename, { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ECloudFile.create({
        name: filename,
        type: 'file',
        file_url,
        size: blob.size,
        mime_type: 'image/png',
        parent_id: null,
        path: '/ECloud/' + filename
      });
      toast.success('Photo saved to ECloud');
      queryClient.invalidateQueries({ queryKey: ['ecloud-files'] });
      setPhoto(null);
    } catch (e) {
      toast.error('Save failed: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-black">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="font-semibold text-white mb-2">Camera Unavailable</h3>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {photo ? (
        <>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <img src={photo} alt="Captured" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex items-center justify-center gap-8 py-6 bg-black">
            <button onClick={() => setPhoto(null)} className="flex flex-col items-center gap-1 text-white">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-xs">Retake</span>
            </button>
            <button onClick={saveToECloud} disabled={saving} className="flex flex-col items-center gap-1 text-white">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center active:scale-95 transition-transform">
                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Cloud className="w-6 h-6" />}
              </div>
              <span className="text-xs">{saving ? 'Saving…' : 'Save to ECloud'}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 relative">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex items-center justify-center gap-8 py-6 bg-black">
            <button onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')} className="flex flex-col items-center gap-1 text-white">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform">
                <RefreshCw className="w-5 h-5" />
              </div>
              <span className="text-xs">Flip</span>
            </button>
            <button onClick={capture} className="flex flex-col items-center gap-1 text-white">
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform p-1">
                <div className="w-full h-full rounded-full bg-white" />
              </div>
              <span className="text-xs">Capture</span>
            </button>
            <div className="w-12" />
          </div>
        </>
      )}
    </div>
  );
}