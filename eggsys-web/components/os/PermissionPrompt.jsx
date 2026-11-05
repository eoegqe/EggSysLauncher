import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PERMISSIONS, registerPromptHandler, setPermission } from '@/lib/appPermissions';

// System permission modal — a simple yes/no question.
// Singleton: mounted once at the OS level; the permission manager routes
// requests here via registerPromptHandler.
export default function PermissionPrompt() {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    return registerPromptHandler((req) => setCurrent(req));
  }, []);

  const choose = useCallback((value) => {
    if (current?.appId && current?.permission) {
      setPermission(current.appId, current.permission, value);
    }
    current?.resolve?.(value);
    setCurrent(null);
  }, [current]);

  if (!current) return null;
  const meta = PERMISSIONS[current.permission] || PERMISSIONS.notifications;
  const Icon = meta.icon;

  return createPortal(
    <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/50 backdrop-blur-[2px] animate-in fade-in">
      <div className="w-[86%] max-w-[320px] rounded-[28px] overflow-hidden shadow-2xl animate-in zoom-in-95 bg-white dark:bg-zinc-900">
        {/* Header band */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3 ring-1 ring-orange-200 dark:ring-orange-800/40">
            <Icon className="w-7 h-7 text-orange-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {current.appName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug">
            Wants to {meta.verb}. Allow?
          </p>
        </div>
        {/* Yes / No */}
        <div className="grid grid-cols-2 border-t border-gray-100 dark:border-zinc-800">
          <button
            onClick={() => choose('denied')}
            className="py-3.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors border-r border-gray-100 dark:border-zinc-800"
          >
            No
          </button>
          <button
            onClick={() => choose('while_using')}
            className="py-3.5 text-sm font-semibold text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
          >
            Yes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}