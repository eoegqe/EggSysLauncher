import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, Delete, ArrowUp, CornerDownLeft } from 'lucide-react';

/**
 * EggSysKeyboard — EggetSystem's own on-screen keyboard for the mobile OS.
 *
 * Intercepts focus on any <input>/<textarea>/[contenteditable], suppresses the
 * host (Android) soft keyboard via `inputmode="none"`, and routes key presses
 * through the active field so React-controlled inputs stay in sync.
 * Self-contained: owns its own state and DOM listeners, no shared context.
 *
 * Resizable: drag the top handle up/down to grow/shrink the keys. The chosen
 * key height persists across sessions in localStorage.
 * Key feedback: each key scales down + flashes on press, with a light haptic
 * tick on devices that support the Vibration API.
 */

const LETTER_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
];

const NUMBER_ROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['-','/',':',';','(',')','$','&','@','"'],
  ['.',',','?','!',"'"],
];

const SYMBOL_ROWS = [
  ['[',']','{','}','#','%','^','*','+','='],
  ['_','\\','|','~','<','>','€','£','¥','•'],
  ['.',',','?','!',"'"],
];

const HEIGHT_KEY = 'eggsys_keyboard_key_height';
const MIN_KEY_H = 36;
const MAX_KEY_H = 80;
const DEFAULT_KEY_H = 48;

function clampHeight(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return DEFAULT_KEY_H;
  return Math.max(MIN_KEY_H, Math.min(MAX_KEY_H, Math.round(n)));
}

function setNativeValue(el, value) {
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc && desc.set) desc.set.call(el, value);
  else el.value = value;
}

function isEditable(el) {
  if (!el) return false;
  if (el.tagName === 'INPUT') {
    const t = (el.type || '').toLowerCase();
    return !['button','checkbox','radio','range','submit','image','reset','hidden','file'].includes(t);
  }
  if (el.tagName === 'TEXTAREA') return true;
  if (el.isContentEditable) return true;
  return false;
}

