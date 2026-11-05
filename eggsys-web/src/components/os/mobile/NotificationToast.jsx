import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Bell, Headphones, Shield, ShoppingCart, Package, AlertTriangle, Info, Mail, MessageSquare, BatteryLow } from 'lucide-react';
import { useNotifAppIconMap, resolveNotifAppIcon } from '@/hooks/useNotifAppIcon';

// Resolve the icon + gradient for a notification based on its source app/type.
// Admin-originated notifications always use the Shield (Admin app) and hide the name.
function resolveNotifVisual(notif, appIconMap) {
  if (notif.isSupport) {
    return { Icon: Headphones, iconBg: 'bg-white/20', cardTint: true };
  }
  if (notif.isCall) {
    return { Icon: Phone, iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600', cardTint: false };
  }
  if (notif.isChat) {
    return { Icon: MessageCircle, iconBg: 'bg-gradient-to-br from-green-500 to-teal-600', cardTint: false };
  }
  if (notif.fromAdmin) {
    return { Icon: Shield, iconBg: 'bg-gradient-to-br from-red-600 to-orange-600', cardTint: false };
  }
  if (notif.isUpdate) {
    return { Icon: Package, iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600', cardTint: false };
  }
  if (notif.isLowBattery) {
    return { Icon: BatteryLow, iconBg: 'bg-gradient-to-br from-yellow-500 to-orange-500', cardTint: false };
  }
  // App-originated notifications (EggSys.notify()) carry source_app — render the
  // real app icon instead of a generic type-based icon.
  const appIcon = resolveNotifAppIcon(notif, appIconMap);
  if (appIcon) {
    return { Icon: appIcon.Icon, iconBg: appIcon.iconBg, cardTint: false };
  }
  // Map notification type → source app icon
  const type = notif.notifType || notif.message_type;
  switch (type) {
    case 'app_approved':
    case 'app_rejected':
      return { Icon: ShoppingCart, iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500', cardTint: false };
    case 'feedback_received':
    case 'feedback_resolved':
      return { Icon: MessageSquare, iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600', cardTint: false };
    case 'egg_messenger':
    case 'message':
      return { Icon: Mail, iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600', cardTint: false };
    case 'warning':
      return { Icon: AlertTriangle, iconBg: 'bg-gradient-to-br from-yellow-500 to-orange-500', cardTint: false };
    case 'error':
      return { Icon: AlertTriangle, iconBg: 'bg-gradient-to-br from-red-500 to-rose-600', cardTint: false };
    case 'system':
      return { Icon: Info, iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600', cardTint: false };
    default:
      return { Icon: Bell, iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600', cardTint: false };
  }
}

export default function NotificationToast({ notif, onDismiss, onAnswer, onDecline, onCardClick }) {
  const isSupport = !!notif.isSupport;
  const appIconMap = useNotifAppIconMap();
  const { Icon, iconBg } = resolveNotifVisual(notif, appIconMap);

  const cardClass = isSupport
    ? 'mx-2 mt-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg ring-1 ring-purple-300/40 px-3 py-2.5 text-sm flex items-center gap-3'
    : `mx-2 mt-2 bg-white rounded-2xl shadow-lg ring-1 ring-black/5 px-3 py-2.5 text-sm flex items-center gap-3 ${notif.isCall ? 'relative z-[1100]' : ''}`;

  const titleClass = isSupport ? 'text-white' : 'text-slate-800';
  const contentClass = isSupport ? 'text-white/90' : 'text-slate-500';

  // Admin notifications: show the shield icon but do not include the sender name.
  const displayTitle = notif.fromAdmin
    ? (notif.title || 'Admin')
    : notif.title;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 80) onDismiss(notif.id); }}
      onClick={() => onCardClick && onCardClick(notif)}
      className={cardClass}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        {notif.source_app && (
          <p className={`text-[10px] truncate ${isSupport ? 'text-white/70' : 'text-slate-400'}`}>{notif.source_app}</p>
        )}
        <p className={`font-semibold text-xs truncate ${titleClass}`}>{displayTitle}</p>
        <p className={`text-xs truncate ${contentClass}`}>{notif.content}</p>
      </div>
      {notif.isCall && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onDecline(notif)}
            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
            title="Decline"
          >
            <Phone className="w-4 h-4 text-white rotate-[135deg]" />
          </button>
          <button
            onClick={() => onAnswer(notif)}
            className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
            title="Answer"
          >
            <Phone className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </motion.div>
  );
}