import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import FactoryResetHelper from '@/components/os/apps/FactoryResetHelper';

// System-level overlay for the Factory Reset helper. Opened by tapping
// S:\OS\EggetSystem\factory-reset.eaf in a file manager, but lives here
// (outside any app iframe/window) so it stays open even if the Files app is
// closed — same pattern as RegistryEditorLayer / EsvIsMenuLayer.
export function requestFactoryReset() {
  window.dispatchEvent(new CustomEvent('eggsys_show_factory_reset'));
}

export default function FactoryResetLayer() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(() => document.fullscreenElement || document.body);

  useEffect(() => {
    const updateTarget = () => setTarget(document.fullscreenElement || document.body);
    const show = async () => {
      if (document.fullscreenElement?.tagName === 'IFRAME') await document.exitFullscreen();
      updateTarget();
      setOpen(true);
    };
    window.addEventListener('eggsys_show_factory_reset', show);
    document.addEventListener('fullscreenchange', updateTarget);
    return () => {
      window.removeEventListener('eggsys_show_factory_reset', show);
      document.removeEventListener('fullscreenchange', updateTarget);
    };
  }, []);

  if (!open) return null;
  return createPortal(
    <FactoryResetHelper onClose={() => setOpen(false)} />,
    target
  );
}