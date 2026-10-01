package com.theegget.eggsys;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.HashSet;
import java.util.Set;

public class ManagerAccessibilityService extends AccessibilityService {
    private static final String PREFS = "eggsys_manager";
    private static final String BLOCKING_ENABLED = "block_non_allowed_apps";
    private static final String ALLOWED_APPS = "allowed_apps";
    private static final String MANAGER_PACKAGE = "com.theegget.eggsys";
    private static final String BOOT_SETTINGS_PACKAGE = MANAGER_PACKAGE;
    private static final long VOLUME_HOLD_MS = 3000;

    private WindowManager windowManager;
    private View overlay;
    private String blockedPackage;
    private boolean blockScreenShowing;
    private boolean closing;
    private boolean forceStopStarted;
    private long volumeDownAt;
    private boolean volumeTriggered;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private final Runnable volumeAction = () -> {
        if (volumeDownAt != 0 && !volumeTriggered) {
            volumeTriggered = true;
            openBootSettings();
        }
    };

    @Override public void onServiceConnected() {
        super.onServiceConnected();
        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            info.flags |= AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS
                    | AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
            setServiceInfo(info);
        }
    }

    @Override public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        String foreground = event.getPackageName() == null ? "" : event.getPackageName().toString();

        if (closing && isSettingsPackage(foreground)) {
            tryForceStop();
            return;
        }

        if (closing && !isSettingsPackage(foreground)
                && !foreground.equals(MANAGER_PACKAGE)
                && !foreground.equals(BOOT_SETTINGS_PACKAGE)) {
            return;
        }

        if (getSharedPreferences(PREFS, MODE_PRIVATE)
                .getBoolean(BLOCKING_ENABLED, false)) {
            if (isBlockedPackage(foreground)) {
                blockedPackage = foreground;
                closing = false;
                forceStopStarted = false;
                showBlockedScreen();
            } else if (blockedPackage != null
                    && blockScreenShowing
                    && !foreground.equals(blockedPackage)
                    && !foreground.equals(MANAGER_PACKAGE)) {
                beginClosing();
            }
        }
    }

    @Override public boolean onKeyEvent(KeyEvent event) {
        if (event == null || !getSharedPreferences(PREFS, MODE_PRIVATE)
                .getBoolean(BLOCKING_ENABLED, false)
                && !getSharedPreferences(PREFS, MODE_PRIVATE)
                .getBoolean("volume_shortcut_enabled", true)) {
            return false;
        }

        if (event.getKeyCode() != KeyEvent.KEYCODE_VOLUME_DOWN) return false;

        if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
            volumeDownAt = System.currentTimeMillis();
            volumeTriggered = false;
            handler.removeCallbacks(volumeAction);
            handler.postDelayed(volumeAction, VOLUME_HOLD_MS);
            return true;
        } else if (event.getAction() == KeyEvent.ACTION_UP) {
            volumeDownAt = 0;
            handler.removeCallbacks(volumeAction);
            return true;
        }
        return true;
    }

    @Override public void onInterrupt() {}

    private boolean isBlockedPackage(String pkg) {
        if (pkg == null || pkg.isEmpty()) return false;
        if (pkg.equals(MANAGER_PACKAGE) || pkg.equals(BOOT_SETTINGS_PACKAGE)
                || pkg.equals("android") || pkg.equals("com.android.systemui")
                || pkg.equals("com.android.settings")) return false;
        if (getAllowedApps().contains(pkg)) return false;

        try {
            android.content.pm.ApplicationInfo info =
                    getPackageManager().getApplicationInfo(pkg, 0);
            return (info.flags & android.content.pm.ApplicationInfo.FLAG_SYSTEM) == 0
                    && (info.flags & android.content.pm.ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private Set<String> getAllowedApps() {
        return new HashSet<>(getSharedPreferences(PREFS, MODE_PRIVATE)
                .getStringSet(ALLOWED_APPS, new HashSet<>()));
    }

    private void showBlockedScreen() {
        if (blockScreenShowing || windowManager == null) return;

        blockScreenShowing = true;
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(48, 48, 48, 48);
        box.setBackgroundColor(Color.BLACK);

        TextView title = new TextView(this);
        title.setText("App Blocked");
        title.setTextColor(Color.WHITE);
        title.setTextSize(30);
        title.setGravity(Gravity.CENTER);
        box.addView(title);

        TextView message = new TextView(this);
        message.setText("This app is blocked by EggSys Manager.");
        message.setTextColor(Color.WHITE);
        message.setTextSize(18);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, 20, 0, 30);
        box.addView(message);

        Button manager = new Button(this);
        manager.setText("Open EggSys Manager");
        manager.setOnClickListener(v -> {
            beginClosing();
            Intent i = new Intent(this, ManagerActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(i);
        });
        box.addView(manager);

        overlay = box;
        WindowManager.LayoutParams p = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        p.gravity = Gravity.CENTER;
        windowManager.addView(overlay, p);
    }

    private void beginClosing() {
        if (closing || blockedPackage == null) return;
        closing = true;
        forceStopStarted = false;
        showClosingScreen();
        handler.postDelayed(this::openBlockedAppInfo, 250);
    }

    private void showClosingScreen() {
        if (overlay != null && windowManager != null) {
            try { windowManager.removeView(overlay); } catch (Exception ignored) {}
            overlay = null;
        }

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(48, 48, 48, 48);
        box.setBackgroundColor(Color.BLACK);

        TextView title = new TextView(this);
        title.setText("Closing Blocked Apps");
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);
        box.addView(title);

        TextView message = new TextView(this);
        message.setText("EggSys Manager is closing blocked apps for you.");
        message.setTextColor(Color.WHITE);
        message.setTextSize(18);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, 20, 0, 0);
        box.addView(message);

        overlay = box;
        WindowManager.LayoutParams p = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        p.gravity = Gravity.CENTER;
        windowManager.addView(overlay, p);
    }

    private void openBlockedAppInfo() {
        if (!closing || blockedPackage == null || forceStopStarted) return;
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            i.setData(Uri.parse("package:" + blockedPackage));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception ignored) {}
    }

    private void tryForceStop() {
        if (forceStopStarted || !closing) return;

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        AccessibilityNodeInfo force = findNode(root,
                "Force stop", "FORCE STOP", "Force Stop", "Stop");
        if (force != null && force.isClickable()) {
            forceStopStarted = true;
            force.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            handler.postDelayed(this::confirmForceStop, 300);
        } else if (force != null) {
            AccessibilityNodeInfo parent = force.getParent();
            if (parent != null && parent.isClickable()) {
                forceStopStarted = true;
                parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                handler.postDelayed(this::confirmForceStop, 300);
            }
        }
    }

    private void confirmForceStop() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;
        AccessibilityNodeInfo confirm = findNode(root,
                "OK", "Ok", "ok", "Force stop", "FORCE STOP");
        if (confirm != null && confirm.isClickable()) {
            confirm.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        }
        handler.postDelayed(this::finishClosing, 700);
    }

    private void finishClosing() {
        if (overlay != null && windowManager != null) {
            try { windowManager.removeView(overlay); } catch (Exception ignored) {}
            overlay = null;
        }
        blockScreenShowing = false;
        closing = false;
        forceStopStarted = false;
        blockedPackage = null;
        Intent i = new Intent(this, ManagerActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        try { startActivity(i); } catch (Exception ignored) {}
    }

    private AccessibilityNodeInfo findNode(AccessibilityNodeInfo root, String... labels) {
        for (String label : labels) {
            java.util.List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(label);
            if (nodes != null && !nodes.isEmpty()) return nodes.get(0);
        }
        return null;
    }

    private boolean isSettingsPackage(String pkg) {
        return "com.android.settings".equals(pkg);
    }

    private void openBootSettings() {
        Intent i = new Intent();
        i.setComponent(new ComponentName(
                BOOT_SETTINGS_PACKAGE,
                BOOT_SETTINGS_PACKAGE + ".MainActivity"));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        try { startActivity(i); } catch (Exception ignored) {}
    }

    @Override public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (overlay != null && windowManager != null) {
            try { windowManager.removeView(overlay); } catch (Exception ignored) {}
        }
        super.onDestroy();
    }
}
