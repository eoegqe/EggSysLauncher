package com.theegget.eggsys;

import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import androidx.core.app.NotificationCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

public abstract class LauncherBaseActivity extends Activity {
    private static final String HOST = "web-egget-system.base44.app";
    private static final String BASE_URL = "https://" + HOST + "/";
    private static final String NOTIFICATION_CHANNEL_ID = "eggsys_web";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1003;
    private static final int WEB_PERMISSION_REQUEST = 1001;
    private static final int GEO_PERMISSION_REQUEST = 1002;

    private boolean volumeUpDown;
    private boolean volumeShortcutTriggered;
    private final Handler volumeHandler = new Handler(Looper.getMainLooper());
    private final Runnable volumeUpLongPress = new Runnable() {
        @Override public void run() {
            if (volumeUpDown
                    && getSharedPreferences("eggsys_manager", MODE_PRIVATE)
                        .getBoolean("volume_shortcut_enabled", true)) {
                volumeShortcutTriggered = true;
                openManager();
            }
        }
    };
    protected WebView webView;

    private PermissionRequest pendingWebPermissionRequest;
    private GeolocationPermissions.Callback pendingGeolocationCallback;
    private String pendingGeolocationOrigin;
    private final AtomicInteger nextNotificationId = new AtomicInteger(2000);