export default function EggSysKeyboard() {
  const [visible, setVisible] = useState(false);
  const [layout, setLayout] = useState('letters');
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const [keyHeight, setKeyHeight] = useState(() => clampHeight(localStorage.getItem(HEIGHT_KEY)));
  const activeEl = useRef(null);
  const originalInputMode = useRef(null);
  const resizeRef = useRef(null);

  const attach = useCallback((el) => {
    if (!el || !isEditable(el)) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      originalInputMode.current = el.getAttribute('inputmode');
      el.setAttribute('inputmode', 'none');
    }
    activeEl.current = el;
    const t = (el.type || '').toLowerCase();
    const im = originalInputMode.current || '';
    if (t === 'number' || t === 'tel' || im === 'numeric' || im === 'tel' || im === 'decimal') {
      setLayout('numbers');
    } else {
      setLayout('letters');
    }
    setShift(false);
    setCaps(false);
    setVisible(true);
  }, []);

  const detach = useCallback((el) => {
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && originalInputMode.current !== null) {
      if (originalInputMode.current === null) el.removeAttribute('inputmode');
      else el.setAttribute('inputmode', originalInputMode.current);
      originalInputMode.current = null;
    }
  }, []);

  useEffect(() => {
    const onFocusIn = (e) => {
      const t = e.target;
      if (!isEditable(t)) return;
      if (t.closest('[data-eggsys-keyboard]')) return;
      attach(t);
    };
    const onFocusOut = (e) => {
      const related = e.relatedTarget;
      if (related && isEditable(related) && !related.closest('[data-eggsys-keyboard]')) {
        detach(e.target);
        attach(related);
        return;
      }
      detach(e.target);
      activeEl.current = null;
      setVisible(false);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [attach, detach]);

  const applyToField = (fn) => {
    const el = activeEl.current;
    if (!el) return;
    fn(el);
  };

  const insertText = (text) => {
    applyToField((el) => {
      if (el.isContentEditable) {
        el.focus();
        document.execCommand('insertText', false, text);
        return;
      }
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const next = el.value.slice(0, start) + text + el.value.slice(end);
      setNativeValue(el, next);
      const caret = start + text.length;
      try { el.setSelectionRange(caret, caret); } catch (_) {}
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const backspace = () => {
    applyToField((el) => {
      if (el.isContentEditable) {
        el.focus();
        document.execCommand('delete', false);
        return;
      }
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      if (start === 0 && end === 0) return;
      let next, caret;
      if (start === end) {
        next = el.value.slice(0, start - 1) + el.value.slice(end);
        caret = start - 1;
      } else {
        next = el.value.slice(0, start) + el.value.slice(end);
        caret = start;
      }
      setNativeValue(el, next);
      try { el.setSelectionRange(caret, caret); } catch (_) {}
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const enter = () => {
    applyToField((el) => {
      if (el.tagName === 'TEXTAREA' || el.isContentEditable) {
        insertText('\n');
        return;
      }
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    });
  };

  const typeChar = (ch) => {
    insertText(ch);
    if (shift && !caps) setShift(false);
  };

  const close = () => {
    applyToField((el) => { try { el.blur(); } catch (_) {} });
    setVisible(false);
  };

  // Drag the top handle up/down to resize the keys. Persists on release.
  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startY: e.clientY, startH: keyHeight };
    const onMove = (ev) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startY - ev.clientY;
      const next = clampHeight(resizeRef.current.startH + delta);
      setKeyHeight(next);
    };
    const onUp = () => {
      if (resizeRef.current) {
        // Read the latest height from state via a microtask setter flush.
        setKeyHeight((h) => { localStorage.setItem(HEIGHT_KEY, String(h)); return h; });
      }
      resizeRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Flat key spec: { label, onKey, width, active, icon }
  const charKey = (k) => ({ label: k, onKey: () => typeChar(k) });

  const renderRows = () => {
    if (layout === 'letters') {
      const up = shift || caps;
      const L = (k) => charKey(up ? k.toUpperCase() : k);
      return (
        <>
          <Row keyHeight={keyHeight} keys={LETTER_ROWS[0].map(L)} />
          <Row keyHeight={keyHeight} keys={LETTER_ROWS[1].map(L)} className="px-5" />
          <Row
            keyHeight={keyHeight}
            keys={[
              { icon: <ArrowUp className="w-5 h-5" />, onKey: () => (caps ? (setCaps(false), setShift(false)) : setShift((s) => !s)), onLongPress: () => setCaps((c) => !c), width: 'w-14', active: shift || caps },
              ...LETTER_ROWS[2].map(L),
              { icon: <Delete className="w-5 h-5" />, onKey: backspace, width: 'w-16' },
            ]}
          />
        </>
      );
    }
    const rows = layout === 'numbers' ? NUMBER_ROWS : SYMBOL_ROWS;
    return (
      <>
        <Row keyHeight={keyHeight} keys={rows[0].map(charKey)} />
        <Row keyHeight={keyHeight} keys={rows[1].map(charKey)} />
        <Row
          keyHeight={keyHeight}
          keys={[
            { label: layout === 'numbers' ? '#+=' : '123', onKey: () => setLayout(layout === 'numbers' ? 'symbols' : 'numbers'), width: 'w-16', small: true },
            ...rows[2].map(charKey),
            { icon: <Delete className="w-5 h-5" />, onKey: backspace, width: 'w-16' },
          ]}
        />
      </>
    );
  };

  if (!visible) return null;

  return (
    <div
      data-eggsys-keyboard
      className="fixed inset-x-0 bottom-0 z-[3000] select-none touch-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="w-full bg-[#0b0f1a]/95 backdrop-blur-md border-t border-white/10 shadow-2xl px-2 pt-1.5 pb-2">
        <div className="flex items-center justify-end gap-2 pb-1.5">
          <button
            onPointerDown={startResize}
            className="flex-1 flex justify-center py-1 cursor-ns-resize touch-none"
            aria-label="Drag to resize keyboard"
            title="Drag to resize"
          >
            <div className="w-10 h-1.5 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
          </button>
          <button
            onClick={close}
            className="-mt-1 mr-0.5 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
            aria-label="Hide keyboard"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {renderRows()}

        <Row
          keyHeight={keyHeight}
          className="mt-1.5"
          keys={[
            layout === 'letters'
              ? { label: '123', onKey: () => setLayout('numbers'), width: 'w-16', small: true }
              : { label: 'ABC', onKey: () => setLayout('letters'), width: 'w-16', small: true },
            { icon: <ArrowUp className="w-5 h-5" />, onKey: () => setShift((s) => !s), width: 'w-12', active: shift || caps },
            { label: 'space', onKey: () => typeChar(' ') },
            { icon: <CornerDownLeft className="w-5 h-5" />, onKey: enter, width: 'w-16' },
          ]}
        />
      </div>
    </div>
  );
}

function Row({ keys, className = '', keyHeight }) {
  return (
    <div className={`flex gap-1.5 w-full mt-1.5 first:mt-0 ${className}`}>
      {keys.map((k, idx) => (
        <Key key={idx} keyHeight={keyHeight} {...k} />
      ))}
    </div>
  );
}

function Key({ label, icon, onKey, onLongPress, width, active, small, keyHeight = DEFAULT_KEY_H }) {
  const timer = useRef(null);
  const [pressed, setPressed] = useState(false);

  const handleDown = (e) => {
    e.preventDefault();
    setPressed(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(8); } catch (_) {}
    }
    if (onLongPress) timer.current = setTimeout(onLongPress, 450);
  };
  const handleUp = () => {
    setPressed(false);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    onKey && onKey();
  };
  const handleLeave = () => {
    setPressed(false);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };

  const base = width ? `${width} shrink-0` : 'flex-1 min-w-0';
  const tone = active
    ? 'bg-amber-400/90 text-black'
    : pressed
      ? 'bg-white/40 text-white'
      : 'bg-white/[0.12] hover:bg-white/20 text-white';
  return (
    <button
      type="button"
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleLeave}
      onPointerCancel={handleLeave}
      style={{ height: keyHeight }}
      className={`rounded-lg flex items-center justify-center transition-all duration-75 ${base} ${tone} ${pressed ? 'scale-90' : 'scale-100'} ${small ? 'text-xs font-semibold' : 'text-lg font-medium'}`}
    >
      {icon || (label === 'space' ? <span className="text-xs text-white/40">space</span> : label)}
    </button>
  );
}