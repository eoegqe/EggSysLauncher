import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { User, Lock, Palette, Info, Save, Power, Mail, Link2, Unlink, MessageSquare, Loader2, Users, Terminal, RefreshCw, AlertCircle, Upload, Monitor, Bell, Shield, Download, CheckCircle, Copy, ExternalLink, Crown, Zap, Grid, Server, Trash2, Camera, Maximize, Globe, Bug, FileCode, Code, FlaskConical } from 'lucide-react';
import { buildEafBlob, buildEaflText } from '@/lib/eafFormat';
import { toast } from '@/lib/devToast';
import EggetSystemPlusCheckout from '../EggetSystemPlusCheckout';
import EAccountSection from '../EAccountSection';
import ManageSubscriptionModal from './ManageSubscriptionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AdminPanel from '../../AdminPanel';
import { getUserThemeGradient } from '@/lib/themeUtils';
import ReferralWidget from '@/components/os/ReferralWidget';
import ReferralTabView from '@/components/os/mobile/ReferralTabView';
import { getEggSysIcon } from '@/lib/eggSysIcon';
import { mergeLocalBuiltins } from '@/lib/builtinAppMeta';
import ServicesTab from './ServicesTab';
import AddWebsiteApp from './AddWebsiteApp';
import AppInfoPage from './AppInfoPage';
import BackupRestore from './BackupRestore';
import EsabfBackup from './EsabfBackup';
import FingerprintSetup from '@/components/os/mobile/FingerprintSetup';
import ESimSetup from '@/components/os/mobile/ESimSetup';
import { Fingerprint, Signal } from 'lucide-react';
import { getManualConsent, setManualConsent } from '@/lib/spotifyAuth';
import { confirmAction } from '@/components/os/ConfirmDialog';
import { fetchEAccount } from '@/lib/eaccountSync';
import { isNotificationSoundEnabled, setNotificationSoundEnabled, playNotificationSound, getNotificationSound, setNotificationSound, previewNotificationSound, NOTIFICATION_SOUNDS } from '@/lib/notificationSound';
import { useEggSysOSDisabled } from '@/hooks/useEggSysOSDisabled';
import { isOwnerRole } from '@/lib/adminPermissions';
import EggSysOSFailure from '@/components/os/EggSysOSFailure';
import { useIsTablet } from '@/hooks/useIsTablet';
import SettingsTabletSidebar from './SettingsTabletSidebar';
export default function MobileSettings() {
  const eggSysOSDisabled = useEggSysOSDisabled();
  const isTablet = useIsTablet();
  const [activeTab, setActiveTab] = useState(isTablet ? 'eaccount' : null);
  const [soundEnabled, setSoundEnabled] = useState(() => isNotificationSoundEnabled());
  const [notifSound, setNotifSound] = useState(() => getNotificationSound());
  const [buildClickCount, setBuildClickCount] = useState(0);
  const [devAuthenticated, setDevAuthenticated] = useState(
    () => localStorage.getItem('eos_dev_options_enabled') === 'true'
  );
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['current-user-mobile-settings'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: 5000,
    refetchInterval: (query) => (query.state.error ? false : 10000)
  });

  const { data: eAccounts = [] } = useQuery({
    queryKey: ['eaccount', user?.email || 'guest'],
    queryFn: async () => {
      const ea = await fetchEAccount(user, base44);
      return ea ? [ea] : [];
    },
  });
  const eAccount = eAccounts[0] || null;
  const subTier = eAccount?.subscription_tier || 'free';
  const hasPlus = ['plus','pro','elite','max'].includes(subTier);
  const hasPro = ['pro','elite','max'].includes(subTier);
  const hasElite = ['elite','max'].includes(subTier);
  const hasMax = subTier === 'max';

  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed-apps-mobile'],
    queryFn: () => base44.entities.InstalledApp.list('-created_date')
  });

  const { data: systemMaintenance } = useQuery({
    queryKey: ['system-maintenance'],
    queryFn: async () => {
      const records = await base44.entities.SystemMaintenance.list();
      return records[0] || null;
    },
    staleTime: 30000
  });
  const subscriptionsHidden = !!systemMaintenance?.subscriptions_hidden;

  const { data: eggSysApps = [] } = useQuery({
    queryKey: ['eggsys-apps-settings'],
    queryFn: () => base44.entities.EggSysApps.list('-created_date')
  });

  const isOwner = user?.admin_role?.toLowerCase() === 'owner' || user?.role === 'owner' || eAccount?.admin_role?.toLowerCase() === 'owner' || user?.email === 'eggtheegget@gmail.com' || user?.email === 'eggtheegget@outlook.com';
  const hasMusicPermission = isOwner || eAccount?.special_permissions?.music === true;

  const builtinApps = mergeLocalBuiltins(eggSysApps.filter(a => a.is_builtin && a.app_type !== 'service')).filter(app => {
    // Admin app never appears in settings
    if (app.app_id === 'admin' || app.name === 'Admin') return false;
    // Base44 Editor only visible to owner
    if (app.app_id === 'base44editor' || app.name === 'Base44 Editor' || app.name === 'Base44') return isOwner;
    // Spotify only visible to owner or users with music special permission
    if (app.app_id === 'music' || app.name === 'Spotify') return hasMusicPermission;
    return true;
  });

  const { data: availableUpdates = [] } = useQuery({
    queryKey: ['os-updates-mobile'],
    queryFn: async () => {
      const updates = await base44.entities.OSUpdate.list('-created_date');
      const currentVersion = user?.os_version || '1.0.0';
      return updates.filter(u => 
        u.is_published && 
        compareVersions(u.version, currentVersion) > 0 &&
        !(user?.dismissed_updates || []).includes(u.version)
      );
    },
    enabled: !!user
  });

  // Previously installed updates (version <= current) — shown as update history.
  const { data: previousUpdates = [] } = useQuery({
    queryKey: ['os-updates-previous-mobile'],
    queryFn: async () => {
      const updates = await base44.entities.OSUpdate.list('-release_date');
      const currentVersion = user?.os_version || '1.0.0';
      return updates.filter(u => u.is_published && compareVersions(u.version, currentVersion) <= 0);
    },
    enabled: !!user
  });

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

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    current_pin: '',
    new_pin: '',
    confirm_pin: ''
  });

  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const profilePicInputRef = React.useRef(null);
  const [uploadingRingtone, setUploadingRingtone] = useState(false);

  const [eAccountForm, setEAccountForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    mode: 'login'
  });
  const [eAccountLoading, setEAccountLoading] = useState(false);
  const [showPlusCheckout, setShowPlusCheckout] = useState(false);
  const [showManageSubscription, setShowManageSubscription] = useState(false);
  const [showManageSub, setShowManageSub] = useState(false);
  const [showFingerprintSetup, setShowFingerprintSetup] = useState(false);
  const [showAddWebsite, setShowAddWebsite] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  React.useEffect(() => {
    const pendingTab = sessionStorage.getItem('eos_settings_tab');
    if (pendingTab) {
      sessionStorage.removeItem('eos_settings_tab');
      setActiveTab(pendingTab);
    }
  }, []);

  const handleDisableFingerprint = async () => {
    if (!await confirmAction('Turn off fingerprint unlock?')) return;
    await base44.auth.updateMe({ fingerprint_enabled: false });
    queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
    queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
    toast.success('Fingerprint unlock turned off');
  };

  React.useEffect(() => {
    if (user) {
      setProfileForm(prev => ({ ...prev, full_name: user.full_name || '' }));
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('Profile updated');
    }
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({ full_name: profileForm.full_name });
  };

  const uninstallAppMutation = useMutation({
    mutationFn: (appId) => base44.entities.InstalledApp.delete(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-apps-mobile'] });
      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      toast.success('App uninstalled');
    }
  });

  const handleUninstallApp = async (app) => {
    if (!await confirmAction(`Uninstall ${app.name}?`)) return;
    uninstallAppMutation.mutate(app.id);
  };

  const handleTogglePermission = async (app, perm) => {
    const currentPerms = app.permissions || {};
    const newValue = !currentPerms[perm];
    try {
      await base44.entities.InstalledApp.update(app.id, {
        permissions: { ...currentPerms, [perm]: newValue }
      });
      queryClient.invalidateQueries({ queryKey: ['installed-apps-mobile'] });
      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      toast.success(`${perm} ${newValue ? 'enabled' : 'disabled'} for ${app.name}`);
    } catch (e) {
      toast.error('Failed to update permission');
    }
  };

  const installedServices = (() => {
    const serviceRecords = installedApps.filter(a => a.app_data?.app_type === 'service');
    const tombstoneKeys = new Set(
      serviceRecords.filter(a => a.app_data?.is_uninstalled === true).map(a => a.app_data?.linked_service_id || a.app_id)
    );
    const builtinSvc = eggSysApps.filter(a => a.app_type === 'service' && a.is_builtin);
    const installedBuiltin = builtinSvc.filter(s => !tombstoneKeys.has(s.linked_service_id || s.app_id));
    const customInstalled = serviceRecords.filter(a => !a.app_data?.is_uninstalled && !a.app_data?.is_builtin);
    return [...installedBuiltin, ...customInstalled];
  })();

  // Tombstones are uninstall markers, not real installed apps — hide them from app lists
  const visibleInstalledApps = installedApps.filter(a => !(a.app_data?.is_uninstalled === true));

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingProfilePic(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // Sync to Base44 user account
      await base44.auth.updateMe({ profile_picture: file_url });
      // Sync to E-Account avatar_url
      if (eAccount) {
        try {
          await base44.entities.EAccount.update(eAccount.id, { avatar_url: file_url });
        } catch (e) {
          console.warn('Failed to sync avatar to E-Account', e);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['eaccount'] });
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const handleRingtoneUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }
    setUploadingRingtone(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ ringtone_url: file_url });
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-phone'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('Ringtone updated!');
    } catch (error) {
      toast.error('Failed to upload ringtone');
    } finally {
      setUploadingRingtone(false);
    }
  };

  const handleRingtoneRemove = async () => {
    await base44.auth.updateMe({ ringtone_url: null });
    queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
    queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
    queryClient.invalidateQueries({ queryKey: ['current-user-phone'] });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
    toast.success('Ringtone removed');
  };

  const handleUpdatePin = () => {
    if (user?.pin && profileForm.current_pin !== user.pin) {
      toast.error('Current PIN is incorrect');
      return;
    }
    if (profileForm.new_pin.length !== 4 || !/^\d+$/.test(profileForm.new_pin)) {
      toast.error('PIN must be 4 digits');
      return;
    }
    if (profileForm.new_pin !== profileForm.confirm_pin) {
      toast.error('PINs do not match');
      return;
    }
    updateProfileMutation.mutate({ pin: profileForm.new_pin });
    setProfileForm(prev => ({ ...prev, current_pin: '', new_pin: '', confirm_pin: '' }));
    toast.success('PIN updated');
  };

  const wallpapers = [
    { id: 'gradient', name: 'Purple', color: 'from-indigo-600 via-purple-600 to-pink-600' },
    { id: 'blue', name: 'Blue', color: 'from-blue-600 via-cyan-600 to-teal-600' },
    { id: 'sunset', name: 'Sunset', color: 'from-orange-500 via-red-500 to-pink-600' },
    { id: 'forest', name: 'Forest', color: 'from-green-600 via-emerald-600 to-teal-700' }
  ];

  const handleWallpaperChange = (wallpaperId) => {
    updateProfileMutation.mutate({ 
      preferences: { ...user?.preferences, wallpaper: wallpaperId } 
    });
    toast.success('Wallpaper updated');
  };

  const handleThemeChange = (themeId) => {
    updateProfileMutation.mutate({
      preferences: { ...user?.preferences, theme: themeId === 'default' ? null : themeId }
    });
    toast.success('Theme updated');
  };

  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);

  const handleCustomWallpaperUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWallpaper(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateProfileMutation.mutate({
        preferences: { ...user?.preferences, wallpaper: 'custom', wallpaper_custom_url: file_url }
      });
      toast.success('Custom wallpaper set');
    } catch (err) {
      toast.error('Failed to upload wallpaper');
    } finally {
      setUploadingWallpaper(false);
      e.target.value = '';
    }
  };

  const handleEAccountSubmit = async () => {
    if (!eAccountForm.email || !eAccountForm.password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (eAccountForm.mode === 'create' && eAccountForm.password !== eAccountForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setEAccountLoading(true);
    
    try {
      await new Promise(r => setTimeout(r, 1500));
      
      if (eAccountForm.mode === 'login') {
        const accountExists = Math.random() > 0.3;
        if (!accountExists) {
          toast.error('E Account not found. Please check your email or create a new account.');
          setEAccountLoading(false);
          return;
        }
      }
      
      await base44.auth.updateMe({ 
        e_account: { 
          email: eAccountForm.email, 
          synced_at: new Date().toISOString() 
        } 
      });
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
      toast.success(eAccountForm.mode === 'create' ? 'E Account created and synced!' : 'E Account synced!');
      setEAccountForm({ email: '', password: '', confirmPassword: '', mode: 'login' });
    } catch (error) {
      toast.error('Failed to sync E Account');
    } finally {
      setEAccountLoading(false);
    }
  };

  const handleEAccountUnlink = async () => {
    if (!await confirmAction('Unlink your E Account?')) return;
    await base44.auth.updateMe({ e_account: null });
    queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
    toast.success('E Account unlinked');
  };

  const handleBuildClick = () => {
    const newCount = buildClickCount + 1;
    setBuildClickCount(newCount);

    if (newCount === 7) {
      setDevAuthenticated(true);
      localStorage.setItem('eos_dev_options_enabled', 'true');
      setBuildClickCount(0);
      base44.entities.Notification.create({
        title: 'Developer Options',
        message: 'Developer Options enabled',
        type: 'system',
        recipient_username: user?.username
      }).catch(() => {});
    } else if (newCount < 7) {
      toast.success(`${7 - newCount} more taps to developer options`);
    }
  };

  const TEMPLATE_APP = {
    app_id: 'com.example.myapp',
    name: 'My App',
    version: '1.0.0',
    description: 'A sample EggetSystem app template — modify and make it your own.',
    icon: 'Code',
    color: 'from-blue-500 to-purple-600',
    category: 'Productivity',
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; padding: 20px; background: #f9fafb; color: #1f2937; }
    h1 { margin-bottom: 12px; }
    p { color: #6b7280; margin-bottom: 16px; }
    button { padding: 10px 20px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Hello, EggetSystem!</h1>
  <p>Start building your app here.</p>
  <button onclick="EggSys.notify('Hello from my app!')">Send Notification</button>
</body>
</html>`
  };

  const downloadEafTemplate = async () => {
    try {
      const blob = await buildEafBlob(TEMPLATE_APP);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-app-template.eaf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('EAF template downloaded');
    } catch (e) {
      toast.error('Failed to export EAF template');
    }
  };

  const downloadEaflTemplate = () => {
    const text = buildEaflText(TEMPLATE_APP);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-app-template.eafl';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('EAFL template downloaded');
  };

  const settingsTabs = [
    { id: 'eaccount', label: 'Account', icon: Mail, color: 'from-emerald-500 to-teal-600' },
    { id: 'security', label: 'Security', icon: Lock, color: 'from-red-500 to-red-600' },
    { id: 'display', label: 'Display', icon: Monitor, color: 'from-blue-500 to-blue-600' },
    { id: 'homescreen', label: 'Home Screen', icon: Monitor, color: 'from-indigo-500 to-indigo-600' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'from-purple-500 to-purple-600' },
    { id: 'uiux', label: 'UI/UX', icon: Palette, color: 'from-pink-500 to-rose-600' },
    { id: 'network', label: 'Mobile Network', icon: Signal, color: 'from-emerald-500 to-green-600' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'from-yellow-500 to-yellow-600' },
    { id: 'permissions', label: 'Permissions', icon: Shield, color: 'from-green-500 to-green-600' },
    { id: 'apps', label: 'Apps', icon: Grid, color: 'from-sky-500 to-cyan-600', badge: visibleInstalledApps.length > 0 ? visibleInstalledApps.length : null },
    { id: 'services', label: 'Services', icon: Server, color: 'from-emerald-500 to-teal-600', badge: installedServices.length > 0 ? installedServices.length : null },
    { id: 'privacy', label: 'Privacy', icon: Lock, color: 'from-red-500 to-red-600' },
    { id: 'referral', label: 'Refer & Earn', icon: Users, color: 'from-violet-500 to-purple-600' },
    { id: 'backup', label: 'Backup & Restore', icon: Download, color: 'from-cyan-500 to-blue-600' },
    { id: 'recovery', label: 'Recovery', icon: AlertCircle, color: 'from-orange-500 to-red-600' },
    { id: 'about', label: 'About', icon: Info, color: 'from-gray-500 to-gray-600' }
  ];

  return (
    <>
      <div className={`absolute inset-0 bg-gray-50 flex ${isTablet ? 'flex-row' : 'flex-col'}`}>
      {/* Start Screen / Grid — phone only (tablet uses the sidebar) */}
      {!activeTab && !isTablet && (
        <div className="absolute inset-0 flex flex-col">
          <div className={`px-4 py-5 bg-gradient-to-r ${getUserThemeGradient(user, 'from-slate-700 to-slate-900')}`}>
            <h2 className="text-2xl font-bold text-white mb-1">Settings</h2>
            <p className="text-sm text-white/70">Manage your EggetSystem preferences</p>
          </div>
          
          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-3">
            {settingsTabs.map(item => {
              const ItemIcon = item.icon;
              return (
                <button
                   key={item.id}
                   onClick={() => setActiveTab(item.id)}
                   className="relative bg-white rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:shadow-md transition-all border"
                 >
                   <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                     <ItemIcon className="w-5 h-5 text-white" />
                   </div>
                   <p className="text-xs font-semibold text-gray-800 text-center">{item.label}</p>
                  {item.badge && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      )}

      {/* Back Button & Content — phone only */}
      {activeTab && !isTablet && (
        <div className={`p-4 border-b bg-gradient-to-r ${getUserThemeGradient(user, 'from-slate-700 to-slate-900')}`}>
          <Button variant="ghost" onClick={() => setActiveTab(null)} className="gap-2 text-white hover:bg-white/20 hover:text-white">
            ← Back
          </Button>
          <p className="text-white font-semibold text-sm ml-1 inline-block">{settingsTabs.find(t => t.id === activeTab)?.label || activeTab}</p>
        </div>
      )}

      {/* Content */}
      {isTablet && (
        <SettingsTabletSidebar
          tabs={settingsTabs}
          activeTab={activeTab}
          onSelect={setActiveTab}
          gradient={getUserThemeGradient(user, 'from-slate-700 to-slate-900')}
        />
      )}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {activeTab === 'eaccount' && (
          eggSysOSDisabled ? <EggSysOSFailure title="E Account" /> : (
          <div className="space-y-4">
            <>
            {/* EggetSystem+ Card */}
            {userLoading ? (
              <div className="bg-white rounded-xl p-4 text-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-gray-500">Loading subscription...</p>
              </div>
            ) : (eAccount && hasPlus) ? (
              (() => {
                const subType = hasMax ? 'EggetSystem Max' : hasElite ? 'EggetSystem Elite' : hasPro ? 'EggetSystem Pro' : 'EggetSystem+';
                const activatedAt = eAccount?.subscription_granted_at;
                const gradientColor = hasMax ? 'from-yellow-400 via-red-500 to-purple-600' :
                                      hasElite ? 'from-purple-600 via-pink-500 to-red-500' :
                                      hasPro ? 'from-green-500 to-blue-600' :
                                      'from-yellow-400 to-orange-500';

                return (
                  <div className={`bg-gradient-to-r ${gradientColor} rounded-xl p-4 text-white`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Crown className="w-7 h-7" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="text-xs opacity-90 font-medium">Active · Permanent</span>
                        </div>
                        <h3 className="text-base font-bold">{subType}</h3>
                        {activatedAt && (
                          <p className="text-xs opacity-70">Since {new Date(activatedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <button
                       onClick={() => setShowManageSub(true)}
                       className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-2 rounded-xl text-sm transition-all"
                     >
                       Manage Subscription
                     </button>
                  </div>
                );
              })()
            ) : (!userLoading && eAccount && !subscriptionsHidden) ? (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">EggetSystem+</h4>
                    <p className="text-xs text-gray-500">$25 one-time · Permanent access</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlusCheckout(true)}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
                >
                  Upgrade Now
                </button>
              </div>
            ) : null}

              {eAccount && subTier !== 'free' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-800 capitalize">✓ {subTier} Subscription Active</p>
                <p className="text-xs text-blue-600 mt-0.5">Via your E Account</p>
              </div>
            )}

            {/* Profile Picture Editor */}
            <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
              <div className="relative">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : eAccount?.avatar_url ? (
                  <img
                    src={eAccount.avatar_url}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => profilePicInputRef.current?.click()}
                  disabled={uploadingProfilePic}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 disabled:opacity-50"
                  title="Change profile picture"
                >
                  {uploadingProfilePic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
                <input
                  ref={profilePicInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureUpload}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">Profile Picture</p>
                <p className="text-xs text-gray-500 mb-2">Tap the camera to change your picture</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => profilePicInputRef.current?.click()}
                  disabled={uploadingProfilePic}
                >
                  {uploadingProfilePic ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploadingProfilePic ? 'Uploading...' : 'Upload Picture'}
                </Button>
              </div>
            </div>

            {/* E Account Section - Use Desktop Component */}
            <div className="bg-white rounded-xl border p-4">
              <EAccountSection user={user} />
            </div>



            <EggetSystemPlusCheckout
              isOpen={showPlusCheckout}
              onClose={() => setShowPlusCheckout(false)}
              user={user}
              onSubscribe={async (type, fields) => {
                await base44.auth.updateMe(fields);
                queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
                queryClient.invalidateQueries({ queryKey: ['current-user'] });
              }}
            />

            {/* Manage Subscription Modal */}
            <ManageSubscriptionModal isOpen={showManageSub} onClose={() => setShowManageSub(false)} user={user} />

            {/* Security subtab — .esabf account backup */}
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Security</h3>
              <EsabfBackup user={user} eAccount={eAccount} />
            </div>
            </>
            </div>
            ))}


        {activeTab === 'security' && (
          <div className="bg-white rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Change PIN</h3>
            {user?.pin && (
              <div>
                <Label>Current PIN</Label>
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="Enter current PIN"
                  value={profileForm.current_pin}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, current_pin: e.target.value.replace(/\D/g, '') }))}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>New PIN</Label>
              <Input
                type="password"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={profileForm.new_pin}
                onChange={(e) => setProfileForm(prev => ({ ...prev, new_pin: e.target.value.replace(/\D/g, '') }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Confirm PIN</Label>
              <Input
                type="password"
                maxLength={4}
                placeholder="Confirm PIN"
                value={profileForm.confirm_pin}
                onChange={(e) => setProfileForm(prev => ({ ...prev, confirm_pin: e.target.value.replace(/\D/g, '') }))}
                className="mt-1"
              />
            </div>
            <Button onClick={handleUpdatePin} className="w-full">
              <Lock className="w-4 h-4 mr-2" />
              Update PIN
            </Button>

            <div className="pt-2 border-t">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('eos_open_update_manager', {
                    detail: availableUpdates.length > 0 ? availableUpdates[0] : null
                  }));
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-800">System Update</p>
                    <p className="text-xs text-gray-500">
                      {availableUpdates.length > 0
                        ? `EggetSystem ${availableUpdates[0].version} available`
                        : 'Up to date'}
                    </p>
                  </div>
                </div>
                {availableUpdates.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                )}
              </button>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Fingerprint className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">Fingerprint Unlock</p>
                    <p className="text-xs text-gray-500">
                      {user?.fingerprint_enabled ? 'Enabled — use your fingerprint to unlock' : 'Use a fingerprint passkey to unlock'}
                    </p>
                  </div>
                </div>
                {user?.fingerprint_enabled ? (
                  <Button onClick={handleDisableFingerprint} variant="outline" size="sm">
                    Turn Off
                  </Button>
                ) : (
                  <Button onClick={() => setShowFingerprintSetup(true)} size="sm">
                    Set Up
                  </Button>
                )}
              </div>
            </div>

            {/* Hide status bar in full screen — EggSys.fullscn() */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Maximize className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">Hide Status Bar in Full Screen</p>
                    <p className="text-xs text-gray-500">EggSys.fullscn() — press & hold the top edge for 3s to exit</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const secPrefs = user?.security_preferences || {};
                    await base44.auth.updateMe({
                      security_preferences: { ...secPrefs, hide_statusbar_fullscreen: !secPrefs.hide_statusbar_fullscreen }
                    });
                    queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
                    queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
                    toast.success('Security setting updated');
                  }}
                  className={`w-12 h-6 rounded-full transition-colors shrink-0 ${
                    user?.security_preferences?.hide_statusbar_fullscreen ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    user?.security_preferences?.hide_statusbar_fullscreen ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'display' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Brightness</h3>
              <input 
                type="range" 
                min="0" 
                max="100" 
                defaultValue="80"
                className="w-full"
                onChange={() => toast.success('Brightness adjusted')}
              />
            </div>
          </div>
        )}

        {activeTab === 'homescreen' && (() => {
          const homePrefs = user?.home_preferences || {};
          const updateHomePreference = async (key, value) => {
            await base44.auth.updateMe({
              home_preferences: { ...homePrefs, [key]: value }
            });
            queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
            toast.success('Home screen setting updated');
          };

          return (
            <div className="space-y-4">
              {/* Legacy Mode Toggle */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-4">Mode</h3>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-800">Legacy Mode</p>
                    <p className="text-xs text-gray-500">Hide home button, show close button instead</p>
                  </div>
                  <button
                    onClick={() => updateHomePreference('legacy_mode', !(homePrefs.legacy_mode !== false))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      homePrefs.legacy_mode !== false ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      homePrefs.legacy_mode !== false ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-blue-800 mb-1">Legacy Home Mode</p>
                    <p className="text-xs text-blue-700">
                      When enabled, the home button is hidden and a close (X) button appears instead. Perfect for older device layouts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Taskbar Position */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Taskbar Layout</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['horizontal', 'vertical'].map(option => (
                    <button
                      key={option}
                      onClick={() => updateHomePreference('taskbar_layout', option)}
                      className={`p-3 rounded-lg border-2 text-xs capitalize font-medium ${
                        (homePrefs.taskbar_layout || 'horizontal') === option
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* App Grid Columns */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Home Grid Columns</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['4', '5', '6'].map(option => (
                    <button
                      key={option}
                      onClick={() => updateHomePreference('grid_columns', parseInt(option))}
                      className={`p-3 rounded-lg border-2 text-xs font-medium ${
                        (homePrefs.grid_columns || 5) === parseInt(option)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {option} cols
                    </button>
                  ))}
                </div>
              </div>

              {/* Skip Select OS */}
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-800">Skip Select OS</p>
                    <p className="text-xs text-gray-500">On mobile, boot straight into the Mobile OS after the full screen prompt</p>
                  </div>
                  <button
                    onClick={() => updateHomePreference('skip_select_os', !homePrefs.skip_select_os)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      homePrefs.skip_select_os ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      homePrefs.skip_select_os ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'appearance' && (
          eggSysOSDisabled ? <EggSysOSFailure title="Themes" /> : (
          <div className="space-y-4">
            {isOwner && (
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-1">Theme</h3>
                <p className="text-xs text-gray-500 mb-4">Owner-exclusive theme. Select Default to return to standard colors.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleThemeChange('default')}
                    className={`h-24 rounded-xl flex items-end p-3 border-2 bg-gradient-to-br from-slate-100 to-slate-200 ${
                      !user?.preferences?.theme || user?.preferences?.theme === 'default' ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <span className="text-gray-800 text-sm font-medium">Default</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('owner')}
                    className={`h-24 rounded-xl flex items-end p-3 border-2 bg-gradient-to-br from-red-600 via-black to-purple-600 ${
                      user?.preferences?.theme === 'owner' ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <span className="text-white text-sm font-medium">Owner</span>
                  </button>
                </div>
              </div>
            )}
            {/* Branding — EggetSystem logo replacement */}
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm">Show EggetSystem Logo</h3>
                  <p className="text-xs text-gray-500">Replace every "EggetSystem" text with the wordmark logo across the system.</p>
                </div>
                <button
                  onClick={async () => {
                    const prefs = user?.appearance_preferences || {};
                    const next = !(prefs.replace_eggetsystem_logo !== false);
                    await base44.auth.updateMe({
                      appearance_preferences: { ...prefs, replace_eggetsystem_logo: next }
                    });
                    queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
                    queryClient.invalidateQueries({ queryKey: ['eggsys-replacer-pref'] });
                    toast.success(next ? 'Logo replacement enabled' : 'Logo replacement disabled');
                    setTimeout(() => window.location.reload(), 600);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors shrink-0 ml-3 ${
                    (user?.appearance_preferences?.replace_eggetsystem_logo !== false) ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    (user?.appearance_preferences?.replace_eggetsystem_logo !== false) ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-4">Wallpaper</h3>
              <div className="grid grid-cols-2 gap-3">
                {wallpapers.map(wp => (
                  <button
                    key={wp.id}
                    onClick={() => handleWallpaperChange(wp.id)}
                    className={`h-24 rounded-xl bg-gradient-to-br ${wp.color} flex items-end p-3 border-2 ${
                      user?.preferences?.wallpaper === wp.id ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <span className="text-white text-sm font-medium">{wp.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => document.getElementById('mobile-custom-wallpaper-input').click()}
                  className={`h-24 rounded-xl flex items-end p-3 border-2 overflow-hidden relative ${
                    user?.preferences?.wallpaper === 'custom' ? 'border-blue-500' : 'border-transparent bg-slate-100'
                  }`}
                >
                  {user?.preferences?.wallpaper === 'custom' && user?.preferences?.wallpaper_custom_url ? (
                    <img src={user?.preferences?.wallpaper_custom_url} alt="Custom" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <span className="relative text-white text-sm font-medium drop-shadow">{uploadingWallpaper ? 'Uploading…' : 'Custom'}</span>
                </button>
                <input id="mobile-custom-wallpaper-input" type="file" accept="image/*" className="hidden" onChange={handleCustomWallpaperUpload} />
              </div>
            </div>


          </div>
        ))}

        {activeTab === 'notifications' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Enable Notifications</p>
                  <p className="text-xs text-gray-500">Receive app notifications</p>
                </div>
                <button
                  onClick={() => toast.success('Notification settings updated')}
                  className="w-12 h-6 rounded-full bg-blue-500"
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow translate-x-6" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Sound Effects</p>
                  <p className="text-xs text-gray-500">Play notification sounds</p>
                </div>
                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    setNotificationSoundEnabled(next);
                    if (next) playNotificationSound();
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm">Notification Sound</p>
                  <p className="text-xs text-gray-500">Choose the chime played for notifications</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {NOTIFICATION_SOUNDS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => { setNotifSound(s.key); setNotificationSound(s.key); previewNotificationSound(s.key); }}
                    className={`px-2 py-2.5 rounded-lg text-xs font-medium border transition-colors ${notifSound === s.key ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 space-y-3">
              <div>
                <p className="font-semibold text-sm">Call Ringtone</p>
                <p className="text-xs text-gray-500">Upload an audio file to play during incoming calls instead of silence</p>
              </div>
              {user?.ringtone_url ? (
                <div className="flex items-center gap-2">
                  <audio src={user.ringtone_url} controls className="flex-1 h-8 min-w-0" />
                  <Button onClick={handleRingtoneRemove} variant="outline" size="sm" className="shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No ringtone set — incoming calls will be silent</p>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors text-sm font-medium w-fit">
                {uploadingRingtone ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingRingtone ? 'Uploading...' : (user?.ringtone_url ? 'Change Ringtone' : 'Upload Ringtone')}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleRingtoneUpload}
                  disabled={uploadingRingtone}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-3">
            {visibleInstalledApps.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No installed apps yet</p>
              </div>
            ) : (
              visibleInstalledApps.map((app) => (
                <div key={app.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center`}>
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">{app.name}</h4>
                      <p className="text-xs text-gray-500">v{app.version}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {['storage', 'network', 'files', 'notifications', 'clipboard', 'geolocation'].map((perm) => {
                      const isEnabled = app.permissions?.[perm] || false;
                      return (
                        <div key={perm} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-xs capitalize">{perm}</span>
                          <button
                            onClick={() => handleTogglePermission(app, perm)}
                            className={`w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'apps' && (
          <div className="space-y-4">
            {/* Add Website as App button */}
            <button
              onClick={() => setShowAddWebsite(true)}
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Add Website as App</p>
                <p className="text-xs text-white/80">Pin any website to your app list</p>
              </div>
            </button>

            {/* Built-in apps */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Built-in Apps</p>
              <div className="space-y-2">
                {builtinApps.length === 0 ? (
                  <div className="bg-white rounded-xl p-4 text-center">
                    <Grid className="w-10 h-10 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No built-in apps available</p>
                  </div>
                ) : (
                  builtinApps.map((app) => {
                    const AppIcon = getEggSysIcon(app.icon);
                    return (
                      <div key={app.id} onClick={() => setSelectedApp(app)} className={`bg-white rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${(user?.disabled_services || []).includes(app.app_id) ? 'opacity-60' : ''}`}>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color || 'from-slate-500 to-slate-700'} flex items-center justify-center flex-shrink-0`}>
                          <AppIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-gray-800 text-sm truncate">{app.name}</h4>
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">Built-in</span>
                            {(user?.disabled_services || []).includes(app.app_id) && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-200 text-gray-600">Disabled</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{app.description || 'System app'}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Installed apps */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Installed Apps</p>
              {visibleInstalledApps.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center">
                  <Grid className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No apps installed yet</p>
                  <p className="text-xs text-gray-400 mt-1">Apps and services you install appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleInstalledApps.map((app) => {
                    const AppIcon = getEggSysIcon(app.icon);
                    const isService = app.app_data?.app_type === 'service';
                    return (
                      <div key={app.id} onClick={() => setSelectedApp(app)} className="bg-white rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color || 'from-gray-500 to-slate-500'} flex items-center justify-center flex-shrink-0`}>
                          <AppIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-gray-800 text-sm truncate">{app.name}</h4>
                            {isService && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">Service</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{app.description || `v${app.version || '1.0.0'}`}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUninstallApp(app); }}
                          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                          title="Uninstall"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <ServicesTab installedApps={installedApps} eggSysApps={eggSysApps} user={user} onSelectApp={setSelectedApp} />
        )}

        {activeTab === 'network' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Signal className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Your eSIM connects you to the EggetSystem mobile network. An active eSIM is required to send messages and make calls.
                </p>
              </div>
            </div>
            <ESimSetup
              user={user}
              variant="settings"
              onActivated={() => {
                queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
                queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
              }}
            />
          </div>
        )}

        {activeTab === 'privacy' && (() => {
          const stored = getManualConsent();
          const manualConsent = stored !== null ? stored : (user?.email !== 'eggtheegget@outlook.com');
          const toggleManualConsent = () => {
            setManualConsent(!manualConsent);
            toast.success(!manualConsent ? 'Spotify consent screen enabled' : 'Spotify consent screen disabled');
          };
          return (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm">Privacy Mode</p>
                  <p className="text-xs text-gray-500">Hide sensitive info</p>
                </div>
                <button
                  onClick={() => toast.success('Privacy mode updated')}
                  className="w-12 h-6 rounded-full bg-gray-300"
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow translate-x-0.5" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Spotify Manual Consent</p>
                  <p className="text-xs text-gray-500">Show Spotify's consent screen every sign-in. Off = skip it after your first authorization.</p>
                </div>
                <button
                  onClick={toggleManualConsent}
                  className={`w-12 h-6 rounded-full transition-colors shrink-0 ml-3 ${manualConsent ? 'bg-blue-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${manualConsent ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Your privacy is important. EggetSystem stores all data securely and encrypted.
                </p>
              </div>
            </div>
          </div>
          );
        })()}

        {activeTab === 'recovery' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2 text-sm">
                <RefreshCw className="w-4 h-4" />
                Reset Tutorial
              </h3>
              <p className="text-xs text-blue-600 mb-3">
                Replay the welcome tutorial to learn about EggetSystem features again.
              </p>
              <Button
                onClick={async () => {
                  if (await confirmAction('Reset tutorial? The tutorial will show again on next login.')) {
                    await base44.auth.updateMe({ tutorial_completed: false });
                    toast.success('Tutorial reset! Reload to see it again.');
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Tutorial
              </Button>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
              <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                Recovery Mode
              </h3>
              <p className="text-xs text-orange-600 mb-3">
                Access advanced recovery tools to troubleshoot your system.
              </p>
              <Button
                onClick={async () => {
                  if (await confirmAction('Enter Recovery Mode? This will restart your system.')) {
                    await base44.auth.updateMe({ in_recovery_mode: true });
                    window.location.reload();
                  }
                }}
                className="w-full bg-orange-600 hover:bg-orange-700 text-sm"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Enter Recovery Mode
              </Button>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                Factory Reset
              </h3>
              <p className="text-xs text-red-600 mb-3">
                Reset your system to factory defaults. This will delete all data.
              </p>
              <Button
                onClick={async () => {
                  if (!await confirmAction('Are you sure? This will delete ALL your data.')) return;
                  if (!await confirmAction('This action cannot be undone. Continue?')) return;
                  
                  try {
                    await base44.entities.InstalledApp.filter({}, '-created_date', 100).then(apps => {
                      return Promise.all(apps.map(app => base44.entities.InstalledApp.delete(app.id)));
                    });
                    await base44.entities.File.filter({}, '-created_date', 100).then(files => {
                      return Promise.all(files.map(file => base44.entities.File.delete(file.id)));
                    });
                    await base44.auth.updateMe({
                      setup_completed: false,
                      pin: null,
                      os_version: '1.0.0'
                    });
                    localStorage.clear();
                    toast.success('Factory reset complete - logging out...');
                    setTimeout(() => base44.auth.logout(), 1000);
                  } catch (error) {
                    toast.error('Factory reset failed');
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-sm"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Factory Reset
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'uiux' && (() => {
          const uiPrefs = user?.ui_preferences || {};
          const updateUIPreference = async (key, value) => {
            await base44.auth.updateMe({
              ui_preferences: { ...uiPrefs, [key]: value }
            });
            queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
            toast.success('UI preference updated');
          };

          return (
            <div className="space-y-3">
              {/* Layout Density */}
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">Layout Density</h4>
                <div className="grid grid-cols-3 gap-2">
                  {['compact', 'comfortable', 'spacious'].map(option => (
                    <button
                      key={option}
                      onClick={() => updateUIPreference('layout_density', option)}
                      className={`p-3 rounded-lg border-2 text-xs capitalize ${
                        (uiPrefs.layout_density || 'comfortable') === option
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Animation Speed */}
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">Animation Speed</h4>
                <div className="grid grid-cols-4 gap-2">
                  {['none', 'reduced', 'normal', 'fast'].map(option => (
                    <button
                      key={option}
                      onClick={() => updateUIPreference('animation_speed', option)}
                      className={`p-3 rounded-lg border-2 text-xs capitalize ${
                        (uiPrefs.animation_speed || 'normal') === option
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Window Style */}
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">Window Style</h4>
                <div className="grid grid-cols-3 gap-2">
                  {['modern', 'classic', 'minimal'].map(option => (
                    <button
                      key={option}
                      onClick={() => updateUIPreference('window_style', option)}
                      className={`p-3 rounded-lg border-2 text-xs capitalize ${
                        (uiPrefs.window_style || 'modern') === option
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">Font Size</h4>
                <div className="grid grid-cols-3 gap-2">
                  {['small', 'medium', 'large'].map(option => (
                    <button
                      key={option}
                      onClick={() => updateUIPreference('font_size', option)}
                      className={`p-3 rounded-lg border-2 capitalize ${
                        (uiPrefs.font_size || 'medium') === option
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200'
                      } ${
                        option === 'small' ? 'text-xs' :
                        option === 'large' ? 'text-base' : 'text-sm'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corner Radius */}
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">Corner Radius</h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sharp', label: 'Sharp', class: 'rounded-none' },
                    { id: 'rounded', label: 'Rounded', class: 'rounded-lg' },
                    { id: 'very_rounded', label: 'Very Rounded', class: 'rounded-2xl' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => updateUIPreference('corner_radius', option.id)}
                      className={`p-3 border-2 text-xs ${option.class} ${
                        (uiPrefs.corner_radius || 'rounded') === option.id
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transparency */}
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm">Transparency</h4>
                    <p className="text-xs text-gray-500">Blur effects</p>
                  </div>
                  <button
                    onClick={() => updateUIPreference('transparency', !(uiPrefs.transparency !== false))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      uiPrefs.transparency !== false ? 'bg-pink-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      uiPrefs.transparency !== false ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Icon Style */}
              <div className="bg-white rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">Icon Style</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['colorful', 'monochrome'].map(option => (
                    <button
                      key={option}
                      onClick={() => updateUIPreference('icon_style', option)}
                      className={`p-3 rounded-lg border-2 text-xs capitalize ${
                        (uiPrefs.icon_style || 'colorful') === option
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'referral' && (
          <ReferralTabView user={user} eAccount={eAccount} />
        )}

        {activeTab === 'backup' && (
          <BackupRestore user={user} />
        )}

        {activeTab === 'about' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4">
              <div className="text-center py-6">
                <h3 className="text-2xl font-bold text-gray-800">EggetSystem Mobile</h3>
                <p className="text-sm text-gray-500">Version {user?.os_version || '1.0.0'}</p>
                <button 
                  onClick={handleBuildClick}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
                >
                  Build 20260910.1
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Platform</span>
                  <span className="font-medium">Mobile</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Framework</span>
                  <span className="font-medium">React</span>
                </div>
              </div>
            </div>

            {isOwnerRole(user) && (
              <Link
                to="/EggetSystemBeta"
                className="flex items-center justify-center gap-2 w-full p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl"
              >
                <FlaskConical className="w-5 h-5" />
                <span className="font-medium">Run Beta</span>
              </Link>
            )}

            {devAuthenticated && (
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Code className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Developer Options</h3>
                    <p className="text-white/80 text-xs">Tools for app creators</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={downloadEafTemplate}
                    variant="outline"
                    className="w-full bg-blue-500/20 border-blue-300/30 text-white hover:bg-blue-500/30 text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export EAF Template
                  </Button>
                  <Button
                    onClick={downloadEaflTemplate}
                    variant="outline"
                    className="w-full bg-blue-500/20 border-blue-300/30 text-white hover:bg-blue-500/30 text-sm"
                  >
                    <FileCode className="w-4 h-4 mr-2" />
                    Export EAFL Template
                  </Button>
                  <div className="flex items-center justify-between px-1 py-1">
                    <div className="flex items-center gap-2">
                      <Bug className="w-4 h-4 text-white/70" />
                      <span className="text-sm text-white/90">Debug Mode</span>
                    </div>
                    <button
                      onClick={async () => {
                        const devPrefs = user?.dev_preferences || {};
                        await base44.auth.updateMe({
                          dev_preferences: { ...devPrefs, debug_mode: !devPrefs.debug_mode }
                        });
                        queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
                        toast.success(!devPrefs.debug_mode ? 'Debug mode enabled' : 'Debug mode disabled');
                      }}
                      className={`w-12 h-6 rounded-full transition-colors shrink-0 ${
                        user?.dev_preferences?.debug_mode ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        user?.dev_preferences?.debug_mode ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  <Button
                    onClick={() => {
                      console.table(visibleInstalledApps.map(a => ({
                        name: a.name,
                        app_id: a.app_id,
                        version: a.version,
                        has_eaf: !!a.eaf_file_url,
                        has_data: !!a.app_data
                      })));
                      toast.success(`Logged ${visibleInstalledApps.length} installed apps to console`);
                    }}
                    variant="outline"
                    className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 text-sm"
                  >
                    <Terminal className="w-4 h-4 mr-2" />
                    Inspect Installed Apps
                  </Button>
                  <Button
                    onClick={async () => {
                      if (await confirmAction('Clear all cached app data from local storage?')) {
                        Object.keys(localStorage).forEach(key => {
                          if (key.startsWith('eaf_') || key.startsWith('app_') || key.startsWith('react_zip_')) {
                            localStorage.removeItem(key);
                          }
                        });
                        toast.success('App cache cleared');
                      }
                    }}
                    variant="outline"
                    className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear App Cache
                  </Button>
                  <Button
                    onClick={() => {
                      queryClient.invalidateQueries();
                      toast.success('Refreshing system...');
                      setTimeout(() => window.location.reload(), 600);
                    }}
                    variant="outline"
                    className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 text-sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload System
                  </Button>
                  <Button
                    onClick={() => {
                      setDevAuthenticated(false);
                      localStorage.removeItem('eos_dev_options_enabled');
                      base44.entities.Notification.create({
                        title: 'Developer Options',
                        message: 'Developer Options disabled',
                        type: 'system',
                        recipient_username: user?.username
                      }).catch(() => {});
                    }}
                    variant="outline"
                    className="w-full bg-red-500/20 border-red-300/30 text-white hover:bg-red-500/30 text-sm"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Disable
                  </Button>
                </div>
              </div>
            )}

            <button
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
              className="flex items-center justify-center gap-2 w-full p-4 bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="font-medium">Sign in with Base44</span>
            </button>

            <Link 
              to={createPageUrl('Feedback')}
              className="flex items-center justify-center gap-2 w-full p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Send Feedback</span>
            </Link>

            <Link 
              to={createPageUrl('SelectOS')}
              className="flex items-center justify-center gap-2 w-full p-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl"
            >
              <Monitor className="w-5 h-5" />
              <span className="font-medium">Go to SelectOS</span>
            </Link>

            <div className="text-center text-xs text-gray-500 pt-2">
              <p>© 2025 EggetSystem. All rights reserved.</p>
            </div>
            </div>
            )}
            </div>
            </div>

            {selectedApp && (
              <AppInfoPage app={selectedApp} onBack={() => setSelectedApp(null)} user={user} />
            )}

            {/* Admin Panel Modal */}
            <AdminPanel 
            isOpen={showAdminPanel} 
            onClose={() => setShowAdminPanel(false)} 
            />

            {showAddWebsite && (
              <AddWebsiteApp onClose={() => setShowAddWebsite(false)} />
            )}

            {showFingerprintSetup && (
              <FingerprintSetup
                user={user}
                onEnabled={async () => {
                  await base44.auth.updateMe({ fingerprint_enabled: true });
                  queryClient.invalidateQueries({ queryKey: ['current-user-mobile-settings'] });
                  queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
                  setShowFingerprintSetup(false);
                }}
                onCancel={() => setShowFingerprintSetup(false)}
              />
            )}
            </>
            );
            }