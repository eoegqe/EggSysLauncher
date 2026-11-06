import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Check, X, Package, Eye, Trash2, RefreshCw, MessageSquare, Mail, Users, Ban, Unlock, UserCog, BarChart3, Activity, CheckSquare, Send, Sparkles, Lock, RotateCw, User, ListChecks, ExternalLink, Crown, Download, FlaskConical, Bell, Tv, ShieldCheck } from 'lucide-react';
import { createPageUrl } from '@/utils';
import DailyTasks from '../apps/DailyTasks';
import AdminProfileLinks from '../apps/AdminProfileLinks';
import AdminAnalytics from './admin/AdminAnalytics';
import AdminActivityLog from './admin/AdminActivityLog';
import AdminUserDetail from './admin/AdminUserDetail';
import Base44UserDetail from './admin/Base44UserDetail';
import AdminEmailBlast from './admin/AdminEmailBlast';
import AdminEmailUser from './admin/AdminEmailUser';
import AdminUtilities from './admin/AdminUtilities';
import AdminTabBar from './admin/AdminTabBar';
import AddCollaboratorDialog from './admin/AddCollaboratorDialog';
import RoleDialog from './admin/RoleDialog';
import AdminPushNotifications from './admin/AdminPushNotifications';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/lib/devToast';
import { format } from 'date-fns';
import { CONTENT_RATINGS, getRatingMeta } from '@/lib/contentRatings';
import { isElevated, canManageAdmins } from '@/lib/adminPermissions';
import EggSysWord from '@/components/os/EggSysWord';
import { confirmAction } from '@/components/os/ConfirmDialog';
import { sendNotificationEmail } from '@/lib/notifyEmail';
import { isReactZipApp, assembleReactZipHtml } from '@/lib/reactZip';


