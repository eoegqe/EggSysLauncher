import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { promptAction, confirmAction, alertAction } from '@/components/os/ConfirmDialog';
import { isReactZipApp, assembleReactZipHtml } from '@/lib/reactZip';
import { requestPermission } from '@/lib/appPermissions';
import { fetchReactZip } from '@/lib/reactZipStorage';
import { openPiP, closePiP } from '@/lib/pipManager';
import { musicController } from '@/lib/musicController';
import { requestSystemInstall } from '@/components/os/SystemInstallLayer';
import { setAppDataKey, getAppDataKey, removeAppDataKey, pushAppDataToEAccount } from '@/lib/appDataStore';

// JS API injected into every app iframe so app developers can call
// EggSys.closeApp() from a button to close their app inside EggetSystem.
const EGGSYS_API_SCRIPT = `<script>
(function(){
  if (window.EggSys) return;
  window.EggSys = {
    closeApp: function() {
      window.parent.postMessage({ type: 'eggsys_close_app', source: 'eggsys-app' }, '*');
    },
    notify: function(title, message) {
      window.parent.postMessage({ type: 'eggsys_notify', source: 'eggsys-app', title: title || 'Notification', message: message || '' }, '*');
    },
    notifyUser: function(recipient, title, message) {
      window.parent.postMessage({ type: 'eggsys_notify_user', source: 'eggsys-app', recipient: recipient || '', title: title || 'Notification', message: message || '' }, '*');
    },
    requestPermission: function(permission) {
      return new Promise(function(resolve) {
        var reqId = 'perm_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        var timer = setTimeout(function() {
          window.removeEventListener('message', onMsg);
          resolve('denied');
        }, 120000);
        function onMsg(e) {
          try {
            var d = e.data || {};
            if (d.type === 'eggsys_permission_result' && d.reqId === reqId) {
              clearTimeout(timer);
              window.removeEventListener('message', onMsg);
              resolve(d.result || 'denied');
            }
          } catch (err) {}
        }
        window.addEventListener('message', onMsg);
        window.parent.postMessage({ type: 'eggsys_request_permission', reqId: reqId, source: 'eggsys-app', permission: permission || '' }, '*');
      });
    },
    fullscn: function() {
      try {
        var el = document.documentElement;
        if (!document.fullscreenElement) {
          if (el.requestFullscreen) el.requestFullscreen();
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
      } catch (e) {}
    },
    UserInfo: function() {
      return new Promise(function(resolve) {
        var reqId = 'uinfo_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        var timer = setTimeout(function() {
          window.removeEventListener('message', onMsg);
          resolve(null);
        }, 3000);
        function onMsg(e) {
          try {
            var d = e.data || {};
            if (d.type === 'eggsys_userinfo' && d.reqId === reqId) {
              clearTimeout(timer);
              window.removeEventListener('message', onMsg);
              resolve(d.data || null);
            }
          } catch (err) {}
        }
        window.addEventListener('message', onMsg);
        window.parent.postMessage({ type: 'eggsys_get_userinfo', reqId: reqId, source: 'eggsys-app' }, '*');
      });
    },
    Email: function(subject, body) {
      return new Promise(function(resolve) {
        var reqId = 'email_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        var timer = setTimeout(function() {
          window.removeEventListener('message', onMsg);
          resolve({ success: false, error: 'timeout' });
        }, 15000);
        function onMsg(e) {
          try {
            var d = e.data || {};
            if (d.type === 'eggsys_email_result' && d.reqId === reqId) {
              clearTimeout(timer);
              window.removeEventListener('message', onMsg);
              resolve(d.result || { success: false });
            }
          } catch (err) {}
        }
        window.addEventListener('message', onMsg);
        window.parent.postMessage({ type: 'eggsys_email', reqId: reqId, source: 'eggsys-app', subject: subject || '', body: body || '' }, '*');
      });
    },
    webview: function(url) {
      window.parent.postMessage({ type: 'eggsys_webview', source: 'eggsys-app', url: url || '' }, '*');
    },
    prompt: function(message, defaultValue) {
      return new Promise(function(resolve) {
        var reqId = 'prompt_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        var timer = setTimeout(function() {
          window.removeEventListener('message', onMsg);
          resolve(null);
        }, 120000);
        function onMsg(e) {
          try {
            var d = e.data || {};
            if (d.type === 'eggsys_prompt_result' && d.reqId === reqId) {
              clearTimeout(timer);
              window.removeEventListener('message', onMsg);
              resolve(d.value);
            }
          } catch (err) {}
        }
        window.addEventListener('message', onMsg);
        window.parent.postMessage({ type: 'eggsys_prompt', reqId: reqId, source: 'eggsys-app', message: message || '', defaultValue: defaultValue || '' }, '*');
      });
    },
    confirm: function(message) {
      return new Promise(function(resolve) {
        var reqId = 'confirm_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        var timer = setTimeout(function() {
          window.removeEventListener('message', onMsg);
          resolve(false);
        }, 120000);
        function onMsg(e) {
          try {
            var d = e.data || {};
            if (d.type === 'eggsys_confirm_result' && d.reqId === reqId) {
              clearTimeout(timer);
              window.removeEventListener('message', onMsg);
              resolve(!!d.value);
            }
          } catch (err) {}
        }
        window.addEventListener('message', onMsg);
        window.parent.postMessage({ type: 'eggsys_confirm', reqId: reqId, source: 'eggsys-app', message: message || '' }, '*');
      });
    },
    alert: function(message) {
      return new Promise(function(resolve) {
        var reqId = 'alert_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        var timer = setTimeout(function() {
          window.removeEventListener('message', onMsg);
          resolve(true);
        }, 120000);
        function onMsg(e) {
          try {
            var d = e.data || {};
            if (d.type === 'eggsys_alert_result' && d.reqId === reqId) {
              clearTimeout(timer);
              window.removeEventListener('message', onMsg);
              resolve(true);
            }
          } catch (err) {}
        }
        window.addEventListener('message', onMsg);
        window.parent.postMessage({ type: 'eggsys_alert', reqId: reqId, source: 'eggsys-app', message: message || '' }, '*');
      });
    },
    requestPiP: function(title) {
      window.parent.postMessage({ type: 'eggsys_request_pip', source: 'eggsys-app', title: title || 'App', appId: window.location.pathname || 'app' }, '*');
    },
    closePiP: function() {
      window.parent.postMessage({ type: 'eggsys_close_pip', source: 'eggsys-app' }, '*');
    },
    // Open another EggetSystem app, optionally passing a page/param (e.g. a
    // Spotify playlist id). The target app reads it via EggSys.getLaunchPage().
    Redirect: function(appname, page) {
      window.parent.postMessage({ type: 'eggsys_redirect', source: 'eggsys-app', appname: appname || '', page: page || '' }, '*');
    },
    // Trigger an install prompt for an App Store app (used for ads and
    // creator cross-promotion). Looks up the PublishedApp by appId and shows
    // an install sheet. No-op if the app is already installed.
    install: function(appName, appId) {
      window.parent.postMessage({ type: 'eggsys_install', source: 'eggsys-app', appName: appName || '', appId: appId || '' }, '*');
    },
    Install: function(appName, appId) {
      window.EggSys.install(appName, appId);
    },
    // Returns a list of approved App Store apps: [{ app_id, name, ... }].
    // Lets embedded apps populate an app picker without a raw API call.
    listApps: function() {
      return new Promise(function(resolve) {
        var reqId = 'listapps_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        var timer = setTimeout(function() {
          window.removeEventListener('message', onMsg);
          resolve([]);
        }, 10000);
        function onMsg(e) {
          try {
            var d = e.data || {};
            if (d.type === 'eggsys_list_apps_result' && d.reqId === reqId) {
              clearTimeout(timer);
              window.removeEventListener('message', onMsg);
              resolve(d.apps || []);
            }
          } catch (err) {}
        }
        window.addEventListener('message', onMsg);
        window.parent.postMessage({ type: 'eggsys_list_apps', reqId: reqId, source: 'eggsys-app' }, '*');
      });
    },
    // Returns the page/param this app was opened with via EggSys.Redirect(),
    // then clears it so subsequent opens start fresh. null if none.
    getLaunchPage: function() {
      try {
        var p = sessionStorage.getItem('eggsys_launch_page');
        sessionStorage.removeItem('eggsys_launch_page');
        return p || null;
      } catch (e) { return null; }
    },
    // Report audio playback state to the system-wide music controller
    // (shown in the Control Center). state: { isPlaying, title, artist,
    // artwork, canSkip }. Call whenever playback changes; call clear() on stop.
    Music: {
      setPlayback: function(state) {
        window.parent.postMessage({ type: 'eggsys_music_state', source: 'eggsys-app', state: state || {} }, '*');
      },
      clear: function() {
        window.parent.postMessage({ type: 'eggsys_music_clear', source: 'eggsys-app' }, '*');
      },
      onControls: function(callback) {
        function onMsg(e) {
          try {
            var d = e.data || {};
            if (d.type === 'eggsys_music_control' && d.source === 'eggsys-host') {
              callback(d.action);
            }
          } catch (err) {}
        }
        window.addEventListener('message', onMsg);
        return function() { window.removeEventListener('message', onMsg); };
      }
    },
    // Persistent storage — saves app data to this device (cookies) and,
    // when online, syncs to your E-Account so it follows you across devices.
    // Each device keeps its own version; the Sync button restores missing data.
    Storage: {
      save: function(key, value) {
        return new Promise(function(resolve) {
          var reqId = 'storage_' + Date.now() + '_' + Math.random().toString(36).slice(2);
          function onMsg(e) {
            try {
              var d = e.data || {};
              if (d.type === 'eggsys_storage_result' && d.reqId === reqId) {
                window.removeEventListener('message', onMsg);
                resolve(d.success !== false);
              }
            } catch (err) {}
          }
          window.addEventListener('message', onMsg);
          window.parent.postMessage({ type: 'eggsys_storage_save', reqId: reqId, source: 'eggsys-app', key: key || '', value: value }, '*');
        });
      },
      load: function(key) {
        return new Promise(function(resolve) {
          var reqId = 'storage_' + Date.now() + '_' + Math.random().toString(36).slice(2);
          function onMsg(e) {
            try {
              var d = e.data || {};
              if (d.type === 'eggsys_storage_result' && d.reqId === reqId) {
                window.removeEventListener('message', onMsg);
                resolve(d.value);
              }
            } catch (err) {}
          }
          window.addEventListener('message', onMsg);
          window.parent.postMessage({ type: 'eggsys_storage_load', reqId: reqId, source: 'eggsys-app', key: key || '' }, '*');
        });
      },
      remove: function(key) {
        return new Promise(function(resolve) {
          var reqId = 'storage_' + Date.now() + '_' + Math.random().toString(36).slice(2);
          function onMsg(e) {
            try {
              var d = e.data || {};
              if (d.type === 'eggsys_storage_result' && d.reqId === reqId) {
                window.removeEventListener('message', onMsg);
                resolve(d.success !== false);
              }
            } catch (err) {}
          }
          window.addEventListener('message', onMsg);
          window.parent.postMessage({ type: 'eggsys_storage_remove', reqId: reqId, source: 'eggsys-app', key: key || '' }, '*');
        });
      }
    }
  };
})();
</script>`;

