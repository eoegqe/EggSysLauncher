import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calculator, FileText, Folder, Settings, Globe, Package, ListChecks, Shield, X, Bell, Lock, Power, RotateCw, Mail, Check, AlertTriangle, Info, Download, Trash2, Home, MessageCircle, RefreshCw, Crown, Phone, Contact, Camera, ShoppingCart, Sparkles, Code, Music, SquareStack,   Terminal, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import CommunicationSuspensionNotice from '../components/os/CommunicationSuspensionNotice';
import { safeNotify } from '../lib/safeNotify';
import { playNotificationSound } from '../lib/notificationSound';

import { motion, AnimatePresence } from 'framer-motion';
import GlobalCallMonitor from '../components/os/mobile/GlobalCallMonitor';
import TestIncomingCallSimulator from '../components/os/mobile/TestIncomingCallSimulator';
import ScheduledTextSimulator from '../components/os/mobile/ScheduledTextSimulator';
import ControlCenter from '../components/os/mobile/ControlCenter';
import { WifiNetworkError, MobileDataError } from '../components/os/mobile/NetworkErrorScreen';
import NotificationCenter from '../components/os/mobile/NotificationCenter';
import NotificationToast from '../components/os/mobile/NotificationToast';
import MobileBootScreen from '../components/os/mobile/MobileBootScreen';
import BiosBootMenu from '../components/os/mobile/BiosBootMenu';
import CustomBootScreen from '../components/os/mobile/CustomBootScreen';
import { getActiveOS } from '@/lib/customOSStorage';
import { resolveDarkMode, setStoredDarkMode, DARK_MODE_EVENT } from '@/lib/darkMode';

