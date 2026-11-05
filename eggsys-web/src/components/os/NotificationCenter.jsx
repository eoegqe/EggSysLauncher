import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, X, Check, Package, MessageSquare, Mail, Settings, Filter, AlertTriangle, Info, CheckCheck, RefreshCw, Download, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from '@/lib/devToast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const compareVersions = (v1, v2) => {
  if (!v1 || !v2) return 0;
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

export default function NotificationCenter({ isOpen, onClose, onInstallUpdate }) {
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-notif-center'],
    queryFn: () => base44.auth.me()
  });

  // Live calls via subscription — the old one-second list poll used up almost
  // the whole per-user list budget on its own (rate limit: 70 lists/minute).
  useEffect(() => {
    if (!currentUser?.username) return;
    const unsub = base44.entities.Call.subscribe((event) => {
      const c = event.data;
      if (!c) return;
      if (c.caller_username !== currentUser.username && c.recipient_username !== currentUser.username) return;
      queryClient.invalidateQueries({ queryKey: ['calls', currentUser.username] });
    });
    return unsub;
  }, [currentUser?.username, queryClient]);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    refetchInterval: false
  });

  // Fetch available OS updates directly (no DB post needed)
  const { data: availableUpdates = [], refetch: refetchUpdates } = useQuery({
    queryKey: ['available-updates-notif', user?.os_version, user?.dismissed_updates],
    queryFn: async () => {
      const updates = await base44.entities.OSUpdate.list('-created_date');
      const currentVersion = user?.os_version || '1.0.0';
      const dismissed = user?.dismissed_updates || [];
      return updates.filter(u =>
        u.is_published &&
        compareVersions(u.version, currentVersion) > 0 &&
        !dismissed.includes(u.version)
      );
    },
    enabled: !!user,
    staleTime: Infinity,
    refetchInterval: false
  });

  // Admin messages (Message entity - by username, @all broadcasts, or @ad for admins)
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['notifications', user?.username],
    queryFn: async () => {
      if (!user?.username) return [];
      const isAdmin = user?.role === 'admin' || user?.admin_role;
      const queries = [
        base44.entities.Message.filter({ recipient_username: user.username }, '-created_date'),
        base44.entities.Message.filter({ recipient_username: 'all' }, '-created_date'),
        ...(isAdmin ? [base44.entities.Message.filter({ recipient_username: 'ad' }, '-created_date')] : [])
      ];
      const results = await Promise.all(queries);
      const merged = results.flat();
      const seen = new Set();
      return merged.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user?.username,
    staleTime: Infinity,
    refetchInterval: false
  });

  // System notifications (Notification entity - by username)
   const { data: systemNotifs = [], refetch: refetchSystemNotifs } = useQuery({
     queryKey: ['system-notifs', user?.username],
     queryFn: async () => {
       if (!user?.username) return [];
       return await base44.entities.Notification.filter({ recipient_username: user.username }, '-created_date');
     },
     enabled: !!user?.username,
     staleTime: Infinity,
     refetchInterval: false
   });

   // Fetch active calls
   const { data: calls = [] } = useQuery({
     queryKey: ['calls', currentUser?.username],
     queryFn: async () => {
       if (!currentUser?.username) return [];
       return await base44.entities.Call.filter({
         $or: [
           { caller_username: currentUser.username },
           { recipient_username: currentUser.username }
         ],
         status: { $in: ['ringing', 'accepted'] }
       }, '-created_date');
     },
     enabled: !!currentUser?.username,
     refetchInterval: 60000
   });

  // Build synthetic update notifications from OSUpdate records (no DB write needed)
  const updateNotifications = availableUpdates.map(u => ({
    id: `update-${u.id}`,
    _entity: 'OSUpdate',
    _update: u,
    title: `EggetSystem ${u.version} Available`,
    body: `${u.title} — ${u.description}${u.size_mb ? ` (${u.size_mb} MB)` : ''}`,
    notif_type: 'system',
    read: false,
    created_date: u.release_date || u.created_date,
    priority: u.priority
  }));

  // Normalize and combine all lists
  const notifications = [
    ...updateNotifications,
    ...systemNotifs
      .filter(n => !n.title?.match(/^EggetSystem .* Available$/)) // deduplicate if old DB notifs exist
      .map(n => ({
        ...n,
        _entity: 'Notification',
        body: n.message,
        notif_type: n.type
      })),
    ...messages.map(n => ({
      ...n,
      _entity: 'Message',
      body: n.content,
      notif_type: n.message_type
    }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const notificationPrefs = user?.notification_preferences || {
    system: true,
    apps: true,
    updates: true,
    messages: true,
    sound: true,
    desktop: true
  };

  // Show desktop notification for new notifications
  useEffect(() => {
    if (!isOpen && notifications.length > lastNotificationCount && notificationPrefs.desktop) {
      const newNotifications = notifications.slice(0, notifications.length - lastNotificationCount);
      newNotifications.forEach(notif => {
        if (!notif.read && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(notif.title, {
            body: notif.body,
            icon: 'https://media.base44.com/images/public/6946b759fb67abb9152e7314/398c6f43c_file_000000004cec81f596e27c29b1ce8a00.png'
          });
        }
      });
    }
    setLastNotificationCount(notifications.length);
  }, [notifications, isOpen, lastNotificationCount, notificationPrefs.desktop]);

  // Request desktop notification permission
  useEffect(() => {
    if (isOpen && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isOpen]);

  const [dismissedUpdateIds, setDismissedUpdateIds] = useState([]);

  const visibleNotifications = notifications.filter(n => !dismissedUpdateIds.includes(n.id));
  const filteredNotifications = filterType === 'all'
    ? visibleNotifications
    : visibleNotifications.filter(n => n.notif_type === filterType);

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: ({ id, _entity }) => {
      if (_entity === 'OSUpdate') return Promise.resolve(); // synthetic, no DB call
      if (_entity === 'Notification') return base44.entities.Notification.update(id, { read: true });
      return base44.entities.Message.update(id, { read: true });
    },
    onSuccess: (_, { id, _entity }) => {
      if (_entity === 'OSUpdate') return; // nothing to invalidate
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['system-notifs'] });
    }
  });

  const deleteNotificationMutation = useMutation({
     mutationFn: ({ id, _entity }) => {
       if (_entity === 'OSUpdate') return Promise.resolve(); // dismiss locally
       if (_entity === 'Notification') return base44.entities.Notification.delete(id);
       return base44.entities.Message.delete(id);
     },
     onSuccess: (_, { id, _entity }) => {
       if (_entity === 'OSUpdate') {
         setDismissedUpdateIds(prev => [...prev, id]);
         toast.success('Update notification dismissed');
         return;
       }
       queryClient.invalidateQueries({ queryKey: ['notifications'] });
       queryClient.invalidateQueries({ queryKey: ['system-notifs'] });
       toast.success('Notification deleted');
     }
   });

   const acceptCallMutation = useMutation({
     mutationFn: (callId) => base44.entities.Call.update(callId, { status: 'accepted' }),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['calls'] });
       toast.success('Call accepted');
     }
   });

   const declineCallMutation = useMutation({
     mutationFn: (callId) => base44.entities.Call.update(callId, { status: 'declined', ended_at: new Date().toISOString() }),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['calls'] });
       toast.success('Call declined');
     }
   });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = filteredNotifications.filter(n => !n.read);
      await Promise.all(unread.map(n => {
        if (n._entity === 'OSUpdate') return Promise.resolve();
        if (n._entity === 'Notification') return base44.entities.Notification.update(n.id, { read: true });
        return base44.entities.Message.update(n.id, { read: true });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['system-notifs'] });
      toast.success('All marked as read');
    }
  });

  const getIcon = (type) => {
    switch(type) {
      case 'app_approved': return Check;
      case 'app_rejected': return X;
      case 'message': return MessageSquare;
      case 'warning': return AlertTriangle;
      case 'system': return Info;
      case 'egg_messenger': return Mail;
      default:
        if (type?.includes('update') || type?.includes('EggetSystem')) return Package;
        return Bell;
    }
  };

  const getColor = (type, title) => {
    if (title?.includes('EggetSystem') && title?.includes('Available')) return 'from-indigo-500 to-purple-600';
    switch(type) {
      case 'app_approved': return 'from-green-500 to-emerald-600';
      case 'app_rejected': return 'from-red-500 to-rose-600';
      case 'message': return 'from-purple-500 to-pink-600';
      case 'warning': return 'from-yellow-500 to-orange-500';
      case 'system': return 'from-blue-500 to-cyan-600';
      case 'egg_messenger': return 'from-pink-500 to-rose-500';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const updatePrefsMutation = useMutation({
    mutationFn: (prefs) => base44.auth.updateMe({ notification_preferences: prefs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notification-prefs'] });
      toast.success('Preferences updated');
    }
  });

  const notificationTypes = [
    { value: 'all', label: 'All' },
    { value: 'system', label: 'System' },
    { value: 'app_approved', label: 'Approved' },
    { value: 'app_rejected', label: 'Rejected' },
    { value: 'message', label: 'Messages' },
    { value: 'warning', label: 'Warnings' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-slate-50 shadow-2xl z-50 flex flex-col rounded-l-3xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-6 w-28 h-28 bg-purple-500/20 rounded-full blur-2xl" />
              <div className="relative flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
                    <Bell className="w-4.5 h-4.5" />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight">Notifications</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      setIsChecking(true);
                      await Promise.all([refetchMessages(), refetchSystemNotifs(), refetchUpdates()]);
                      setIsChecking(false);
                      toast.success('Checked for new notifications');
                    }}
                    className="hover:bg-white/15 rounded-lg p-2 transition-colors"
                    title="Check for notifications"
                  >
                    <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="hover:bg-white/15 rounded-lg p-2 transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button onClick={onClose} className="hover:bg-white/15 rounded-lg p-2 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="relative flex items-center justify-between text-xs">
                <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/15 font-medium">
                  {unreadCount} unread
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-white/90 hover:text-white flex items-center gap-1.5 font-medium hover:bg-white/10 px-2.5 py-1 rounded-full transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            {!showSettings && (
              <div className="px-3 py-2.5 border-b border-slate-200 bg-white/70 backdrop-blur flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                {notificationTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setFilterType(type.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                      filterType === type.value
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 border-b border-slate-200 bg-white"
              >
                <h3 className="font-semibold text-slate-800 mb-4">Notification Preferences</h3>
                <div className="space-y-3">
                  {[
                    { id: 'system-notifs', key: 'system', label: 'System Notifications' },
                    { id: 'app-notifs', key: 'apps', label: 'App Notifications' },
                    { id: 'update-notifs', key: 'updates', label: 'Update Notifications' },
                    { id: 'message-notifs', key: 'messages', label: 'Message Notifications' },
                    { id: 'sound-notifs', key: 'sound', label: 'Notification Sound' },
                    { id: 'desktop-notifs', key: 'desktop', label: 'Desktop Notifications' },
                  ].map(({ id, key, label }) => (
                    <div key={id} className="flex items-center justify-between">
                      <Label htmlFor={id} className="text-sm">{label}</Label>
                      <Switch
                        id={id}
                        checked={notificationPrefs[key]}
                        onCheckedChange={(checked) =>
                          updatePrefsMutation.mutate({ ...notificationPrefs, [key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Notifications List */}
            <div className="flex-1 overflow-auto">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 px-6 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
                    <Bell className="w-9 h-9" />
                  </div>
                  <p className="font-semibold text-slate-400">No notifications</p>
                  <p className="text-sm text-slate-300 mt-0.5">{filterType === 'all' ? "You're all caught up!" : 'Nothing in this category'}</p>
                </div>
              ) : (
                <div className="p-3 space-y-2.5">
                  {filteredNotifications.map((notification) => {
                     const Icon = getIcon(notification.notif_type);
                     const color = getColor(notification.notif_type, notification.title);

                     // Check if this is an incoming call notification
                     const incomingCall = notification.notif_type === 'message' && 
                       notification.title?.includes('Call from') &&
                       calls.find(c => c.id === notification.related_id && c.status === 'ringing' && c.recipient_username === currentUser?.username);

                     return (
                       <motion.div
                         key={`${notification._entity}-${notification.id}`}
                         initial={{ opacity: 0, y: 12 }}
                         animate={{ opacity: 1, y: 0 }}
                         className={`group relative p-3.5 rounded-2xl transition-all overflow-hidden ${
                           notification.read
                             ? 'bg-white border border-slate-200/70'
                             : 'bg-white border border-slate-200 shadow-sm ring-1 ring-indigo-100'
                         }`}
                       >
                         <span className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${color}`} />
                         <div className="flex items-start gap-3 pl-1">
                           <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                             <Icon className="w-5 h-5 text-white" />
                           </div>
                           <div className="flex-1 min-w-0">
                             {notification.source_app && (
                               <p className="text-[11px] text-slate-400 font-medium leading-tight mb-0.5">{notification.source_app}</p>
                             )}
                             <h4 className="font-semibold text-slate-800 mb-0.5 leading-tight">{notification.title}</h4>
                             <p className="text-sm text-slate-500 mb-2 leading-snug">{notification.body}</p>
                             {notification._entity === 'OSUpdate' && notification._update && (
                               <div className="flex flex-wrap gap-1 mb-2">
                                 <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                   notification._update.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                   notification._update.priority === 'recommended' ? 'bg-blue-100 text-blue-700' :
                                   'bg-gray-100 text-gray-600'
                                 }`}>
                                   {notification._update.priority}
                                 </span>
                                 {notification._update.changes?.map((c, i) => (
                                   <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                     c.category === 'security' ? 'bg-red-100 text-red-700' :
                                     c.category === 'feature' ? 'bg-green-100 text-green-700' :
                                     c.category === 'bugfix' ? 'bg-yellow-100 text-yellow-700' :
                                     'bg-purple-100 text-purple-700'
                                   }`}>
                                     {c.category}: {c.description}
                                   </span>
                                 ))}
                               </div>
                             )}
                             {notification._entity === 'OSUpdate' && notification._update && onInstallUpdate && (
                               <button
                                 onClick={() => onInstallUpdate(notification._update)}
                                 className="mt-2.5 w-full text-xs px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                               >
                                 <Download className="w-3.5 h-3.5" />
                                 Install Update
                               </button>
                             )}
                             {incomingCall && (
                               <div className="flex gap-2 mt-2.5">
                                 <button
                                   onClick={() => acceptCallMutation.mutate(incomingCall.id)}
                                   className="flex-1 text-xs px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                 >
                                   <Phone className="w-3.5 h-3.5" />
                                   Answer
                                 </button>
                                 <button
                                   onClick={() => declineCallMutation.mutate(incomingCall.id)}
                                   className="flex-1 text-xs px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                 >
                                   <PhoneOff className="w-3.5 h-3.5" />
                                   Decline
                                 </button>
                               </div>
                             )}
                             <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                               {notification.created_date ? format(new Date(notification.created_date), 'MMM d, h:mm a') : ''}
                             </p>
                             </div>
                             <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                             {!notification.read && !incomingCall && (
                               <button
                                 onClick={() => markReadMutation.mutate({ id: notification.id, _entity: notification._entity })}
                                 className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                                 title="Mark as read"
                               >
                                 <Check className="w-4 h-4 text-emerald-600" />
                               </button>
                             )}
                             <button
                               onClick={() => deleteNotificationMutation.mutate({ id: notification.id, _entity: notification._entity })}
                               className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                               title="Delete"
                             >
                               <X className="w-4 h-4 text-slate-400" />
                             </button>
                             </div>
                         </div>
                       </motion.div>
                     );
                   })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}