// When an AppFrame hosts a custom EAF installer, the EggSys.install() API
// is repurposed: calling it with NO arguments installs the EAF itself, and
// passing an app name/ID is invalid (it must not open the store). This
// override is injected after the standard API script so it redefines
// install() for installer contexts only.
function buildInstallerOverride(adminGranted) {
  return `<script>
(function(){
  if (!window.EggSys) return;
  window.EggSys.install = function(appName, appId) {
    return new Promise(function(resolve) {
      if (appName || appId) {
        window.parent.postMessage({ type: 'eggsys_install_invalid', source: 'eggsys-installer' }, '*');
        resolve({ success: false, error: 'invalid' });
        return;
      }
      var reqId = 'instself_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      function onMsg(e) {
        try {
          var d = e.data || {};
          if (d.type === 'eggsys_install_self_result' && d.reqId === reqId) {
            window.removeEventListener('message', onMsg);
            resolve(d.result || { success: false });
          }
        } catch (err) {}
      }
      window.addEventListener('message', onMsg);
      window.parent.postMessage({ type: 'eggsys_install_self', source: 'eggsys-installer', reqId: reqId, admin: ${adminGranted ? 'true' : 'false'} }, '*');
    });
  };
  window.EggSys.Install = window.EggSys.install;
})();
</script>`;
}

