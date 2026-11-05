import React, { useState, useEffect } from 'react';
import { Grid3x3, Search, Clock, Calculator, FileText, Folder, Terminal, Settings, Globe, Package, Sparkles, Download, ListChecks, Lock, User, Code, Battery, BatteryLow, BatteryMedium, BatteryFull, BatteryCharging, Bell, Shield, BarChart3, Laugh, LogOut, Paintbrush, DoorOpen, Phone, Crown } from 'lucide-react';
import PrankDialog from './PrankDialog';
import MusicAppIcon from './MusicAppIcon';
import { useMusicAppMeta, MUSIC_APP_ID } from '@/lib/musicAppMeta';
import ServerPanel from './ServerPanel';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/lib/devToast';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { getActiveServer } from '@/lib/serverContext';

const appIcons = {
  calculator: Calculator,
  editor: FileText,
  files: Folder,
  terminal: Terminal,
  settings: Settings,
  browser: Globe,
  appstore: Package,
  appcreator: Sparkles,
  taskmanager: ListChecks,
  profile: User,
  devconsole: Code,
  admin: Shield,
  devdashboard: BarChart3,
  paint: Paintbrush,
  phone: Phone
};

export default function Taskbar({ 
  runningApps, 
  pinnedApps = [],
  onStartClick, 
  onAppClick,
  onPinnedAppClick,
  activeWindow,
  hasUpdates = false,
  onUpdateClick,
  onLock,
  onPowerOff,
  unreadNotifications = 0,
  onNotificationClick,
  onAdminClick,
  showAdminButton = false,
  adminButtonStyle = 'default',
  hideStartButton = false,
  uiPrefs = {},
  activeCall = null,
  onReopenCall
}) {
  const navigate = useNavigate();
  // Music app branding (Music Player ↔ Spotify) — see src/lib/musicAppMeta.js
  const musicMeta = useMusicAppMeta();
  const [time, setTime] = useState(new Date());
  const [battery, setBattery] = useState({ level: 100, charging: false, supported: false });
  const [showPrankDialog, setShowPrankDialog] = useState(false);
  const [showServerPanel, setShowServerPanel] = useState(false);
  const [isDemoMode] = useState(localStorage.getItem('eos_demo_mode') === 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const systemApps = [
    { id: 'calculator', name: 'Calculator' },
    { id: 'editor', name: 'Text Editor' },
    { id: 'files', name: 'File Explorer' },
    { id: 'terminal', name: 'Terminal' },
    { id: 'settings', name: 'Settings' },
    { id: 'browser', name: 'Browser' },
    { id: 'appstore', name: 'App Store' },
    { id: 'appcreator', name: 'App Creator' },
    { id: 'taskmanager', name: 'Task Manager' },
    { id: 'ecloud', name: 'ECloud' },
    { id: 'devdashboard', name: 'Dev Dashboard' },
    { id: 'devconsole', name: 'Dev Console' },
    { id: 'eafinstaller', name: 'EAF Installer' },
    { id: 'phone', name: 'Phone' },
  ];

  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed-apps-taskbar'],
    queryFn: () => base44.entities.InstalledApp.list()
  });

  const { data: user } = useQuery({
    queryKey: ['current-user-taskbar'],
    queryFn: () => base44.auth.me()
  });

  const { data: activeServer } = useQuery({
    queryKey: ['active-server'],
    queryFn: () => getActiveServer()
  });

  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const sysMatches = systemApps.filter(a => a.name.toLowerCase().includes(q));
    const installedMatches = installedApps.filter(a => a.name.toLowerCase().includes(q)).map(a => ({ id: a.app_id, name: a.name }));
    return [...sysMatches, ...installedMatches].slice(0, 6);
  };

  const searchResults = getSearchResults();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(bat => {
        const updateBattery = () => {
          const newLevel = Math.round(bat.level * 100);
          const newCharging = bat.charging;
          
          setBattery({
            level: newLevel,
            charging: newCharging,
            supported: true
          });
          
          // Show low battery warning
          if (newLevel <= 20 && !newCharging) {
            toast.error(`Low Battery: ${newLevel}%`, {
              description: 'Please connect your charger',
              duration: 5000
            });
          }
        };
        updateBattery();
        bat.addEventListener('levelchange', updateBattery);
        bat.addEventListener('chargingchange', updateBattery);
        return () => {
          bat.removeEventListener('levelchange', updateBattery);
          bat.removeEventListener('chargingchange', updateBattery);
        };
      });
    }
  }, []);

  const getBatteryIcon = () => {
    if (battery.charging) return BatteryCharging;
    if (battery.level <= 20) return BatteryLow;
    if (battery.level <= 50) return BatteryMedium;
    return BatteryFull;
  };

  const BatteryIcon = getBatteryIcon();

  const getPinnedAppInfo = (appId) => {
    // The music app carries its own live name/icon (Music Player ↔ Spotify).
    if (appId === MUSIC_APP_ID) {
      return { id: appId, name: musicMeta.name, icon: MusicAppIcon };
    }
    // Check if it's a system app
    const names = {
      calculator: 'Calculator',
      editor: 'Text Editor',
      files: 'File Explorer',
      terminal: 'Terminal',
      settings: 'Settings',
      browser: 'Browser',
      appstore: 'App Store',
      appcreator: 'App Creator',
      admin: 'Admin',
      devdashboard: 'Dev Dashboard',
      phone: 'Phone'
    };
    
    if (appIcons[appId]) {
      return {
        id: appId,
        name: names[appId] || appId,
        icon: appIcons[appId]
      };
    }
    
    // Check if it's an installed app
    const installedApp = installedApps.find(app => app.app_id === appId);
    if (installedApp) {
      return {
        id: appId,
        name: installedApp.name,
        icon: Package
      };
    }
    
    return {
      id: appId,
      name: appId,
      icon: Package
    };
  };

  const taskbarPosition = uiPrefs.taskbar_position || 'bottom';
  const transparency = uiPrefs.transparency !== false;
  const fontSize = uiPrefs.font_size || 'medium';
  const cornerRadius = uiPrefs.corner_radius || 'rounded';
  
  const positionClass = taskbarPosition === 'top' ? 'top-0' : 'bottom-0';
  const borderClass = taskbarPosition === 'top' ? 'border-b' : 'border-t';
  const bgClass = transparency ? 'bg-gray-900/80 backdrop-blur-xl' : 'bg-gray-900';
  const fontSizeClass = fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm';
  const cornerRadiusClass = cornerRadius === 'sharp' ? 'rounded-none' : cornerRadius === 'very_rounded' ? 'rounded-2xl' : 'rounded-lg';

  return (
    <div className={`fixed ${positionClass} left-0 right-0 h-12 ${bgClass} ${borderClass} border-white/10 flex items-center justify-between px-4 z-50`}>
      {/* Start Button */}
      {!hideStartButton && (
        <button
          onClick={onStartClick}
          className={`w-10 h-10 ${cornerRadiusClass} bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex items-center justify-center transition-all hover:scale-105 shadow-lg`}
        >
          <img 
            src="https://media.base44.com/images/public/6946b759fb67abb9152e7314/c697387e9_file_000000006d3481f5be81064990edc01f.png" 
            alt="EggetSystem" 
            className="w-6 h-6 object-contain"
          />
        </button>
      )}

      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-4 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
            onFocus={() => setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
            placeholder="Search EggetSystem..."
            className={`w-full h-9 ${transparency ? 'bg-white/10 backdrop-blur-sm' : 'bg-white/20'} ${cornerRadiusClass} pl-10 pr-4 ${fontSizeClass} text-white placeholder-gray-400 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
          />
        </div>
        {showSearchResults && searchResults.length > 0 && (
          <div className={`absolute bottom-full mb-2 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border border-white/10 ${cornerRadiusClass} shadow-2xl overflow-hidden z-[999]`}>
            {searchResults.map((app) => {
              const Icon = appIcons[app.id] || Package;
              return (
                <button
                  key={app.id}
                  onMouseDown={() => {
                    onPinnedAppClick(app.id);
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-white text-left"
                >
                  <Icon className="w-4 h-4 text-blue-400" />
                  <span className={fontSizeClass}>{app.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pinned & Running Apps */}
      <div className="flex items-center gap-2 flex-1">
        {/* Pinned Apps */}
        {pinnedApps.map((appId) => {
          const app = getPinnedAppInfo(appId);
          const isRunning = runningApps.find(r => r.appId === appId);
          const Icon = app.icon;
          
          return (
            <button
              key={`pinned-${appId}`}
              onClick={() => isRunning ? onAppClick(isRunning.id) : onPinnedAppClick(appId)}
              className={cn(
                `h-10 px-3 ${cornerRadiusClass} flex items-center gap-2 transition-all relative`,
                isRunning && activeWindow === isRunning.id
                  ? "bg-white/20 border border-white/30"
                  : "bg-white/5 hover:bg-white/10 border border-white/5"
              )}
              title={app.name}
            >
              <Icon className="w-4 h-4 text-white" />
              {isRunning && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
              )}
            </button>
          );
        })}
        
        {/* Running Apps (not pinned) */}
        {runningApps.filter(app => !pinnedApps.includes(app.appId)).map((app) => (
          <button
            key={app.id}
            onClick={() => onAppClick(app.id)}
            className={cn(
              `h-10 px-4 ${cornerRadiusClass} flex items-center gap-2 transition-all`,
              activeWindow === app.id
                ? "bg-white/20 border border-white/30"
                : "bg-white/5 hover:bg-white/10 border border-white/5"
            )}
          >
            <app.icon className="w-4 h-4 text-white" />
            <span className={`${fontSizeClass} text-white`}>{app.title}</span>
          </button>
        ))}
      </div>

      {/* Active Call Pill */}
      {activeCall && onReopenCall && (
        <button
          onClick={onReopenCall}
          className="flex items-center gap-2 px-3 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white text-xs font-semibold animate-pulse transition-all"
          title="Return to call"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Active Call</span>
        </button>
      )}

      {/* System Tray */}
      <div className="flex items-center gap-2">
        {activeServer && (
          <button
            onClick={() => setShowServerPanel(true)}
            className={`relative w-10 h-10 ${cornerRadiusClass} bg-gradient-to-br from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 border border-white/10 flex items-center justify-center transition-all hover:scale-105 shadow-lg`}
            title="Run your server"
          >
            <Crown className="w-5 h-5 text-white" />
          </button>
        )}
        {showAdminButton && (
          <button
            onClick={onAdminClick}
            className={`relative w-10 h-10 ${cornerRadiusClass} bg-black hover:bg-gray-900 border border-white/20 flex items-center justify-center transition-all hover:scale-105 shadow-lg`}
            title="Admin Panel"
          >
            <Shield className="w-5 h-5 text-orange-500" />
          </button>
        )}
        {isDemoMode && (
          <button
            onClick={() => {
              localStorage.removeItem('eos_demo_mode');
              toast.success('Exiting demo mode...');
              setTimeout(() => window.location.reload(), 500);
            }}
            className={`relative w-10 h-10 ${cornerRadiusClass} bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 border border-white/10 flex items-center justify-center transition-all hover:scale-105`}
            title="Exit Demo Mode"
          >
            <LogOut className="w-4 h-4 text-white" />
          </button>
        )}
        {user?.is_prankster && (
          <button
            onClick={() => setShowPrankDialog(true)}
            className={`relative w-10 h-10 ${cornerRadiusClass} bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border border-white/10 flex items-center justify-center transition-all hover:scale-105`}
            title="Send Prank"
          >
            <Laugh className="w-4 h-4 text-white" />
          </button>
        )}
        <button
          onClick={onNotificationClick}
          className={`relative w-10 h-10 ${cornerRadiusClass} bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all hover:scale-105`}
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-white" />
          {unreadNotifications > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </div>
          )}
        </button>
        {battery.supported && (
          <div 
            className="flex items-center gap-1 px-2 text-white text-xs"
            title={`Battery: ${battery.level}%${battery.charging ? ' (Charging)' : ''}`}
          >
            <BatteryIcon className={cn(
              "w-4 h-4",
              battery.level <= 20 && !battery.charging && "text-red-400",
              battery.charging && "text-green-400"
            )} />
            <span>{battery.level}%</span>
          </div>
        )}
        <button
           onClick={() => navigate('/')}
           className={`w-10 h-10 ${cornerRadiusClass} bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border border-white/10 flex items-center justify-center transition-all hover:scale-105`}
           title="Go to SelectOS"
         >
           <DoorOpen className="w-4 h-4 text-white" />
         </button>
        <button
           onClick={onLock}
           className={`w-10 h-10 ${cornerRadiusClass} bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all hover:scale-105`}
           title="Lock screen"
         >
           <Lock className="w-4 h-4 text-white" />
         </button>
        <div className={`flex items-center gap-2 text-white ${fontSizeClass} pl-2`}>
          <Clock className="w-4 h-4" />
          <span>{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <PrankDialog
        isOpen={showPrankDialog}
        onClose={() => setShowPrankDialog(false)}
      />

      <ServerPanel
        isOpen={showServerPanel}
        onClose={() => setShowServerPanel(false)}
      />
    </div>
  );
}