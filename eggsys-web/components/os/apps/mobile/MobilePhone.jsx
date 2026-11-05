import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, User, Server, FlaskConical, Settings } from 'lucide-react';
import { toast } from '@/lib/devToast';
import { useContacts } from '@/hooks/useContacts';
import { requestPermission } from '@/lib/appPermissions';
import { getUserThemeGradient } from '@/lib/themeUtils';
import TestCallModal from './TestCallModal';
import PhoneSettingsView from './PhoneSettingsView';
import { getKidsAllowedContacts, THEEGGET_USERNAME } from '@/lib/kidsMode';

export default function MobilePhone({ esimActive = true, onLaunchApp, mobileDataEnabled = true, onClose, kidsMode = false }) {
  const { contacts } = useContacts();
  const [showTestCall, setShowTestCall] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [callerIdInput, setCallerIdInput] = useState('');
  const [savingCallerId, setSavingCallerId] = useState(false);
  const [uploadingRingtone, setUploadingRingtone] = useState(false);
  const [testCallEnabled, setTestCallEnabled] = useState(() => localStorage.getItem('eos_test_call_enabled') !== 'false');
  const [vibrateEnabled, setVibrateEnabled] = useState(() => localStorage.getItem('eos_vibrate_enabled') !== 'false');
  const [useHomeBgEnabled, setUseHomeBgEnabled] = useState(() => localStorage.getItem('eos_use_home_background') !== 'false');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-phone'],
    queryFn: () => base44.auth.me()
  });

  const accent = getUserThemeGradient(currentUser, 'from-green-500 to-emerald-600');

  useEffect(() => {
    if (currentUser?.caller_id !== undefined) setCallerIdInput(currentUser.caller_id || '');
  }, [currentUser?.caller_id]);

  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed-apps-phone'],
    queryFn: () => base44.entities.InstalledApp.list('-created_date')
  });

  const { data: eggSysApps = [] } = useQuery({
    queryKey: ['egg-sys-apps-phone'],
    queryFn: () => base44.entities.EggSysApps.filter({ app_type: 'service' })
  });

  // The Phone service is the official service linked to the built-in 'phone' app
  const phoneService = eggSysApps.find(a => a.linked_service_id === 'phone');
  const phoneServiceAppId = phoneService?.app_id;

  // Built-in services are installed by default. The Phone service is considered
  // installed unless an explicit uninstall tombstone exists for it.
  const phoneTombstoneExists = installedApps.some(
    a => a.app_data?.app_type === 'service' && a.app_data?.is_uninstalled === true &&
      (a.app_data?.linked_service_id === 'phone' || (phoneServiceAppId && a.app_id === phoneServiceAppId))
  );
  const phoneServiceInstalled = !!phoneService && !phoneTombstoneExists;

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-phone'],
    queryFn: async () => {
      const users = await base44.entities.User.list('-created_date');
      return users.filter(u => u.username && u.username !== currentUser?.username);
    },
    enabled: !!currentUser?.username
  });

  const handleCall = async (user) => {
    if (!mobileDataEnabled) {
      window.dispatchEvent(new CustomEvent('eos_no_service', { detail: { app: 'Phone' } }));
      return;
    }
    if (!esimActive) {
      toast.error('Mobile network not reachable');
      return;
    }
    const isSelfCall = user.username === currentUser.username;
    try {
      const granted = await requestPermission('phone', 'Phone', 'microphone');
      if (granted !== 'while_using' && granted !== 'only_once') { toast.error('Microphone permission denied'); return; }

      const startCall = async () => {
        const call = await base44.entities.Call.create({
          caller_username: currentUser.username,
          recipient_username: user.username,
          status: 'ringing',
          started_at: new Date().toISOString()
        });
        sessionStorage.setItem('eos_outgoing_call', call.id);
        // Skip the incoming-call notification for self-calls — the call screen
        // appears directly (caller side). A missed-call notification is created
        // by GlobalCallMonitor after the call ends.
        if (!isSelfCall) {
          const callerId = currentUser.caller_id?.trim();
          const notifPerm = await requestPermission('phone', 'Phone', 'notifications');
          if (notifPerm === 'while_using' || notifPerm === 'only_once') {
            await base44.entities.Notification.create({
              title: `Call from @${currentUser.username}`,
              message: `${callerId || currentUser.full_name || currentUser.username} is calling you`,
              recipient_username: user.username,
              type: 'message',
              related_id: call.id,
              read: false
            });
          }
        }
        toast.success(`Calling @${user.username}...`);
      };

      if (isSelfCall) {
        // Close the Phone app immediately, wait 5 seconds, then start the call.
        onClose?.();
        setTimeout(() => startCall().catch(() => toast.error('Failed to start call')), 5000);
      } else {
        await startCall();
      }
    } catch (error) {
      toast.error(error.name === 'NotAllowedError' ? 'Microphone permission denied' : 'Failed to start call');
    }
  };

  const handleSaveCallerId = async () => {
    setSavingCallerId(true);
    try {
      await base44.auth.updateMe({ caller_id: callerIdInput.trim() });
      queryClient.invalidateQueries({ queryKey: ['current-user-phone'] });
      toast.success('Caller ID updated');
    } catch {
      toast.error('Failed to save caller ID');
    } finally {
      setSavingCallerId(false);
    }
  };

  const handleRingtoneUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRingtone(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ ringtone_url: file_url });
      queryClient.invalidateQueries({ queryKey: ['current-user-phone'] });
      toast.success('Ringtone updated!');
    } catch {
      toast.error('Failed to upload ringtone');
    } finally {
      setUploadingRingtone(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRingtoneRemove = async () => {
    try {
      await base44.auth.updateMe({ ringtone_url: '' });
      queryClient.invalidateQueries({ queryKey: ['current-user-phone'] });
      toast.success('Ringtone removed');
    } catch {
      toast.error('Failed to remove ringtone');
    }
  };

  const toggleTestCall = (v) => {
    setTestCallEnabled(v);
    localStorage.setItem('eos_test_call_enabled', String(v));
  };

  const toggleVibrate = (v) => {
    setVibrateEnabled(v);
    localStorage.setItem('eos_vibrate_enabled', String(v));
  };

  const toggleUseHomeBg = (v) => {
    setUseHomeBgEnabled(v);
    localStorage.setItem('eos_use_home_background', String(v));
  };

  const blockedUsernames = currentUser?.blocked_usernames || [];
  const contactUsernames = contacts.map(c => c.contact_username);
  const contactUsers = allUsers.filter(u => contactUsernames.includes(u.username) && !blockedUsernames.includes(u.username));
  const isOwner = currentUser?.admin_role === 'owner';

  // Kids Mode: only Theegget + parent-approved contacts may be called. Build the
  // list from real users when available, and always include a Theegget entry.
  const kidsAllowed = getKidsAllowedContacts();
  const kidsContactUsers = allUsers.filter((u) => kidsAllowed.includes(u.username));
  if (!kidsContactUsers.some((u) => u.username === THEEGGET_USERNAME)) {
    kidsContactUsers.unshift({
      username: THEEGGET_USERNAME,
      full_name: 'Theegget',
      verified: true,
    });
  }
  const visibleContacts = kidsMode ? kidsContactUsers : contactUsers;

  if (!currentUser?.username) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-800 mb-2">Username Required</h3>
          <p className="text-sm text-gray-600">Set up your username in Settings to make calls</p>
        </div>
      </div>
    );
  }

  if (!phoneServiceInstalled) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className={`p-4 bg-gradient-to-r ${accent} text-white`}>
          <h2 className="text-xl font-bold">Phone</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Server className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Phone services failed to open</h3>
            <p className="text-sm text-gray-500">app not installed</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className={`p-4 bg-gradient-to-r ${accent} text-white`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">Phone</h2>
            <p className="text-xs opacity-80">Add contacts in the Contacts app to call them</p>
          </div>
          {!kidsMode && (
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
            title="Phone Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          )}
        </div>
      </div>

      {showSettings ? (
        <PhoneSettingsView
          currentUser={currentUser}
          callerIdInput={callerIdInput}
          setCallerIdInput={setCallerIdInput}
          onSaveCallerId={handleSaveCallerId}
          savingCallerId={savingCallerId}
          uploadingRingtone={uploadingRingtone}
          onRingtoneUpload={handleRingtoneUpload}
          onRingtoneRemove={handleRingtoneRemove}
          showTestCallToggle={isOwner}
          testCallEnabled={testCallEnabled}
          onToggleTestCall={toggleTestCall}
          vibrateEnabled={vibrateEnabled}
          onToggleVibrate={toggleVibrate}
          useHomeBackground={useHomeBgEnabled}
          onToggleUseHomeBackground={toggleUseHomeBg}
          onBack={() => setShowSettings(false)}
        />
      ) : (
      <div className="flex-1 overflow-auto">
        <div className="p-2">
          {isOwner && testCallEnabled && !kidsMode && (
            <div className="mb-2">
              <div className="px-3 pb-1 pt-2 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-500">Test</p>
              </div>
              <div className="w-full flex items-center gap-3 p-3 bg-purple-50/60 rounded-xl">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-800">Test Call</p>
                  <p className="text-sm text-gray-500">Simulate incoming &amp; outgoing calls</p>
                </div>
                <button
                  onClick={() => setShowTestCall(true)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow active:scale-95 transition-transform"
                  title="Test Call"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {visibleContacts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{kidsMode ? 'No allowed contacts' : 'No contacts yet'}</p>
              <p className="text-xs mt-1">{kidsMode ? 'Ask a parent to approve contacts' : 'Add contacts in the Contacts app'}</p>
            </div>
          ) : (
            visibleContacts.map(user => (
              <div
                key={user.id}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-800">@{user.username}</p>
                  <p className="text-sm text-gray-500">{user.full_name || 'No name set'}</p>
                </div>
                <button
                  onClick={() => handleCall(user)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow active:scale-95 transition-transform"
                  title="Call"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {showTestCall && (
        <TestCallModal currentUser={currentUser} esimActive={esimActive} onClose={() => setShowTestCall(false)} onCloseApp={onClose} />
      )}
    </div>
  );
}