// Inject the API right after <head> (or <body> as a fallback) so it runs
// before the app's own scripts regardless of how the app HTML is structured.
function injectEggSysApi(html, installerMode) {
  const base = EGGSYS_API_SCRIPT + (installerMode ? buildInstallerOverride(installerMode.adminGranted) : '');
  if (!html) return base;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => m + base);
  }
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (m) => m + base);
  }
  return base + html;
}

export default function AppFrame({ htmlContent, appName, appId, onClose, onLaunchApp, userInfo, appData, installerMode, onInstallSelf, sandbox = 'allow-scripts allow-same-origin allow-fullscreen allow-popups allow-popups-to-escape-sandbox' }) {
  const iframeRef = useRef(null);
  const [webviewUrl, setWebviewUrl] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      if (e.data && e.data.type === 'eggsys_close_app') {
        onClose?.();
      } else if (e.data && e.data.type === 'eggsys_get_userinfo') {
        const win = iframeRef.current?.contentWindow;
        if (win) {
          win.postMessage({ type: 'eggsys_userinfo', reqId: e.data.reqId, data: userInfo || null }, '*');
        }
      } else if (e.data && e.data.type === 'eggsys_notify' && e.data.source === 'eggsys-app') {
        const username = userInfo?.username;
        if (!username) return;
        const appNameStr = appName || 'App';
        const title = e.data.title || 'Notification';
        const message = e.data.message || '';
        (async () => {
          const result = await requestPermission(appId, appNameStr, 'notifications');
          if (result !== 'while_using' && result !== 'only_once') return;
          base44.entities.Notification.create({
            title,
            message,
            recipient_username: username,
            type: 'message',
            source_app: appNameStr,
            read: false,
          }).catch(() => {});
        })();
      } else if (e.data && e.data.type === 'eggsys_notify_user' && e.data.source === 'eggsys-app') {
        const recipient = e.data.recipient;
        if (!recipient) return;
        const appNameStr = appName || 'App';
        const title = e.data.title || 'Notification';
        const message = e.data.message || '';
        (async () => {
          const result = await requestPermission(appId, appNameStr, 'notifications');
          if (result !== 'while_using' && result !== 'only_once') return;
          base44.entities.Notification.create({
            title,
            message,
            recipient_username: recipient,
            type: 'message',
            source_app: appNameStr,
            read: false,
          }).catch(() => {});
        })();
      } else if (e.data && e.data.type === 'eggsys_request_permission' && e.data.source === 'eggsys-app') {
        const win = iframeRef.current?.contentWindow;
        const perm = e.data.permission || 'notifications';
        (async () => {
          const result = await requestPermission(appId, appName || 'App', perm);
          if (win) win.postMessage({ type: 'eggsys_permission_result', reqId: e.data.reqId, result }, '*');
        })();
      } else if (e.data && e.data.type === 'eggsys_webview' && e.data.source === 'eggsys-app') {
        const url = e.data.url;
        if (url) {
          let full = url;
          if (!/^https?:\/\//i.test(full)) full = 'https://' + full;
          setWebviewUrl(full);
        }
      } else if (e.data && e.data.type === 'eggsys_email' && e.data.source === 'eggsys-app') {
        const win = iframeRef.current?.contentWindow;
        (async () => {
          let result = { success: false };
          try {
            const me = await base44.auth.me();
            const to = me?.email;
            if (!to) {
              result = { success: false, error: 'No email address on file for current user' };
            } else {
              await base44.integrations.Core.SendEmail({
                to,
                subject: e.data.subject || 'EggetSystem',
                body: e.data.body || '',
              });
              result = { success: true };
            }
          } catch (err) {
            result = { success: false, error: String(err?.message || err) };
          }
          if (win) win.postMessage({ type: 'eggsys_email_result', reqId: e.data.reqId, result }, '*');
        })();
      } else if (e.data && e.data.type === 'eggsys_prompt' && e.data.source === 'eggsys-app') {
        const win = iframeRef.current?.contentWindow;
        (async () => {
          let value = null;
          try {
            value = await promptAction(e.data.message || '', { defaultValue: e.data.defaultValue || '' });
          } catch (err) {
            value = null;
          }
          if (win) win.postMessage({ type: 'eggsys_prompt_result', reqId: e.data.reqId, value }, '*');
        })();
      } else if (e.data && e.data.type === 'eggsys_confirm' && e.data.source === 'eggsys-app') {
        const win = iframeRef.current?.contentWindow;
        (async () => {
          let value = false;
          try {
            value = await confirmAction(e.data.message || '');
          } catch (err) {
            value = false;
          }
          if (win) win.postMessage({ type: 'eggsys_confirm_result', reqId: e.data.reqId, value }, '*');
        })();
      } else if (e.data && e.data.type === 'eggsys_alert' && e.data.source === 'eggsys-app') {
        const win = iframeRef.current?.contentWindow;
        (async () => {
          try {
            await alertAction(e.data.message || '');
          } catch (err) {}
          if (win) win.postMessage({ type: 'eggsys_alert_result', reqId: e.data.reqId, value: true }, '*');
        })();
      } else if (e.data && e.data.type === 'eggsys_request_pip' && e.data.source === 'eggsys-app') {
        // App requested PiP — show a compact iframe preview of the app
        const pipId = `pip-${appId}`;
        const iframeEl = iframeRef.current;
        openPiP({
          id: pipId,
          title: e.data.title || appName || 'App',
          type: 'video',
          render: () => (
            <iframe
              srcDoc={iframeEl?.srcdoc}
              src={iframeEl?.src}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-fullscreen allow-popups"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              title={appName || 'PiP'}
            />
          ),
          onExpand: () => {
            // Restore full view — just close PiP, the app is still open
          },
          onClose: () => {},
        });
      } else if (e.data && e.data.type === 'eggsys_close_pip' && e.data.source === 'eggsys-app') {
        closePiP(`pip-${appId}`);
      } else if (e.data && e.data.type === 'eggsys_music_state' && e.data.source === 'eggsys-app') {
        // An iframe app reported audio playback state — register it as a
        // music source so the Control Center shows it alongside Spotify.
        const st = e.data.state || {};
        const win = iframeRef.current?.contentWindow;
        const sourceId = `app:${appId}`;
        musicController.registerSource(sourceId, {
          label: appName || 'App',
          isPlaying: !!st.isPlaying,
          currentTrack: {
            name: st.title || '',
            artist: st.artist || '',
            artwork: st.artwork || null,
          },
          playerReady: true,
          controls: {
            togglePlay: () => win?.postMessage({ type: 'eggsys_music_control', source: 'eggsys-host', action: 'toggle' }, '*'),
            nextTrack: st.canSkip === false ? null : () => win?.postMessage({ type: 'eggsys_music_control', source: 'eggsys-host', action: 'next' }, '*'),
            previousTrack: st.canSkip === false ? null : () => win?.postMessage({ type: 'eggsys_music_control', source: 'eggsys-host', action: 'previous' }, '*'),
          },
        });
      } else if (e.data && e.data.type === 'eggsys_music_clear' && e.data.source === 'eggsys-app') {
        musicController.unregisterSource(`app:${appId}`);
      } else if (e.data && e.data.type === 'eggsys_redirect' && e.data.source === 'eggsys-app') {
        // App asked to open another EggetSystem app with an optional page param.
        onLaunchApp?.(e.data.appname, e.data.page);
      } else if (e.data && e.data.type === 'eggsys_install' && e.data.source === 'eggsys-app') {
        // Only the requesting iframe may open the OS-owned install popup.
        if (e.source !== iframeRef.current?.contentWindow) return;
        requestSystemInstall(e.data.appName, e.data.appId);
      } else if (e.data && e.data.type === 'eggsys_list_apps' && e.data.source === 'eggsys-app') {
        const win = iframeRef.current?.contentWindow;
        (async () => {
          let apps = [];
          try {
            apps = await base44.entities.PublishedApp.filter({ status: 'approved' });
          } catch (err) { apps = []; }
          if (win) win.postMessage({ type: 'eggsys_list_apps_result', reqId: e.data.reqId, apps }, '*');
        })();
      } else if (e.data && e.data.type === 'eggsys_install_self' && e.data.source === 'eggsys-installer') {
        // Custom EAF installer asked to install its own EAF package.
        const win = iframeRef.current?.contentWindow;
        (async () => {
          let result = { success: false };
          try {
            if (onInstallSelf) {
              result = await onInstallSelf({ admin: !!e.data.admin });
            } else {
              result = { success: false, error: 'not supported' };
            }
          } catch (err) {
            result = { success: false, error: String(err?.message || err) };
          }
          if (win) win.postMessage({ type: 'eggsys_install_self_result', reqId: e.data.reqId, result }, '*');
        })();
      } else if (e.data && e.data.type === 'eggsys_install_invalid' && e.data.source === 'eggsys-installer') {
        // Installer called install() with args — invalid in installer context.
      } else if (e.data && e.data.type === 'eggsys_storage_save' && e.data.source === 'eggsys-app') {
        const win = iframeRef.current?.contentWindow;
        try {
          setAppDataKey(appId, e.data.key, e.data.value);
          pushAppDataToEAccount(appId, base44).catch(() => {});
          if (win) win.postMessage({ type: 'eggsys_storage_result', reqId: e.data.reqId, success: true }, '*');
        } catch (err) {
          if (win) win.postMessage({ type: 'eggsys_storage_result', reqId: e.data.reqId, success: false }, '*');
        }
      } else if (e.data && e.data.type === 'eggsys_storage_load' && e.data.source === 'eggsys-app') {
        const win = iframeRef.current?.contentWindow;
        const value = getAppDataKey(appId, e.data.key);
        if (win) win.postMessage({ type: 'eggsys_storage_result', reqId: e.data.reqId, value }, '*');
      } else if (e.data && e.data.type === 'eggsys_storage_remove' && e.data.source === 'eggsys-app') {
        const win = iframeRef.current?.contentWindow;
        try {
          removeAppDataKey(appId, e.data.key);
          if (win) win.postMessage({ type: 'eggsys_storage_result', reqId: e.data.reqId, success: true }, '*');
        } catch (err) {
          if (win) win.postMessage({ type: 'eggsys_storage_result', reqId: e.data.reqId, success: false }, '*');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      // App closed — drop its music source so the Control Center updates.
      musicController.unregisterSource(`app:${appId}`);
    };
  }, [onClose, onLaunchApp, userInfo, appId, appName, onInstallSelf]);

  const inlineReactZip = appData?.react_zip || appData?.app_data?.react_zip;
  const reactZipUrl = appData?.react_zip_url || appData?.app_data?.react_zip_url;
  const [fetchedReactZip, setFetchedReactZip] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    if (inlineReactZip || !reactZipUrl) return;
    let cancelled = false;
    setFetchFailed(false);
    fetchReactZip(reactZipUrl).then(data => {
      if (cancelled) return;
      if (data) setFetchedReactZip(data);
      else setFetchFailed(true);
    });
    return () => { cancelled = true; };
  }, [reactZipUrl, inlineReactZip]);

  const srcDoc = useMemo(() => {
    if (!isReactZipApp(htmlContent)) {
      return injectEggSysApi(htmlContent, installerMode);
    }
    const reactZip = inlineReactZip || fetchedReactZip;
    if (reactZip) {
      return injectEggSysApi(assembleReactZipHtml(reactZip), installerMode);
    }
    // Still loading or missing — show a placeholder so the iframe isn't blank.
    if (reactZipUrl && !fetchFailed) {
      return `<!DOCTYPE html><html><head><style>
        body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;background:#f9fafb;color:#6b7280;}
        .spin{width:28px;height:28px;border:3px solid #d1d5db;border-top-color:#3b82f6;border-radius:50%;animation:r .8s linear infinite;}
        @keyframes r{to{transform:rotate(360deg)}}
      </style></head><body><div class="spin"></div></body></html>`;
    }
    return `<!DOCTYPE html><html><head><style>
      body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;background:#f9fafb;color:#374151;text-align:center;padding:20px;}
      .box{max-width:320px;}
      h2{font-size:18px;margin:0 0 8px;}
      p{font-size:14px;color:#6b7280;margin:0;}
    </style></head><body><div class="box">
      <h2>⚠️ App data unavailable</h2>
      <p>This React app's source files could not be loaded. The app package may be too large or corrupted. Try re-creating or re-installing it.</p>
    </div></body></html>`;
  }, [htmlContent, inlineReactZip, fetchedReactZip, reactZipUrl, fetchFailed, installerMode]);

  return (
    <div className="h-full w-full overflow-auto">
      <iframe
        ref={iframeRef}
        src={webviewUrl || undefined}
        srcDoc={webviewUrl ? undefined : srcDoc}
        className="w-full h-full border-0"
        sandbox={webviewUrl ? 'allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-popups-to-escape-sandbox' : sandbox}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={appName || 'EggetSystem App'}
      />

    </div>
  );
}