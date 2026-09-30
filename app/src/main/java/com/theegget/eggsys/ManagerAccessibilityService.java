package com.theegget.eggsys;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;

public class ManagerAccessibilityService extends AccessibilityService {
    private static final String PREFS = "eggsys_manager";
    private static final String OVERLAY_ENABLED = "manager_overlay_enabled";
    private static final String VOLUME_SHORTCUT = "volume_shortcut_enabled";

    private WindowManager windowManager;
    private Button managerButton;

    @Override public void onServiceConnected() {
        super.onServiceConnected();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(OVERLAY_ENABLED, false)) {
            showButton();
        }
    }

    @Override public void onAccessibilityEvent(android.view.accessibility.AccessibilityEvent event) {
        boolean enabled = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(OVERLAY_ENABLED, false);
        if (enabled) showButton();
        else hideButton();
    }

    @Override public void onInterrupt() {}

    @Override public boolean onKeyEvent(KeyEvent event) {
        if (!getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(VOLUME_SHORTCUT, true)) {
            return false;
        }

        if (event.getAction() == KeyEvent.ACTION_DOWN &&
                (event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_UP ||
                 event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_DOWN)) {
            int key = event.getKeyCode();
            long now = System.currentTimeMillis();
            if (key == KeyEvent.KEYCODE_VOLUME_UP) {
                volumeUpAt = now;
            } else {
                volumeDownAt = now;
            }
            if (volumeUpAt != 0 && volumeDownAt != 0 &&
                    Math.abs(volumeUpAt - volumeDownAt) <= 350) {
                volumeUpAt = 0;
                volumeDownAt = 0;
                openManager();
            }
            return true;
        }
        return false;
    }

    private long volumeUpAt;
    private long volumeDownAt;

    public void showButton() {
        if (managerButton != null || windowManager == null) return;

        managerButton = new Button(this);
        managerButton.setText("Manager");
        managerButton.setTextSize(12);
        managerButton.setOnClickListener(v -> openManager());

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.END;
        params.y = 8;
        params.x = 8;

        windowManager.addView(managerButton, params);
    }

    public void hideButton() {
        if (managerButton != null && windowManager != null) {
            windowManager.removeView(managerButton);
            managerButton = null;
        }
    }

    private void openManager() {
        Intent intent = new Intent(this, ManagerActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
    }

    @Override public void onDestroy() {
        hideButton();
        super.onDestroy();
    }
}