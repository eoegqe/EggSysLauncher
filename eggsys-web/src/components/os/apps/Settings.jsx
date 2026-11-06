import React, { useState } from 'react';
import { Monitor, Palette, Bell, Lock, Info, Check, Shield, Download, CheckCircle, AlertCircle, Loader2, RefreshCw, User, Save, Mail, Link2, Unlink, MessageSquare, Star, Crown, Users, Plus, Trash2, Code, Terminal, Upload, Camera, Copy, ExternalLink, Rocket, Gem, Infinity, Smartphone, Gift, Package, Globe } from 'lucide-react';
import SitePermissionsTab from './settings/SitePermissionsTab';
import ReferralWidget from '@/components/os/ReferralWidget';
import EggetSystemPlusCheckout from './EggetSystemPlusCheckout';
import EAccountSection from './EAccountSection';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/devToast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import EggSysWord from '@/components/os/EggSysWord';
import { confirmAction } from '@/components/os/ConfirmDialog';
import { fetchEAccount } from '@/lib/eaccountSync';
import { useEggSysOSDisabled } from '@/hooks/useEggSysOSDisabled';
import EggSysOSFailure from '@/components/os/EggSysOSFailure';

const AVAILABLE_PERMISSIONS = [
  { id: 'storage', label: 'Local Storage', description: 'Store data on your device', icon: '💾' },
  { id: 'network', label: 'Network Access', description: 'Make network requests', icon: '🌐' },
  { id: 'files', label: 'File Access', description: 'Read and write files', icon: '📁' },
  { id: 'notifications', label: 'Notifications', description: 'Show notifications', icon: '🔔' },
  { id: 'clipboard', label: 'Clipboard Access', description: 'Copy and paste data', icon: '📋' },
  { id: 'geolocation', label: 'Location Access', description: 'Access your location', icon: '📍' },
];

