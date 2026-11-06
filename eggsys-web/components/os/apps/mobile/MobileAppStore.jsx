import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getDeviceId } from '@/lib/deviceId';
import { Package, Download, Star, Plus, CheckCircle, Trash2, ChevronLeft, Search, Shield, ShieldCheck, ShieldAlert, ShieldX, Loader2, Bug, Eye, Lock, Zap, Wifi, FileSearch, XCircle, ChevronDown, ChevronUp, AlertTriangle, FlaskConical, Play, ChevronRight, Calculator, FileText, Folder, Terminal, Globe, Sparkles, ListChecks, Cloud, BarChart3, Code, Settings, Paintbrush, Send } from 'lucide-react';
import { getUserThemeGradient } from '@/lib/themeUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/devToast';
import { cn } from '@/lib/utils';
import AppDetailPage from './AppDetailPage';
import { getEggSysIcon } from '@/lib/eggSysIcon';
import SpotifyIcon from '@/components/os/SpotifyIcon';
import EditAppDialog from '@/components/os/apps/EditAppDialog';
import ContentRatingBadge from '@/components/os/ContentRatingBadge';
import { isAdminOrHigher } from '@/lib/adminPermissions';
import EggSysWord from '@/components/os/EggSysWord';
import { confirmAction } from '@/components/os/ConfirmDialog';
import { offloadReactZip } from '@/lib/reactZipStorage';

const LAUNCHABLE_APP_IDS = new Set(['calculator','editor','files','terminal','browser','appstore','appcreator','taskmanager','devdashboard','devconsole','settings','paint','esss','eggmail','messages','familylink']);