export default function AdminApp() {
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeTab, setActiveTab] = useState('apps');
  const [adminMessages, setAdminMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedBase44User, setSelectedBase44User] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState('warning');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(localStorage.getItem('eos_demo_mode') === 'true');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const v = localStorage.getItem('eos_admin_dark_mode');
    return v === null ? true : v === 'true';
  });
  const [initializingProfiles, setInitializingProfiles] = useState(false);


  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('eos_admin_dark_mode', next.toString());
  };
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', category: 'general', priority: 'medium', is_published: true });
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [updateForm, setUpdateForm] = useState({ 
    version: '', 
    title: '', 
    description: '', 
    release_date: new Date().toISOString().split('T')[0],
    size_mb: 50,
    priority: 'recommended',
    changes: [],
    is_published: true
  });
  const [showAddCollaboratorDialog, setShowAddCollaboratorDialog] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('We\'re performing scheduled maintenance to improve your experience. Please check back in about a day.');
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushTarget, setPushTarget] = useState('all');
  const [pushType, setPushType] = useState('system');
  const [pushSending, setPushSending] = useState(false);
  const queryClient = useQueryClient();

  // Check cached admin status
  const getCachedAdminStatus = () => {
    try {
      const cached = localStorage.getItem('eos_admin_verified');
      if (cached) {
        const { email, timestamp } = JSON.parse(cached);
        // Cache valid for 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return email;
        }
      }
    } catch (e) {}
    return null;
  };

  const [cachedAdminEmail] = useState(getCachedAdminStatus());

  const { data: user } = useQuery({
    queryKey: ['current-user-admin'],
    queryFn: () => base44.auth.me()
  });

  // Fetch connected EAccount for admin role check (try owner_email, email, then username)
  const { data: connectedEAccount, isLoading: isEAccountLoading } = useQuery({
    queryKey: ['connected-eaccount', user?.email],
    queryFn: async () => {
      const byOwner = await base44.entities.EAccount.filter({ owner_email: user?.email });
      if (byOwner?.length) return byOwner;
      const byEmail = await base44.entities.EAccount.filter({ email: user?.email });
      if (byEmail?.length) return byEmail;
      if (user?.username) {
        const byUsername = await base44.entities.EAccount.filter({ username: user.username });
        if (byUsername?.length) return byUsername;
      }
      return [];
    },
    enabled: !!user?.email,
  });

  const eAccount = connectedEAccount?.[0];

  // Cache admin status for fast future loads
  useEffect(() => {
    if (user?.email && (user.role === 'admin' || eAccount?.admin_role)) {
      localStorage.setItem('eos_admin_verified', JSON.stringify({
        email: user.email,
        timestamp: Date.now()
      }));
    }
  }, [user, eAccount]);

  // Quick access check first - check EAccount admin_role
  const hasBasicAccess = cachedAdminEmail || user?.role === 'admin' || eAccount?.admin_role || user?.['admin?'] === 'y';



  const { data: adminWhitelist = [] } = useQuery({
    queryKey: ['admin-whitelist-adminapp'],
    queryFn: () => base44.entities.AdminWhitelist.filter({ is_active: true }),
    enabled: !!user && !!hasBasicAccess,
    staleTime: 60000 // Cache for 1 minute
  });

  // Access control - check EAccount admin_role instead of user.admin_role
  const whitelistEntry = adminWhitelist.find(a => a.email === user?.email);
  const isOwner = eAccount?.admin_role === 'owner' || whitelistEntry?.role === 'owner' || user?.email === 'eggtheegget@outlook.com';
  const isCurrentOwner = eAccount?.admin_role === 'owner' || user?.email === 'eggtheegget@outlook.com';
  const isCoOwner = eAccount?.admin_role === 'owner' || eAccount?.admin_role === 'co-owner';
  const isAdmin = eAccount?.admin_role === 'admin' || eAccount?.admin_role === 'co-owner' || eAccount?.admin_role === 'owner' || user?.role === 'admin' || isOwner || isCoOwner || whitelistEntry?.role === 'owner';
  const isVIP = eAccount?.admin_role === 'vip';
  const canViewAdmin = isAdmin || isVIP;
  const hasAccess = !!(hasBasicAccess || isOwner || isCoOwner || whitelistEntry);
  
  // Allow users to view/edit their own EAccount profile
  const canEditOwnProfile = !!user?.email;

  // Rank hierarchy: owner > co_owner > admin > user
  const getRank = (u) => {
    if (!u) return 0;
    const wEntry = adminWhitelist.find(a => a.email === u.email);
    if (u.admin_role === 'owner' || wEntry?.role === 'owner') return 4;
    if (u.admin_role === 'co-owner') return 3;
    if (u.admin_role === 'admin') return 2;
    if (u.role === 'admin') return 2;
    return 1;
  };

  const isManager = isOwner || isCoOwner || canManageAdmins(eAccount);
  const canModerate = (targetUser) => {
    if (!targetUser) return false;
    // Detect self by email (EAccount id !== Base44 User id)
    const isSelf = targetUser.email === user?.email || targetUser.owner_email === user?.email;
    // Owners and co-owners can moderate themselves
    if ((isOwner || isCoOwner) && isSelf) return true;
    if (isOwner) return getRank(targetUser) < 4;
    if (isCoOwner) return getRank(targetUser) < 3;
    // Manager admins can moderate other admins and regular users
    if (isManager) return getRank(targetUser) <= 2 && !isSelf;
    return getRank(user) > getRank(targetUser);
  };

  const { data: pendingApps = [], isLoading } = useQuery({
    queryKey: ['pending-apps'],
    queryFn: () => base44.entities.PublishedApp.filter({ status: 'pending' }, '-created_date'),
    enabled: !!user && hasAccess && (activeTab === 'apps' || activeTab === 'dashboard'),
    staleTime: 30000
  });

  const { data: allApps = [] } = useQuery({
    queryKey: ['all-published-apps'],
    queryFn: () => base44.entities.PublishedApp.list('-created_date'),
    enabled: !!user && hasAccess && activeTab === 'apps',
    staleTime: 30000
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['all-feedbacks'],
    queryFn: () => base44.entities.Feedback.list('-created_date'),
    enabled: !!user && hasAccess && (activeTab === 'feedback' || activeTab === 'dashboard'),
    staleTime: 30000
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.EAccount.list('-created_date'),
    enabled: !!user && hasAccess && (activeTab === 'users' || activeTab === 'eaccounts' || activeTab === 'dashboard'),
    refetchInterval: activeTab === 'users' || activeTab === 'eaccounts' || activeTab === 'dashboard' ? 10000 : false,
    staleTime: 5000
  });

  // Base44 platform users (User entity) — the "Users" tab lists these; clicking
  // opens the same E-Account management UI used for the linked E-Account.
  const { data: base44Users = [], isLoading: isLoadingBase44Users } = useQuery({
    queryKey: ['base44-users-admin'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
    enabled: !!user && hasAccess && isOwner && (activeTab === 'users' || activeTab === 'dashboard'),
    staleTime: 10000
  });

  // Find the E-Account linked to a Base44 user (by owner_email or email match).
  const findLinkedEAccount = (email) =>
    allUsers.find((u) => u.owner_email === email || u.email === email) || null;

  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 50),
    enabled: (isOwner || isCoOwner) && (activeTab === 'activity' || activeTab === 'dashboard'),
    staleTime: 30000
  });

  const { data: adminNotes = [] } = useQuery({
    queryKey: ['admin-notes'],
    queryFn: () => base44.entities.AdminNote.list('-created_date'),
    enabled: canViewAdmin && activeTab === 'notes',
    staleTime: 30000
  });

  const { data: osUpdates = [] } = useQuery({
    queryKey: ['os-updates'],
    queryFn: () => base44.entities.OSUpdate.list('-created_date'),
    enabled: canViewAdmin && activeTab === 'updates',
    staleTime: 30000
  });

  const { data: showRequests = [] } = useQuery({
    queryKey: ['show-requests'],
    queryFn: () => base44.entities.ShowRequest.list('-created_date'),
    enabled: canViewAdmin && activeTab === 'tvshows',
    staleTime: 30000
  });

  const { data: adminChats = [] } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const messages = await base44.entities.UserMessage.filter({
        $or: [
          { sender_username: user?.username },
          { recipient_username: user?.username }
        ]
      }, '-created_date');
      return messages;
    },
    enabled: hasAccess && !!user?.username && activeTab === 'messaging',
    refetchInterval: 15000
  });

  const newFeedbackCount = feedbacks.filter(f => f.status === 'new').length;
  const activeUsersCount = allUsers.filter(u => u.status !== 'banned').length;

  const logActivity = async (action, targetType, targetId, details = {}) => {
    try {
      await base44.entities.ActivityLog.create({
        action,
        target_type: targetType,
        target_id: targetId,
        details,
        admin_email: user?.email
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  // Auto-refresh users list every 10 seconds when on users or e-accounts tab
  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'eaccounts') {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['all-users'] });
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, queryClient]);

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, status, feedback }) => {
      await base44.entities.Feedback.update(id, { status });
      // Send notification if resolved
      if (status === 'resolved') {
        const feedbackUser = await base44.entities.EAccount.filter({ email: feedback.user_email });
        if (feedbackUser[0]?.username) {
          await base44.entities.Message.create({
            title: 'Your Feedback Was Resolved',
            content: `Your feedback "${feedback.subject}" has been reviewed and resolved. Thank you!`,
            message_type: 'system',
            recipient_username: feedbackUser[0].username
          });
          sendNotificationEmail({
            recipientEmail: feedbackUser[0].email || feedbackUser[0].owner_email,
            title: 'Your Feedback Was Resolved',
            message: `Your feedback "${feedback.subject}" has been reviewed and resolved. Thank you!`
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-feedbacks'] });
      toast.success('Feedback updated');
    }
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: (id) => base44.entities.Feedback.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-feedbacks'] });
      toast.success('Feedback deleted');
      setSelectedFeedback(null);
    }
  });

  const banUserMutation = useMutation({
    mutationFn: ({ userId, reason, userEmail, suspensionType, suspensionDuration, targetUser, banType }) => {
      const isSelf = userEmail === user?.email;
      if (isSelf) {
        // Only the current owner may moderate themselves (for testing bans/suspensions)
        if (!isCurrentOwner) throw new Error('You cannot moderate yourself');
      } else if (adminWhitelist.some(a => a.email === userEmail) || !canModerate(targetUser)) {
        throw new Error('You cannot moderate this user');
      }
      let updateData = {};
      if (suspensionType === 'creation') {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (suspensionDuration || 24));
        updateData = { status: 'suspended', creation_suspended: true, creation_suspension_expires: expiresAt.toISOString(), suspension_reason: reason };
      } else if (suspensionType === 'online') {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (suspensionDuration || 24));
        updateData = { status: 'suspended', online_suspended: true, online_suspension_expires: expiresAt.toISOString(), suspension_reason: reason };
      } else if (banType === 'temporary') {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (suspensionDuration || 24));
        updateData = { status: 'banned', banned_reason: reason, ban_expires: expiresAt.toISOString() };
      } else {
        updateData = { status: 'banned', banned_reason: reason, ban_expires: null };
      }
      return base44.entities.EAccount.update(userId, updateData);
    },
    onSuccess: async (_, variables) => {
      await logActivity('ban_user', 'user', variables.userId, { 
        reason: variables.reason,
        suspension_type: variables.suspensionType,
        duration: variables.suspensionDuration
      });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('User banned');
      setSelectedUser(null);
      setBanReason('');
      setSelectedItems([]);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to ban user');
    }
  });

  const unbanUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.EAccount.update(userId, { 
      status: 'active', 
      banned_reason: null,
      ban_expires: null,
      creation_suspended: false,
      creation_suspension_expires: null,
      online_suspended: false,
      online_suspension_expires: null
    }),
    onSuccess: async (_, userId) => {
      await logActivity('unban_user', 'user', userId, {});
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('User unbanned and all suspensions lifted');
      setSelectedUser(null);
    }
  });

  const removeSuspensionMutation = useMutation({
    mutationFn: (userId) => base44.entities.EAccount.update(userId, {
      status: 'active',
      creation_suspended: false,
      creation_suspension_expires: null,
      online_suspended: false,
      online_suspension_expires: null,
      suspension_reason: null
    }),
    onSuccess: async (_, userId) => {
      await logActivity('unban_user', 'user', userId, { type: 'remove_suspension' });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Suspension removed — account is active again');
      setSelectedUser(null);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, ownerEmail }) => {
      // Enforce single owner: demote any existing owner before assigning a new one
      if (role === 'owner') {
        const existingOwners = await base44.entities.EAccount.filter({ admin_role: 'owner' });
        await Promise.all(existingOwners.filter(o => o.id !== userId).map(o => base44.entities.EAccount.update(o.id, { admin_role: 'none' })));
      }
      const updated = await base44.entities.EAccount.update(userId, { admin_role: role });
      // Sync admin_role to the linked Base44 User so auth.me() and public profiles reflect it
      try {
        const email = ownerEmail || updated?.owner_email;
        if (email) {
          const users = await base44.entities.User.filter({ email });
          if (users[0]) await base44.entities.User.update(users[0].id, { admin_role: role });
        }
      } catch (e) { /* non-fatal sync */ }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-admin'] });
      toast.success('Role updated');
      setShowRoleDialog(false);
      setSelectedRole('');
    }
  });



  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientUsername, title, message, messageType }) => {
      const messageData = {
        title: title,
        content: message,
        recipient_username: recipientUsername,
        message_type: messageType,
        read: false
      };

      const createdMessage = await base44.entities.Message.create(messageData);
      sendNotificationEmail({
        recipientEmail: selectedUser?.email || selectedUser?.owner_email,
        title,
        message
      });
      await logActivity('message_user', 'user', selectedUser.id, { title, message, message_id: createdMessage.id });

      return createdMessage;
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      toast.success(`Message sent to ${message.recipient_username}`);
      setShowMessageDialog(false);
      setMessageTitle('');
      setMessageContent('');
      setMessageType('warning');
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    }
  });

  const togglePranksterMutation = useMutation({
    mutationFn: ({ userId, isPrankster }) => 
      base44.entities.EAccount.update(userId, { is_prankster: isPrankster }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Prankster status updated');
    }
  });

  const changeUsernameMutation = useMutation({
    mutationFn: ({ userId, newUsername }) => 
      base44.entities.EAccount.update(userId, { username: newUsername }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Username updated');
      setSelectedUser(null);
    }
  });

  const toggleBase44AdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin, userEmail }) => {
      if (!isAdmin) {
        // When making someone a Base44 Admin, invite them as collaborator
        await base44.users.inviteUser(userEmail, 'admin');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User invited as collaborator');
    }
  });

  const getUserRole = (u) => {
    const whitelistEntry = adminWhitelist.find(a => a.email === u.email);
    if (whitelistEntry?.role === 'owner') return { name: 'Owner', type: 'owner' };
    if (u.admin_role === 'owner') return { name: 'Owner', type: 'owner' };
    if (u.admin_role === 'co-owner') return { name: isElevated(u) ? 'Co-Owner (elevated)' : 'Co-Owner', type: 'co_owner' };
    if (u.admin_role === 'admin') return { name: isElevated(u) ? 'Admin (elevated)' : 'Admin', type: 'admin' };
    if (u.admin_role === 'vip') return { name: 'VIP', type: 'vip' };
    return { name: 'None', type: 'none' };
  };

  const updateContentRatingMutation = useMutation({
    mutationFn: async ({ appId, contentRating }) =>
      base44.entities.PublishedApp.update(appId, { content_rating: contentRating }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-apps'] });
      queryClient.invalidateQueries({ queryKey: ['all-published-apps'] });
      setSelectedApp((prev) => prev ? { ...prev, content_rating: variables.contentRating } : prev);
      toast.success('Content rating updated');
    },
    onError: (err) => toast.error('Failed to update content rating: ' + (err?.message || err))
  });

  const approveMutation = useMutation({
    mutationFn: async (app) => {
      await base44.entities.PublishedApp.update(app.id, { status: 'approved' });
      const appCreator = await base44.entities.EAccount.filter({ owner_email: app.created_by });
      if (appCreator[0]?.username) {
        await base44.entities.Message.create({
          title: 'App Approved! 🎉',
          content: `Your app "${app.name}" has been approved and is now live in the App Store!`,
          message_type: 'system',
          recipient_username: appCreator[0].username
        });
        sendNotificationEmail({
          recipientEmail: appCreator[0].email || appCreator[0].owner_email,
          title: 'App Approved! 🎉',
          message: `Your app "${app.name}" has been approved and is now live in the App Store!`
        });
      }
      await logActivity('approve_app', 'app', app.id, { app_name: app.name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-apps'] });
      queryClient.invalidateQueries({ queryKey: ['all-published-apps'] });
      queryClient.invalidateQueries({ queryKey: ['approved-published-apps'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('App approved!');
      setSelectedApp(null);
      setSelectedItems([]);
    },
    onError: () => {
      toast.error('Failed to approve app');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (app) => {
      await base44.entities.PublishedApp.update(app.id, { status: 'rejected' });
      const appCreator = await base44.entities.EAccount.filter({ owner_email: app.created_by });
      if (appCreator[0]?.username) {
        await base44.entities.Message.create({
          title: 'App Not Approved',
          content: `Your app "${app.name}" was not approved. Please review our guidelines and resubmit.`,
          message_type: 'warning',
          recipient_username: appCreator[0].username
        });
        sendNotificationEmail({
          recipientEmail: appCreator[0].email || appCreator[0].owner_email,
          title: 'App Not Approved',
          message: `Your app "${app.name}" was not approved. Please review our guidelines and resubmit.`
        });
      }
      await logActivity('reject_app', 'app', app.id, { app_name: app.name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-apps'] });
      queryClient.invalidateQueries({ queryKey: ['all-published-apps'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('App rejected');
      setSelectedApp(null);
      setSelectedItems([]);
    },
    onError: () => {
      toast.error('Failed to reject app');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (appId) => base44.entities.PublishedApp.delete(appId),
    onSuccess: async (_, appId) => {
      await logActivity('delete_app', 'app', appId, {});
      queryClient.invalidateQueries({ queryKey: ['pending-apps'] });
      queryClient.invalidateQueries({ queryKey: ['all-published-apps'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('App deleted');
      setSelectedApp(null);
    }
  });

  const bulkApproveAppsMutation = useMutation({
    mutationFn: async (appIds) => {
      const apps = allApps.filter(app => appIds.includes(app.id));
      const rated = apps.filter(app => app.content_rating && app.content_rating !== 'unrated');
      if (rated.length !== apps.length) {
        throw new Error(`${apps.length - rated.length} app(s) have no content rating. Rate them first.`);
      }
      await Promise.all(rated.map(app => approveMutation.mutateAsync(app)));
    },
    onSuccess: () => {
      setSelectedItems([]);
      toast.success('Apps approved!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to approve apps');
    }
  });

  const bulkBanUsersMutation = useMutation({
    mutationFn: async ({ userIds, reason }) => {
      const whitelistedEmails = adminWhitelist.map(a => a.email);
      const usersToUpdate = allUsers.filter(u => 
        userIds.includes(u.id) && !whitelistedEmails.includes(u.email) && u.email !== user?.email
      );
      await Promise.all(usersToUpdate.map(u => 
        base44.entities.EAccount.update(u.id, { status: 'banned', banned_reason: reason })
      ));
      await Promise.all(usersToUpdate.map(u => 
        logActivity('ban_user', 'user', u.id, { reason, bulk: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      setSelectedItems([]);
      toast.success('Users banned');
    }
  });

  const clearActivityLogsMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(activityLogs.map(log => base44.entities.ActivityLog.delete(log.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Activity logs cleared');
    }
  });

  const sendAdminMessageMutation = useMutation({
    mutationFn: async ({ recipientUsername, content }) => {
      return await base44.entities.UserMessage.create({
        sender_username: user.username,
        recipient_username: recipientUsername,
        content,
        read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      setNewMessage('');
      toast.success('Message sent');
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) => base44.entities.UserMessage.delete(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Message deleted');
    }
  });



  const createNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.AdminNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] });
      toast.success('Note created');
      setShowNoteDialog(false);
      setNoteForm({ title: '', content: '', category: 'general', priority: 'medium', is_published: true });
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AdminNote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] });
      toast.success('Note updated');
      setShowNoteDialog(false);
      setEditingNote(null);
      setNoteForm({ title: '', content: '', category: 'general', priority: 'medium', is_published: true });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.AdminNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] });
      toast.success('Note deleted');
    }
  });

  const createUpdateMutation = useMutation({
    mutationFn: (updateData) => base44.entities.OSUpdate.create(updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-updates'] });
      toast.success('OS Update created');
      setShowUpdateDialog(false);
      setUpdateForm({ 
        version: '', 
        title: '', 
        description: '', 
        release_date: new Date().toISOString().split('T')[0],
        size_mb: 50,
        priority: 'recommended',
        changes: [],
        is_published: true
      });
    }
  });

  const updateUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OSUpdate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-updates'] });
      toast.success('OS Update updated');
      setShowUpdateDialog(false);
      setEditingUpdate(null);
      setUpdateForm({ 
        version: '', 
        title: '', 
        description: '', 
        release_date: new Date().toISOString().split('T')[0],
        size_mb: 50,
        priority: 'recommended',
        changes: [],
        is_published: true
      });
    }
  });

  const deleteUpdateMutation = useMutation({
    mutationFn: (id) => base44.entities.OSUpdate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-updates'] });
      toast.success('OS Update deleted');
    }
  });

  // Auto-expire temporary bans
  useEffect(() => {
    if ((activeTab === 'users' || activeTab === 'eaccounts') && allUsers.length > 0) {
      const now = new Date();
      allUsers.forEach(async (u) => {
        if (u.ban_expires && new Date(u.ban_expires) <= now && u.status === 'banned') {
          try {
            await base44.entities.EAccount.update(u.id, { status: 'active', banned_reason: null, ban_expires: null });
            queryClient.invalidateQueries({ queryKey: ['all-users'] });
          } catch (error) { console.error('Failed to auto-expire ban:', error); }
        }
        if (u.creation_suspension_expires && new Date(u.creation_suspension_expires) <= now && u.creation_suspended) {
          try {
            await base44.entities.EAccount.update(u.id, { creation_suspended: false, creation_suspension_expires: null, ...(u.status === 'suspended' ? { status: 'active' } : {}) });
            queryClient.invalidateQueries({ queryKey: ['all-users'] });
          } catch (error) { console.error('Failed to auto-expire creation suspension:', error); }
        }
        if (u.online_suspension_expires && new Date(u.online_suspension_expires) <= now && u.online_suspended) {
          try {
            await base44.entities.EAccount.update(u.id, { online_suspended: false, online_suspension_expires: null, ...(u.status === 'suspended' ? { status: 'active' } : {}) });
            queryClient.invalidateQueries({ queryKey: ['all-users'] });
          } catch (error) { console.error('Failed to auto-expire online suspension:', error); }
        }
      });
    }
  }, [allUsers, activeTab, queryClient]);

  const analyzeWithAI = async (content, type) => {
    setAiAnalyzing(true);
    setAiResult(null);
    try {
      const prompt = type === 'app' 
        ? `Analyze this app submission for approval in an app store. Check for: inappropriate content, policy violations, security concerns, quality issues, and overall suitability. App details:\n\nName: ${content.name}\nDescription: ${content.description}\nHTML Content:\n${content.html_content}\n\nProvide a recommendation (approve/reject/review) with reasoning.`
        : `Analyze this user feedback for priority and sentiment. Feedback:\n\nSubject: ${content.subject}\nCategory: ${content.category}\nMessage: ${content.message}\n\nProvide priority level (high/medium/low), sentiment, and suggested action.`;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendation: { type: 'string' },
            reasoning: { type: 'string' },
            concerns: { type: 'array', items: { type: 'string' } },
            score: { type: 'number' }
          }
        }
      });
      setAiResult(result);
    } catch (error) {
      toast.error('AI analysis failed');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const initializeProfileIDs = async () => {
    if (!await confirmAction('Assign sequential profile IDs to all users based on join date? This will set profile_id on each user.')) return;
    setInitializingProfiles(true);
    try {
      await base44.functions.invoke('initializeProfileIds', {});
      toast.success('Profile IDs initialized successfully!');
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    } catch (error) {
      toast.error('Failed to initialize profile IDs: ' + error.message);
    } finally {
      setInitializingProfiles(false);
    }
  };



  if (!hasAccess) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'} admin-scope`}>
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-300">You don't have permission to access this app.</p>
        </div>
      </div>
    );
  }

  // 2FA is required to moderate. The platform owner is exempt so they can't
  // lock themselves out; all other admins/co-owners must enable 2FA first.
  // Wait for the EAccount to load so the gate doesn't flash false negatives.
  if (!isCurrentOwner && !isEAccountLoading && !eAccount?.two_factor_enabled) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'} admin-scope`}>
        <div className="text-center max-w-sm px-6">
          <ShieldCheck className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">2FA Required</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-1">Two-factor authentication is required to access the admin panel and moderate.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Enable 2FA in Settings → E Account → Security, then reopen the Admin Panel.</p>
        </div>
      </div>
    );
  }

  if (selectedApp) {
    const isZipApp = isReactZipApp(selectedApp.html_content);
    const reactZipPayload = isZipApp ? (selectedApp.app_data?.react_zip || null) : null;
    const previewSrcDoc = isZipApp ? assembleReactZipHtml(reactZipPayload) : selectedApp.html_content;
    return (
      <div className={`h-full flex flex-col ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'} admin-scope`}>
        <div className="p-3 md:p-4 bg-white border-b flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedApp(null)} className="text-sm">← Back</Button>
          <h2 className="text-base md:text-xl font-bold truncate flex-1">{selectedApp.name}</h2>
          <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
            selectedApp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            selectedApp.status === 'approved' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {selectedApp.status}
          </span>
        </div>

        <div className="flex-1 overflow-auto p-3 md:p-6">
          <div className="bg-white rounded-xl border p-4 md:p-6 mb-4 md:mb-6">
            <h3 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">App Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
              <div><span className="text-gray-500">App ID:</span> {selectedApp.app_id}</div>
              <div><span className="text-gray-500">Version:</span> {selectedApp.version}</div>
              <div><span className="text-gray-500">Category:</span> {selectedApp.category}</div>
              <div><span className="text-gray-500">Submitted:</span> {selectedApp.created_date ? format(new Date(selectedApp.created_date), 'MMM d, yyyy h:mm a') : 'Unknown'}</div>
              <div className="col-span-2"><span className="text-gray-500">Description:</span> {selectedApp.description || 'None'}</div>
              <div><span className="text-gray-500">Submitted by:</span> {selectedApp.created_by}</div>
              <div><span className="text-gray-500">VR enabled:</span> {selectedApp.vr_enabled ? 'Yes' : 'No'}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
              <h3 className="font-semibold text-sm md:text-base">Content Rating</h3>
              {(() => { const m = getRatingMeta(selectedApp.content_rating); return (
                <span className={`px-2 py-1 rounded text-xs font-medium border ${m.color}`}>{m.label}</span>
              ); })()}
            </div>
            <p className="text-xs md:text-sm text-gray-500 mb-3">
              {selectedApp.status === 'pending'
                ? 'Choose a content rating before approving. This is required.'
                : 'Admins can update this rating at any time.'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CONTENT_RATINGS.filter((r) => r.value !== 'unrated').map((r) => (
                <button
                  key={r.value}
                  onClick={() => updateContentRatingMutation.mutate({ appId: selectedApp.id, contentRating: r.value })}
                  disabled={updateContentRatingMutation.isPending}
                  className={`p-2 md:p-3 rounded-lg border text-xs md:text-sm font-medium transition-all disabled:opacity-50 ${
                    selectedApp.content_rating === r.value
                      ? r.color + ' ring-2 ring-blue-400'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                  title={r.description}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] md:text-xs text-gray-400 mt-2">{getRatingMeta(selectedApp.content_rating).description}</p>
          </div>

          <div className="bg-white rounded-xl border p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="font-semibold text-sm md:text-base">Preview</h3>
              <Button
                onClick={() => analyzeWithAI(selectedApp, 'app')}
                disabled={aiAnalyzing}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                {aiAnalyzing ? 'Analyzing...' : 'AI Analysis'}
              </Button>
            </div>
            {aiResult && (
              <div className={`mb-4 p-4 rounded-lg border ${
                aiResult.recommendation?.toLowerCase().includes('approve') ? 'bg-green-50 border-green-200' :
                aiResult.recommendation?.toLowerCase().includes('reject') ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles className="w-4 h-4 mt-0.5 text-purple-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{aiResult.recommendation}</p>
                    <p className="text-sm text-gray-700 mt-1">{aiResult.reasoning}</p>
                    {aiResult.concerns?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-600">Concerns:</p>
                        <ul className="text-xs text-gray-600 list-disc list-inside mt-1">
                          {aiResult.concerns.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                    {aiResult.score && (
                      <p className="text-xs text-gray-500 mt-2">Score: {aiResult.score}/10</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="border rounded-lg overflow-hidden" style={{ height: '300px' }}>
              <iframe
                srcDoc={previewSrcDoc}
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin"
                title="App Preview"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 md:p-6 mb-4 md:mb-6">
            <h3 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">HTML Content</h3>
            {isZipApp ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 text-xs md:text-sm text-blue-800">
                <p className="font-semibold mb-1">React ZIP app</p>
                <p>This app was uploaded as a React project archive. Its source is bundled in the uploaded ZIP and transpiled on demand — there is no raw HTML to display here. Use the preview above to see it running.</p>
              </div>
            ) : (
              <pre className="bg-gray-900 text-gray-100 p-3 md:p-4 rounded-lg text-xs overflow-auto max-h-48 md:max-h-64">
                {selectedApp.html_content}
              </pre>
            )}
          </div>

          {isAdmin && (
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              {selectedApp.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      if (!selectedApp.content_rating || selectedApp.content_rating === 'unrated') {
                        toast.error('Please choose a content rating before approving');
                        return;
                      }
                      approveMutation.mutate(selectedApp);
                    }}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button 
                    onClick={() => rejectMutation.mutate(selectedApp)}
                    disabled={rejectMutation.isPending}
                    variant="destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                  </Button>
                </>
              )}
              <Button 
                onClick={async () => {
                  if (await confirmAction('Delete this app permanently?')) {
                    deleteMutation.mutate(selectedApp.id);
                  }
                }}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Feedback detail view
  if (selectedFeedback) {
    return (
      <div className={`h-full flex flex-col ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'} admin-scope`}>
        <div className="p-3 md:p-4 bg-white border-b flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedFeedback(null)} className="text-sm">← Back</Button>
          <h2 className="text-base md:text-xl font-bold truncate flex-1">{selectedFeedback.subject}</h2>
          <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
            selectedFeedback.status === 'new' ? 'bg-blue-100 text-blue-800' :
            selectedFeedback.status === 'read' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {selectedFeedback.status}
          </span>
        </div>
        <div className="flex-1 overflow-auto p-3 md:p-6">
          <div className="bg-white rounded-xl border p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="font-semibold text-sm md:text-base">Feedback Details</h3>
              <Button
                onClick={async () => analyzeWithAI(selectedFeedback, 'feedback')}
                disabled={aiAnalyzing}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                {aiAnalyzing ? 'Analyzing...' : 'AI Analysis'}
              </Button>
            </div>
            {aiResult && (
              <div className="mb-4 p-4 rounded-lg border bg-purple-50 border-purple-200">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 text-purple-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{aiResult.recommendation}</p>
                    <p className="text-sm text-gray-700 mt-1">{aiResult.reasoning}</p>
                    {aiResult.concerns?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-600">Key Points:</p>
                        <ul className="text-xs text-gray-600 list-disc list-inside mt-1">
                          {aiResult.concerns.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm mb-4">
              <div><span className="text-gray-500">From:</span> {selectedFeedback.user_name}</div>
              <div><span className="text-gray-500">Email:</span> {selectedFeedback.user_email}</div>
              <div><span className="text-gray-500">Category:</span> {selectedFeedback.category}</div>
              <div><span className="text-gray-500">Date:</span> {selectedFeedback.created_date ? format(new Date(selectedFeedback.created_date), 'MMM d, yyyy h:mm a') : 'Unknown'}</div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Message</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.message}</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            {isAdmin && (
              <>
                {selectedFeedback.status === 'new' && (
                  <Button onClick={() => updateFeedbackMutation.mutate({ id: selectedFeedback.id, status: 'read', feedback: selectedFeedback })} size="sm" className="w-full md:w-auto">
                    <Eye className="w-4 h-4 mr-2" />Mark as Read
                  </Button>
                )}
                {selectedFeedback.status !== 'resolved' && (
                  <Button onClick={() => updateFeedbackMutation.mutate({ id: selectedFeedback.id, status: 'resolved', feedback: selectedFeedback })} size="sm" className="bg-green-600 hover:bg-green-700 w-full md:w-auto">
                    <Check className="w-4 h-4 mr-2" />Mark Resolved
                  </Button>
                )}
                <Button variant="outline" size="sm" className="text-red-600 w-full md:w-auto" onClick={async () => { if (await confirmAction('Delete?')) deleteFeedbackMutation.mutate(selectedFeedback.id); }}>
                  <Trash2 className="w-4 h-4 mr-2" />Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin pages grouped by category. Shared by the dashboard grid and the
  // persistent tab bar so the two stay in sync.
  const adminSections = [
    {
      category: 'Moderation',
      cards: [
        { id: 'apps', label: 'Apps', icon: Package, badge: pendingApps.length, show: true, color: 'from-blue-500 to-blue-600' },
        { id: 'feedback', label: 'Feedback', icon: MessageSquare, badge: newFeedbackCount, show: true, color: 'from-purple-500 to-pink-500' },
        { id: 'users', label: 'Users', icon: Users, show: isOwner, color: 'from-emerald-500 to-teal-600' },
        { id: 'eaccounts', label: 'E-Accounts', icon: UserCog, show: isOwner, color: 'from-teal-500 to-cyan-600' },
        { id: 'activity', label: 'Activity', icon: Activity, show: isOwner || isCoOwner, color: 'from-orange-500 to-red-500' },
        { id: 'tvshows', label: 'TV Shows', icon: Tv, badge: showRequests.filter(s => s.status === 'pending').length, show: canViewAdmin, color: 'from-red-500 to-rose-600' },
      ],
    },
    {
      category: 'Communications',
      cards: [
        { id: 'messaging', label: 'Messages', icon: Mail, show: hasAccess, color: 'from-blue-500 to-indigo-600' },
        { id: 'email', label: 'Email Users', icon: Send, show: canViewAdmin, color: 'from-rose-500 to-pink-600' },
        { id: 'pushnotifs', label: 'Push Notifications', icon: Bell, show: canViewAdmin, color: 'from-sky-500 to-blue-600' },
      ],
    },
    {
      category: 'Content & System',
      cards: [
        { id: 'notes', label: 'Notes', icon: CheckSquare, show: canViewAdmin, color: 'from-amber-500 to-orange-500' },
        { id: 'updates', label: 'OS Updates', icon: RotateCw, show: canViewAdmin, color: 'from-cyan-500 to-blue-500' },
        { id: 'dailytasks', label: 'Daily Tasks', icon: ListChecks, show: canViewAdmin, color: 'from-green-500 to-emerald-600' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, show: canViewAdmin, color: 'from-indigo-500 to-purple-600' },
        { id: 'profiles', label: 'Profile Links', icon: User, show: true, color: 'from-slate-500 to-gray-600' },
      ],
    },
    {
      category: 'Owner Utilities',
      cards: [
        { id: 'utilities', label: 'Utilities', icon: FlaskConical, show: isOwner || isCoOwner, color: 'from-violet-500 to-fuchsia-600' },
      ],
    },
  ];

  return (
    <>
      <AddCollaboratorDialog open={showAddCollaboratorDialog} onOpenChange={setShowAddCollaboratorDialog} />

      {/* Message User Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-md z-[301]">
          <DialogHeader>
            <DialogTitle className="text-base">Send Message to {selectedUser?.full_name}</DialogTitle>
            <DialogDescription className="text-sm">
              Send a notification/warning to @{selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Message Type</Label>
              <Select 
                defaultValue="warning" 
                onValueChange={(value) => {
                  setMessageType(value);
                  setMessageTitle(value === 'warning' ? 'Warning' : value === 'message' ? 'Message from Admin' : 'System Notice');
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="message">Message</SelectItem>
                  <SelectItem value="system">System Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message Title</Label>
              <Input
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                placeholder="e.g., Warning, Notice, Information"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Message Content</Label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Enter your message..."
                className="mt-1 h-32"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                This message will be sent to {selectedUser?.full_name} immediately.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  if (!messageTitle.trim() || !messageContent.trim()) {
                    toast.error('Please fill in all fields');
                    return;
                  }
                  sendMessageMutation.mutate({
                    recipientUsername: selectedUser.username,
                    title: messageTitle,
                    message: messageContent,
                    messageType: messageType
                  });
                }}
                className="flex-1"
                disabled={sendMessageMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
              </Button>
              <Button onClick={() => {
                setShowMessageDialog(false);
                setMessageTitle('');
                setMessageContent('');
              }} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RoleDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        currentUser={user}
        isOwner={isOwner}
        isCurrentOwner={isCurrentOwner}
        isCoOwner={isCoOwner}
        getRank={getRank}
        isPending={updateRoleMutation.isPending}
        onAssign={async (role, isPranksterChecked, specialPermissions, verifiedChecked) => {
          if (isPranksterChecked !== selectedUser.is_prankster) {
            togglePranksterMutation.mutate({ userId: selectedUser.id, isPrankster: isPranksterChecked });
          }
          if (verifiedChecked !== !!selectedUser.verified) {
            try {
              await base44.entities.EAccount.update(selectedUser.id, { verified: verifiedChecked });
              try {
                const users = await base44.entities.User.filter({ email: selectedUser.owner_email });
                if (users[0]) await base44.entities.User.update(users[0].id, { verified: verifiedChecked });
              } catch (e) { /* non-fatal sync */ }
              queryClient.invalidateQueries({ queryKey: ['all-users'] });
              queryClient.invalidateQueries({ queryKey: ['verified-usernames'] });
              toast.success(verifiedChecked ? 'Verified checkmark granted' : 'Verified checkmark removed');
            } catch (e) {
              toast.error('Failed to update verified status');
            }
          }
          if (specialPermissions && (role === 'admin' || role === 'co-owner')) {
            const newPerms = { manager: !!specialPermissions.manager, music: !!specialPermissions.music };
            const had = selectedUser.special_permissions || {};
            if (newPerms.manager !== !!had.manager || newPerms.music !== !!had.music) {
              try {
                await base44.entities.EAccount.update(selectedUser.id, { special_permissions: newPerms });
                try {
                  const users = await base44.entities.User.filter({ email: selectedUser.owner_email });
                  if (users[0]) await base44.entities.User.update(users[0].id, { special_permissions: newPerms });
                } catch (e) { /* non-fatal sync */ }
                queryClient.invalidateQueries({ queryKey: ['all-users'] });
              } catch (e) {
                toast.error('Failed to update special permissions');
              }
            }
          }
          updateRoleMutation.mutate({ userId: selectedUser.id, role, ownerEmail: selectedUser.owner_email });
        }}
      />

      <div className={`h-full flex flex-col ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'} admin-scope`}>
        <div className={`p-3 md:p-6 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 mb-3 md:mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-lg md:text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Admin Panel</h2>
                <p className={`text-xs md:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {isOwner ? 'Owner' : isCoOwner ? 'Co-Owner' : isAdmin ? 'Administrator' : isVIP ? 'VIP (View Only)' : 'Viewer'} Access
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
               <Button onClick={() => setShowAddCollaboratorDialog(true)} variant="outline" size="sm" className={`text-xs ${isDarkMode ? 'border-white text-white hover:bg-gray-700' : ''}`}>
                  <Users className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  <span className="hidden md:inline">Invite User</span>
                  <span className="md:hidden">Invite</span>
                </Button>
               <Button
                onClick={async () => {
                  const currentUser = await base44.auth.me();
                  if (currentUser?.role === 'admin') {
                    toast.success(`✅ Authority Verified — Base44 role: admin (${currentUser.email})`);
                  } else {
                    toast.error(`❌ Not a Base44 admin — role: ${currentUser?.role || 'unknown'}`);
                  }
                }}
                variant="outline"
                size="sm"
                className={`text-xs ${isDarkMode ? 'border-white text-white hover:bg-gray-700' : ''}`}
              >
                <Shield className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                <span className="hidden md:inline">Verify Authority</span>
              </Button>
              <Button onClick={toggleDarkMode} variant="outline" size="sm" className={`text-xs ${isDarkMode ? 'border-white text-white hover:bg-gray-700' : ''}`}>
                 {isDarkMode ? <Sun className="w-3 h-3 md:w-4 md:h-4 mr-1" /> : <Moon className="w-3 h-3 md:w-4 md:h-4 mr-1" />}
                 <span className="hidden md:inline">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
               </Button>
              <Button
                onClick={async () => {
                  const newDemoMode = !isDemoMode;
                  setIsDemoMode(newDemoMode);
                  localStorage.setItem('eos_demo_mode', newDemoMode.toString());
                  toast.success(newDemoMode ? 'Demo Mode: Acting as regular user' : 'Demo Mode: Admin restored');
                  setTimeout(() => window.location.reload(), 500);
                }}
                variant={isDemoMode ? "destructive" : "outline"}
                size="sm"
                className={`text-xs ${isDarkMode && !isDemoMode ? 'border-white text-white hover:bg-gray-700' : ''}`}
              >
                <User className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">{isDemoMode ? 'Exit Demo Mode' : 'Act as User'}</span>
                <span className="md:hidden">Demo</span>
              </Button>
              <div className="text-right hidden md:block">
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Logged in as</p>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user?.email}</p>
                {isDemoMode && <p className="text-xs text-orange-400 font-semibold">Demo Mode</p>}
              </div>
            </div>
          </div>
        </div>

        <div className={`flex-1 overflow-auto p-3 md:p-6 ${isDarkMode ? 'bg-gray-900' : ''}`}>
           {activeTab !== 'dashboard' && (
             <button onClick={() => setActiveTab('dashboard')} className={`mb-2 flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
               <span>←</span> Dashboard
             </button>
           )}
           {activeTab !== 'dashboard' && (
             <AdminTabBar sections={adminSections} activeTab={activeTab} onSelect={setActiveTab} isDarkMode={isDarkMode} />
           )}
           {activeTab === 'pushnotifs' ? (
             <AdminPushNotifications readOnly={!isAdmin} />
           ) : activeTab === 'utilities' ? (
             <AdminUtilities isDarkMode={isDarkMode} />
           ) : activeTab === 'tvshows' ? (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800">EggetStream — Show Requests</h3>
                <p className="text-sm text-gray-500">Review and approve or decline user-submitted show requests</p>
              </div>
              {showRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <p className="text-gray-500">No show requests yet</p>
                </div>
              ) : showRequests.map((show) => (
                <div key={show.id} className="bg-white rounded-xl border p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center text-xl flex-shrink-0">🎬</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-800">{show.show_name}</h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{show.genre}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        show.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        show.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>{show.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{show.description}</p>
                    <p className="text-xs text-gray-400">Requested by {show.requester_name} · {show.created_date ? format(new Date(show.created_date), 'MMM d, yyyy') : ''}</p>
                  </div>
                  {show.status === 'pending' && isAdmin && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={async () => {
                        await base44.entities.ShowRequest.update(show.id, { status: 'approved' });
                        queryClient.invalidateQueries({ queryKey: ['show-requests'] });
                        queryClient.invalidateQueries({ queryKey: ['approved-shows'] });
                        toast.success('Show approved!');
                      }}>
                        <Check className="w-4 h-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={async () => {
                        await base44.entities.ShowRequest.update(show.id, { status: 'rejected' });
                        queryClient.invalidateQueries({ queryKey: ['show-requests'] });
                        toast.success('Show declined.');
                      }}>
                        <X className="w-4 h-4 mr-1" />Decline
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
           ) : activeTab === 'email' ? (
             <div className="space-y-6">
               <AdminEmailUser readOnly={!isAdmin} />
               <AdminEmailBlast readOnly={!isAdmin} />
             </div>
          ) : activeTab === 'profiles' ? (
            <AdminProfileLinks />
          ) : activeTab === 'dailytasks' ? (
            <DailyTasks user={user} readOnly={!isAdmin} />
          ) : activeTab === 'updates' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">OS Update Manager</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">Manage <EggSysWord /> version updates</p>
                </div>
                {isAdmin && (
                <Button onClick={() => {
                  setEditingUpdate(null);
                  setUpdateForm({ 
                    version: '', 
                    title: '', 
                    description: '', 
                    release_date: new Date().toISOString().split('T')[0],
                    size_mb: 50,
                    priority: 'recommended',
                    changes: [],
                    is_published: true
                  });
                  setShowUpdateDialog(true);
                }}>
                  <Package className="w-4 h-4 mr-2" />
                  Create Update
                </Button>
                )}
              </div>

              {showUpdateDialog && (
                <div className="bg-white rounded-xl border p-6 mb-4">
                  <h4 className="font-semibold mb-4">{editingUpdate ? 'Edit Update' : 'Create OS Update'}</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Version</Label>
                        <Input
                          value={updateForm.version}
                          onChange={(e) => setUpdateForm({...updateForm, version: e.target.value})}
                          placeholder="e.g., 1.2.0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Size (MB)</Label>
                        <Input
                          type="number"
                          value={updateForm.size_mb}
                          onChange={(e) => setUpdateForm({...updateForm, size_mb: parseFloat(e.target.value)})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={updateForm.title}
                        onChange={(e) => setUpdateForm({...updateForm, title: e.target.value})}
                        placeholder="Update title..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={updateForm.description}
                        onChange={(e) => setUpdateForm({...updateForm, description: e.target.value})}
                        placeholder="What's new in this update..."
                        className="mt-1 h-24"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Release Date</Label>
                        <Input
                          type="date"
                          value={updateForm.release_date}
                          onChange={(e) => setUpdateForm({...updateForm, release_date: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select value={updateForm.priority} onValueChange={(v) => setUpdateForm({...updateForm, priority: v})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="recommended">Recommended</SelectItem>
                            <SelectItem value="optional">Optional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={updateForm.is_published}
                        onChange={(e) => setUpdateForm({...updateForm, is_published: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <Label>Published (visible to users)</Label>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          if (!updateForm.version || !updateForm.title || !updateForm.description) {
                            toast.error('Please fill in all required fields');
                            return;
                          }
                          if (editingUpdate) {
                            updateUpdateMutation.mutate({ id: editingUpdate.id, data: updateForm });
                          } else {
                            createUpdateMutation.mutate(updateForm);
                          }
                        }}
                        className="flex-1"
                      >
                        {editingUpdate ? 'Update' : 'Create'} OS Update
                      </Button>
                      <Button onClick={() => {
                        setShowUpdateDialog(false);
                        setEditingUpdate(null);
                      }} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {osUpdates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No OS updates yet</p>
                </div>
              ) : (
                osUpdates.map((update) => (
                  <div key={update.id} className="bg-white rounded-xl border p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-800 text-lg">v{update.version}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            update.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            update.priority === 'recommended' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {update.priority}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            update.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {update.is_published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">{update.title}</h5>
                        <p className="text-sm text-gray-600 mb-2">{update.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Release: {format(new Date(update.release_date), 'MMM d, yyyy')}</span>
                          <span>Size: {update.size_mb} MB</span>
                          <span>Created: {format(new Date(update.created_date), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      {isAdmin && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUpdate(update);
                            setUpdateForm({
                              version: update.version,
                              title: update.title,
                              description: update.description,
                              release_date: update.release_date,
                              size_mb: update.size_mb,
                              priority: update.priority,
                              changes: update.changes || [],
                              is_published: update.is_published
                            });
                            setShowUpdateDialog(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={async () => {
                            if (await confirmAction('Delete this update?')) {
                              deleteUpdateMutation.mutate(update.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'notes' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Admin Notes</h3>
                  <p className="text-sm text-gray-500">Publish notes for users to see in help pages</p>
                </div>
                {isAdmin && (
                <Button onClick={() => {
                  setEditingNote(null);
                  setNoteForm({ title: '', content: '', category: 'general', priority: 'medium', is_published: true });
                  setShowNoteDialog(true);
                }}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Create Note
                </Button>
                )}
              </div>

              {showNoteDialog && (
                <div className="bg-white rounded-xl border p-6 mb-4">
                  <h4 className="font-semibold mb-4">{editingNote ? 'Edit Note' : 'Create Note'}</h4>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={noteForm.title}
                        onChange={(e) => setNoteForm({...noteForm, title: e.target.value})}
                        placeholder="Note title..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Content</Label>
                      <Textarea
                        value={noteForm.content}
                        onChange={(e) => setNoteForm({...noteForm, content: e.target.value})}
                        placeholder="Note content..."
                        className="mt-1 h-32"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Category</Label>
                        <Select value={noteForm.category} onValueChange={(v) => setNoteForm({...noteForm, category: v})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="browser">Browser</SelectItem>
                            <SelectItem value="app_store">App Store</SelectItem>
                            <SelectItem value="app_creator">App Creator</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select value={noteForm.priority} onValueChange={(v) => setNoteForm({...noteForm, priority: v})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={noteForm.is_published}
                        onChange={(e) => setNoteForm({...noteForm, is_published: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <Label>Published (visible to users)</Label>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          if (!noteForm.title || !noteForm.content) {
                            toast.error('Please fill in all fields');
                            return;
                          }
                          if (editingNote) {
                            updateNoteMutation.mutate({ id: editingNote.id, data: noteForm });
                          } else {
                            createNoteMutation.mutate(noteForm);
                          }
                        }}
                        className="flex-1"
                      >
                        {editingNote ? 'Update Note' : 'Create Note'}
                      </Button>
                      <Button onClick={() => {
                        setShowNoteDialog(false);
                        setEditingNote(null);
                        setNoteForm({ title: '', content: '', category: 'general', priority: 'medium', is_published: true });
                      }} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {adminNotes.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No admin notes yet</p>
                </div>
              ) : (
                adminNotes.map((note) => (
                  <div key={note.id} className="bg-white rounded-xl border p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-800">{note.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            note.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            note.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            note.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {note.priority}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            note.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {note.is_published ? 'Published' : 'Draft'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                            {note.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Created {note.created_date ? format(new Date(note.created_date), 'MMM d, yyyy h:mm a') : 'Unknown'}
                        </p>
                      </div>
                      {isAdmin && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingNote(note);
                            setNoteForm({
                              title: note.title,
                              content: note.content,
                              category: note.category,
                              priority: note.priority,
                              is_published: note.is_published
                            });
                            setShowNoteDialog(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={async () => {
                            if (await confirmAction('Delete this note?')) {
                              deleteNoteMutation.mutate(note.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'analytics' ? (
            <AdminAnalytics allUsers={allUsers} allApps={allApps} pendingApps={pendingApps} feedbacks={feedbacks} />
          ) : activeTab === 'dashboard' ? (
            <div className="max-w-4xl mx-auto">
              <div className="mb-5 md:mb-6">
                <h2 className={`text-xl md:text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Admin Dashboard</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Select a section to manage</p>
              </div>
              {adminSections.map((section) => {
                const visible = section.cards.filter(s => s.show);
                if (visible.length === 0) return null;
                return (
                  <div key={section.category} className="mb-6 md:mb-8 last:mb-0">
                    <h3 className={`text-sm md:text-base font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{section.category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                      {visible.map(s => {
                        const Icon = s.icon;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setActiveTab(s.id)}
                            className={`relative p-4 md:p-5 rounded-2xl text-left transition-all active:scale-95 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' : 'bg-white hover:shadow-md border'}`}
                          >
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                              <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                            </div>
                            <p className={`font-semibold text-sm md:text-base ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{s.label}</p>
                            {!!s.badge && s.badge > 0 && (
                              <span className="absolute top-3 right-3 min-w-5 h-5 px-1.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{s.badge}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'messaging' ? (
              <div className="h-full flex flex-col bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Broadcast Announcements
                  </h3>
                  <p className="text-xs text-white/80 mt-1">Send a message to all users via @all</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {adminChats.filter(m => m.recipient_username === 'all').length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No broadcasts sent yet</p>
                    </div>
                  ) : (
                    adminChats.filter(m => m.recipient_username === 'all').map((msg) => (
                      <div key={msg.id} className="flex group justify-end">
                        <div className="max-w-md px-4 py-2 rounded-2xl relative bg-blue-600 text-white">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-blue-100">You → @all</span>
                            <span className="text-xs text-blue-200">
                              {msg.created_date ? format(new Date(msg.created_date), 'h:mm a') : ''}
                            </span>
                          </div>
                          <p className="text-sm text-white">{msg.content}</p>
                          {(isOwner || isAdmin) && (
                            <button
                              onClick={async () => { if (await confirmAction('Delete this broadcast?')) deleteMessageMutation.mutate(msg.id); }}
                              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Broadcast to all users (@all)..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newMessage.trim()) {
                          sendAdminMessageMutation.mutate({ recipientUsername: 'all', content: newMessage });
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        if (newMessage.trim()) {
                          sendAdminMessageMutation.mutate({ recipientUsername: 'all', content: newMessage });
                        }
                      }}
                      disabled={!newMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
          ) : activeTab === 'activity' ? (
            <AdminActivityLog
              activityLogs={activityLogs}
              onClear={async () => {
                if (await confirmAction('Clear all activity logs? This cannot be undone.')) {
                  clearActivityLogsMutation.mutate();
                }
              }}
            />
          ) : activeTab === 'users' ? (
          <>
            {selectedBase44User ? (
            <Base44UserDetail
              user={selectedBase44User}
              onBack={() => setSelectedBase44User(null)}
              linkedEAccount={findLinkedEAccount(selectedBase44User.email)}
              isCurrentOwner={isCurrentOwner}
              onOpenLinkedEAccount={() => {
                const linked = findLinkedEAccount(selectedBase44User.email);
                if (linked) { setSelectedUser(linked); setActiveTab('eaccounts'); setSelectedBase44User(null); }
              }}
            />
          ) : (
            <div className="space-y-2 md:space-y-3">
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Base44 Users</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Platform login accounts. Click a user to manage their Base44 account.</p>
              </div>
              {isLoadingBase44Users ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : base44Users.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700"><Users className="w-12 h-12 text-gray-300 mx-auto mb-2" /><p className="text-gray-500">No Base44 users found</p></div>
              ) : base44Users.map((u) => {
                const linked = findLinkedEAccount(u.email);
                return (
                <div key={u.id} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 hover:shadow-sm flex items-center gap-4">
                <div onClick={() => setSelectedBase44User(u)} className="flex-1 flex items-center gap-4 cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-white" /></div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 dark:text-white">{u.full_name || u.email}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-300">{u.email}</p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded mt-1 ${u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>{u.role || 'user'}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${linked ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{linked ? 'E-Account linked' : 'No E-Account'}</span>
                </div>
                </div>
                );
              })}
            </div>
          )}
          </>
        ) : activeTab === 'eaccounts' ? (
          <>
            {selectedUser ? (
            <AdminUserDetail
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              onBack={() => setSelectedUser(null)}
              isAdmin={isAdmin}
              canModerate={canModerate}
              currentUsername={user?.username}
              currentUserEmail={user?.email}
              isCurrentOwner={isCurrentOwner}
              canEditPermissions={isCurrentOwner}
              getUserRole={getUserRole}
              adminWhitelist={adminWhitelist}
              banReason={banReason}
              setBanReason={setBanReason}
              onSendMessage={() => setShowMessageDialog(true)}
              onManageRole={() => {
                setSelectedRole(selectedUser.admin_role || 'none');
                setSelectedUser({...selectedUser, isPranksterChecked: selectedUser.is_prankster || false});
                setShowRoleDialog(true);
              }}
              onChangeUsername={() => {
                const newUsername = prompt('Enter new username:', selectedUser.username);
                if (newUsername && newUsername.trim() && newUsername !== selectedUser.username) {
                  changeUsernameMutation.mutate({ userId: selectedUser.id, newUsername: newUsername.trim() });
                }
              }}
              onToggleBase44Admin={async () => {
                const isCurrentlyAdmin = selectedUser.role === 'admin';
                if (await confirmAction(`${isCurrentlyAdmin ? 'Remove' : 'Invite'} as collaborator for ${selectedUser.full_name}?`)) {
                  toggleBase44AdminMutation.mutate({ userId: selectedUser.id, isAdmin: !isCurrentlyAdmin, userEmail: selectedUser.email });
                }
              }}
              onRemoveUser={async () => {
                if (!await confirmAction('⚠️ WARNING: Remove this user permanently?')) return;
                if (!await confirmAction('Are you absolutely sure? This is your FINAL warning.')) return;
                try {
                  await base44.entities.EAccount.delete(selectedUser.id);
                  await logActivity('delete_user', 'user', selectedUser.id, { username: selectedUser.username });
                  queryClient.invalidateQueries({ queryKey: ['all-users'] });
                  queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
                  toast.success('User removed');
                  setSelectedUser(null);
                } catch (error) {
                  toast.error('Failed to remove user');
                }
              }}
              onDeleteBase44Account={async () => {
                if (!await confirmAction(`⚠️ Delete the Base44 account for ${selectedUser.full_name || selectedUser.email}? This permanently removes their login access. Their E-Account will also be auto-deleted.`)) return;
                if (!await confirmAction('Are you absolutely sure? This is your FINAL warning.')) return;
                try {
                  const base44Users = await base44.entities.User.list('-created_date', 500);
                  const targetUser = base44Users.find(u => u.email === selectedUser.owner_email);
                  if (!targetUser) { toast.error('No linked Base44 account found'); return; }
                  await base44.entities.User.delete(targetUser.id);
                  await base44.entities.EAccount.delete(selectedUser.id);
                  await logActivity('delete_user', 'user', selectedUser.id, { username: selectedUser.username, deleted_base44: true });
                  queryClient.invalidateQueries({ queryKey: ['all-users'] });
                  queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
                  toast.success('Base44 account deleted');
                  setSelectedUser(null);
                } catch (error) {
                  toast.error('Failed to delete Base44 account: ' + error.message);
                }
              }}
              onUnban={() => unbanUserMutation.mutate(selectedUser.id)}
              onRemoveSuspension={() => removeSuspensionMutation.mutate(selectedUser.id)}
              onBan={async () => {
                if (!banReason.trim()) { toast.error('Please enter a reason'); return; }
                const type = selectedUser.suspensionType || 'full';
                if (await confirmAction(`Apply ${type} to ${selectedUser.full_name}?`)) {
                  banUserMutation.mutate({
                    userId: selectedUser.id,
                    reason: banReason,
                    userEmail: selectedUser.email,
                    suspensionType: type,
                    suspensionDuration: selectedUser.suspensionDuration || 24,
                    targetUser: selectedUser,
                    banType: selectedUser.banType || 'permanent'
                  });
                }
              }}
            />
          ) : (
            <div className="space-y-2 md:space-y-3">
              {isAdmin && allUsers.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3 md:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedItems.length === allUsers.filter(u => !u.is_banned).length} onChange={(e) => { if (e.target.checked) { setSelectedItems(allUsers.filter(u => !u.is_banned).map(u => u.id)); } else { setSelectedItems([]); } }} className="w-4 h-4" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{selectedItems.length > 0 ? `${selectedItems.length} selected` : 'Select all'}</span>
                  </div>
                  {selectedItems.length > 0 && (
                    <Button size="sm" variant="destructive" onClick={() => { const reason = prompt('Enter ban reason:'); if (reason) bulkBanUsersMutation.mutate({ userIds: selectedItems, reason }); }}>
                      <Ban className="w-4 h-4 mr-2" />Ban Selected ({selectedItems.length})
                    </Button>
                  )}
                </div>
              )}
              {allUsers.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700"><Users className="w-12 h-12 text-gray-300 mx-auto mb-2" /><p className="text-gray-500">No users found</p></div>
              ) : allUsers.map((u) => {
                const isOnline = u.last_seen && (Date.now() - new Date(u.last_seen).getTime()) < 60000;
                return (
                <div key={u.id} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 hover:shadow-sm flex items-center gap-4">
                {isAdmin && u.status !== 'banned' && canModerate(u) && (<input type="checkbox" checked={selectedItems.includes(u.id)} onChange={(e) => { if (e.target.checked) setSelectedItems([...selectedItems, u.id]); else setSelectedItems(selectedItems.filter(id => id !== u.id)); }} className="w-4 h-4" onClick={(e) => e.stopPropagation()} />)}
                <div onClick={() => setSelectedUser(u)} className="flex-1 flex items-center gap-4 cursor-pointer">
                  <div className="relative flex-shrink-0">
                    {u.avatar_url ? <img src={u.avatar_url} alt={u.username} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 dark:text-white">@{u.username || u.email}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-300">{u.email} • {u.subscription_tier || 'free'}</p>
                    {getUserRole(u).type !== 'none' && <span className={`inline-block text-xs px-2 py-0.5 rounded mt-1 ${getUserRole(u).type === 'owner' ? 'bg-red-100 text-red-800' : getUserRole(u).type === 'co_owner' ? 'bg-orange-100 text-orange-800' : getUserRole(u).type === 'admin' ? 'bg-blue-100 text-blue-800' : getUserRole(u).type === 'vip' ? 'bg-pink-100 text-pink-800' : getUserRole(u).type === 'system' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'}`}>{getUserRole(u).name}</span>}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${u.status === 'banned' ? 'bg-red-100 text-red-800' : u.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{u.status || 'active'}</span>
                </div>
                </div>
                );
              })}
            </div>
          )}
          </>
        ) : activeTab === 'feedback' ? (
          <div className="space-y-2 md:space-y-3">
            {feedbacks.length === 0 ? (
              <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700"><MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" /><p className="text-gray-500">No feedback yet</p></div>
            ) : feedbacks.map((fb) => (
              <div key={fb.id} onClick={() => setSelectedFeedback(fb)} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-3 md:p-4 hover:shadow-sm cursor-pointer flex items-center gap-3 md:gap-4 active:scale-[0.98] transition-all">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${fb.status === 'new' ? 'bg-blue-100' : fb.status === 'read' ? 'bg-yellow-100' : 'bg-green-100'}`}><MessageSquare className={`w-4 h-4 md:w-5 md:h-5 ${fb.status === 'new' ? 'text-blue-600' : fb.status === 'read' ? 'text-yellow-600' : 'text-green-600'}`} /></div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{fb.subject}</h4>
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate">{fb.category} • {fb.user_name} • {fb.created_date ? format(new Date(fb.created_date), 'MMM d') : 'Unknown'}</p>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] md:text-xs font-medium flex-shrink-0 ${fb.status === 'new' ? 'bg-blue-100 text-blue-800' : fb.status === 'read' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{fb.status}</span>
              </div>
            ))}
          </div>
        ) : (
        <>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Pending Review ({pendingApps.length})</h3>
              <div className="flex items-center gap-2">
                {selectedItems.length > 0 && isAdmin && (<Button size="sm" onClick={async () => { if (await confirmAction(`Approve ${selectedItems.length} apps?`)) bulkApproveAppsMutation.mutate(selectedItems); }} className="bg-green-600 hover:bg-green-700"><CheckSquare className="w-4 h-4 mr-2" />Approve ({selectedItems.length})</Button>)}
                <Button variant="outline" size="sm" className={isDarkMode ? 'border-white text-white hover:bg-gray-700' : ''} onClick={() => queryClient.invalidateQueries({ queryKey: ['pending-apps'] })}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
              </div>
            </div>
            {isLoading ? <div className="text-center py-8 text-gray-500">Loading...</div> : pendingApps.length === 0 ? (
              <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700"><Check className="w-12 h-12 text-green-500 mx-auto mb-2" /><p className="text-gray-500">No pending apps to review</p></div>
            ) : (
              <div className="space-y-4">
                {isAdmin && <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 flex items-center gap-3"><input type="checkbox" checked={selectedItems.length === pendingApps.length} onChange={(e) => { if (e.target.checked) setSelectedItems(pendingApps.map(a => a.id)); else setSelectedItems([]); }} className="w-4 h-4" /><span className="text-sm text-gray-600 dark:text-gray-300">{selectedItems.length > 0 ? `${selectedItems.length} selected` : 'Select all'}</span></div>}
                <div className="grid gap-3 md:gap-4">
                  {pendingApps.map((app) => (
                    <div key={app.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3 md:p-5 hover:shadow-md transition-shadow flex items-center gap-3 md:gap-4">
                      {isAdmin && <input type="checkbox" checked={selectedItems.includes(app.id)} onChange={(e) => { if (e.target.checked) setSelectedItems([...selectedItems, app.id]); else setSelectedItems(selectedItems.filter(id => id !== app.id)); }} className="w-4 h-4" onClick={(e) => e.stopPropagation()} />}
                      <div onClick={() => setSelectedApp(app)} className="flex-1 flex items-center gap-3 md:gap-4 cursor-pointer active:scale-[0.98] transition-transform">
                        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${app.color || 'from-gray-500 to-slate-500'} flex items-center justify-center flex-shrink-0`}><Package className="w-5 h-5 md:w-7 md:h-7 text-white" /></div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm md:text-base truncate">{app.name}</h4>
                          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">{app.app_id} • v{app.version}</p>
                          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 truncate">by {app.created_by}</p>
                        </div>
                        <Button size="sm" className="flex-shrink-0 text-xs"><Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" /><span className="hidden md:inline">Review</span></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">All Submissions ({allApps.length})</h3>
            <div className="grid gap-2 md:gap-3">
              {allApps.map((app) => (
                <div key={app.id} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-3 md:p-4 hover:shadow-sm cursor-pointer flex items-center gap-3 md:gap-4 active:scale-[0.98]" onClick={() => setSelectedApp(app)}>
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${app.color || 'from-gray-500 to-slate-500'} flex items-center justify-center flex-shrink-0`}><Package className="w-4 h-4 md:w-5 md:h-5 text-white" /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 dark:text-gray-100 text-sm md:text-base truncate">{app.name}</h4>
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate">{app.category} • {app.created_by}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] md:text-xs font-medium flex-shrink-0 ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : app.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{app.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
        )}
        </div>
      </div>
    </>
  );
}