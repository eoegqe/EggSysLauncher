package com.theegget.eggsys;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.provider.Settings;
import android.Manifest;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

public class ManagerActivity extends Activity {
    private static final String PREFS = "eggsys_manager";
    private static final String VOLUME_SHORTCUT = "volume_shortcut_enabled";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    private ComponentName mode1;
    private ComponentName mode2;
    private LinearLayout content;
    private TextView status;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mode1 = new ComponentName(this, LauncherMode1Activity.class);
        mode2 = new ComponentName(this, LauncherMode2Activity.class);
        showSettings();
        requestRuntimePermissions();
    }

    private void requestRuntimePermissions() {
        List<String> permissions = new ArrayList<>();
        if (android.os.Build.VERSION.SDK_INT >= 23) {
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
                permissions.add(Manifest.permission.RECORD_AUDIO);
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
                permissions.add(Manifest.permission.CAMERA);
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED)
                permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (!permissions.isEmpty()) {
            requestPermissions(permissions.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    private void showSettings() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 32, 32, 0);

        TextView title = new TextView(this);
        title.setText("EggSys Manager");
        title.setTextSize(28);
        root.addView(title);

        LinearLayout tabs = new LinearLayout(this);
        tabs.setOrientation(LinearLayout.HORIZONTAL);

        Button behaviorTab = new Button(this);
        behaviorTab.setText("Behavior");
        Button settingsTab = new Button(this);
        settingsTab.setText("Settings");
        tabs.addView(behaviorTab, new LinearLayout.LayoutParams(0, -2, 1));
        tabs.addView(settingsTab, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(tabs);

        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(0, 24, 0, 32);

        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.addView(content);
        root.addView(scrollView, new LinearLayout.LayoutParams(-1, 0, 1));

        behaviorTab.setOnClickListener(v -> showBehaviorTab());
        settingsTab.setOnClickListener(v -> showSettingsTab());

        setContentView(root);
        showBehaviorTab();
    }

    private void showBehaviorTab() {
        content.removeAllViews();

        TextView heading = new TextView(this);
        heading.setText("Behavior");
        heading.setTextSize(22);
        content.addView(heading);

        TextView description = new TextView(this);
        description.setText("Choose which EggSys launcher is active. Only one launcher can be active at a time.");
        description.setTextSize(17);
        description.setPadding(0, 12, 0, 20);
        content.addView(description);

        status = new TextView(this);
        status.setText("Current launcher: " + currentMode());
        status.setTextSize(18);
        status.setPadding(0, 0, 0, 20);
        content.addView(status);

        Button webButton = new Button(this);
        webButton.setText("Activate Web");
        webButton.setOnClickListener(v -> switchMode(1));
        content.addView(webButton);

        Button osButton = new Button(this);
        osButton.setText("Activate OS");
        osButton.setOnClickListener(v -> switchMode(2));
        content.addView(osButton);

        Button disableButton = new Button(this);
        disableButton.setText("Deactivate Both");
        disableButton.setOnClickListener(v -> disableBoth());
        content.addView(disableButton);

        TextView shortcutHeading = new TextView(this);
        shortcutHeading.setText("Manager shortcut");
        shortcutHeading.setTextSize(20);
        shortcutHeading.setPadding(0, 28, 0, 8);
        content.addView(shortcutHeading);

        Switch shortcut = new Switch(this);
        shortcut.setText("Volume Up + Volume Down");
        shortcut.setTextSize(17);
        shortcut.setChecked(getPreferences(0).getBoolean(VOLUME_SHORTCUT, true));
        shortcut.setOnCheckedChangeListener((buttonView, isChecked) ->
            getPreferences(0).edit().putBoolean(VOLUME_SHORTCUT, isChecked).apply());
        content.addView(shortcut);

        TextView shortcutInfo = new TextView(this);
        shortcutInfo.setText("When enabled, pressing Volume Up and Volume Down together opens EggSys Manager.");
        shortcutInfo.setTextSize(15);
        shortcutInfo.setPadding(0, 4, 0, 0);
        content.addView(shortcutInfo);
    }

    private void showSettingsTab() {
        content.removeAllViews();

        TextView heading = new TextView(this);
        heading.setText("Settings");
        heading.setTextSize(22);
        content.addView(heading);

        TextView info = new TextView(this);
        info.setText("EggSys Manager settings and shortcuts.");
        info.setTextSize(17);
        info.setPadding(0, 20, 0, 20);
        content.addView(info);

        Switch overlay = new Switch(this);
        overlay.setText("Show Manager button at top of screen");
        overlay.setTextSize(17);
        overlay.setChecked(getPreferences(0).getBoolean("manager_overlay_enabled", false));
        overlay.setOnCheckedChangeListener((buttonView, isChecked) -> {
            getPreferences(0).edit().putBoolean("manager_overlay_enabled", isChecked).apply();
            if (!isAccessibilityServiceEnabled()) {
                try {
                    startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
                } catch (Exception ignored) {}
            }
        });
        content.addView(overlay);

        Switch volume = new Switch(this);
        volume.setText("Volume Up + Volume Down shortcut");
        volume.setTextSize(17);
        volume.setChecked(getPreferences(0).getBoolean(VOLUME_SHORTCUT, true));
        volume.setOnCheckedChangeListener((buttonView, isChecked) ->
            getPreferences(0).edit().putBoolean(VOLUME_SHORTCUT, isChecked).apply());
        content.addView(volume);

        TextView shortcutInfo = new TextView(this);
        shortcutInfo.setText("The accessibility service can provide the on-screen Manager button and a global Volume Up + Volume Down shortcut.");
        shortcutInfo.setTextSize(15);
        shortcutInfo.setPadding(0, 8, 0, 12);
        content.addView(shortcutInfo);

        Button accessibilitySettings = new Button(this);
        accessibilitySettings.setText("Open Accessibility settings");
        accessibilitySettings.setOnClickListener(v -> {
            try {
                startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
            } catch (Exception ignored) {}
        });
        content.addView(accessibilitySettings);

        Button androidSettings = new Button(this);
        androidSettings.setText("Open Android Home settings");
        androidSettings.setOnClickListener(v -> {
            try {
                startActivity(new Intent(Settings.ACTION_HOME_SETTINGS));
            } catch (Exception ignored) {
                startActivity(new Intent(Settings.ACTION_SETTINGS));
            }
        });
        content.addView(androidSettings);
    }

    private boolean isAccessibilityServiceEnabled() {
        String enabled = Settings.Secure.getString(
            getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabled == null) return false;
        ComponentName service = new ComponentName(this, ManagerAccessibilityService.class);
        return enabled.toLowerCase().contains(service.flattenToString().toLowerCase());
    }

    private void switchMode(int mode) {
        ComponentName enable = mode == 1 ? mode1 : mode2;
        ComponentName disable = mode == 1 ? mode2 : mode1;

        getPackageManager().setComponentEnabledSetting(enable,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
        getPackageManager().setComponentEnabledSetting(disable,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);

        try {
            Intent home = new Intent(Intent.ACTION_MAIN);
            home.addCategory(Intent.CATEGORY_HOME);
            home.addCategory(Intent.CATEGORY_DEFAULT);
            home.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(home);
        } catch (Exception ignored) {}

        showBehaviorTab();
    }

    private void disableBoth() {
        getPackageManager().setComponentEnabledSetting(mode1,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
        getPackageManager().setComponentEnabledSetting(mode2,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
        showBehaviorTab();
    }

    private String currentMode() {
        if (isEnabled(mode1)) return "Web";
        if (isEnabled(mode2)) return "OS";
        return "None";
    }

    private boolean isEnabled(ComponentName component) {
        return getPackageManager().getComponentEnabledSetting(component)
            == PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
    }
}
