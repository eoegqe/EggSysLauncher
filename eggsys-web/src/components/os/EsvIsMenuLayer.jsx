import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import EsvIsMenu from '@/components/os/apps/EsvIsMenu';

// System-level overlay for the EggetSystem Visual Menu. The menu is opened
// via the `esvismenu` terminal command, but it lives here (outside any app
// iframe/window) so it stays open even when the Terminal app is closed.
export function requestEsvIsMenu() {
  window.dispatchEvent(new CustomEvent('eggsys_show_esvismenu'));
}

export default function EsvIsMenuLayer() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(() => document.fullscreenElement || document.body);

  useEffect(() => {
    const updateTarget = () => setTarget(document.fullscreenElement || document.body);
    const show = async () => {
      if (document.fullscreenElement?.tagName === 'IFRAME') await document.exitFullscreen();
      updateTarget();
      setOpen(true);
    };
    window.addEventListener('eggsys_show_esvismenu', show);
    document.addEventListener('fullscreenchange', updateTarget);
    return () => {
      window.removeEventListener('eggsys_show_esvismenu', show);
      document.removeEventListener('fullscreenchange', updateTarget);
    };
  }, []);

  if (!open) return null;
  return createPortal(
    <EsvIsMenu onClose={() => setOpen(false)} />,
    target
  );
}