import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';

// Module-level state bridges the imperative confirmAction() call to the
// single mounted <ConfirmDialog /> instance. Returns a Promise<boolean>.
let _push = null;

/**
 * Show an in-app confirmation dialog (replaces native window.confirm so the
 * app never exits fullscreen). Resolves true if confirmed, false otherwise.
 * @param {string} message
 * @param {object} [opts] - { title, confirmText, cancelText, danger }
 * @returns {Promise<boolean>}
 */
export function confirmAction(message, opts = {}) {
  if (!_push) {
    // Dialog not mounted yet — fall back to native (rare, only pre-mount).
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    _push({ message, ...opts, resolve });
  });
}

/**
 * Show an in-app alert dialog with a single OK button (replaces native
 * window.alert so the app never exits fullscreen). Resolves true when dismissed.
 * @param {string} message
 * @param {object} [opts] - { title, okText }
 * @returns {Promise<boolean>}
 */
export function alertAction(message, opts = {}) {
  if (!_push) {
    return Promise.resolve(window.alert(message));
  }
  return new Promise((resolve) => {
    _push({ message, okOnly: true, ...opts, resolve });
  });
}

/**
 * Show an in-app prompt dialog with a text input and OK/Cancel buttons
 * (replaces native window.prompt so the app never exits fullscreen).
 * Resolves with the entered string on OK, or null on cancel.
 * @param {string} message
 * @param {object} [opts] - { title, defaultValue, placeholder, confirmText, cancelText }
 * @returns {Promise<string|null>}
 */
export function promptAction(message, opts = {}) {
  if (!_push) {
    return Promise.resolve(window.prompt(message, opts.defaultValue || ''));
  }
  return new Promise((resolve) => {
    _push({ message, isPrompt: true, ...opts, resolve });
  });
}

export default function ConfirmDialog() {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    _push = (item) => {
      setQueue((q) => [...q, item]);
    };
    return () => { _push = null; };
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [current, queue]);

  // Seed the input when a prompt dialog opens.
  useEffect(() => {
    if (current?.isPrompt) {
      setPromptValue(current.defaultValue || '');
      // Focus the input on next tick so it's ready.
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [current]);

  const close = useCallback((result) => {
    if (current?.resolve) current.resolve(result);
    setCurrent(null);
  }, [current]);

  // Keyboard support: Enter = confirm, Escape = cancel — without leaving fullscreen.
  useEffect(() => {
    if (!current) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(current.isPrompt ? null : false); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        close(current.isPrompt ? promptValue : true);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [current, close, promptValue]);

  if (!current) return null;

  const { message, title, confirmText, cancelText, danger, okOnly, okText, isPrompt, placeholder } = current;
  const Icon = danger ? AlertTriangle : HelpCircle;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-[90%] max-w-sm p-6 animate-in zoom-in-95">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-100 dark:bg-red-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
            <Icon className={`w-5 h-5 ${danger ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            {title && <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>}
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{message}</p>
            {isPrompt && (
              <input
                ref={inputRef}
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={placeholder || ''}
                className="mt-3 w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-6 justify-end">
          {!okOnly && (
            <button
              onClick={() => close(isPrompt ? null : false)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 transition-colors"
            >
              {cancelText || 'Cancel'}
            </button>
          )}
          <button
            onClick={() => close(isPrompt ? promptValue : true)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {okOnly ? (okText || 'OK') : (confirmText || 'Confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}