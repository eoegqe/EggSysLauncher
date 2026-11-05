import React, { useEffect } from 'react';
import BootAnimation from '@/components/os/boot/BootAnimation';

// Boot animation for a custom OS. The OS definition carries the animation
// style, colors, logo, duration, boot text and — for the Custom CSS style —
// raw CSS that is injected for the duration of the boot.
export default function CustomBootScreen({ osDef, onBootComplete }) {
  const anim = osDef?.boot_animation || {};
  const duration = anim.duration_ms || 3000;
  const style = anim.style || 'bar';
  const customCss = style === 'custom' ? (anim.custom_css || '') : '';

  useEffect(() => {
    const t = setTimeout(onBootComplete, duration);
    return () => clearTimeout(t);
  }, [duration, onBootComplete]);

  return (
    <>
      {customCss && <style>{customCss}</style>}
      <BootAnimation
        style={style}
        bg={anim.background || '#000000'}
        accent={anim.accent_color}
        secondary={anim.secondary_color}
        logo={anim.logo_url || osDef?.branding?.logo_url}
        name={osDef?.name || 'EggSys'}
        version={osDef?.version}
        bootText={anim.boot_text || osDef?.branding?.boot_text}
        duration={duration}
      />
    </>
  );
}