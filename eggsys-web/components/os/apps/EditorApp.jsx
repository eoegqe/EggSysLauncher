import React from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import Base44EditorIcon from '@/components/os/Base44EditorIcon';

const EDITOR_URL = 'https://app.base44.com/apps/6946b759fb67abb9152e7314/editor/preview';

// Owner-only app that embeds the Base44 editor preview for this app.
// Wrapped in a dark EggetSystem-style shell so the builder has its own
// distinct identity inside the OS.
export default function EditorApp() {
  const iframeRef = React.useRef(null);

  const reload = () => {
    const f = iframeRef.current;
    if (f) f.src = EDITOR_URL;
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0b0f1a] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-white/10 bg-[#0e1422] shrink-0">
        <Base44EditorIcon className="w-7 h-7 shadow-md ring-1 ring-white/10" size={28} />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-sm font-semibold text-white truncate">Base44 Builder</span>
          <span className="text-[10px] text-white/40 truncate">Editor preview</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={reload}
            title="Reload preview"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href={EDITOR_URL}
            target="_blank"
            rel="noreferrer"
            title="Open in new tab"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Preview surface */}
      <div className="flex-1 min-h-0 bg-[#0b0f1a] p-2">
        <div className="h-full w-full rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl bg-white">
          <iframe
            ref={iframeRef}
            src={EDITOR_URL}
            className="w-full h-full border-0"
            title="Base44 Editor"
            allow="clipboard-read; clipboard-write; fullscreen"
          />
        </div>
      </div>
    </div>
  );
}