// Home-screen column classes for a custom OS's layout.grid_columns (Tailwind
// only keeps classes written out literally).
const HOME_GRID_COLS = { 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8' };
import MobileLockScreen from '../components/os/mobile/MobileLockScreen';
import MobileSetup from '../components/os/mobile/MobileSetup';
import MobileRecovery from '../components/os/mobile/MobileRecovery';
import MobileBanScreen from '../components/os/mobile/MobileBanScreen';
import UsernameSetup from '../components/os/UsernameSetup';
import AdminPanel from '../components/os/AdminPanel';
import UpdateManagerApp, { setPendingUpdate } from '../components/os/apps/mobile/UpdateManagerApp';
import HomeScreenWidgets from '../components/os/mobile/HomeScreenWidgets';
import StatusBar from '../components/os/mobile/StatusBar';
import ServerPanel from '../components/os/ServerPanel';
import { getActiveServer } from '../lib/serverContext';
import MaintenanceScreen from '../components/MaintenanceScreen';
import TempClose from './TempClose';
import BrickedScreen from '../components/os/BrickedScreen';
import AppCrashScreen from '../components/os/AppCrashScreen';
import { getAppServiceCrash } from '../lib/appServiceLink';
import { buildEggSysUserInfo } from '@/lib/eggSysUserInfo';
import { getHomeScreenBackground } from '@/lib/themeUtils';
import { getWallpaperGradient } from '@/lib/sysFileFormat';
import { readBootState, writeBootState, isFullyBootedUnlocked, markUnlockedThisSession, markLockedThisSession } from '@/lib/bootState';
import { missingRequiredSystemFiles } from '@/lib/systemFiles';
import { fetchEAccount } from '@/lib/eaccountSync';
import EggSysWord from '../components/os/EggSysWord';
import KidsModeBar from '../components/os/mobile/KidsModeBar';
import KidsParentalControls from '../components/os/mobile/KidsParentalControls';
import { isKidsModeEnabled, setKidsModeEnabled, hasKidsPin, getKidsUsername, KIDS_APP_IDS } from '@/lib/kidsMode';
import { isGuestSetupComplete, getGuestSetup } from '@/lib/guestSetup';

// Import app components
import CalculatorApp from '../components/os/apps/Calculator';
import TextEditor from '../components/os/apps/TextEditor';
import SettingsApp from '../components/os/apps/Settings';

import AppStore from '../components/os/apps/AppStore';
import AppCreator from '../components/os/apps/AppCreator';
import TaskManager from '../components/os/apps/TaskManager';
import MobileFilesApp from '../components/os/apps/mobile/MobileFilesApp';
import AdminApp from '../components/os/apps/AdminApp';
import MobileSettings from '../components/os/apps/mobile/MobileSettings';
import TCAccountPrompt from '../components/os/mobile/TCAccountPrompt';
import GuestEAccountPrompt from '../components/os/mobile/GuestEAccountPrompt';
import MobileAppStore from '../components/os/apps/mobile/MobileAppStore';
import MobileDevApp from '../components/os/apps/mobile/MobileDevApp';
import MobileTaskManager from '../components/os/apps/mobile/MobileTaskManager';
import EggMailApp from '../components/os/apps/EggMailApp';
import MobileMessages from '../components/os/apps/mobile/MobileMessages';
import SupportInbox from '../components/os/apps/mobile/SupportInbox';
import MobilePhone from '../components/os/apps/mobile/MobilePhone';
import MobileContacts from '../components/os/apps/mobile/MobileContacts';
import MobileCamera from '../components/os/apps/mobile/MobileCamera';
import MobilePhotos from '../components/os/apps/mobile/MobilePhotos';
import PiPLayer from '../components/os/mobile/PiPLayer';
import EggSysKeyboard from '../components/os/mobile/EggSysKeyboard';
import VRViewer from '../components/os/VRViewer';
import MusicPlayer from '../components/os/apps/MusicPlayer';
import SpotifyIcon from '../components/os/SpotifyIcon';
import Base44EditorIcon from '../components/os/Base44EditorIcon';
import EditorApp from '../components/os/apps/EditorApp';
import { InstalledAppIcon, HoldableButton } from '../components/os/mobile/MobileHomeIcons';
import AppFrame from '../components/os/AppFrame';
import PermissionPrompt from '../components/os/PermissionPrompt';
import AppView from '../components/os/mobile/AppView';
import TabletSidebar from '../components/os/mobile/TabletSidebar';
import MusicPlayerLayer from '../components/os/mobile/MusicPlayerLayer';
import RecentAppsOverlay from '../components/os/mobile/RecentAppsOverlay';
import SystemNavBar from '../components/os/mobile/SystemNavBar';
import { LandscapeWarning } from '../components/os/mobile/OrientationScreens';
import PowerOffOverlay from '../components/os/mobile/PowerOffOverlay';
import NotifPermissionPrompt from '../components/os/mobile/NotifPermissionPrompt';
import PCSandbox from '../components/os/mobile/PCSandbox';
import InstalledAppContextMenu from '../components/os/mobile/InstalledAppContextMenu';
import BuiltinAppContextMenu from '../components/os/mobile/BuiltinAppContextMenu';
import { wifiAppIds, mobileDataAppIds } from '@/lib/mobileAppConfigs';
import { confirmAction } from '@/components/os/ConfirmDialog';
import TerminalApp from '../components/os/apps/Terminal';
import { getDeviceId, appBelongsToDevice } from '@/lib/deviceId';
import { getApprovalState } from '@/lib/deviceApproval';
import DeviceApprovalScreen from '../components/os/mobile/DeviceApprovalScreen';
import { useRemoteActions } from '../hooks/useRemoteActions';
import { useMusicAppMeta } from '@/lib/musicAppMeta';
import MusicAppIcon from '@/components/os/MusicAppIcon';

// Synthesized user for unauthenticated visitors so the mobile OS boots
// without forcing sign-in. Account-bound features stay gated.
const GUEST_USER = {
  _guest: true,
  email: null,
  username: null,
  full_name: 'Guest',
  role: 'user',
  admin_role: null,
};

const appConfigs = {
  calculator: { title: 'Calculator', icon: Calculator, component: CalculatorApp, color: 'from-blue-500 to-blue-600' },
  editor: { title: 'Text Editor', icon: FileText, component: TextEditor, color: 'from-green-500 to-emerald-600' },
  files: { title: 'Files', icon: Folder, component: MobileFilesApp, color: 'from-sky-500 to-blue-600' },
  settings: { title: 'Settings', icon: Settings, component: MobileSettings, color: 'from-purple-500 to-purple-600' },

  appstore: { title: 'App Store', icon: ShoppingCart, component: MobileAppStore, color: 'from-pink-500 to-rose-500' },
  dev: { title: 'Dev', icon: Code, component: MobileDevApp, color: 'from-indigo-500 to-purple-600' },
  eggmail: { title: 'EggMail', icon: Mail, component: EggMailApp, color: 'from-blue-500 to-indigo-600' },

  taskmanager: { title: 'Task Manager', icon: ListChecks, component: MobileTaskManager, color: 'from-teal-500 to-cyan-600' },
  messages: { title: 'Messages', icon: MessageCircle, component: MobileMessages, color: 'from-green-500 to-teal-600' },
  phone: { title: 'Phone', icon: Phone, component: MobilePhone, color: 'from-green-500 to-emerald-600' },
  contacts: { title: 'Contacts', icon: Contact, component: MobileContacts, color: 'from-indigo-500 to-purple-600' },
  camera: { title: 'Camera', icon: Camera, component: MobileCamera, color: 'from-gray-700 to-gray-900' },
  photos: { title: 'Photos', icon: Images, component: MobilePhotos, color: 'from-fuchsia-500 to-purple-600' },
  // Music app defaults to the EggetSystem Music Player; when Spotify is powered
  // on, its name/icon/color are swapped in at render time (see musicAppMeta).
  music: { title: 'Music Player', icon: Music, component: MusicPlayer, color: 'from-green-500 to-teal-500' },
  base44editor: { title: 'Base44 Editor', icon: Base44EditorIcon, component: EditorApp, color: 'from-indigo-500 to-blue-700', ownerOnly: true },
  admin: { title: 'Admin', icon: Shield, component: AdminApp, color: 'from-red-600 to-orange-600', adminOnly: true },
  'eggsys-os': { title: 'EggSys OS', icon: RefreshCw, component: UpdateManagerApp, color: 'from-blue-500 to-cyan-600' },
  terminal: { title: 'Terminal', icon: Terminal, component: TerminalApp, color: 'from-zinc-700 to-zinc-900' },
};



// Apps available in Lite mode — a stripped-down mobile experience.
const LITE_APP_IDS = ['phone', 'messages', 'settings', 'appstore', 'editor', 'music'];

export default function MobileOS({ betaMode = false, kidsMode: kidsModeProp = false } = {}) {
  const liteMode = new URLSearchParams(window.location.search).get('lite') === '1';
  // Kids Mode can be enabled via the dedicated Kids build (prop) or toggled on
  // locally by a parent (persists across sessions on this device).
  const [kidsMode, setKidsMode] = useState(kidsModeProp || isKidsModeEnabled());
  const [showKidsControls, setShowKidsControls] = useState(false);
  useRemoteActions();
  useEffect(() => {
    const requestFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.log('Fullscreen request failed:', error);
      }
    };
    requestFullscreen();
  }, []);

  const [currentApp, setCurrentApp] = useState(null);
  const [recentApps, setRecentApps] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const [musicOpened, setMusicOpened] = useState(false); // Music Player stays mounted in the background once opened
  const [testIncomingActive, setTestIncomingActive] = useState(false);
  const [testCallerId, setTestCallerId] = useState('');

  // Owner-only test incoming call: Phone app dispatches this event; we return
  // to the home screen and let the simulator show a delayed call notification.
  useEffect(() => {
    const handler = (e) => {
      setCurrentApp(null);
      setTestCallerId(e?.detail?.callerId || '');
      setTestIncomingActive(true);
    };
    window.addEventListener('eos_test_incoming_call', handler);
    return () => window.removeEventListener('eos_test_incoming_call', handler);
  }, []);

  // Opening signin.eaf from the Files app requests the lock screen.
  useEffect(() => {
    const onLock = () => { markLockedThisSession(); setIsLocked(true); };
    window.addEventListener('eggsys_request_lock', onLock);
    return () => window.removeEventListener('eggsys_request_lock', onLock);
  }, []);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [showBios, setShowBios] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryReason, setRecoveryReason] = useState('');
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [showDeviceApproval, setShowDeviceApproval] = useState(false);
  const [deviceApprovalOthers, setDeviceApprovalOthers] = useState([]);
  const [isTablet, setIsTablet] = useState(localStorage.getItem('eos_is_tablet') === 'true');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showUpdateManager, setShowUpdateManager] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [appContextMenu, setAppContextMenu] = useState(null); // { app } or null
  const [builtinContextMenu, setBuiltinContextMenu] = useState(null); // { id, config } or null
  const [guestDisabledBuiltins, setGuestDisabledBuiltins] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eos_disabled_builtins') || '[]'); } catch { return []; }
  });
  const [vrApp, setVrApp] = useState(null);
  const [poweringOff, setPoweringOff] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [banBypassed, setBanBypassed] = useState(false);
  const [displayedNotifications, setDisplayedNotifications] = useState([]);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [activeCallForStatusBar, setActiveCallForStatusBar] = useState(null);
  const [showServerPanel, setShowServerPanel] = useState(false);
  const [testNotifCountdown, setTestNotifCountdown] = useState(null);
  const [showTestOptions, setShowTestOptions] = useState(false);
  const [showScheduleText, setShowScheduleText] = useState(false);
  const [showControlCenter, setShowControlCenter] = useState(false);
  const [showPCSandbox, setShowPCSandbox] = useState(false);
  const [accountMode, setAccountMode] = useState(() => localStorage.getItem('eos_account_mode') === 'support' ? 'support' : 'personal');
  const [wifiEnabled, setWifiEnabled] = useState(() => localStorage.getItem('eos_wifi_enabled') !== 'false');
  const [mobileDataEnabled, setMobileDataEnabled] = useState(() => localStorage.getItem('eos_mobile_data_enabled') !== 'false');
  // Dark mode for the shell: the device choice, else the active OS's theme.
  const [darkMode, setDarkMode] = useState(() => resolveDarkMode(getActiveOS()));
  useEffect(() => {
    const onChange = () => {
      const stored = localStorage.getItem('eos_dark_mode');
      if (stored !== null) setDarkMode(stored === '1');
    };
    window.addEventListener(DARK_MODE_EVENT, onChange);
    return () => window.removeEventListener(DARK_MODE_EVENT, onChange);
  }, []);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [authGrace, setAuthGrace] = useState(true);
  const [prebootResolved, setPrebootResolved] = useState(() => sessionStorage.getItem('eos_preboot_guest') === 'true');
  const [authLoadTimedOut, setAuthLoadTimedOut] = useState(false);
  const testNotifTimer = React.useRef(null);
  const toastedNotifIdsRef = React.useRef(new Set());
  const [battery, setBattery] = useState(null);
  const lowBatteryNotifiedRef = React.useRef(false);

  // Low battery notification — fire a toast once when the battery drops to
  // 20% or below while unplugged, and re-arm when it recovers or is charging.
  useEffect(() => {
    let b;
    const update = () => {
      const level = Math.round(b.level * 100);
      const charging = b.charging;
      setBattery({ level, charging });
      if (charging || level > 20) {
        lowBatteryNotifiedRef.current = false;
        setDisplayedNotifications(prev => prev.filter(d => d.id !== 'low-battery'));
      } else if (level <= 20 && !lowBatteryNotifiedRef.current) {
        lowBatteryNotifiedRef.current = true;
        const toastNotif = {
          id: 'low-battery',
          title: 'Low Battery',
          content: `Battery at ${level}%. Connect your charger to keep using EggetSystem.`,
          notifType: 'warning',
          isLowBattery: true
        };
        setDisplayedNotifications(prev => [...prev, toastNotif]);
        safeNotify(toastNotif.title, { body: toastNotif.content, tag: 'low-battery', requireInteraction: false });
        setTimeout(() => setDisplayedNotifications(prev => prev.filter(d => d.id !== 'low-battery')), 6000);
      }
    };
    (async () => {
      try {
        b = await navigator.getBattery?.();
        if (!b) return;
        b.addEventListener('levelchange', update);
        b.addEventListener('chargingchange', update);
        update();
      } catch {}
    })();
    return () => {
      if (b) {
        b.removeEventListener('levelchange', update);
        b.removeEventListener('chargingchange', update);
      }
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setAuthGrace(false), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const { data: activeServer } = useQuery({
    queryKey: ['active-server-mobile'],
    queryFn: () => getActiveServer()
  });

  const queryClient = useQueryClient();

  const { data: rawUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['current-user-mobile'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      const isDemoMode = localStorage.getItem('eos_demo_mode') === 'true';
      if (isDemoMode && (userData.admin_role || userData.role === 'admin')) {
        return { ...userData, admin_role: null, role: 'user', _demo_mode: true };
      }
      return userData;
    },
    retry: false,
    staleTime: 60000,
    refetchInterval: (query) => (query.state.error ? false : 60000)
  });

  // Death-circle guard: if the session query hangs (e.g. expired token from a
  // ban period), break out after 10s and fall back to guest mode so the user is
  // never permanently stuck on the black loading spinner.
  useEffect(() => {
    if (!isLoadingUser || authLoadTimedOut) return;
    const t = setTimeout(() => setAuthLoadTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [isLoadingUser, authLoadTimedOut]);

  // Fall back to a guest user when no authenticated session exists so the
  // mobile OS boots without a sign-in wall. Account-bound features are gated.
  const baseUser = rawUser || (isLoadingUser && !authLoadTimedOut ? null : GUEST_USER);
  // In Kids Mode the child operates under a restricted profile with no
  // admin/owner/special powers, so they can't change anything on the parent's
  // account. The kid gets their own username (set in Parental Controls) so
  // they act as themselves; the parent's email is kept only for data queries.
  const kidsUsername = getKidsUsername();
  const user = kidsMode && baseUser && !baseUser._guest
    ? { ...baseUser, username: kidsUsername || baseUser.username, full_name: kidsUsername || baseUser.full_name, admin_role: null, role: 'user', special_permissions: {}, 'admin?': undefined, _kids_profile: true }
    : baseUser?._guest
      ? { ...baseUser, ...getGuestSetup() }
      : baseUser;

  // "No service" notification dispatched by Phone/Messages when mobile data is off
  useEffect(() => {
    const handler = async (e) => {
      const appName = e?.detail?.app || 'EggetSystem';
      const notif = {
        id: `no-service-${Date.now()}`,
        title: `${appName}: No service`,
        content: 'Mobile data is turned off'
      };
      setDisplayedNotifications(prev => [...prev, notif]);
      safeNotify(notif.title, { body: notif.content, tag: notif.id });
      setTimeout(() => {
        setDisplayedNotifications(prev => prev.filter(d => d.id !== notif.id));
      }, 4000);
      if (user?.username) {
        try {
          await base44.entities.Notification.create({
            title: `${appName}: No service`,
            message: 'Mobile data is turned off',
            recipient_username: user.username,
            type: 'warning',
            read: false
          });
          queryClient.invalidateQueries({ queryKey: ['system-notifs-mobile'] });
        } catch {}
      }
    };
    window.addEventListener('eos_no_service', handler);
    return () => window.removeEventListener('eos_no_service', handler);
  }, [user?.username]);

  // "Connection lost" notification when a network-dependent app is blocked by being offline
  useEffect(() => {
    if (isOnline || !currentApp) return;
    if (!wifiAppIds.includes(currentApp.id) && !mobileDataAppIds.includes(currentApp.id)) return;
    const notif = {
      id: `connection-lost-${Date.now()}`,
      title: 'Connection lost',
      content: 'You are offline'
    };
    setDisplayedNotifications(prev => [...prev, notif]);
    safeNotify(notif.title, { body: notif.content, tag: notif.id });
    const timer = setTimeout(() => {
      setDisplayedNotifications(prev => prev.filter(d => d.id !== notif.id));
    }, 4000);
    return () => clearTimeout(timer);
  }, [isOnline, currentApp?.id]);

  const { data: systemMaintenance } = useQuery({
    queryKey: ['system-maintenance-mobile'],
    queryFn: async () => {
      const records = await base44.entities.SystemMaintenance.list();
      return records[0] || null;
    },
    staleTime: 30000,
    refetchInterval: 60000
  });

  // Check orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Lightweight heartbeat: update last_seen every 5 minutes (no screenshot)
  useEffect(() => {
    const updateLastSeen = () => {
      base44.auth.updateMe({ last_seen: new Date().toISOString() }).catch(() => {});
    };
    const interval = setInterval(updateLastSeen, 300000);
    return () => clearInterval(interval);
  }, []);

  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed-apps-mobile'],
    queryFn: async () => {
      const { getGuestInstalledApps, setGuestInstalledApps } = await import('@/lib/guestBackup');
      if (user?._guest) {
        // Guests: localStorage only
        return getGuestInstalledApps().map((a) => ({ ...a, id: a.app_id }));
      }
      // Signed-in: try backend, fall back to localStorage cache if offline
      try {
        const list = await base44.entities.InstalledApp.list('-created_date');
        return list;
      } catch (err) {
        return getGuestInstalledApps().map((a) => ({ ...a, id: a.app_id }));
      }
    },
    enabled: !!user,
    refetchInterval: false,
    staleTime: 60000
  });

  const { data: eggSysApps = [] } = useQuery({
    queryKey: ['eggsys-apps-mobile'],
    queryFn: () => base44.entities.EggSysApps.list(),
    staleTime: 60000
  });

  const { data: eAccount } = useQuery({
    queryKey: ['eaccount-mobile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      return await fetchEAccount(user, base44);
    },
    enabled: !!user?.email,
    staleTime: 30000
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-mobile'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: 60000
  });

  const { data: messages = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications-mobile'],
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
    staleTime: 60000,
    refetchInterval: false
  });

  // Incoming chat messages (UserMessage) — shown as tappable toasts that open the chat
  const toastedChatIds = React.useRef(new Set());
  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chat-notifs-mobile', user?.username],
    queryFn: async () => {
      if (!user?.username) return [];
      return await base44.entities.UserMessage.filter({ recipient_username: user.username, read: false }, '-created_date', 20);
    },
    enabled: !!user?.username,
    staleTime: 30000,
    refetchInterval: 60000
  });

  useEffect(() => {
    if (!chatMessages.length) return;
    // Don't show chat toasts while the Messages app is open (it handles its own toasts)
    if (currentApp?.id === 'messages') return;
    chatMessages.forEach(msg => {
      if (toastedChatIds.current.has(msg.id)) return;
      const ageMs = Date.now() - new Date(msg.created_date).getTime();
      toastedChatIds.current.add(msg.id);
      // Skip old unread messages (e.g. on first load) — only toast fresh ones
      if (ageMs > 60000) return;
      const toastNotif = {
        id: `chat-${msg.id}`,
        title: `Message from @${msg.sender_username}`,
        content: msg.content,
        isChat: true,
        chatUsername: msg.sender_username
      };
      setDisplayedNotifications(prev => [...prev, toastNotif]);
      safeNotify(toastNotif.title, { body: msg.content });
      setTimeout(() => {
        setDisplayedNotifications(prev => prev.filter(d => d.id !== toastNotif.id));
      }, 6000);
    });
  }, [chatMessages, currentApp?.id]);

  // Incoming support replies (SupportMessage) — shown as purple toasts
  const toastedSupportIds = React.useRef(new Set());
  const { data: supportReplies = [] } = useQuery({
    queryKey: ['support-replies-mobile', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.SupportMessage.filter({ user_email: user.email, from_support: true, read: false }, '-created_date', 20);
    },
    enabled: !!user?.email,
    staleTime: 30000,
    refetchInterval: 60000
  });

  useEffect(() => {
    if (!supportReplies.length) return;
    supportReplies.forEach(msg => {
      if (toastedSupportIds.current.has(msg.id)) return;
      const ageMs = Date.now() - new Date(msg.created_date).getTime();
      toastedSupportIds.current.add(msg.id);
      if (ageMs > 60000) return;
      const toastNotif = {
        id: `support-${msg.id}`,
        title: 'EggetSystem Tech Support',
        content: 'You have a reply from EggetSystem tech support',
        isSupport: true
      };
      setDisplayedNotifications(prev => [...prev, toastNotif]);
      safeNotify(toastNotif.title, { body: toastNotif.content });
      setTimeout(() => {
        setDisplayedNotifications(prev => prev.filter(d => d.id !== toastNotif.id));
      }, 6000);
    });
  }, [supportReplies]);

  const { data: systemNotifs = [], refetch: refetchSystemNotifs } = useQuery({
    queryKey: ['system-notifs-mobile', user?.username],
    queryFn: async () => {
      if (!user?.username) return [];
      return await base44.entities.Notification.filter({ recipient_username: user.username }, '-created_date');
    },
    enabled: !!user?.username,
    staleTime: 60000,
    refetchInterval: 60000
  });

  // Play the notification chime when a new unread notification arrives.
  const prevUnreadNotifIds = useRef(new Set());
  useEffect(() => {
    if (!systemNotifs || !systemNotifs.length) return;
    const unread = systemNotifs.filter(n => !n.read);
    const currentIds = new Set(unread.map(n => n.id));
    if (prevUnreadNotifIds.current.size > 0) {
      for (const id of currentIds) {
        if (!prevUnreadNotifIds.current.has(id)) {
          playNotificationSound();
          break;
        }
      }
    }
    prevUnreadNotifIds.current = currentIds;
  }, [systemNotifs]);

  // Real-time subscriptions: invalidate query cache on entity changes instead of polling.
  useEffect(() => {
    if (!user) return;
    const unsubs = [
      base44.entities.InstalledApp.subscribe(() => queryClient.invalidateQueries({ queryKey: ['installed-apps-mobile'] })),
      // Only traffic involving this user refreshes its badge queries — an
      // app-wide message would otherwise cost a list call here every time.
      base44.entities.UserMessage.subscribe((event) => {
        const m = event.data;
        if (!m) return;
        if (m.recipient_username === user.username || m.sender_username === user.username) {
          queryClient.invalidateQueries({ queryKey: ['chat-notifs-mobile'] });
        }
      }),
      base44.entities.SupportMessage.subscribe((event) => {
        if (event.data?.user_email === user.email) {
          queryClient.invalidateQueries({ queryKey: ['support-replies-mobile'] });
        }
      }),
      base44.entities.Notification.subscribe(() => queryClient.invalidateQueries({ queryKey: ['system-notifs-mobile'] })),
      base44.entities.Message.subscribe(() => queryClient.invalidateQueries({ queryKey: ['notifications-mobile'] })),
    ];
    return () => unsubs.forEach(u => u && u());
  }, [user, queryClient]);

  const { data: availableUpdates = [], refetch: refetchUpdates } = useQuery({
    queryKey: ['available-updates-mobile'],
    queryFn: async () => {
      const updates = await base44.entities.OSUpdate.list('-created_date');
      const currentVersion = user?.os_version || '1.0.0';
      const dismissed = user?.dismissed_updates || [];
      
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
      
      return updates.filter(u => 
        u.is_published && 
        compareVersions(u.version, currentVersion) > 0 &&
        !dismissed.includes(u.version)
      );
    },
    enabled: !!user,
    refetchInterval: 500000
  });

  // Build synthetic update notifications
  const updateNotifications = availableUpdates.map(u => ({
    id: `update-${u.id}`,
    _entity: 'OSUpdate',
    _update: u,
    title: `EggetSystem ${u.version} Available`,
    content: `${u.title} — ${u.description}${u.size_mb ? ` (${u.size_mb} MB)` : ''}`,
    message_type: 'system',
    read: false,
    created_date: u.release_date || u.created_date,
    priority: u.priority
  }));

  // EggSys OS disabled warning — permanent, undeletable red notification pinned to top
  const eggSysOSService = eggSysApps.find(a => a.app_type === 'service' && a.name === 'EggSys OS');
  const eggSysOSDisabled = !!eggSysOSService && (user?.disabled_services || []).includes(eggSysOSService.app_id);

  const handleReenableEggSysOS = async () => {
    const current = user?.disabled_services || [];
    const next = current.filter(id => id !== eggSysOSService.app_id);
    await base44.auth.updateMe({ disabled_services: next });
    queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
    toast.success('EggSys OS re-enabled');
  };

  // Combine all for display, deduplicating DB-stored update notifs
  const sortedNotifications = [
    ...updateNotifications,
    ...systemNotifs
      .filter(n => !n.title?.match(/^EggetSystem .* Available$/))
      .map(n => ({ ...n, _entity: 'Notification', content: n.message, message_type: n.type })),
    ...messages.map(n => ({ ...n, _entity: 'Message' }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const notifications = eggSysOSDisabled
    ? [{
        id: 'eggsys-os-disabled-warning',
        title: 'Re-enable EggSys OS',
        content: 'EggSys OS is disabled. Most features like E-Account and updates are unavailable until you re-enable it.',
        _isEggSysOSWarning: true,
        read: true,
        created_date: new Date().toISOString()
      }]
    : sortedNotifications;

  const unreadNotifications = 
    messages.filter(n => !n.read).length +
    systemNotifs.filter(n => !n.read && !n.title?.match(/^EggetSystem .* Available$/)).length +
    availableUpdates.length;

  // Create notification for OS updates
  useEffect(() => {
    const createUpdateNotification = async () => {
      if (availableUpdates.length > 0 && user?.username) {
        const criticalUpdate = availableUpdates.find(u => u.priority === 'critical');
        const updateToShow = criticalUpdate || availableUpdates[0];
        
        const existingNotifs = await base44.entities.Notification.filter({ recipient_username: user.username });
        const existingNotif = existingNotifs.find(n => n.title?.includes(`EggetSystem ${updateToShow.version}`));
        
        if (!existingNotif) {
          await base44.entities.Notification.create({
            title: `EggetSystem ${updateToShow.version} Available`,
            message: `${updateToShow.title} - ${updateToShow.description}`,
            recipient_username: user.username,
            type: 'system',
            read: false
          });
          queryClient.invalidateQueries({ queryKey: ['system-notifs-mobile'] });
        }
      }
    };
    
    createUpdateNotification();
  }, [availableUpdates, user?.username, queryClient]);

  // Open the Update Manager when requested from Settings or other surfaces.
  // It launches as a system service ("EggSys OS") so it appears in recent apps.
  useEffect(() => {
    const handler = (e) => {
      const update = e?.detail;
      if (update) {
        setPendingUpdate(update);
        setSelectedUpdate(update);
      }
      // Always launch the EggSys OS service — when there's no pending update
      // it opens to the manager home (version, history, revert).
      launchApp('eggsys-os');
    };
    window.addEventListener('eos_open_update_manager', handler);
    return () => window.removeEventListener('eos_open_update_manager', handler);
  }, []);

  // Show new notifications in the notification bar
  useEffect(() => {
    const newNotifs = notifications.filter(n => !n.read);
    newNotifs.forEach(notif => {
      if (toastedNotifIdsRef.current.has(notif.id)) return;
      const alreadyDisplaying = displayedNotifications.some(d => d.id === notif.id);
      if (!alreadyDisplaying) {
        toastedNotifIdsRef.current.add(notif.id);
        const isCallNotif = notif.title?.startsWith('Call from @') && notif.related_id;
        const isUpdateNotif = notif._entity === 'OSUpdate' && notif._update;
        const toastNotif = {
          id: notif.id,
          title: notif.title,
          content: notif.content,
          isCall: isCallNotif,
          callId: isCallNotif ? notif.related_id : null,
          callerUsername: isCallNotif ? notif.title.replace('Call from @', '') : null,
          isUpdate: isUpdateNotif,
          update: isUpdateNotif ? notif._update : null,
          fromAdmin: !!notif.from_admin,
          notifType: notif.message_type || notif.type,
          source_app: notif.source_app
        };
        setDisplayedNotifications(prev => [...prev, toastNotif]);
        
        // Send native Android notification
        safeNotify(notif.title, {
          body: notif.content,
          icon: 'https://media.base44.com/images/public/6946b759fb67abb9152e7314/c697387e9_file_000000006d3481f5be81064990edc01f.png',
          tag: notif.id,
          requireInteraction: false
        });
        
        // Auto-dismiss: 4s for regular notifs, 35s for call toasts (matches ring timeout)
        setTimeout(() => {
          setDisplayedNotifications(prev => prev.filter(d => d.id !== notif.id));
        }, isCallNotif ? 35000 : 4000);
      }
    });
  }, [notifications, displayedNotifications]);

  // Answer / decline a call directly from a toast notification
  const handleAnswerCallFromToast = async (toastNotif) => {
    try {
      await base44.entities.Call.update(toastNotif.callId, { status: 'accepted' });
      sessionStorage.setItem('eos_accepted_call', toastNotif.callId);
      sessionStorage.removeItem('eos_outgoing_call');
    } catch (e) {
      toast.error('Failed to answer call');
    } finally {
      setDisplayedNotifications(prev => prev.filter(d => d.id !== toastNotif.id));
    }
  };

  const handleDeclineCallFromToast = async (toastNotif) => {
    try {
      await base44.entities.Call.update(toastNotif.callId, { status: 'declined', ended_at: new Date().toISOString() });
      sessionStorage.removeItem('eos_accepted_call');
    } catch (e) {
      toast.error('Failed to decline call');
    } finally {
      setDisplayedNotifications(prev => prev.filter(d => d.id !== toastNotif.id));
    }
  };

  const handleOpenChatFromToast = (toastNotif) => {
    setDisplayedNotifications(prev => prev.filter(d => d.id !== toastNotif.id));
    sessionStorage.setItem('eos_open_chat', toastNotif.chatUsername);
    launchApp('messages');
  };

  // Request notification permission on boot — show styled prompt after unlock
  useEffect(() => {
    if (!isBooting && !isLocked && 'Notification' in window && Notification.permission === 'default') {
      const alreadyPrompted = sessionStorage.getItem('notif_prompt_shown');
      if (!alreadyPrompted) {
        sessionStorage.setItem('notif_prompt_shown', 'true');
        setTimeout(() => setShowNotifPrompt(true), 1500);
      }
    }
  }, [isBooting, isLocked]);

  // Handle refresh button click — show prompt if notifications disabled
  const handleRefresh = () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      setShowNotifPrompt(true);
    } else {
      window.location.reload();
    }
  };

  // Decide post-boot state (lock / setup / recovery) once the user is known.
  // The BootScreen owns the isBooting timeline — we must NOT end boot early
  // here, otherwise the boot animation gets cut off when the user loads fast.
  const bootStateDecided = React.useRef(false);
  useEffect(() => {
    if (bootStateDecided.current || !user) return;
    // For signed-in users, wait for the E-Account to load so we know whether
    // a PIN is set on the account (the PIN lives on the E-Account, not the
    // Base44 user record).
    if (!user._guest && user.email && eAccount === undefined) return;
    bootStateDecided.current = true;

    (async () => {
      // Guests use on-device setup state (localStorage) since they have no
      // Base44 user record. Run them through setup if it isn't complete, and
      // respect a locally-stored PIN for the lock screen.
      if (user._guest) {
        if (!isGuestSetupComplete()) {
          setShowSetup(true);
          setIsLocked(false);
        } else if (user.pin) {
          if (isFullyBootedUnlocked(readBootState())) {
            setIsLocked(false);
          } else {
            setIsLocked(true);
          }
        } else {
          setIsLocked(false);
        }
        return;
      }

      // If a required system file is missing, boot into recovery with a
      // "system process not found" notice so the user can reinstall them.
      const missing = await missingRequiredSystemFiles();
      if (missing.length > 0) {
        setRecoveryReason('A system process was not found.');
        setShowRecovery(true);
        setIsLocked(false);
        return;
      }

      // Device-approval 2FA: when 2FA is on, a new (not-yet-approved) device
      // must be approved from an already-approved device before it can boot.
      if (user.setup_completed && user.username && eAccount?.two_factor_enabled) {
        const approval = await getApprovalState(eAccount);
        if (approval.requiresApproval) {
          setDeviceApprovalOthers(approval.approvedOthers || []);
          setShowDeviceApproval(true);
          return;
        }
      }

      if (user.in_recovery_mode) {
        setRecoveryReason('');
        setShowRecovery(true);
        setIsLocked(false);
      } else if (!user.setup_completed) {
        setShowSetup(true);
        setIsLocked(false);
      } else if (!user.username) {
        setShowUsernameSetup(true);
        setIsLocked(false);
      } else if (user.setup_completed && (eAccount?.pin || user.pin)) {
        // If the user already unlocked this session (boot state "3"), skip
        // the lock screen and go straight to the home screen.
        if (isFullyBootedUnlocked(readBootState())) {
          setIsLocked(false);
        } else {
          setIsLocked(true);
        }
      } else {
        setIsLocked(false);
      }
    })();
  }, [user, eAccount]);

  const installUpdateMutation = useMutation({
    mutationFn: async (update) => {
      const newHistory = [
        ...(user?.update_history || []),
        { version: update.version, installed_date: new Date().toISOString(), status: 'success' }
      ];
      await base44.auth.updateMe({ os_version: update.version, update_history: newHistory });
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['current-user-mobile'] });
      queryClient.removeQueries({ queryKey: ['available-updates-mobile'] });
      setShowUpdateManager(false);
      setSelectedUpdate(null);
      toast.success('Update installed!');
      setTimeout(() => window.location.reload(), 1000);
    }
  });

  const markReadMutation = useMutation({
    mutationFn: ({ id, _entity }) => {
      if (_entity === 'Notification') return base44.entities.Notification.update(id, { read: true });
      return base44.entities.Message.update(id, { read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-mobile'] });
      queryClient.invalidateQueries({ queryKey: ['system-notifs-mobile'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: ({ id, _entity }) => {
      if (_entity === 'Notification') return base44.entities.Notification.delete(id);
      return base44.entities.Message.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-mobile'] });
      queryClient.invalidateQueries({ queryKey: ['system-notifs-mobile'] });
      toast.success('Notification deleted');
    }
  });



  const getNotificationIcon = (type, title) => {
    // Special handling for OS updates
    if (title?.includes('EggetSystem') && title?.includes('Available')) {
      return Package;
    }
    
    switch(type) {
      case 'message':
        return Mail;
      case 'warning':
        return AlertTriangle;
      case 'system':
        return Info;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type, title) => {
    // Special handling for OS updates
    if (title?.includes('EggetSystem') && title?.includes('Available')) {
      return 'from-indigo-500 to-purple-600';
    }
    
    switch(type) {
      case 'message':
        return 'from-purple-500 to-pink-600';
      case 'warning':
        return 'from-yellow-500 to-orange-500';
      case 'system':
        return 'from-blue-500 to-cyan-600';
      default:
        return 'from-gray-500 to-slate-600';
    }
  };

  const isOwner = !kidsMode && (user?.admin_role === 'owner' || user?.email === 'eggtheegget@gmail.com' || user?.email === 'eggtheegget@outlook.com');
  // Music Player: owners, co-owners, and admins granted the music special permission
  const canUseMusic = !kidsMode && (isOwner || user?.admin_role === 'co-owner' || !!user?.special_permissions?.music);
  const canUseEditor = !kidsMode && isOwner;
  // Music app branding (Music Player ↔ Spotify) — see src/lib/musicAppMeta.js
  const musicMeta = useMusicAppMeta();

  const handleTestNotification = () => {
    if (testNotifCountdown !== null) return;
    let count = 20;
    setTestNotifCountdown(count);
    testNotifTimer.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(testNotifTimer.current);
        testNotifTimer.current = null;
        setTestNotifCountdown(null);
        const testNotif = { id: `test-${Date.now()}`, title: 'Test Toast', content: 'This is a test toast triggered by the owner bell.' };
        setDisplayedNotifications(prev => [...prev, testNotif]);
        safeNotify(testNotif.title, { body: testNotif.content });
        setTimeout(() => {
          setDisplayedNotifications(prev => prev.filter(d => d.id !== testNotif.id));
        }, 4000);
      } else {
        setTestNotifCountdown(count);
      }
    }, 1000);
  };

  const handleTestText = () => {
    setShowTestOptions(false);
    const toastNotif = {
      id: `test-text-${Date.now()}`,
      title: 'Message from @__test_text__',
      content: 'This is a test',
      isChat: true,
      chatUsername: '__test_text__'
    };
    setDisplayedNotifications(prev => [...prev, toastNotif]);
    setTimeout(() => {
      setDisplayedNotifications(prev => prev.filter(d => d.id !== toastNotif.id));
    }, 6000);
  };

  const handleScheduledText = (targetUser, msgContent) => {
    const toastNotif = {
      id: `scheduled-${Date.now()}`,
      title: `Message from @${targetUser.username}`,
      content: msgContent,
      isChat: true,
      chatUsername: targetUser.username
    };
    setDisplayedNotifications(prev => [...prev, toastNotif]);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(toastNotif.title, { body: msgContent });
    }
    // Removes itself 10 seconds after being sent
    setTimeout(() => {
      setDisplayedNotifications(prev => prev.filter(d => d.id !== toastNotif.id));
    }, 10000);
  };

  const handleLock = () => {
    markLockedThisSession();
    setIsLocked(true);
  };

  const handleLogout = async () => {
    if (await confirmAction('Sign out of EggetSystem?')) {
      await base44.auth.logout();
    }
  };

  const launchApp = (appId) => {
    // Music Player is owner/co-owner only for now
    if (appId === 'music' && !canUseMusic) {
      toast.error('The music app is currently limited to owners and co-owners');
      return;
    }
    if (appId === 'base44editor' && !canUseEditor) {
      toast.error('Base44 Editor is owner-only');
      return;
    }
    // Check if admin app - open panel instead
    if (appId === 'admin') {
      const isDemoMode = localStorage.getItem('eos_demo_mode') === 'true';
      if (isDemoMode) {
        toast.error('Admin panel not available in demo mode');
        return;
      }
      const isOwner = user?.email === 'eggtheegget@gmail.com' || user?.email === 'eggtheegget@outlook.com';
      const hasAdminAccess = user?.admin_role || user?.['admin?'] === 'y' || isOwner || user?.email === 'EggetSystem_web@proton.me';
      if (!hasAdminAccess) {
        toast.error('Admin access required');
        return;
      }
      setShowAdminPanel(true);
      return;
    }

    // Kids Mode — messaging is not available; only curated apps may open.
    if (kidsMode) {
      if (appId === 'messages') {
        toast.error('Messaging isn’t available in Kids Mode');
        return;
      }
      if (!KIDS_APP_IDS.includes(appId)) {
        toast.error('This app isn’t available in Kids Mode');
        return;
      }
    }

    // Support mode — owner views the support inbox inside the Messages app
    if (appId === 'messages' && accountMode === 'support' && isOwner) {
      setCurrentApp({
        id: 'messages',
        title: 'Support Inbox',
        icon: MessageCircle,
        component: () => <SupportInbox currentUser={user} onBack={closeApp} />,
        color: 'from-blue-500 to-indigo-600'
      });
      return;
    }

    // Communication suspension — block apps that allow user interaction
    if (eAccount?.online_suspended && (appId === 'phone' || appId === 'messages' || appId === 'appstore' || appId === 'eggmail' || appId === 'contacts')) {
      window.dispatchEvent(new CustomEvent('show-comm-suspension'));
      return;
    }

    const config = appConfigs[appId];
    if (!config) {
      const installedApp = installedApps.find(a => a.app_id === appId);
      if (installedApp) {
        launchInstalledApp(installedApp);
        return;
      }
      return;
    }
    const crash = getAppServiceCrash(appId, eggSysApps, installedApps, user?.disabled_services);
    if (crash) {
      setCurrentApp({
        id: appId,
        title: config.title,
        icon: config.icon,
        component: () => <AppCrashScreen appName={config.title} serviceName={crash.serviceName} onClose={closeApp} />,
        color: config.color
      });
      return;
    }
    setCurrentApp({ id: appId, ...config });
    if (appId === 'music') setMusicOpened(true);
  };

  const closeApp = () => {
    setCurrentApp(null);
  };

  const [inputLocked, setInputLocked] = useState(false);

  // Minimize the current app to the recent apps list (keeps it "open" in background)
  const minimizeApp = async () => {
    setInputLocked(true);
    setTimeout(() => setInputLocked(false), 500);
    // Capture a snapshot of the app's last state for the recent-apps card.
    let snapshotUrl = null;
    const el = document.querySelector('[data-app-content]');
    if (el) {
      try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(el, { scale: 0.4, useCORS: true, backgroundColor: null, logging: false });
        snapshotUrl = canvas.toDataURL('image/jpeg', 0.55);
      } catch (e) {
        console.warn('Recent app snapshot failed:', e);
      }
    }
    setCurrentApp((curr) => {
      if (curr) {
        setRecentApps((prev) => {
          const filtered = prev.filter((a) => a.id !== curr.id);
          return [{ ...curr, snapshotUrl }, ...filtered].slice(0, 12);
        });
      }
      return null;
    });
  };

  const restoreApp = (app) => {
    setRecentApps((prev) => prev.filter((a) => a.id !== app.id));
    setCurrentApp(app);
    setShowRecent(false);
  };

  const removeRecent = (id) => {
    setRecentApps((prev) => prev.filter((a) => a.id !== id));
    // Closing Spotify from recent apps actually stops the player
    if (id === 'music') setMusicOpened(false);
  };

  const clearRecent = () => {
    if (recentApps.some((a) => a.id === 'music')) setMusicOpened(false);
    setRecentApps([]);
  };

  // When the EggetSystem Visual Menu opens (via the `esvismenu` terminal
  // command), minimize the current app so the menu is visible on mobile.
  useEffect(() => {
    const onShowVisMenu = () => { if (currentApp) minimizeApp(); };
    window.addEventListener('eggsys_show_esvismenu', onShowVisMenu);
    return () => window.removeEventListener('eggsys_show_esvismenu', onShowVisMenu);
  }, [currentApp]);

  const uninstallAppMutation = useMutation({
    mutationFn: async (appId) => {
      const { getGuestInstalledApps, setGuestInstalledApps } = await import('@/lib/guestBackup');
      if (user?._guest) {
        setGuestInstalledApps(getGuestInstalledApps().filter((a) => a.app_id !== appId));
        return;
      }
      try {
        return await base44.entities.InstalledApp.delete(appId);
      } catch (err) {
        // Offline: remove from localStorage cache
        setGuestInstalledApps(getGuestInstalledApps().filter((a) => a.app_id !== appId));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-apps-mobile'] });
      setAppContextMenu(null);
      toast.success('App uninstalled');
    }
  });

  // Disable a built-in app from the home screen (long-press → Disable).
  // Signed-in users persist via disabled_services; guests use localStorage.
  const handleDisableBuiltin = async (app) => {
    if (!await confirmAction(`Disable ${app.title || app.name}? It will be hidden from the home screen. You can re-enable it in Settings → Apps.`)) return;
    const appId = app.app_id || app.id;
    if (user?._guest) {
      const next = Array.from(new Set([...guestDisabledBuiltins, appId]));
      localStorage.setItem('eos_disabled_builtins', JSON.stringify(next));
      setGuestDisabledBuiltins(next);
    } else {
      const current = user?.disabled_services || [];
      const next = Array.from(new Set([...current, appId]));
      await base44.auth.updateMe({ disabled_services: next });
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    }
    setBuiltinContextMenu(null);
  };

  // App Info opens Settings and auto-opens the App Info page for this built-in app.
  const handleBuiltinAppInfo = (app) => {
    const appId = app.app_id || app.id;
    sessionStorage.setItem('eos_settings_app_info', appId);
    setBuiltinContextMenu(null);
    launchApp('settings');
  };

  const launchInstalledApp = (app) => {
    setCurrentApp({
      id: app.app_id,
      title: app.name,
      icon: Package,
      component: () => (
        <AppFrame htmlContent={app.html_content} appName={app.name} appId={app.app_id} onClose={closeApp} onLaunchApp={(name, page) => { if (page) sessionStorage.setItem('eggsys_launch_page', page); launchApp(name); }} userInfo={buildEggSysUserInfo(eAccount)} appData={app.app_data} />
      ),
      color: app.color
    });
    setAppContextMenu(null);
  };

  const homeScreenBg = getHomeScreenBackground(user, 'r', kidsMode);

  // A booted custom OS brings its own home screen: its wallpaper, its apps in
  // its own order, and its grid width. Kids/Lite keep their fixed layout.
  const activeOS = getActiveOS();
  const osLookActive = !!activeOS && !kidsMode && !liteMode;
  const osHomeApps = osLookActive ? (activeOS.layout?.home_apps || []) : [];
  const osGridCols = osLookActive ? HOME_GRID_COLS[activeOS.layout?.grid_columns] : null;
  const osGrad = osLookActive ? getWallpaperGradient(activeOS.theme?.wallpaper_gradient) : null;
  const homeBg = osLookActive && (activeOS.theme?.wallpaper_url || osGrad)
    ? (activeOS.theme.wallpaper_url
      ? { className: 'bg-cover bg-center', style: { backgroundImage: `url("${activeOS.theme.wallpaper_url}")` } }
      : { className: `bg-gradient-to-r ${osGrad.className}`, style: {} })
    : homeScreenBg;
  // Apps on the home screen: the OS's pre-installed list when it ships one,
  // otherwise every built-in. Settings always stays so the device can be managed.
  const homeScreenApps = (() => {
    const all = Object.entries(appConfigs);
    if (!osHomeApps.length) return all;
    const chosen = osHomeApps.filter((id) => appConfigs[id]).map((id) => [id, appConfigs[id]]);
    if (!chosen.length) return all;
    return chosen.some(([id]) => id === 'settings') ? chosen : [...chosen, ['settings', appConfigs.settings]];
  })();

  // Wait for the session query before deciding maintenance/setup/lock states
  // so guest fallback doesn't flash a maintenance screen during loading.
  if (isLoadingUser && !authLoadTimedOut) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (systemMaintenance?.is_under_maintenance && !user?.bypass_maintenance) {
    return <MaintenanceScreen />;
  }

  if (systemMaintenance?.temp_closed && !(user?.admin_role === 'owner' || user?.admin_role === 'co-owner')) {
    return <TempClose message={systemMaintenance.temp_close_message} />;
  }

  // A crash-on-disable service was disabled — EggetSystem is bricked
  const crashServiceIds = eggSysApps.filter(a => a.app_type === 'service' && a.disable_crashes).map(a => a.app_id);
  if ((user?.disabled_services || []).some(id => crashServiceIds.includes(id))) {
    return <BrickedScreen serviceName="EggSys OS" />;
  }

  // VR mode overlay
  if (vrApp) {
    return <VRViewer installedApps={installedApps} onClose={() => setVrApp(null)} />;
  }

  // BIOS boot menu — opened from recovery on mobile.
  if (showBios) {
    return (
      <BiosBootMenu
        autoOpen
        onContinue={() => setShowBios(false)}
        onBoot={async () => {
          try { await base44.auth.updateMe({ in_recovery_mode: false }); } catch (e) {}
          window.location.reload();
        }}
      />
    );
  }

  if (isBooting) {
    const finishBoot = () => {
      // Reset the tablet flag on every boot, then re-detect from the actual
      // device. Real tablets (min screen dimension >= 600px) get tablet UI
      // automatically; phones start in phone mode and can still confirm tablet
      // mode via the landscape dialog for that session.
      localStorage.removeItem('eos_is_tablet');
      const isActuallyTablet = Math.min(window.innerWidth, window.innerHeight) >= 600;
      setIsTablet(isActuallyTablet);
      if (isActuallyTablet) localStorage.setItem('eos_is_tablet', 'true');
      setIsBooting(false);
    };
    if (activeOS) {
      return <CustomBootScreen osDef={activeOS} onBootComplete={finishBoot} />;
    }
    return <MobileBootScreen onBootComplete={finishBoot} />;
  }



  if (eAccount?.status === 'banned' && !banBypassed) {
    return (
      <MobileBanScreen
        user={user}
        eAccount={eAccount}
        onBypass={async () => {
          try {
            if (eAccount?.id) {
              await base44.entities.EAccount.update(eAccount.id, {
                status: 'active',
                banned_reason: null
              });
            }
            queryClient.invalidateQueries({ queryKey: ['eaccount-mobile', user?.email] });
          } catch (e) {
            toast.error('Failed to unban account');
          }
          setBanBypassed(true);
        }}
      />
    );
  }

  if (showDeviceApproval) {
    return <DeviceApprovalScreen
      approvedOthers={deviceApprovalOthers}
      onApproved={() => {
        setShowDeviceApproval(false);
        queryClient.invalidateQueries({ queryKey: ['eaccount'] });
        // Proceed to the lock screen (or home) now that this device is trusted.
        if (eAccount?.pin || user.pin) {
          if (isFullyBootedUnlocked(readBootState())) {
            setIsLocked(false);
          } else {
            setIsLocked(true);
          }
        } else {
          setIsLocked(false);
        }
      }}
      onDenied={() => { base44.auth.logout(); }}
    />;
  }

  if (showUsernameSetup) {
    return <UsernameSetup user={user} onComplete={() => {
      setShowUsernameSetup(false);
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
    }} />;
  }

  if (showRecovery) {
    return <MobileRecovery reason={recoveryReason} onExit={async () => {
      await base44.auth.updateMe({ in_recovery_mode: false });
      setShowRecovery(false);
      setRecoveryReason('');
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
    }} onOpenBios={() => setShowBios(true)} />;
  }

  if (showSetup) {
    return <MobileSetup guest={!!user?._guest} onComplete={() => {
      setShowSetup(false);
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
    }} />;
  }

  if (isLocked) {
    return (
      <MobileLockScreen
        kidsMode={kidsMode}
        user={{ ...user, pin: eAccount?.pin ?? user.pin }}
        onUnlock={() => {
          // Mark this session as unlocked so an in-session re-entry skips the
          // lock screen. The flag is in-memory only, so a page refresh always
          // re-shows the lock screen (refresh can no longer bypass the PIN).
          markUnlockedThisSession();
          setIsLocked(false);
          // Sync the E-Account (and its PIN) on every unlock so the lock
          // screen always has the latest PIN from the account.
          queryClient.invalidateQueries({ queryKey: ['eaccount-mobile', user?.email] });
        }}
      />
    );
  }

  // Home screen
  return (
    <>
      {/* Global Call Monitor */}
      {user && <GlobalCallMonitor currentUser={user} allUsers={allUsers} onActiveCallChange={setActiveCallForStatusBar} currentApp={currentApp} />}
      {user && <TestIncomingCallSimulator active={testIncomingActive} currentUser={user} callerId={testCallerId} onComplete={() => setTestIncomingActive(false)} esimActive={!!user?.esim?.activated} />}
      {user && <ScheduledTextSimulator isOpen={showScheduleText} onClose={() => setShowScheduleText(false)} currentUser={user} allUsers={allUsers} onSend={handleScheduledText} />}
      {/* Full screen app view */}
      {currentApp && currentApp.id !== 'music' && (
        <AppView
          currentApp={currentApp}
          user={user}
          displayedNotifications={displayedNotifications}
          onDismissNotif={(id) => setDisplayedNotifications(prev => prev.filter(d => d.id !== id))}
          onAnswerCall={handleAnswerCallFromToast}
          onDeclineCall={handleDeclineCallFromToast}
          onCardClick={(n) => {
            if (n.isCall) { setDisplayedNotifications(prev => prev.filter(d => d.id !== n.id)); window.dispatchEvent(new CustomEvent('eos_reopen_call')); }
            else if (n.isChat) { handleOpenChatFromToast(n); }
            else if (n.isSupport) { setDisplayedNotifications(prev => prev.filter(d => d.id !== n.id)); }
          }}
          onClose={closeApp}
          onMinimize={minimizeApp}
          onOpenRecent={() => setShowRecent(true)}
          onLaunchApp={launchApp}
          onLock={handleLock}
          onRefresh={handleRefresh}
          activeCall={activeCallForStatusBar}
          wifiEnabled={wifiEnabled}
          mobileDataEnabled={mobileDataEnabled}
          onOpenControlCenter={() => setShowControlCenter(true)}
          isOnline={isOnline}
          hideStatusBarFullScreen={!!user?.security_preferences?.hide_statusbar_fullscreen}
          kidsMode={kidsMode}
        />
      )}

      {/* Persistent Music Player layer — stays mounted so audio keeps playing when minimized */}
      {musicOpened && user && (
        <MusicPlayerLayer
          active={currentApp?.id === 'music'}
          onClose={closeApp}
          onMinimize={minimizeApp}
          onOpenRecent={() => setShowRecent(true)}
          onLaunchApp={launchApp}
          user={user}
          onLock={handleLock}
          onRefresh={handleRefresh}
          activeCall={activeCallForStatusBar}
          wifiEnabled={wifiEnabled}
          mobileDataEnabled={mobileDataEnabled}
          onOpenControlCenter={() => setShowControlCenter(true)}
          hideStatusBarFullScreen={!!user?.security_preferences?.hide_statusbar_fullscreen}
        />
      )}

      <AnimatePresence>
        {showRecent && (
          <RecentAppsOverlay
            apps={recentApps}
            onRestore={restoreApp}
            onCloseApp={removeRecent}
            onClearAll={clearRecent}
            onDismiss={() => setShowRecent(false)}
          />
        )}
      </AnimatePresence>

      <div
        className={`h-screen w-screen flex flex-col relative isolate ${inputLocked ? 'pointer-events-none' : ''}`}
      >
        {/* Wallpaper layer — behind the shell so dark mode can dim it */}
        <div className={`absolute inset-0 -z-10 ${homeBg.className}`} style={homeBg.style}>
          {darkMode && <div className="absolute inset-0 bg-black/50" />}
        </div>
      {/* Status Bar — hidden while the full-screen Update Manager ("EggSys OS") service is open */}
      {currentApp?.id !== 'eggsys-os' && (
      <StatusBar onLock={handleLock} onRefresh={handleRefresh} activeCall={activeCallForStatusBar} onReopenCall={() => window.dispatchEvent(new CustomEvent('eos_reopen_call'))} esimActive={!!user?.esim?.activated} wifiEnabled={wifiEnabled} mobileDataEnabled={mobileDataEnabled} onOpenControlCenter={() => setShowControlCenter(true)} />
      )}

      {/* Notification bar — call toasts are hidden while the full-screen call UI is open to avoid duplicate controls */}
      <div className="fixed top-12 left-0 right-0 z-[1100]">
      <AnimatePresence>
        {displayedNotifications.filter(n => !(n.isCall && activeCallForStatusBar)).map((notif) => (
          <NotificationToast
            key={notif.id}
            notif={notif}
            onDismiss={(id) => setDisplayedNotifications(prev => prev.filter(d => d.id !== id))}
            onAnswer={handleAnswerCallFromToast}
            onDecline={handleDeclineCallFromToast}
            onCardClick={(n) => {
              if (n.isCall) setDisplayedNotifications(prev => prev.filter(d => d.id !== n.id));
              else if (n.isChat) handleOpenChatFromToast(n);
              else if (n.isSupport) setDisplayedNotifications(prev => prev.filter(d => d.id !== n.id));
              else if (n.isUpdate) {
                setSelectedUpdate(n.update);
                setShowUpdateManager(true);
                setDisplayedNotifications(prev => prev.filter(d => d.id !== n.id));
              }
              else if (n.isLowBattery) {
                setDisplayedNotifications(prev => prev.filter(d => d.id !== n.id));
              }
            }}
          />
        ))}
      </AnimatePresence>
      </div>

      {/* Tablet sidebar + content wrapper */}
      <div className="flex flex-row flex-1 min-h-0">
      {isTablet && (
        <TabletSidebar
          kidsMode={kidsMode}
          activeServer={activeServer}
          onOpenServerPanel={() => setShowServerPanel(true)}
          onLaunchApp={launchApp}
          onLock={handleLock}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
      {/* Main Content */}
      <div className={`flex-1 overflow-auto ${isTablet ? 'p-8' : 'p-6'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {accountMode === 'support' && isOwner ? 'Support Account' : (<><EggSysWord height={22} /> Mobile</>)}
            </h1>
            {betaMode && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/30 text-purple-100 border border-purple-400/40 uppercase tracking-wider">
                Beta
              </span>
            )}
            {liteMode && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 uppercase tracking-wider">
                Lite
              </span>
            )}
            {kidsMode && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/30 text-amber-100 border border-amber-400/40 uppercase tracking-wider">
                Kids
              </span>
            )}
            {window.location.hostname.startsWith('preview--') && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/30 text-amber-100 border border-amber-400/40 uppercase tracking-wider">
                Preview
              </span>
            )}
          </div>
        </div>
        {betaMode && (
          <div className="mb-4 bg-purple-500/15 border border-purple-400/30 rounded-xl p-3 text-purple-100 text-xs flex items-center gap-1.5">
            You're running the <EggSysWord height={12} /> Beta build. New features appear here first and may be unstable.
          </div>
        )}
        {accountMode === 'support' && isOwner && (
          <div className="mb-4 bg-blue-500/20 backdrop-blur border border-blue-300/30 rounded-xl p-3 text-white text-sm">
            You are in Support mode. Open Messages to view user support conversations and appeals.
          </div>
        )}

        {kidsMode && (
          <KidsModeBar onOpenControls={() => setShowKidsControls(true)} />
        )}

        {/* Widgets */}
        <HomeScreenWidgets />
        
        {/* App Grid */}
         <div className={`grid ${osGridCols || (isTablet ? 'grid-cols-6' : 'grid-cols-5')} ${isTablet ? 'gap-5' : 'gap-4'}`}>
           {homeScreenApps.map(([id, config]) => {
              // Hide built-in apps the user has disabled (re-enable via Settings → Apps)
              if ((user?.disabled_services || []).includes(id)) return null;
              // Guests disable built-ins via localStorage
              if (guestDisabledBuiltins.includes(id)) return null;
              // Hide admin app and taskbar-only apps from home screen — unless
              // the booted custom OS ships it on purpose (its home_apps list).
              if (config.adminOnly && !osHomeApps.includes(id)) return null;
              // EggSys OS is a system service, not a home-screen app
              if (id === 'eggsys-os') return null;
              // Dev app only appears when Developer Options is enabled
              if (id === 'dev' && localStorage.getItem('eos_dev_options_enabled') !== 'true') return null;
              // Terminal (with ESDC commands) only appears when Developer Options is enabled
              if (id === 'terminal' && localStorage.getItem('eos_dev_options_enabled') !== 'true') return null;
              if (id === 'music' && !canUseMusic) return null;
              if (id === 'base44editor' && !canUseEditor) return null;
              if (kidsMode) {
                if (!KIDS_APP_IDS.includes(id)) return null;
              } else if (liteMode) {
                if (!LITE_APP_IDS.includes(id)) return null;
              } else {
                if (['phone', 'messages', 'contacts', 'camera'].includes(id)) return null;
              }
              return (
             <HoldableButton
               key={id}
               onTap={() => launchApp(id)}
               onHold={() => setBuiltinContextMenu({
                 id,
                 config: id === 'music' ? { ...config, title: musicMeta.name, color: musicMeta.color } : config
               })}
               className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
             >
               {id === 'music' ? (
                 <MusicAppIcon className={isTablet ? "w-16 h-16" : "w-14 h-14"} />
                 ) : id === 'base44editor' ? (
                 <Base44EditorIcon className={isTablet ? "w-16 h-16" : "w-14 h-14"} />
               ) : (
               <div className={`${isTablet ? 'w-16 h-16' : 'w-14 h-14'} rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
                 <config.icon className={`${isTablet ? 'w-8 h-8' : 'w-7 h-7'} text-white`} />
               </div>
               )}
               <span className="text-xs text-white font-medium text-center leading-tight">
                 {id === 'music' ? musicMeta.name : config.title}
               </span>
             </HoldableButton>
           );
           })}
          {!liteMode && !kidsMode && installedApps.filter(app => app.app_data?.app_type !== 'service' && app.app_id !== 'spotify-music-podcasts' && appBelongsToDevice(app, getDeviceId())).map((app) => (
             <InstalledAppIcon
               key={app.id}
               app={app}
               onTap={() => launchInstalledApp(app)}
               onHold={() => setAppContextMenu({ app })}
             />
           ))}
        </div>
      </div>

      {/* Bottom Navigation — hidden in Lite mode, and on tablets (dock lives in the sidebar) */}
      {!liteMode && !isTablet && (
      <div className={`flex items-center justify-around px-4 py-4 backdrop-blur-xl border-t ${darkMode ? 'bg-black/60 border-white/10' : 'bg-white/10 border-white/20'}`}>
        <button
          onClick={() => launchApp('phone')}
          className="flex flex-col items-center gap-1 text-white"
        >
          <Phone className="w-6 h-6" />
          <span className="text-xs">Phone</span>
        </button>

        {!kidsMode && (
        <button
          onClick={() => launchApp('messages')}
          className="flex flex-col items-center gap-1 text-white"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-xs">Messages</span>
        </button>
        )}

        <button
          onClick={() => launchApp('contacts')}
          className="flex flex-col items-center gap-1 text-white"
        >
          <Contact className="w-6 h-6" />
          <span className="text-xs">Contacts</span>
        </button>

        <button
          onClick={() => launchApp('camera')}
          className="flex flex-col items-center gap-1 text-white"
        >
          <Camera className="w-6 h-6" />
          <span className="text-xs">Camera</span>
        </button>

         {activeServer && (
           <button
             onClick={() => setShowServerPanel(true)}
             className="flex flex-col items-center gap-1 text-white"
             title="Run your server"
           >
             <Crown className="w-6 h-6 text-amber-300" />
             <span className="text-xs">Server</span>
           </button>
         )}
        </div>
        )}
        </div>
        </div>

        {/* Persistent in-app navigation bar (Recent) — hidden on the home screen in legacy mode */}
      {!liteMode && user?.home_preferences?.legacy_mode === false && (
        <SystemNavBar hideHome matchDock onRecent={() => setShowRecent(true)} />
      )}

      {/* Server Panel */}
      <ServerPanel
        isOpen={showServerPanel}
        onClose={() => setShowServerPanel(false)}
      />

      {/* Admin Panel */}
      <AdminPanel 
        isOpen={showAdminPanel} 
        onClose={() => setShowAdminPanel(false)} 
      />

      {/* Power Off / Restart Overlay */}
      <PowerOffOverlay active={poweringOff || restarting} label={restarting ? 'Restarting' : 'Powering Off'} />

      {/* Update Manager — now opens as the "EggSys OS" service app (see appConfigs) */}

      {/* Notification Permission Prompt */}
      <NotifPermissionPrompt open={showNotifPrompt} onClose={() => setShowNotifPrompt(false)} />

      {/* Installed App Context Menu */}
      <InstalledAppContextMenu
        app={appContextMenu?.app}
        onClose={() => setAppContextMenu(null)}
        onOpenApp={(app) => launchInstalledApp(app)}
        onOpenVR={(app) => setVrApp(app)}
        onUninstall={async (app) => { if (await confirmAction(`Uninstall "${app.name}"?`)) uninstallAppMutation.mutate(app.id); }}
      />

      {/* Built-in App Context Menu (App Info + Disable) */}
      <BuiltinAppContextMenu
        app={builtinContextMenu ? {
          app_id: builtinContextMenu.id,
          name: builtinContextMenu.config.title,
          icon: builtinContextMenu.config.icon,
          color: builtinContextMenu.config.color,
        } : null}
        onClose={() => setBuiltinContextMenu(null)}
        onOpenApp={(app) => launchApp(app.app_id)}
        onAppInfo={handleBuiltinAppInfo}
        onDisable={handleDisableBuiltin}
      />
      <CommunicationSuspensionNotice />

      {/* Control Center (double-tap home) */}
      <ControlCenter
        isOpen={showControlCenter}
        onClose={() => setShowControlCenter(false)}
        wifi={wifiEnabled}
        mobileData={mobileDataEnabled}
        darkMode={darkMode}
        onToggleDarkMode={() => {
          const next = !darkMode;
          setDarkMode(next);
          setStoredDarkMode(next);
        }}
        onToggleWifi={() => {
          const next = !wifiEnabled;
          setWifiEnabled(next);
          localStorage.setItem('eos_wifi_enabled', String(next));
        }}
        onToggleMobileData={() => {
          const next = !mobileDataEnabled;
          setMobileDataEnabled(next);
          localStorage.setItem('eos_mobile_data_enabled', String(next));
        }}
        notifications={notifications}
        onMarkRead={(notif) => markReadMutation.mutate({ id: notif.id, _entity: notif._entity })}
        onDelete={(notif) => deleteNotificationMutation.mutate({ id: notif.id, _entity: notif._entity })}
        onReenableEggSysOS={handleReenableEggSysOS}
        onInstallUpdate={(update) => { setSelectedUpdate(update); setShowControlCenter(false); setShowUpdateManager(true); }}
        onTestText={handleTestText}
        onTestNotification={handleTestNotification}
        onScheduleText={() => setShowScheduleText(true)}
        testNotifCountdown={testNotifCountdown}
        accountMode={accountMode}
        onToggleAccountMode={() => {
          const next = accountMode === 'support' ? 'personal' : 'support';
          setAccountMode(next);
          localStorage.setItem('eos_account_mode', next);
          setShowControlCenter(false);
          if (next === 'support') {
            setCurrentApp({
              id: 'messages',
              title: 'Support Inbox',
              icon: MessageCircle,
              component: () => <SupportInbox currentUser={user} onBack={closeApp} />,
              color: 'from-blue-500 to-indigo-600'
            });
          } else {
            setCurrentApp(null);
          }
          toast.success(next === 'support' ? 'Switched to Support Account' : 'Switched to Personal Account');
        }}
        isOwner={isOwner}
        onOpenMusic={() => launchApp('music')}
        onOpenAdmin={() => { setShowControlCenter(false); setShowAdminPanel(true); }}
        isAdmin={!kidsMode && !!(user?.admin_role || user?.['admin?'] === 'y' || isOwner || user?.email === 'EggetSystem_web@proton.me')}
        onLock={handleLock}
        onLogout={handleLogout}
        onVRHome={() => { setVrApp(true); setShowControlCenter(false); }}
        onRecovery={async () => {
          if (await confirmAction('Enter Recovery Mode? This will restart your device.')) {
            await base44.auth.updateMe({ in_recovery_mode: true });
            setShowRecovery(true);
            setShowControlCenter(false);
          }
        }}
        onOpenPCSandbox={() => {
          setShowControlCenter(false);
          setShowPCSandbox(true);
        }}
        kidsMode={kidsMode}
        onEnableKidsMode={() => {
          setShowControlCenter(false);
          // Remember where Kids Mode was turned on so we can return there on turn-off.
          sessionStorage.setItem('eos_kids_origin', window.location.pathname);
          if (hasKidsPin()) {
            setKidsModeEnabled(true);
            setKidsMode(true);
            toast.success('Kids Mode enabled');
            // Move to the dedicated Kids home screen.
            setTimeout(() => { window.location.href = createPageUrl('MobileOSKids'); }, 400);
          } else {
            // No PIN yet — open parental controls so the parent sets one
            // as part of enabling. Controls enable Kids Mode on first unlock
            // and navigate to the Kids home screen (onEnabled).
            setShowKidsControls(true);
          }
        }}
        onOpenKidsControls={() => {
          setShowControlCenter(false);
          setShowKidsControls(true);
        }}
        onCallYourself={async () => {
          if (!user?.username) { toast.error('Sign in to call yourself'); return; }
          try {
            const call = await base44.entities.Call.create({
              caller_username: user.username,
              recipient_username: user.username,
              status: 'ringing',
              started_at: new Date().toISOString()
            });
            sessionStorage.setItem('eos_outgoing_call', call.id);
            setShowControlCenter(false);
            setShowPCSandbox(true);
            toast.success('Calling yourself… answer in the PC Sandbox');
          } catch (e) {
            toast.error('Failed to start call');
          }
        }}
        onPowerOff={() => {
          setShowControlCenter(false);
          setPoweringOff(true);
          writeBootState('0'); // reset boot state
          setTimeout(() => {
            if (betaMode) {
              try { window.close(); } catch (e) {}
              setTimeout(() => {
                if (!window.closed) {
                  document.body.innerHTML = '<div style="position:fixed;inset:0;background:#000;display:flex;align-items:center;justify-content:center;color:#555;font-family:system-ui;font-size:14px;letter-spacing:0.2em;">POWERED OFF<' + '/div>';
                }
              }, 200);
            } else {
              window.location.href = createPageUrl('SelectOS');
            }
          }, 3500);
        }}
        onRestart={() => {
          setShowControlCenter(false);
          setRestarting(true);
          writeBootState('0'); // reset boot state
          setTimeout(() => {
            sessionStorage.setItem('eos_restarting', 'true');
            window.location.reload();
          }, 2000);
        }}
        betaMode={betaMode}
      />
      <TCAccountPrompt user={user} />
      {user?._guest && !eAccount && <GuestEAccountPrompt />}
      <KidsParentalControls
        open={showKidsControls}
        onClose={() => setShowKidsControls(false)}
        onTurnedOff={() => {
          setKidsMode(false);
          // Return to the home screen Kids Mode was turned on from.
          const origin = sessionStorage.getItem('eos_kids_origin');
          sessionStorage.removeItem('eos_kids_origin');
          setTimeout(() => {
            window.location.href = createPageUrl(origin || (betaMode ? 'MobileOSBeta' : 'MobileOS'));
          }, 400);
        }}
        onEnabled={() => {
          setKidsMode(true);
          // Move to the dedicated Kids home screen.
          setTimeout(() => { window.location.href = createPageUrl('MobileOSKids'); }, 400);
        }}
      />
      <PermissionPrompt />
      <PiPLayer />
      </div>

      {/* EggSys on-screen keyboard — replaces the host (Android) soft keyboard */}
      <EggSysKeyboard />

      {/* Landscape overlay for phones — sits below the PC Sandbox so the
          sandbox stays usable in landscape (z-99999 > 99998) */}
      {isLandscape && !isTablet && (
        <div className="fixed inset-0 z-[99998]">
          <LandscapeWarning />
        </div>
      )}

      {/* PC Sandbox — owner-only landscape testing environment above the
          landscape warning so it's usable in landscape orientation */}
      {showPCSandbox && (
        <PCSandbox onClose={() => setShowPCSandbox(false)} />
      )}
    </>
  );
}