export default function Settings() {
    const eggSysOSDisabled = useEggSysOSDisabled();
    const [activeSection, setActiveSection] = useState(null);
    const [settings, setSettings] = useState({
      brightness: 80,
      resolution: '1920x1080',
      theme: 'default',
      wallpaper: 'gradient',
      notifications: true,
      soundEnabled: true,
      autoUpdate: true,
      privacyMode: false
    });
    const [profileForm, setProfileForm] = useState({
      full_name: '',
      current_pin: '',
      new_pin: '',
      confirm_pin: ''
    });
    const [showDevPinDialog, setShowDevPinDialog] = useState(false);
    const [devPin, setDevPin] = useState('');
    const [devPinError, setDevPinError] = useState('');
    const [devAuthenticated, setDevAuthenticated] = useState(() => localStorage.getItem('eos_dev_options_enabled') === 'true');
    const [buildClickCount, setBuildClickCount] = useState(0);
    const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
    const [uploadingRingtone, setUploadingRingtone] = useState(false);
    const [showPlusCheckout, setShowPlusCheckout] = useState(false);
    const [checkoutInitialTier, setCheckoutInitialTier] = useState('plus');
    const [showManageSub, setShowManageSub] = useState(false);
    const [showManageProSub, setShowManageProSub] = useState(false);
    const [showManageEliteSub, setShowManageEliteSub] = useState(false);
    const [showManageMaxSub, setShowManageMaxSub] = useState(false);


    const queryClient = useQueryClient();
  
  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed-apps'],
    queryFn: () => base44.entities.InstalledApp.list('-created_date')
  });

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['current-user-settings'],
    queryFn: () => base44.auth.me(),
    retry: false
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

  const { data: systemMaintenance } = useQuery({
    queryKey: ['system-maintenance'],
    queryFn: async () => {
      const records = await base44.entities.SystemMaintenance.list();
      return records[0] || null;
    },
    staleTime: 30000
  });
  const subscriptionsHidden = !!systemMaintenance?.subscriptions_hidden;

  React.useEffect(() => {
    if (user) {
      setProfileForm(prev => ({ ...prev, full_name: user.full_name || '' }));
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('Profile updated');
    }
  });

  const { data: availableUpdates = [], isLoading: updatesLoading } = useQuery({
    queryKey: ['os-updates'],
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

  const updatePermissionMutation = useMutation({
    mutationFn: ({ appId, permissions }) => 
      base44.entities.InstalledApp.update(appId, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      toast.success('Permissions updated');
    }
  });

  const updateAutoUpdateMutation = useMutation({
    mutationFn: (autoUpdate) => base44.auth.updateMe({ auto_update: autoUpdate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user-settings'] });
      toast.success('Auto-update settings saved');
    }
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

  const isLiteMode = window.location.pathname.includes('Lite');
  
  const settingsItems = isLiteMode ? [
    { id: 'eaccount', icon: Mail, title: 'E Account', description: 'Sync your E Account', color: 'from-emerald-500 to-teal-600' },
    { id: 'about', icon: Info, title: 'About', description: 'System information', color: 'from-gray-500 to-gray-600' }
  ] : [
    { id: 'eaccount', icon: Mail, title: 'E Account', description: 'Sync your E Account', color: 'from-emerald-500 to-teal-600' },
    { id: 'display', icon: Monitor, title: 'Display', description: 'Brightness, resolution, and themes', color: 'from-blue-500 to-blue-600' },
    { id: 'personalization', icon: Palette, title: 'Personalization', description: 'Wallpapers and colors', color: 'from-purple-500 to-purple-600' },
    { id: 'uiux', icon: Palette, title: 'UI/UX Customization', description: 'Layout, animations, and visual styles', color: 'from-pink-500 to-rose-600' },
    { id: 'taskbar', icon: Monitor, title: 'Taskbar', description: 'Customize taskbar appearance and apps', color: 'from-cyan-500 to-teal-600' },
    { id: 'updates', icon: Download, title: 'Updates', description: 'OS updates and update history', color: 'from-indigo-500 to-indigo-600', badge: availableUpdates.length > 0 ? availableUpdates.length : null },
    { id: 'notifications', icon: Bell, title: 'Notifications', description: 'Manage app notifications', color: 'from-yellow-500 to-yellow-600' },
    { id: 'permissions', icon: Shield, title: 'App Permissions', description: 'Manage app permissions', color: 'from-green-500 to-green-600' },
    { id: 'site-permissions', icon: Globe, title: 'Site Permissions', description: 'Camera, mic, location for websites', color: 'from-teal-500 to-cyan-600' },
    { id: 'privacy', icon: Lock, title: 'Privacy & Security', description: 'Control your privacy settings', color: 'from-red-500 to-red-600' },
    { id: 'referral', icon: Gift, title: 'Refer & Earn', description: 'Invite friends and earn app credits', color: 'from-violet-500 to-purple-600' },
    { id: 'recovery', icon: AlertCircle, title: 'Recovery', description: 'System recovery and reset options', color: 'from-orange-500 to-red-600' },
    { id: 'about', icon: Info, title: 'About', description: 'System information', color: 'from-gray-500 to-gray-600' }
  ];

  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'wallpaper') {
      updateProfileMutation.mutate({ preferences: { ...user?.preferences, wallpaper: value } });
    }
    toast.success('Setting updated');
  };

  const handleCustomWallpaperUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWallpaper(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateProfileMutation.mutate({
        preferences: { ...user?.preferences, wallpaper: 'custom', wallpaper_custom_url: file_url }
      });
      setSettings(prev => ({ ...prev, wallpaper: 'custom' }));
      toast.success('Custom wallpaper set');
    } catch (err) {
      toast.error('Failed to upload wallpaper');
    } finally {
      setUploadingWallpaper(false);
      e.target.value = '';
    }
  };

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({ full_name: profileForm.full_name });
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

  const handleBuildClick = () => {
    const newCount = buildClickCount + 1;
    setBuildClickCount(newCount);

    if (newCount === 7) {
      setShowDevPinDialog(true);
      setBuildClickCount(0);
    } else if (newCount < 7) {
      toast.success(`${7 - newCount} more clicks to developer options`);
    }
  };

  const handleDevPinSubmit = () => {
    if (devPin === '7113') {
      setDevAuthenticated(true);
      localStorage.setItem('eos_dev_options_enabled', 'true');
      window.dispatchEvent(new Event('eos-dev-options-changed'));
      setShowDevPinDialog(false);
      setDevPin('');
      setDevPinError('');
      toast.success('Developer Options enabled!');
    } else {
      setDevPinError('Incorrect PIN');
      setDevPin('');
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
      queryClient.invalidateQueries({ queryKey: ['current-user-settings'] });
      toast.success('Ringtone updated!');
    } catch (error) {
      toast.error('Failed to upload ringtone');
    } finally {
      setUploadingRingtone(false);
    }
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingProfilePic(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_picture: file_url });
      queryClient.invalidateQueries({ queryKey: ['current-user-settings'] });
      toast.success('Profile picture updated!');
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'eaccount':
        if (eggSysOSDisabled) return <EggSysOSFailure title="E Account" />;
        return (
          <div className="space-y-6">
            {/* Subscription Status (admin-granted via E Account) */}
            {eAccount && subTier !== 'free' ? (
              <div className={`bg-gradient-to-r ${
                hasMax ? 'from-slate-800 to-black' :
                hasElite ? 'from-purple-500 to-pink-600' :
                hasPro ? 'from-blue-500 to-indigo-600' :
                'from-yellow-400 to-orange-500'
              } rounded-xl p-6 text-white`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                    {hasMax ? <Infinity className="w-8 h-8" /> : hasElite ? <Gem className="w-8 h-8" /> : hasPro ? <Rocket className="w-8 h-8" /> : <Crown className="w-8 h-8" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm opacity-90 font-medium">Active · Admin-Granted</span>
                    </div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <EggSysWord height={20} />
                      {hasMax ? 'Max' : hasElite ? 'Elite' : hasPro ? 'Pro' : '+'}
                    </h3>
                    {eAccount?.subscription_granted_at && (
                      <p className="text-xs opacity-75">Granted {new Date(eAccount.subscription_granted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 bg-white/10 rounded-lg p-3">
                  <p className="text-xs opacity-90">Subscriptions are managed by store staff and admins. To change your plan, visit a participating <EggSysWord /> store.</p>
                </div>
              </div>
            ) : (eAccount && !subscriptionsHidden) ? (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 flex items-center gap-1"><EggSysWord height={16} />+</h4>
                    <p className="text-xs text-gray-500">Activate at a participating store</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlusCheckout(true)}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
                >
                  View Plans
                </button>
              </div>
            ) : null}

            <EAccountSection user={user} />

            {/* Change PIN */}
            <div className="bg-white rounded-xl border p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Change PIN</h4>
              <p className="text-sm text-gray-500 mb-4">Your PIN is used to unlock your screen</p>
              <div className="space-y-4">
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
              </div>
            </div>

            <EggetSystemPlusCheckout
              isOpen={showPlusCheckout}
              onClose={() => setShowPlusCheckout(false)}
              user={user}
              initialTier={checkoutInitialTier}
              onSubscribe={async (type, fields) => {
                await base44.auth.updateMe(fields);
                queryClient.invalidateQueries({ queryKey: ['current-user-settings'] });
                queryClient.invalidateQueries({ queryKey: ['current-user'] });
              }}
            />

          </div>
        );

      case 'display':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-4 block">Brightness</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[settings.brightness]}
                  onValueChange={([value]) => updateSetting('brightness', value)}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{settings.brightness}%</span>
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold mb-4 block">Resolution</Label>
              <Select value={settings.resolution} onValueChange={(value) => updateSetting('resolution', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1920x1080">1920 × 1080 (Full HD)</SelectItem>
                  <SelectItem value="2560x1440">2560 × 1440 (2K)</SelectItem>
                  <SelectItem value="3840x2160">3840 × 2160 (4K)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-semibold mb-4 block">Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                {['default', 'dark', 'light'].map(theme => (
                  <button
                    key={theme}
                    onClick={() => updateSetting('theme', theme)}
                    className={`p-4 rounded-lg border-2 transition-all capitalize ${
                      settings.theme === theme 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {settings.theme === theme && <Check className="w-4 h-4 text-blue-500 mb-2" />}
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'personalization':
        if (eggSysOSDisabled) return <EggSysOSFailure title="Themes" />;
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-4 block">Wallpaper</Label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'gradient', name: 'Purple Gradient', bg: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600' },
                  { id: 'blue', name: 'Blue Gradient', bg: 'bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600' },
                  { id: 'sunset', name: 'Sunset', bg: 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-600' },
                  { id: 'forest', name: 'Forest', bg: 'bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700' }
                ].map(wp => (
                  <button
                    key={wp.id}
                    onClick={() => updateSetting('wallpaper', wp.id)}
                    className={`relative h-32 rounded-xl overflow-hidden border-2 transition-all ${
                      settings.wallpaper === wp.id ? 'border-blue-500 ring-4 ring-blue-100' : 'border-gray-200'
                    }`}
                  >
                    <div className={`w-full h-full ${wp.bg}`} />
                    {settings.wallpaper === wp.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm p-2">
                      {wp.name}
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => document.getElementById('desktop-custom-wallpaper-input').click()}
                  className={`relative h-32 rounded-xl overflow-hidden border-2 transition-all ${
                    settings.wallpaper === 'custom' ? 'border-blue-500 ring-4 ring-blue-100' : 'border-gray-200 bg-slate-100'
                  }`}
                >
                  {settings.wallpaper === 'custom' && user?.preferences?.wallpaper_custom_url ? (
                    <img src={user?.preferences?.wallpaper_custom_url} alt="Custom" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  {settings.wallpaper === 'custom' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm p-2">
                    {uploadingWallpaper ? 'Uploading…' : 'Custom'}
                  </div>
                </button>
                <input id="desktop-custom-wallpaper-input" type="file" accept="image/*" className="hidden" onChange={handleCustomWallpaperUpload} />
              </div>
            </div>

          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">Enable Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications from apps</p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => updateSetting('notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">Sound Effects</p>
                <p className="text-sm text-gray-500">Play sounds for notifications</p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="font-semibold">Call Ringtone</p>
                <p className="text-sm text-gray-500">Upload an audio file to play during incoming calls</p>
              </div>
              {user?.ringtone_url ? (
                <div className="flex items-center gap-3">
                  <audio src={user.ringtone_url} controls className="flex-1 h-8" />
                  <Button
                    onClick={async () => {
                      await base44.auth.updateMe({ ringtone_url: null });
                      queryClient.invalidateQueries({ queryKey: ['current-user-settings'] });
                      toast.success('Ringtone removed');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No ringtone set — default will be used</p>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium">
                {uploadingRingtone ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingRingtone ? 'Uploading...' : 'Upload Ringtone'}
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
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">Privacy Mode</p>
                <p className="text-sm text-gray-500">Hide sensitive information</p>
              </div>
              <Switch
                checked={settings.privacyMode}
                onCheckedChange={(checked) => updateSetting('privacyMode', checked)}
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-2">Security PIN</h3>
              <p className="text-sm text-gray-500 mb-4">Change your screen lock PIN</p>
              <Button
                onClick={() => {
                  const profileApp = {
                    id: Date.now().toString(),
                    appId: 'profile',
                    title: 'User Profile',
                    icon: () => null,
                    component: () => null
                  };
                  window.location.hash = 'profile';
                }}
                variant="outline"
                className="w-full"
              >
                <Lock className="w-4 h-4 mr-2" />
                Change PIN
              </Button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <Lock className="w-4 h-4 inline mr-2" />
                Your privacy is important. <EggSysWord /> stores all data locally and doesn't send information to external servers.
              </p>
            </div>
          </div>
        );

      case 'recovery':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Reset Tutorial
              </h3>
              <p className="text-sm text-blue-600 mb-4">
                Replay the welcome tutorial to learn about <EggSysWord /> features again.
              </p>
              <Button
                onClick={async () => {
                  if (await confirmAction('Reset tutorial? The tutorial will show again on next login.')) {
                    await base44.auth.updateMe({ tutorial_completed: false });
                    toast.success('Tutorial reset! Reload to see it again.');
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Tutorial
              </Button>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
              <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Enter Recovery Mode
              </h3>
              <p className="text-sm text-orange-600 mb-4">
                Access advanced recovery tools to troubleshoot and repair your system.
              </p>
              <Button
                onClick={async () => {
                  if (await confirmAction('Enter Recovery Mode? This will restart your system.')) {
                    await base44.auth.updateMe({ in_recovery_mode: true });
                    window.location.reload();
                  }
                }}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Enter Recovery Mode
              </Button>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Factory Reset
              </h3>
              <p className="text-sm text-red-600 mb-4">
                Reset your system to factory defaults. This will delete all apps, files, and settings.
              </p>
              <Button
                onClick={async () => {
                  if (!await confirmAction('Are you sure? This will delete ALL your data and restart the setup process.')) return;
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
                      pinned_apps: [],
                      pin: null,
                      preferences: null,
                      os_version: '1.0.0'
                    });
                    toast.success('Factory reset complete - restarting...');
                    setTimeout(() => window.location.reload(), 1000);
                  } catch (error) {
                    toast.error('Factory reset failed');
                  }
                }}
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Factory Reset
              </Button>
            </div>
          </div>
        );

      case 'updates':
        if (eggSysOSDisabled) return <EggSysOSFailure title="Updates" />;
        return (
          <div className="space-y-6">
            {/* Current Version */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Current Version</p>
                  <h3 className="text-3xl font-bold flex items-center gap-2"><EggSysWord height={28} /> {user?.os_version || '1.0.0'}</h3>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* Available Updates */}
            {updatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : availableUpdates.length > 0 ? (
              <div>
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5 text-indigo-600" />
                  Available Updates ({availableUpdates.length})
                </h4>
                <div className="space-y-3">
                  {availableUpdates.map((update) => (
                    <div key={update.id} className="bg-white border-2 border-indigo-200 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-bold text-gray-800 flex items-center gap-1"><EggSysWord height={16} /> {update.version}</h5>
                            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
                              update.priority === 'critical' ? 'bg-red-500' :
                              update.priority === 'recommended' ? 'bg-blue-500' :
                              'bg-gray-500'
                            }`}>
                              {update.priority}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-700">{update.title}</p>
                        </div>
                        <span className="text-xs text-gray-500">{update.size_mb}MB</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{update.description}</p>
                      {update.changes && update.changes.length > 0 && (
                        <div className="mb-4 space-y-1">
                          {update.changes.slice(0, 3).map((change, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded text-white flex-shrink-0 ${
                                change.category === 'feature' ? 'bg-blue-500' :
                                change.category === 'improvement' ? 'bg-green-500' :
                                change.category === 'bugfix' ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}>
                                {change.category}
                              </span>
                              <span className="text-gray-600">{change.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
                        <Download className="w-4 h-4 mr-2" />
                        Install Update
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-800 mb-2">You're up to date!</h4>
                <p className="text-sm text-gray-600">Your system is running the latest version of <EggSysWord /></p>
              </div>
            )}

            {/* Update History */}
            {user?.update_history && user.update_history.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Update History</h4>
                <div className="space-y-2">
                  {user.update_history.slice().reverse().map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {record.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800 flex items-center gap-1"><EggSysWord height={14} /> {record.version}</p>
                          <p className="text-xs text-gray-500">
                            {record.installed_date ? format(new Date(record.installed_date), 'MMM d, yyyy • h:mm a') : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        record.status === 'success' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Check for Updates Button */}
            <Button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['os-updates'] });
                toast.success('Checking for updates...');
              }}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check for Updates
            </Button>
          </div>
        );

      case 'permissions':
        return (
          <div className="space-y-6">
            {installedApps.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No installed apps yet</p>
              </div>
            ) : (
              installedApps.map((app) => (
                <div key={app.id} className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center flex-shrink-0`}>
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{app.name}</h4>
                      <p className="text-sm text-gray-500">v{app.version}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {AVAILABLE_PERMISSIONS.map((permission) => {
                      const isGranted = app.permissions?.[permission.id] === true;
                      return (
                        <div key={permission.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{permission.icon}</span>
                            <div>
                              <p className="text-sm font-medium">{permission.label}</p>
                              <p className="text-xs text-gray-500">{permission.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isGranted}
                            onCheckedChange={(checked) => {
                              const newPermissions = { ...app.permissions, [permission.id]: checked };
                              updatePermissionMutation.mutate({ appId: app.id, permissions: newPermissions });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        );



      case 'site-permissions':
        return <SitePermissionsTab />;

      case 'uiux':
        const uiPrefs = user?.ui_preferences || {};
        const isOwner = user?.admin_role?.toLowerCase() === 'owner' || user?.role === 'owner' || eAccount?.admin_role?.toLowerCase() === 'owner';
        const updateUIPreference = async (key, value) => {
          await base44.auth.updateMe({
            ui_preferences: { ...uiPrefs, [key]: value }
          });
          queryClient.invalidateQueries({ queryKey: ['current-user-settings'] });
          toast.success('UI preference updated');
        };

        return (
          <div className="space-y-6">
            {/* Theme — owner only */}
            {isOwner && (
              <div className="bg-white rounded-xl border p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Theme</h4>
                <p className="text-sm text-gray-500 mb-4">Pick a color theme for your home screen.</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'default', name: 'Default', colors: 'from-slate-500 to-slate-700' },
                    { id: 'owner', name: 'Owner', colors: 'from-red-600 via-black to-purple-600' },
                  ].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        updateProfileMutation.mutate({ preferences: { ...user?.preferences, theme: theme.id } });
                        toast.success(`${theme.name} theme applied`);
                      }}
                      className={`relative h-32 rounded-xl overflow-hidden border-2 transition-all ${
                        user?.preferences?.theme === theme.id ? 'border-pink-500 ring-4 ring-pink-100' : 'border-gray-200'
                      }`}
                    >
                      <div className={`w-full h-full bg-gradient-to-br ${theme.colors}`} />
                      {user?.preferences?.theme === theme.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm p-2">
                        {theme.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Layout Density */}
            <div className="bg-white rounded-xl border p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Layout Density</h4>
              <p className="text-sm text-gray-500 mb-4">Adjust spacing and content density</p>
              <div className="grid grid-cols-3 gap-3">
                {['compact', 'comfortable', 'spacious'].map(option => (
                  <button
                    key={option}
                    onClick={() => updateUIPreference('layout_density', option)}
                    className={`p-4 rounded-xl border-2 transition-all capitalize ${
                      (uiPrefs.layout_density || 'comfortable') === option
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {(uiPrefs.layout_density || 'comfortable') === option && <Check className="w-4 h-4 text-pink-500 mb-2" />}
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Animation Speed */}
            <div className="bg-white rounded-xl border p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Animation Speed</h4>
              <p className="text-sm text-gray-500 mb-4">Control UI animation timing</p>
              <div className="grid grid-cols-4 gap-3">
                {['none', 'reduced', 'normal', 'fast'].map(option => (
                  <button
                    key={option}
                    onClick={() => updateUIPreference('animation_speed', option)}
                    className={`p-4 rounded-xl border-2 transition-all capitalize ${
                      (uiPrefs.animation_speed || 'normal') === option
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {(uiPrefs.animation_speed || 'normal') === option && <Check className="w-4 h-4 text-pink-500 mb-2" />}
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Window Style */}
            <div className="bg-white rounded-xl border p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Window Style</h4>
              <p className="text-sm text-gray-500 mb-4">Choose your window appearance</p>
              <div className="grid grid-cols-3 gap-3">
                {['modern', 'classic', 'minimal'].map(option => (
                  <button
                    key={option}
                    onClick={() => updateUIPreference('window_style', option)}
                    className={`p-4 rounded-xl border-2 transition-all capitalize ${
                      (uiPrefs.window_style || 'modern') === option
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {(uiPrefs.window_style || 'modern') === option && <Check className="w-4 h-4 text-pink-500 mb-2" />}
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="bg-white rounded-xl border p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Font Size</h4>
              <p className="text-sm text-gray-500 mb-4">Adjust text size across the system</p>
              <div className="grid grid-cols-3 gap-3">
                {['small', 'medium', 'large'].map(option => (
                  <button
                    key={option}
                    onClick={() => updateUIPreference('font_size', option)}
                    className={`p-4 rounded-xl border-2 transition-all capitalize ${
                      (uiPrefs.font_size || 'medium') === option
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {(uiPrefs.font_size || 'medium') === option && <Check className="w-4 h-4 text-pink-500 mb-2" />}
                    <span className={
                      option === 'small' ? 'text-xs' :
                      option === 'large' ? 'text-lg' : 'text-base'
                    }>{option}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Corner Radius */}
            <div className="bg-white rounded-xl border p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Corner Radius</h4>
              <p className="text-sm text-gray-500 mb-4">Roundness of UI elements</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'sharp', label: 'Sharp', class: 'rounded-none' },
                  { id: 'rounded', label: 'Rounded', class: 'rounded-lg' },
                  { id: 'very_rounded', label: 'Very Rounded', class: 'rounded-2xl' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => updateUIPreference('corner_radius', option.id)}
                    className={`p-4 border-2 transition-all ${option.class} ${
                      (uiPrefs.corner_radius || 'rounded') === option.id
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {(uiPrefs.corner_radius || 'rounded') === option.id && <Check className="w-4 h-4 text-pink-500 mb-2" />}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transparency */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800">Transparency Effects</h4>
                  <p className="text-sm text-gray-500">Blur and transparency in UI elements</p>
                </div>
                <Switch
                  checked={uiPrefs.transparency !== false}
                  onCheckedChange={(checked) => updateUIPreference('transparency', checked)}
                />
              </div>
            </div>

            {/* Taskbar Position */}
            <div className="bg-white rounded-xl border p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Taskbar Position</h4>
              <p className="text-sm text-gray-500 mb-4">Where the taskbar appears</p>
              <div className="grid grid-cols-2 gap-3">
                {['bottom', 'top'].map(option => (
                  <button
                    key={option}
                    onClick={() => updateUIPreference('taskbar_position', option)}
                    className={`p-4 rounded-xl border-2 transition-all capitalize ${
                      (uiPrefs.taskbar_position || 'bottom') === option
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {(uiPrefs.taskbar_position || 'bottom') === option && <Check className="w-4 h-4 text-pink-500 mb-2" />}
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Style */}
            <div className="bg-white rounded-xl border p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Icon Style</h4>
              <p className="text-sm text-gray-500 mb-4">Visual style for app icons</p>
              <div className="grid grid-cols-2 gap-3">
                {['colorful', 'monochrome'].map(option => (
                  <button
                    key={option}
                    onClick={() => updateUIPreference('icon_style', option)}
                    className={`p-4 rounded-xl border-2 transition-all capitalize ${
                      (uiPrefs.icon_style || 'colorful') === option
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {(uiPrefs.icon_style || 'colorful') === option && <Check className="w-4 h-4 text-pink-500 mb-2" />}
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-pink-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-pink-900 mb-1">Customize Your Experience</h4>
                  <p className="text-sm text-pink-800">
                    These settings allow you to personalize <EggSysWord /> to match your preferences. Changes take effect immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'taskbar':
         return (
           <div className="space-y-6">
             <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6">
               <h3 className="font-semibold text-cyan-900 mb-2">Taskbar Customization</h3>
               <p className="text-sm text-cyan-800">
                 Select which apps appear on your taskbar. By default, no apps are shown. Select your favorite apps to pin them.
               </p>
             </div>

             {/* Home Screen / Taskbar Layout */}
             <div className="bg-white rounded-xl border p-6 space-y-6">
               <div>
                 <h4 className="font-semibold text-gray-800 mb-1">Taskbar Layout</h4>
                 <p className="text-sm text-gray-500 mb-4">Orientation of the taskbar</p>
                 <div className="grid grid-cols-2 gap-3">
                   {['horizontal', 'vertical'].map(option => (
                     <button
                       key={option}
                       onClick={() => updateProfileMutation.mutate({ home_preferences: { ...(user?.home_preferences || {}), taskbar_layout: option } })}
                       className={`p-4 rounded-xl border-2 transition-all capitalize ${(user?.home_preferences?.taskbar_layout || 'horizontal') === option ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-gray-300'}`}
                     >
                       {(user?.home_preferences?.taskbar_layout || 'horizontal') === option && <Check className="w-4 h-4 text-cyan-500 mb-2" />}
                       {option}
                     </button>
                   ))}
                 </div>
               </div>

               <div>
                 <h4 className="font-semibold text-gray-800 mb-1">Home Grid Columns</h4>
                 <p className="text-sm text-gray-500 mb-4">Number of app columns on the home screen</p>
                 <div className="grid grid-cols-3 gap-3">
                   {['4', '5', '6'].map(option => (
                     <button
                       key={option}
                       onClick={() => updateProfileMutation.mutate({ home_preferences: { ...(user?.home_preferences || {}), grid_columns: parseInt(option) } })}
                       className={`p-4 rounded-xl border-2 text-sm font-medium ${(user?.home_preferences?.grid_columns || 5) === parseInt(option) ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-gray-300'}`}
                     >
                       {option} cols
                     </button>
                   ))}
                 </div>
               </div>

               <div className="flex items-center justify-between">
                 <div>
                   <h4 className="font-semibold text-gray-800">Legacy Home Mode</h4>
                   <p className="text-sm text-gray-500">Hide home button, show close button instead</p>
                 </div>
                 <Switch
                   checked={user?.home_preferences?.legacy_mode !== false}
                   onCheckedChange={(checked) => updateProfileMutation.mutate({ home_preferences: { ...(user?.home_preferences || {}), legacy_mode: checked } })}
                 />
               </div>
             </div>

             {installedApps.length === 0 ? (
               <div className="text-center py-12 bg-gray-50 rounded-xl">
                 <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                 <p className="text-gray-500">No installed apps to add to taskbar</p>
               </div>
             ) : (
               <div className="space-y-3">
                 <p className="text-sm font-semibold text-gray-700">Installed Apps</p>
                 {installedApps.map((app) => {
                   const isPinned = user?.pinned_apps?.includes(app.app_id);
                   return (
                     <div key={app.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center`}>
                           <Package className="w-5 h-5 text-white" />
                         </div>
                         <div>
                           <h4 className="font-semibold text-gray-800">{app.name}</h4>
                           <p className="text-xs text-gray-500">v{app.version}</p>
                         </div>
                       </div>
                       <Switch
                         checked={isPinned}
                         onCheckedChange={(checked) => {
                           const currentPinned = user?.pinned_apps || [];
                           const newPinned = checked
                             ? [...currentPinned, app.app_id]
                             : currentPinned.filter(id => id !== app.app_id);
                           updateProfileMutation.mutate({ pinned_apps: newPinned });
                         }}
                       />
                     </div>
                   );
                 })}
               </div>
             )}
           </div>
         );

      case 'referral':
         return <ReferralWidget user={user} />;

      case 'about':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-8 text-white text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl mx-auto mb-4 flex items-center justify-center">
                <Monitor className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2"><EggSysWord height={30} /></h2>
              <p className="text-lg opacity-90 mb-1">Version {user?.os_version || '1.0.0'}</p>
              <button 
                onClick={handleBuildClick}
                className="text-sm opacity-75 hover:opacity-100 transition-opacity"
              >
                Build 20260120.7113
              </button>
            </div>

            {/* Help Section */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Getting Started
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Desktop Basics</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Double-click desktop icons to launch applications</li>
                    <li>Right-click on desktop for quick access menu</li>
                    <li>Use the taskbar at the bottom to manage open windows</li>
                    <li>Click the Start button to open the application menu</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Window Management</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Drag window title bars to move them around</li>
                    <li>Click minimize to collapse a window</li>
                    <li>Click the X button to close applications</li>
                    <li>Pin frequently used apps to the taskbar</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">File Management</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Open File Explorer to browse your files</li>
                    <li>Create folders to organize your content</li>
                    <li>Right-click files for context menu options</li>
                    <li>Use Downloads folder for downloaded files</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Settings Tips</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Customize your wallpaper in Personalization</li>
                    <li>Adjust display settings like brightness and resolution</li>
                    <li>Manage app permissions in App Permissions section</li>
                    <li>Enable notifications for important app updates</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Useful Apps</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li><strong>App Creator:</strong> Build your own applications</li>
                    <li><strong>App Store:</strong> Download and install new apps</li>
                    <li><strong>Terminal:</strong> Access advanced system controls</li>
                    <li><strong>ECloud:</strong> Cloud storage and file sync</li>
                    <li><strong>Paint:</strong> Create and edit images</li>
                  </ul>
                </div>
              </div>
            </div>

            {devAuthenticated && (
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Developer Options</h3>
                    <p className="text-white/80 text-sm">Advanced system options</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      console.log('User Data:', user);
                      toast.success('User data logged to console');
                    }}
                    variant="outline"
                    className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Terminal className="w-4 h-4 mr-2" />
                    Log User Data to Console
                  </Button>
                  <Button
                    onClick={() => {
                      queryClient.invalidateQueries();
                      toast.success('All queries invalidated');
                    }}
                    variant="outline"
                    className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Invalidate All Queries
                  </Button>
                  <Button
                    onClick={async () => {
                      if (await confirmAction('Clear all local storage? This will log you out.')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    variant="outline"
                    className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Clear Local Storage
                  </Button>
                  <Button
                    onClick={() => {
                      setDevAuthenticated(false);
                      localStorage.removeItem('eos_dev_options_enabled');
                      window.dispatchEvent(new Event('eos-dev-options-changed'));
                      toast.success('Developer Options disabled');
                    }}
                    variant="outline"
                    className="w-full bg-red-500/20 border-red-300/30 text-white hover:bg-red-500/30"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Disable Developer Options
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">System Architecture</span>
                <span className="font-medium">x64</span>
              </div>
              <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Platform</span>
                <span className="font-medium">Web-based</span>
              </div>
              <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Framework</span>
                <span className="font-medium">React + Base44</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!user?.egget_system_installed}
                    readOnly
                    className="w-4 h-4 accent-green-500 pointer-events-none"
                  />
                  <span className="text-gray-600 flex items-center gap-1"><EggSysWord height={14} /> Installed</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user?.egget_system_installed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {user?.egget_system_installed ? 'Installed' : 'Not Installed'}
                </span>
              </div>
            </div>

<button
  onClick={() => {
    const link = document.createElement("a");
    link.href =
      "https://github.com/eoegqe/EggetSystem-APK/raw/refs/heads/main/app-release.apk";
    link.download = "EggetSystem.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }}
  style={{
    marginTop: "12px",
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#1f2937",
    color: "white",
    cursor: "pointer",
    fontSize: "14px"
  }}
>
  Download APK
</button>
            <Link 
              to={createPageUrl('Feedback')}
              className="flex items-center justify-center gap-2 w-full p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Send Feedback</span>
            </Link>

            <Button
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <User className="w-5 h-5 mr-2" />
              <span className="font-medium">Sign In with Base44</span>
            </Button>

            <Link 
              to={createPageUrl('SelectOS')}
              className="flex items-center justify-center gap-2 w-full p-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all"
            >
              <Monitor className="w-5 h-5" />
              <span className="font-medium">Go to SelectOS</span>
            </Link>

            <div className="text-center text-sm text-gray-500 pt-4 space-y-2">
              <p>© 2026 Theegget Creations. All rights reserved.</p>
              <div className="flex items-center justify-center gap-4">
                <Link to={createPageUrl('TermsOfService')} className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>
                <span>•</span>
                <Link to={createPageUrl('PrivacyPolicy')} className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (activeSection) {
    return (
      <div className="h-full bg-white flex flex-col">
        <div className="p-6 border-b flex items-center gap-4">
          <Button variant="ghost" onClick={() => setActiveSection(null)}>
            ← Back
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {settingsItems.find(s => s.id === activeSection)?.title}
            </h2>
            <p className="text-sm text-gray-500">
              {settingsItems.find(s => s.id === activeSection)?.description}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <>
      {showDevPinDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Developer Access</h3>
                <p className="text-sm text-gray-500">Enter PIN to continue</p>
              </div>
            </div>
            <Input
              type="password"
              maxLength={4}
              value={devPin}
              onChange={(e) => setDevPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter PIN"
              className="mb-3"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleDevPinSubmit()}
            />
            {devPinError && <p className="text-sm text-red-600 mb-3">{devPinError}</p>}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDevPinDialog(false);
                  setDevPin('');
                  setDevPinError('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleDevPinSubmit} className="flex-1 bg-gray-800 hover:bg-gray-900">
                Verify
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
        <div className="p-6 bg-white border-b flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">Manage your <EggSysWord /> preferences</p>
        </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {settingsItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-all border relative"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-800">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            {item.badge && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {item.badge}
              </div>
            )}
          </button>
        ))}
      </div>
      </div>
    </>
  );
}