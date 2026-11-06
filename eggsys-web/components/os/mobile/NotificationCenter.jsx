import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Mail, AlertTriangle, Info, Package, Download, Check, X, Shield, ShoppingCart, MessageSquare, Power } from 'lucide-react';
import { useNotifAppIconMap, resolveNotifAppIcon } from '@/hooks/useNotifAppIcon';

function getNotificationIcon(notif) {
  if (notif.from_admin) return Shield;
  if (notif.title?.includes('EggetSystem') && notif.title?.includes('Available')) return Package;
  const type = notif.message_type || notif.type;
  switch (type) {
    case 'app_approved':
    case 'app_rejected':
      return ShoppingCart;
    case 'feedback_received':
    case 'feedback_resolved':
      return MessageSquare;
    case 'egg_messenger':
    case 'message':
      return Mail;
    case 'warning':
    case 'error':
      return AlertTriangle;
    case 'system':
      return Info;
    default:
      return Bell;
  }
}

function getNotificationAppName(notif) {
  if (notif.from_admin) return 'Admin';
  if (notif.title?.includes('EggetSystem') && notif.title?.includes('Available')) return 'Updates';
  if (notif._entity === 'OSUpdate') return 'Updates';
  if (notif.title?.toLowerCase().includes('call') || notif.title?.toLowerCase().includes('missed')) return 'Phone';
  // App-originated notifications (EggSys.notify()) carry the app name in source_app
  if (notif.source_app) return notif.source_app;
  const type = notif.message_type || notif.type;
  switch (type) {
    case 'app_approved':
    case 'app_rejected':
      return 'App Store';
    case 'feedback_received':
    case 'feedback_resolved':
      return 'Feedback';
    case 'egg_messenger':
    case 'message':
      return 'Egg Mail';
    case 'warning':
    case 'error':
    case 'system':
      return 'EggSys OS Services';
    default:
      return 'EggetSystem';
  }
}

function formatNotifTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getNotificationColor(notif) {
  if (notif.from_admin) return 'from-red-600 to-orange-600';
  if (notif.title?.includes('EggetSystem') && notif.title?.includes('Available')) return 'from-indigo-500 to-purple-600';
  const type = notif.message_type || notif.type;
  switch (type) {
    case 'app_approved':
    case 'app_rejected':
      return 'from-pink-500 to-rose-500';
    case 'feedback_received':
    case 'feedback_resolved':
      return 'from-purple-500 to-pink-600';
    case 'egg_messenger':
    case 'message':
      return 'from-blue-500 to-indigo-600';
    case 'warning':
      return 'from-yellow-500 to-orange-500';
    case 'error':
      return 'from-red-500 to-rose-600';
    case 'system':
      return 'from-blue-500 to-cyan-600';
    default:
      return 'from-gray-500 to-slate-600';
  }
}

export default function NotificationCenter({ notifications, onMarkRead, onDelete, onInstallUpdate, onReenableEggSysOS }) {
  const appIconMap = useNotifAppIconMap();

  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-white/60 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-2">
          <Bell className="w-6 h-6" />
        </div>
        <p className="font-semibold text-white/80 text-sm">No notifications</p>
        <p className="text-xs text-white/50 mt-0.5">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[35vh] overflow-auto pr-1">
      <AnimatePresence>
      {notifications.map((notif) => {
        const appIcon = resolveNotifAppIcon(notif, appIconMap);
        const Icon = appIcon ? appIcon.Icon : getNotificationIcon(notif);
        const color = appIcon ? appIcon.iconBg.replace('bg-gradient-to-br ', '') : getNotificationColor(notif);
        const displayTitle = notif.from_admin ? (notif.title || 'Admin') : notif.title;

        // Permanent EggSys OS disabled warning — red, undeletable, re-enable button
        if (notif._isEggSysOSWarning) {
          return (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="relative p-3 rounded-2xl overflow-hidden bg-red-600 ring-1 ring-red-300/50"
            >
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-red-300" />
              <div className="flex items-start gap-3 pl-1">
                <div className="w-9 h-9 rounded-xl bg-red-700 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/70 leading-tight mb-0.5">
                    EggSys OS Services
                  </p>
                  <h3 className="font-semibold text-sm text-white leading-tight">{notif.title}</h3>
                  <p className="text-xs text-white/80 mt-0.5 leading-snug">{notif.content}</p>
                  <button
                    onClick={() => onReenableEggSysOS?.()}
                    className="mt-2 w-full text-xs px-3 py-1.5 rounded-xl bg-white text-red-600 font-semibold flex items-center justify-center gap-1.5 hover:bg-red-50 transition-colors"
                  >
                    <Power className="w-3.5 h-3.5" />
                    Re-enable EggSys OS
                  </button>
                </div>
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={notif.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 120, transition: { duration: 0.2 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 80) onDelete(notif); }}
            className={`relative p-3 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing ${
              notif.read ? 'bg-white/10' : 'bg-white/15 ring-1 ring-white/20'
            }`}
          >
            <span className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${color}`} />
            <div className="flex items-start gap-3 pl-1">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/50 leading-tight mb-0.5">
                  {getNotificationAppName(notif)}
                </p>
                {displayTitle && <h3 className="font-semibold text-sm text-white leading-tight">{displayTitle}</h3>}
                <p className="text-xs text-white/60 mt-0.5 leading-snug">{notif.content}</p>
                {notif._entity === 'OSUpdate' && notif._update && (
                  <button
                    onClick={() => onInstallUpdate(notif._update)}
                    className="mt-2 w-full text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install Update
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {!notif.read && (
                  <button
                    onClick={() => onMarkRead(notif)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(notif)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
      </AnimatePresence>
    </div>
  );
}