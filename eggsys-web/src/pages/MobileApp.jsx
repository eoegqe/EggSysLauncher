import { useEffect } from 'react';
import MobileOS from './MobileOS';

export default function MobileApp() {
  useEffect(() => {
    // Mark as running inside native APK
    localStorage.setItem('eos_apk_mode', 'mobile');
    localStorage.setItem('eos_platform', 'android');

    // Request fullscreen like a native app would
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});

    // Lock orientation to portrait if supported
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch(() => {});
    }

    // Hide any address bar (mobile browser trick)
    window.scrollTo(0, 1);

    return () => {
      localStorage.removeItem('eos_apk_mode');
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#000' }}>
      <MobileOS apkMode={true} />
    </div>
  );
}