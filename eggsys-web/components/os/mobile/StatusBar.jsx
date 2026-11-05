import React, { useState, useEffect } from 'react';
import { Lock, Wifi, WifiOff, BatteryLow, BatteryMedium, BatteryFull, BatteryCharging, RotateCw, Phone, Signal, SlidersHorizontal, X, Maximize } from 'lucide-react';

export default function StatusBar({ onLock, onRefresh, activeCall, onReopenCall, esimActive, wifiEnabled = true, mobileDataEnabled = true, onOpenControlCenter, appCloseButton, fullScreen, onCloseApp, onEnterFullScreen, onExitFullScreen }) {
  const [now, setNow] = useState(new Date());
  const [battery, setBattery] = useState(null);
  const [wifiStrength, setWifiStrength] = useState(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const getBattery = async () => {
      try {
        const b = await navigator.getBattery?.();
        if (!b) return;
        const update = () => setBattery({ level: Math.round(b.level * 100), charging: b.charging });
        update();
        b.addEventListener('levelchange', update);
        b.addEventListener('chargingchange', update);
      } catch {}
    };
    getBattery();
  }, []);

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    const update = () => {
      const dl = conn.downlink || 0;
      const t = conn.effectiveType;
      if (t === '4g' || dl >= 5) setWifiStrength(4);
      else if (t === '3g' || dl >= 1.5) setWifiStrength(3);
      else if (t === '2g' || dl >= 0.5) setWifiStrength(2);
      else setWifiStrength(1);
    };
    update();
    conn.addEventListener('change', update);
    return () => conn.removeEventListener('change', update);
  }, []);

  const BatteryIcon = () => {
    if (!battery) return null;
    if (battery.charging) return <BatteryCharging className="w-4 h-4 text-green-300" />;
    if (battery.level <= 20) return <BatteryLow className="w-4 h-4 text-red-300" />;
    if (battery.level <= 50) return <BatteryMedium className="w-4 h-4 text-yellow-200" />;
    return <BatteryFull className="w-4 h-4 text-white" />;
  };

  const WifiIndicator = () => {
    if (!isOnline) return null;
    if (!wifiEnabled) return null;
    if (wifiStrength === null) return null;
    if (wifiStrength === 0) return <WifiOff className="w-4 h-4 text-red-300" />;
    return (
      <Wifi className={`w-4 h-4 ${wifiStrength >= 3 ? 'text-white' : wifiStrength === 2 ? 'text-yellow-200' : 'text-red-300'}`} />
    );
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-black/20 backdrop-blur-sm text-white text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
        {onOpenControlCenter && (
          <button
            onClick={onOpenControlCenter}
            className="hover:opacity-70 transition-opacity"
            title="Control Center"
          >
            <SlidersHorizontal className="w-4 h-4 text-white" />
          </button>
        )}
        {appCloseButton && fullScreen && (
          <button
            onClick={onExitFullScreen}
            className="hover:opacity-70 transition-opacity"
            title="Exit Full Screen"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
        {appCloseButton && !fullScreen && onEnterFullScreen && (
          <button
            onClick={onEnterFullScreen}
            className="hover:opacity-70 transition-opacity"
            title="Enter Full Screen"
          >
            <Maximize className="w-4 h-4 text-white" />
          </button>
        )}
        {activeCall && onReopenCall && (
          <button
            onClick={onReopenCall}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 hover:bg-green-600 text-white text-[10px] font-semibold animate-pulse"
          >
            <Phone className="w-3 h-3" />
            <span>Tap to return</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <WifiIndicator />
        {esimActive && mobileDataEnabled && isOnline && <Signal className="w-4 h-4 text-white" />}
        {battery && (
          <div className="flex items-center gap-1">
            <BatteryIcon />
            <span className="text-[11px] font-medium">{battery.level}%</span>
          </div>
        )}
      </div>
    </div>
  );
}