    protected abstract int getMode();
    protected abstract String getPath();

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (android.os.Build.VERSION.SDK_INT >= 28) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        setContentView(webView);
        goImmersive();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);

        android.webkit.CookieManager cookies = android.webkit.CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        if (android.os.Build.VERSION.SDK_INT >= 21) {
            cookies.setAcceptThirdPartyCookies(webView, true);
        }
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);

        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_AUTHENTICATION)) {
            WebSettingsCompat.setWebAuthenticationSupport(
                s,
                WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_APP
            );
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermissionRequest(request));
            }

            @Override public void onGeolocationPermissionsShowPrompt(
                    String origin, GeolocationPermissions.Callback callback) {
                runOnUiThread(() -> handleGeolocationRequest(origin, callback));
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    // EggSys handles normal web browsing itself. Chrome is not required.
                    return false;
                }
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }

            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (url != null) {
                    Uri u = Uri.parse(url);
                    String scheme = u.getScheme();
                    if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                        return false;
                    }
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                    return true;
                }
                return false;
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Uri u = Uri.parse(url);
                if (HOST.equals(u.getHost())) installNotificationCompatibility();
            }
        });

        webView.addJavascriptInterface(new Bridge(), "EggSysOS");
        createNotificationChannel();

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else {
            String bootUrl = getIntent().getStringExtra("eggsys_boot_url");
            webView.loadUrl(bootUrl == null || bootUrl.isEmpty() ? BASE_URL + getPath() : bootUrl);
        }
    }

    private class Bridge {
        @JavascriptInterface public boolean open(String appId) {
            if (appId == null || appId.isEmpty() || !isTrustedPage()) return false;
            Intent i = getPackageManager().getLaunchIntentForPackage(appId);
            if (i == null) {
                runOnUiThread(() -> Toast.makeText(LauncherBaseActivity.this,
                    "App not installed: " + appId, Toast.LENGTH_SHORT).show());
                return false;
            }
            startActivity(i);
            return true;
        }

        @JavascriptInterface public boolean opensys(String url) {
            if (url == null || url.isEmpty() || !isTrustedPage()) return false;

            Uri uri;
            try {
                uri = Uri.parse(url);
            } catch (Exception ignored) {
                return false;
            }

            if (!"eggsys".equalsIgnoreCase(uri.getScheme())) return false;

            String route = uri.getHost();
            if (route == null) return false;

            if ("manager".equalsIgnoreCase(route)) {
                runOnUiThread(() -> openManager());
                return true;
            }

            return false;
        }

        @JavascriptInterface public int mode() {
            return getMode();
        }

        @JavascriptInterface public String fetchApps() {
            if (!isTrustedPage()) return "[]";

            JSONArray apps = new JSONArray();
            PackageManager pm = getPackageManager();
            Intent launcherIntent = new Intent(Intent.ACTION_MAIN);
            launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);

            try {
                for (android.content.pm.ResolveInfo info : pm.queryIntentActivities(launcherIntent, 0)) {
                    if (info == null || info.activityInfo == null) continue;

                    String packageName = info.activityInfo.packageName;
                    if (packageName == null || packageName.isEmpty()) continue;

                    try {
                        android.content.pm.ApplicationInfo appInfo =
                            info.activityInfo.applicationInfo;
                        CharSequence label = pm.getApplicationLabel(appInfo);
                        android.graphics.drawable.Drawable drawable = pm.getApplicationIcon(appInfo);

                        JSONObject app = new JSONObject();
                        app.put("id", packageName);
                        app.put("name", label == null ? packageName : label.toString());
                        app.put("icon", drawableToDataUri(drawable));
                        apps.put(app);
                    } catch (Exception ignored) {
                        // Skip applications whose metadata or icon cannot be read.
                    }
                }
            } catch (Exception ignored) {
                return "[]";
            }

            return apps.toString();
        }

        private String drawableToDataUri(android.graphics.drawable.Drawable drawable) {
            if (drawable == null) return "";

            int width = Math.max(1, drawable.getIntrinsicWidth());
            int height = Math.max(1, drawable.getIntrinsicHeight());
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, output);
            bitmap.recycle();

            return "data:image/png;base64,"
                + android.util.Base64.encodeToString(output.toByteArray(), android.util.Base64.NO_WRAP);
        }

        @JavascriptInterface public boolean notificationsSupported() {
            return android.os.Build.VERSION.SDK_INT < 33
                || checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface public void requestNotificationPermission() {
            if (android.os.Build.VERSION.SDK_INT >= 33
                    && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(
                    new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATION_PERMISSION_REQUEST
                );
            } else {
                sendNotificationPermissionResult(true);
            }
        }

        @JavascriptInterface public int notify(
                String title, String body, String icon, String tag,
                boolean silent, boolean requireInteraction) {
            if (!isTrustedPage() || !notificationsSupported()) return -1;

            int id = nextNotificationId.incrementAndGet();
            String safeTitle = title == null || title.isEmpty() ? "EggSys" : title;
            String safeBody = body == null ? "" : body;

            Intent launch = new Intent(LauncherBaseActivity.this, getClass());
            launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                LauncherBaseActivity.this,
                id,
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT
                    | (android.os.Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Builder builder =
                new NotificationCompat.Builder(LauncherBaseActivity.this, NOTIFICATION_CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle(safeTitle)
                    .setContentText(safeBody)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(safeBody))
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setOnlyAlertOnce(false)
                    .setOngoing(requireInteraction);

            if (silent) builder.setSilent(true);

            NotificationManager manager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) manager.notify(id, builder.build());

            return id;
        }

        @JavascriptInterface public void cancelNotification(int id) {
            if (!isTrustedPage() || id < 0) return;
            NotificationManager manager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) manager.cancel(id);
        }
    }

    private void installNotificationCompatibility() {
        webView.evaluateJavascript(
            "(function(){"
            + "if(window.__EggSysNotificationBridgeInstalled)return;"
            + "window.__EggSysNotificationBridgeInstalled=true;"
            + "if(!window.EggSysOS)return;"
            + "var pending=[];"
            + "window.__EggSysNotificationPermissionResult=function(ok){"
            + " var p=pending.splice(0,pending.length);"
            + " var status=ok?'granted':'denied';"
            + " for(var i=0;i<p.length;i++)p[i](status);"
            + "};"
            + "function Notification(title,options){"
            + " options=options||{};"
            + " if(Notification.permission==='denied')throw new TypeError('Notification permission denied');"
            + " this.title=String(title||'');"
            + " this.body=String(options.body||'');"
            + " this.tag=String(options.tag||'');"
            + " this.data=options.data;"
            + " this.silent=!!options.silent;"
            + " this.requireInteraction=!!options.requireInteraction;"
            + " this.icon=options.icon||options.badge||'';"
            + " this.permission=Notification.permission;"
            + " this._id=EggSysOS.notify(this.title,this.body,this.icon,this.tag,this.silent,this.requireInteraction);"
            + " this.onclick=null;this.onclose=null;this.onerror=null;this.onshow=null;"
            + " }"
            + " Object.defineProperty(Notification,'permission',{get:function(){return EggSysOS.notificationsSupported()?'granted':'default';}});"
            + " Notification.maxActions=0;"
            + " Notification.requestPermission=function(callback){"
            + "   return new Promise(function(resolve){"
            + "     if(EggSysOS.notificationsSupported()){resolve('granted');if(callback)callback('granted');return;}"
            + "     pending.push(function(status){resolve(status);if(callback)callback(status);});"
            + "     EggSysOS.requestNotificationPermission();"
            + "   });"
            + " };"
            + " Notification.prototype.close=function(){if(this._id>=0)EggSysOS.cancelNotification(this._id);if(this.onclose)this.onclose();};"
            + " window.Notification=Notification;"
            + " try{"
            + "   if(navigator.permissions&&navigator.permissions.query){"
            + "     var oldQuery=navigator.permissions.query.bind(navigator.permissions);"
            + "     navigator.permissions.query=function(desc){"
            + "       if(desc&&desc.name==='notifications')return Promise.resolve({state:Notification.permission==='granted'?'granted':'prompt'});"
            + "       return oldQuery(desc);"
            + "     };"
            + "   }"
            + " }catch(e){}"
            + "})();",
            null
        );
    }

    private void sendNotificationPermissionResult(boolean granted) {
        if (webView == null) return;
        webView.evaluateJavascript(
            "window.__EggSysNotificationPermissionResult && window.__EggSysNotificationPermissionResult("
                + (granted ? "true" : "false") + ");",
            null
        );
    }

    private void createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            NotificationManager manager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) {
                NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "EggSys Web",
                    NotificationManager.IMPORTANCE_DEFAULT
                );
                channel.setDescription("Notifications generated by the EggSys website");
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void handleWebPermissionRequest(PermissionRequest request) {
        if (request == null || request.getOrigin() == null
                || !HOST.equals(request.getOrigin().getHost())) {
            if (request != null) request.deny();
            return;
        }

        ArrayList<String> androidPermissions = new ArrayList<>();
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                    && android.os.Build.VERSION.SDK_INT >= 23
                    && checkSelfPermission(android.Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
                androidPermissions.add(android.Manifest.permission.CAMERA);
            }
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                    && android.os.Build.VERSION.SDK_INT >= 23
                    && checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                androidPermissions.add(android.Manifest.permission.RECORD_AUDIO);
            }
        }

        pendingWebPermissionRequest = request;
        if (androidPermissions.isEmpty()) {
            grantWebResourcesIfAllowed(request);
        } else if (android.os.Build.VERSION.SDK_INT >= 23) {
            requestPermissions(androidPermissions.toArray(new String[0]), WEB_PERMISSION_REQUEST);
        }
    }

    private void grantWebResourcesIfAllowed(PermissionRequest request) {
        if (request == null) return;
        ArrayList<String> allowed = new ArrayList<>();
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                    && (android.os.Build.VERSION.SDK_INT < 23
                    || checkSelfPermission(android.Manifest.permission.CAMERA)
                        == PackageManager.PERMISSION_GRANTED)) {
                allowed.add(resource);
            } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                    && (android.os.Build.VERSION.SDK_INT < 23
                    || checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)
                        == PackageManager.PERMISSION_GRANTED)) {
                allowed.add(resource);
            }
        }
        if (allowed.isEmpty()) request.deny();
        else request.grant(allowed.toArray(new String[0]));
        if (pendingWebPermissionRequest == request) pendingWebPermissionRequest = null;
    }

    private void handleGeolocationRequest(String origin, GeolocationPermissions.Callback callback) {
        if (origin == null || callback == null || !HOST.equals(Uri.parse(origin).getHost())) {
            if (callback != null) callback.invoke(origin, false, false);
            return;
        }

        pendingGeolocationOrigin = origin;
        pendingGeolocationCallback = callback;

        if (android.os.Build.VERSION.SDK_INT < 23
                || checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
            callback.invoke(origin, true, false);
            pendingGeolocationCallback = null;
            pendingGeolocationOrigin = null;
        } else {
            requestPermissions(
                new String[]{
                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                    android.Manifest.permission.ACCESS_COARSE_LOCATION
                },
                GEO_PERMISSION_REQUEST
            );
        }
    }

    @Override public void onRequestPermissionsResult(
            int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == WEB_PERMISSION_REQUEST && pendingWebPermissionRequest != null) {
            grantWebResourcesIfAllowed(pendingWebPermissionRequest);
        } else if (requestCode == GEO_PERMISSION_REQUEST && pendingGeolocationCallback != null) {
            boolean granted = false;
            for (int result : grantResults) {
                if (result == PackageManager.PERMISSION_GRANTED) {
                    granted = true;
                    break;
                }
            }
            pendingGeolocationCallback.invoke(pendingGeolocationOrigin, granted, false);
            pendingGeolocationCallback = null;
            pendingGeolocationOrigin = null;
        } else if (requestCode == NOTIFICATION_PERMISSION_REQUEST) {
            boolean granted = android.os.Build.VERSION.SDK_INT < 33
                || checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
            sendNotificationPermissionResult(granted);
        }
    }

    private boolean isTrustedPage() {
        String url = webView.getUrl();
        return url != null && HOST.equals(Uri.parse(url).getHost());
    }

    private void goImmersive() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override public boolean onKeyDown(int keyCode, android.view.KeyEvent event) {
        if (!getSharedPreferences("eggsys_manager", MODE_PRIVATE)
                .getBoolean("volume_shortcut_enabled", true)) {
            return super.onKeyDown(keyCode, event);
        }

        if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP) {
            if (event.getRepeatCount() == 0) {
                volumeUpDown = true;
                volumeShortcutTriggered = false;
                volumeHandler.postDelayed(volumeUpLongPress, 700);
            }
            // Do not consume the key: Android keeps normal volume control.
            return super.onKeyDown(keyCode, event);
        }

        return super.onKeyDown(keyCode, event);
    }

    @Override public boolean onKeyUp(int keyCode, android.view.KeyEvent event) {
        if (!getSharedPreferences("eggsys_manager", MODE_PRIVATE)
                .getBoolean("volume_shortcut_enabled", true)) {
            return super.onKeyUp(keyCode, event);
        }

        if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP) {
            volumeUpDown = false;
            volumeHandler.removeCallbacks(volumeUpLongPress);
            volumeShortcutTriggered = false;
            // Do not consume the key: Android keeps normal volume control.
            return super.onKeyUp(keyCode, event);
        }

        return super.onKeyUp(keyCode, event);
    }

    private void openManager() {
        volumeUpDown = false;
        volumeHandler.removeCallbacks(volumeUpLongPress);
        try { startActivity(new Intent(this, ManagerActivity.class)); } catch (Exception ignored) {}
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goImmersive();
    }

    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        webView.saveState(out);
    }

    @Override protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        webView.onResume();
    }
}
