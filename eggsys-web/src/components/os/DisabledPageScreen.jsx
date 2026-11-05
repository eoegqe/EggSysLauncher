import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';

const isMobileDevice = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  window.innerWidth <= 768;

const isVRBrowser = () => {
  const ua = navigator.userAgent || '';
  const uaLow = ua.toLowerCase();
  if (uaLow.includes('oculusbrowser')) return true;
  if (uaLow.includes('picobrowser')) return true;
  if (uaLow.includes('steamvr')) return true;
  if (/\bquest\b/i.test(ua) && /android/i.test(uaLow)) return true;
  return false;
};

function resolveDestination() {
  if (isVRBrowser()) return { label: 'Go to VR', path: '/VR10010101110' };
  if (isMobileDevice()) return { label: 'Go back to Mobile OS', path: '/Mobile100010101110' };
  return { label: 'Go back to Select OS', path: '/SelectOS' };
}

export default function DisabledPageScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { label, path } = resolveDestination();
  const pageName = location.pathname.substring(1);

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 text-center max-w-md px-6">
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mb-4">403</h1>
          <p className="text-2xl font-bold text-white mb-2">Access Denied</p>
          <p className="text-slate-400">You are not allowed to access <span className="text-red-400 font-mono">/{pageName}</span>.</p>
        </div>

        <button
          onClick={() => navigate(path)}
          className="inline-flex items-center gap-2 px-6 py-3 mt-8 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-red-500/50"
        >
          <ArrowLeft className="w-4 h-4" />
          {label}
        </button>
      </div>
    </div>
  );
}