export default function MobileAppStore({ onLaunchApp }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed-apps'],
    queryFn: () => base44.entities.InstalledApp.list()
  });

  const { data: approvedApps = [] } = useQuery({
    queryKey: ['approved-published-apps'],
    queryFn: () => base44.entities.PublishedApp.filter({ status: 'approved' }, '-created_date')
  });

  const { data: eggSysApps = [] } = useQuery({
    queryKey: ['eggsys-apps'],
    queryFn: () => base44.entities.EggSysApps.list()
  });

  const deleteEggSysAppMutation = useMutation({
    mutationFn: (app) => base44.entities.EggSysApps.delete(app.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eggsys-apps'] });
      toast.success('Official app removed from store');
    }
  });

  const deletePublishedAppMutation = useMutation({
    mutationFn: (app) => base44.entities.PublishedApp.delete(app.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-published-apps'] });
      toast.success('App removed from store');
      setSelectedApp(null);
    }
  });

  const isOwner = currentUser?.email === 'eggtheegget@outlook.com' || ['owner', 'co-owner'].includes(currentUser?.role);
  const isAdmin = !!currentUser && ['admin', 'co-owner', 'owner'].includes(currentUser.role);

  // One unified list: official Theegget Creations apps (non-built-in) first,
  // then community apps. Built-in apps are excluded — they live in Settings.
  const officialApps = eggSysApps
    .filter(app => app.is_builtin === false)
    .map(app => ({ ...app, _official: true, _builtin: false, creator: 'Theegget Creations' }));
  const communityApps = approvedApps.map(app => ({ ...app, _official: false, creator: app.developer_nickname || 'Community' }));
  const storeApps = [...officialApps, ...communityApps];
  const filteredApps = storeApps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Result/error toasts only show in Developer Mode
  const isDevMode = localStorage.getItem('eos_dev_options_enabled') === 'true';

  const installAppMutation = useMutation({
    mutationFn: async (app) => {
      const stored = await offloadReactZip(app);
      await base44.entities.InstalledApp.create({
        name: app.name,
        app_id: app.app_id,
        version: app.version || '1.0.0',
        description: app.description || 'No description',
        icon: app.icon || 'Package',
        color: app.color || 'from-gray-500 to-slate-500',
        html_content: app.html_content || '',
        app_data: { ...stored, license_text: stored?.license_text || stored?.app_data?.license_text || null },
        permissions: {},
        device_id: getDeviceId()
      });
    },
    onSuccess: (_, app) => {
      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      if (isDevMode) toast.success(`${app.name} installed!`);
    }
  });

  const uninstallMutation = useMutation({
    mutationFn: (appId) => base44.entities.InstalledApp.delete(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      if (isDevMode) toast.success('App uninstalled');
    }
  });

  const updateAppMutation = useMutation({
    mutationFn: async ({ app, installedApp }) => {
      const stored = await offloadReactZip(app);
      await base44.entities.InstalledApp.update(installedApp.id, {
        name: app.name,
        version: app.version || '1.0.0',
        description: app.description || 'No description',
        icon: app.icon || 'Package',
        color: app.color || 'from-gray-500 to-slate-500',
        html_content: app.html_content || '',
        app_data: { ...stored, license_text: stored?.license_text || stored?.app_data?.license_text || null }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      if (isDevMode) toast.success('App updated!');
    }
  });

  if (selectedApp) {
    const isOfficialEggSys = '_builtin' in selectedApp;
    const isBuiltIn = !!selectedApp._builtin;
    const isService = selectedApp.app_type === 'service';
    const isInstalled = installedApps.some(a => a.app_id === selectedApp.app_id);
    const installedApp = installedApps.find(a => a.app_id === selectedApp.app_id);
    const Icon = selectedApp.icon || Package;
    const launchTarget = isService && selectedApp.linked_service_id ? selectedApp.linked_service_id : selectedApp.app_id;
    const isOpenable = isService
      ? selectedApp.is_openable === true
      : (LAUNCHABLE_APP_IDS.has(selectedApp.app_id) || selectedApp.is_openable === true);
    const canLaunch = !!onLaunchApp && isOpenable && (isBuiltIn || (isOfficialEggSys && isInstalled) || (isService && !!selectedApp.linked_service_id));
    const isSpotifyApp = selectedApp.app_id === 'spotify-music-podcasts';
    const canUseMusic = currentUser?.admin_role === 'owner' || currentUser?.admin_role === 'co-owner' || !!currentUser?.special_permissions?.music || currentUser?.email === 'eggtheegget@outlook.com' || currentUser?.email === 'eggtheegget@gmail.com';
    const adminOnlyBlocked = !!selectedApp.admin_only_install && !isAdminOrHigher(currentUser);
    const canInstall = !isInstalled && !adminOnlyBlocked && (isService ? true : (isOfficialEggSys ? (!isBuiltIn && isOpenable) : true)) && (!isSpotifyApp || canUseMusic);

    return (
      <AppDetailPage
        app={selectedApp}
        isBuiltIn={isBuiltIn}
        isOfficial={isOfficialEggSys}
        isService={isService}
        isInstalled={isInstalled}
        installedApp={installedApp}
        canLaunch={canLaunch}
        canInstall={canInstall}
        adminOnlyBlocked={adminOnlyBlocked}
        onBack={() => setSelectedApp(null)}
        onLaunch={() => { onLaunchApp(launchTarget); setSelectedApp(null); }}
        onInstall={() => installAppMutation.mutate(selectedApp)}
        onUninstall={async () => uninstallMutation.mutate(installedApp.id)}
        onUpdate={() => updateAppMutation.mutate({ app: selectedApp, installedApp })}
        isAdmin={isAdmin}
        onDelete={isBuiltIn
          ? async () => { if (await confirmAction(`Delete ${selectedApp.name} from the store?`)) deleteEggSysAppMutation.mutate(selectedApp); }
          : async () => { if (await confirmAction(`Delete ${selectedApp.name} from the store? This removes it for all users.`)) deletePublishedAppMutation.mutate(selectedApp); }}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className={`bg-gradient-to-r ${getUserThemeGradient(currentUser, 'from-blue-500 to-purple-600')} border-b p-4`}>
        <h2 className="text-lg font-bold text-white mb-3">App Store</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <Input placeholder="Search apps..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
          {isOwner && (
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Create Official
              </Button>
            </div>
          )}
          <div className="grid gap-3">
            {filteredApps.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No apps found</p>}
            {filteredApps.map(app => {
              const isInstalled = installedApps.some(a => a.app_id === app.app_id);
              const isOfficial = !!app._official;
              const Icon = getEggSysIcon(app.icon);
              return (
                <div key={app.app_id} onClick={() => setSelectedApp(app)} className="bg-white rounded-xl p-4 border active:scale-98 transition-transform">
                  <div className="flex items-center gap-3">
                    {app.icon === 'Spotify' ? (
                      <SpotifyIcon className="w-14 h-14 flex-shrink-0" />
                    ) : (
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center flex-shrink-0`}>
                      {isOfficial ? <Icon className="w-7 h-7 text-white" /> : <Package className="w-7 h-7 text-white" />}
                    </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{app.name}</h3>
                      </div>
                      <p className="text-xs text-gray-400">by {app.creator}</p>
                      <p className="text-xs text-gray-500 truncate">{app.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {!isOfficial && (<><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /><span className="text-xs font-medium">{app.rating}</span></>)}
                        {isInstalled && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Installed</span>}
                        <ContentRatingBadge rating={app.content_rating} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      <EditAppDialog app={null} isOfficial isCreate={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => setCreateOpen(false)} />
    </div>
  );
}