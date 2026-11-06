import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { WORDMARK_URL } from './EggSysWord';

// Runtime scanner: watches the live DOM for any rendered "EggetSystem" text
// and swaps each occurrence for the wordmark image, so every app/screen that
// prints the name as plain text automatically shows the logo instead.
// Legal pages (Terms of Service, Privacy Policy) are skipped per policy.
// Respects the signed-in user's "Show EggetSystem Logo" preference
// (appearance_preferences.replace_eggetsystem_logo). Defaults to on for
// guests and users who haven't set it.

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'TITLE', 'OPTION']);
const NEEDLE = 'EggetSystem';

function isLegalPage() {
  const p = (window.location.pathname || '').toLowerCase();
  return p.includes('termsofservice') || p.includes('privacypolicy');
}

function replaceTextNode(node) {
  const parent = node.parentNode;
  if (!parent) return;
  if (SKIP_TAGS.has(parent.nodeName)) return;
  if (parent.isContentEditable) return;
  // Skip if this text node is the alt/aria text of an existing wordmark img
  if (parent.nodeName === 'IMG' && parent.getAttribute('alt') === NEEDLE) return;

  const text = node.nodeValue;
  if (!text || !text.includes(NEEDLE)) return;

  const parts = text.split(NEEDLE);
  if (parts.length <= 1) return;

  const frag = document.createDocumentFragment();
  parts.forEach((part, i) => {
    if (part) frag.appendChild(document.createTextNode(part));
    if (i < parts.length - 1) {
      const img = document.createElement('img');
      img.src = WORDMARK_URL;
      img.alt = NEEDLE;
      img.draggable = false;
      img.style.height = '1em';
      img.style.width = 'auto';
      img.style.verticalAlign = 'middle';
      img.style.display = 'inline-block';
      img.style.objectFit = 'contain';
      frag.appendChild(img);
    }
  });
  parent.replaceChild(frag, node);
}

function scan(root) {
  if (!root || isLegalPage()) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.includes(NEEDLE)) return NodeFilter.FILTER_REJECT;
      const p = n.parentNode;
      if (!p || SKIP_TAGS.has(p.nodeName) || p.isContentEditable) return NodeFilter.FILTER_REJECT;
      if (p.nodeName === 'IMG' && p.getAttribute('alt') === NEEDLE) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(replaceTextNode);
}

export default function EggSysWordReplacer() {
  const { data: user } = useQuery({
    queryKey: ['eggsys-replacer-pref'],
    queryFn: () => base44.auth.me().catch(() => null),
    retry: false,
    staleTime: 30000,
  });

  // Default to ON (replace) for guests and users who haven't set the preference.
  const replaceEnabled = user?.appearance_preferences?.replace_eggetsystem_logo !== false;

  useEffect(() => {
    if (isLegalPage()) return;
    if (!replaceEnabled) return;

    scan(document.body);

    const observer = new MutationObserver((mutations) => {
      if (isLegalPage()) return;
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === Node.TEXT_NODE) replaceTextNode(n);
          else if (n.nodeType === Node.ELEMENT_NODE) scan(n);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [replaceEnabled]);

  return null;
}