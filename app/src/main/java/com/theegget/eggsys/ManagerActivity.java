package com.theegget.eggsys;

import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class ManagerActivity extends Activity {
    private static final String PREFS = "eggsys_manager";
    private static final String BOOTABLE = "eggsys_bootable";
    private static final String BLOCKING_ENABLED = "block_non_allowed_apps";
    private static final String ALLOWED_APPS = "allowed_apps";
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final int DEVICE_ADMIN_REQUEST = 1002;
    private static final long BOOT_SETTINGS_HOLD_MS = 3000;

    private ComponentName mode1;
    private ComponentName mode2;
    private LinearLayout content;
    private TextView status;
    private final Handler volumeHandler = new Handler();
    private boolean volumeDownHeld;
    private boolean bootSettingsOpened;

    private final Runnable bootSettingsAction = () -> {
        if (!volumeDownHeld || bootSettingsOpened) return;
        bootSettingsOpened = true;
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(
            "com.theegget.eggsys",
            "com.theegget.eggsys.bootsettings.MainActivity"
        ));
        try {
            startActivity(intent);
        } catch (Exception ignored) {}
    };

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (android.os.Build.VERSION.SDK_INT >= 28) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
        }

        mode1 = new ComponentName(this, LauncherMode1Activity.class);
        mode2 = new ComponentName(this, LauncherMode2Activity.class);

        showSettings();
        requestRuntimePermissions();

        if (getIntent().getBooleanExtra("boot_settings_mode", false)) {
            applyBootMode(getIntent().getIntExtra("boot_settings_mode", 1));
        } else if (getIntent().hasExtra("boot_settings_mode")) {
            applyBootMode(getIntent().getIntExtra("boot_settings_mode", 1));
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.hasExtra("boot_settings_mode")) {
            applyBootMode(intent.getIntExtra("boot_settings_mode", 1));
        }
    }

    private void requestRuntimePermissions() {
        List<String> permissions = new ArrayList<>();
        if (android.os.Build.VERSION.SDK_INT >= 23) {
            if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
                permissions.add(android.Manifest.permission.RECORD_AUDIO);
            if (checkSelfPermission(android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
                permissions.add(android.Manifest.permission.CAMERA);
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED)
                permissions.add(android.Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(android.Manifest.permission.POST_NOTIFICATIONS);
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

        TextView hint = new TextView(this);
        hint.setText("Hold Volume Down for 3 seconds while this screen is open to enter hidden Boot Settings.");
        hint.setTextSize(15);
        hint.setPadding(0, 8, 0, 16);
        root.addView(hint);

        LinearLayout tabs = new LinearLayout(this);
        Button behaviorTab = new Button(this);
        behaviorTab.setText("Boot");
        Button appsTab = new Button(this);
        appsTab.setText("Apps");
        Button settingsTab = new Button(this);
        settingsTab.setText("Manager");
        tabs.addView(behaviorTab, new LinearLayout.LayoutParams(0, -2, 1));
        tabs.addView(appsTab, new LinearLayout.LayoutParams(0, -2, 1));
        tabs.addView(settingsTab, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(tabs);

        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(0, 24, 0, 32);

        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.addView(content);
        root.addView(scrollView, new LinearLayout.LayoutParams(-1, 0, 1));

        behaviorTab.setOnClickListener(v -> showBootTab());
        appsTab.setOnClickListener(v -> showAppsTab());
        settingsTab.setOnClickListener(v -> showManagerTab());

        setContentView(root);
        showBootTab();
    }

    private void showBootTab() {
        content.removeAllViews();

        TextView heading = new TextView(this);
        heading.setText("EggSys Bootable");
        heading.setTextSize(22);
        content.addView(heading);

        TextView description = new TextView(this);
        description.setText("When off, EggSys Manager does not participate in the EggSys launcher modes. When on, Mode 1 is enabled so Android can use it as the default Home launcher.");
        description.setTextSize(16);
        description.setPadding(0, 12, 0, 20);
        content.addView(description);

        Switch bootable = new Switch(this);
        bootable.setText("EggSys Bootable");
        bootable.setTextSize(18);
        bootable.setChecked(getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(BOOTABLE, false));
        bootable.setOnCheckedChangeListener((button, checked) -> {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(BOOTABLE, checked).apply();
            if (checked) {
                applyBootMode(1);
            } else {
                disableBothLaunchers();
            }
            updateBootStatus();
        });
        content.addView(bootable);

        status = new TextView(this);
        status.setTextSize(17);
        status.setPadding(0, 16, 0, 16);
        content.addView(status);
        updateBootStatus();

        Button homeSettings = new Button(this);
        homeSettings.setText("Open Android Home settings");
        homeSettings.setOnClickListener(v -> openHomeSettings());
        content.addView(homeSettings);
    }

    private void updateBootStatus() {
        if (status == null) return;
        boolean bootable = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(BOOTABLE, false);
        status.setText("EggSys Bootable: " + (bootable ? "ON" : "OFF") +
            "\nActive launcher mode: " + currentMode());
    }

    private void showAppsTab() {
        content.removeAllViews();

        TextView heading = new TextView(this);
        heading.setText("App Blocking");
        heading.setTextSize(22);
        content.addView(heading);

        TextView description = new TextView(this);
        description.setText("When enabled, user-installed apps that are not allowed below are blocked by EggSys Manager.");
        description.setTextSize(16);
        description.setPadding(0, 12, 0, 16);
        content.addView(description);

        Switch blocking = new Switch(this);
        blocking.setText("Block apps that are not allowed");
        blocking.setTextSize(17);
        blocking.setChecked(getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(BLOCKING_ENABLED, false));
        blocking.setOnCheckedChangeListener((button, checked) ->
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(BLOCKING_ENABLED, checked).apply());
        content.addView(blocking);

        TextView accessibilityInfo = new TextView(this);
        accessibilityInfo.setText("Accessibility access is required for foreground detection and for the closing-blocked-apps sequence.");
        accessibilityInfo.setTextSize(14);
        accessibilityInfo.setPadding(0, 8, 0, 12);
        content.addView(accessibilityInfo);

        Button accessibility = new Button(this);
        accessibility.setText("Open Accessibility settings");
        accessibility.setOnClickListener(v -> openAccessibilitySettings());
        content.addView(accessibility);

        TextView allowedHeading = new TextView(this);
        allowedHeading.setText("Allowed apps");
        allowedHeading.setTextSize(20);
        allowedHeading.setPadding(0, 24, 0, 8);
        content.addView(allowedHeading);

        TextView allowedInfo = new TextView(this);
        allowedInfo.setText("Checked apps are never blocked. System apps and EggSys components are always allowed.");
        allowedInfo.setTextSize(14);
        allowedInfo.setPadding(0, 0, 0, 12);
        content.addView(allowedInfo);

        Set<String> allowed = getAllowedApps();
        List<ApplicationInfo> apps = new ArrayList<>();
        for (ApplicationInfo app : getPackageManager().getInstalledApplications(PackageManager.GET_META_DATA)) {
            if (isUserApp(app) && !app.packageName.equals(getPackageName())) apps.add(app);
        }
        Collections.sort(apps, Comparator.comparing(a -> String.valueOf(a.loadLabel(getPackageManager())).toLowerCase()));

        for (ApplicationInfo app : apps) {
            CheckBox check = new CheckBox(this);
            CharSequence label = app.loadLabel(getPackageManager());
            check.setText(label + "\n" + app.packageName);
            check.setTextSize(15);
            check.setChecked(allowed.contains(app.packageName));
            check.setOnCheckedChangeListener((button, checked) -> {
                Set<String> current = getAllowedApps();
                if (checked) current.add(app.packageName);
                else current.remove(app.packageName);
                saveAllowedApps(current);
            });
            content.addView(check);
        }
    }

    private boolean isUserApp(ApplicationInfo app) {
        int flags = app.flags;
        return (flags & ApplicationInfo.FLAG_SYSTEM) == 0 &&
               (flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0;
    }

    private Set<String> getAllowedApps() {
        return new HashSet<>(getSharedPreferences(PREFS, MODE_PRIVATE)
            .getStringSet(ALLOWED_APPS, new HashSet<>()));
    }

    private void saveAllowedApps(Set<String> apps) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
            .putStringSet(ALLOWED_APPS, new HashSet<>(apps)).apply();
    }

    private void showManagerTab() {
        content.removeAllViews();

        TextView heading = new TextView(this);
        heading.setText("Manager");
        heading.setTextSize(22);
        content.addView(heading);

        Button settingsAppButton = new Button(this);
        settingsAppButton.setText("Open EggSys Settings");
        settingsAppButton.setOnClickListener(v -> {
            Intent intent = new Intent();
            intent.setComponent(new ComponentName(
                "com.theegget.eggsys",
                "com.eggsys.settings.MainActivity"
            ));
            try { startActivity(intent); }
            catch (Exception ignored) {}
        });
        content.addView(settingsAppButton);

        Button keyboardSettings = new Button(this);
        keyboardSettings.setText("Open keyboard settings");
        keyboardSettings.setOnClickListener(v -> {
            try { startActivity(new Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)); }
            catch (Exception ignored) {}
        });
        content.addView(keyboardSettings);

        Button chooseKeyboard = new Button(this);
        chooseKeyboard.setText("Choose EggSys Keyboard");
        chooseKeyboard.setOnClickListener(v -> {
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) imm.showInputMethodPicker();
        });
        content.addView(chooseKeyboard);

        Button adminButton = new Button(this);
        adminButton.setText("Enable EggSys device administrator");
        adminButton.setOnClickListener(v -> requestDeviceAdmin());
        content.addView(adminButton);

        Button overlayButton = new Button(this);
        overlayButton.setText("Allow display over other apps");
        overlayButton.setOnClickListener(v -> openOverlaySettings());
        content.addView(overlayButton);

        Button systemSettingsButton = new Button(this);
        systemSettingsButton.setText("Allow modify system settings");
        systemSettingsButton.setOnClickListener(v -> openWriteSettings());
        content.addView(systemSettingsButton);

        Button lockScreenButton = new Button(this);
        lockScreenButton.setText("Disable lock screen");
        lockScreenButton.setOnClickListener(v -> disableKeyguard());
        content.addView(lockScreenButton);

        Switch overlay = new Switch(this);
        overlay.setText("Show Manager button at top of screen");
        overlay.setTextSize(17);
        overlay.setChecked(getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean("manager_overlay_enabled", false));
        overlay.setOnCheckedChangeListener((buttonView, isChecked) -> {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("manager_overlay_enabled", isChecked).apply();
            if (!isAccessibilityServiceEnabled()) openAccessibilitySettings();
        });
        content.addView(overlay);

        TextView info = new TextView(this);
        info.setText("The keyboard is a normal Android keyboard. Its bottom-left ⚙ button opens EggSys Manager.");
        info.setTextSize(15);
        info.setPadding(0, 16, 0, 12);
        content.addView(info);
    }

    private void requestDeviceAdmin() {
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
        ComponentName admin = new ComponentName(this, EggSysDeviceAdminReceiver.class);
        if (dpm != null && dpm.isAdminActive(admin)) {
            disableKeyguard();
            return;
        }
        Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, admin);
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
            "EggSys uses device administrator access for its lock-screen setting.");
        try { startActivityForResult(intent, DEVICE_ADMIN_REQUEST); } catch (Exception ignored) {}
    }

    private void disableKeyguard() {
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
        ComponentName admin = new ComponentName(this, EggSysDeviceAdminReceiver.class);
        if (dpm == null) return;
        if (!dpm.isAdminActive(admin)) {
            requestDeviceAdmin();
            return;
        }
        if (android.os.Build.VERSION.SDK_INT >= 23 && !Settings.System.canWrite(this)) {
            openWriteSettings();
            return;
        }
        try { dpm.setKeyguardDisabled(admin, true); } catch (SecurityException ignored) {}
    }

    private void openWriteSettings() {
        if (android.os.Build.VERSION.SDK_INT < 23) return;
        try {
            startActivity(new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS,
                Uri.parse("package:" + getPackageName())));
        } catch (Exception ignored) {
            try { startActivity(new Intent(Settings.ACTION_SETTINGS)); } catch (Exception ignoredAgain) {}
        }
    }

    private void openOverlaySettings() {
        try {
            startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getPackageName())));
        } catch (Exception ignored) {
            try { startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)); }
            catch (Exception ignoredAgain) {}
        }
    }

    private void openAccessibilitySettings() {
        try { startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)); }
        catch (Exception ignored) {}
    }

    private boolean isAccessibilityServiceEnabled() {
        String enabled = Settings.Secure.getString(
            getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabled == null) return false;
        ComponentName service = new ComponentName(this, ManagerAccessibilityService.class);
        return enabled.toLowerCase().contains(service.flattenToString().toLowerCase());
    }

    private void applyBootMode(int mode) {
        if (!getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(BOOTABLE, false) && mode != 0) {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(BOOTABLE, true).apply();
        }
        ComponentName enable = mode == 2 ? mode2 : mode1;
        ComponentName disable = mode == 2 ? mode1 : mode2;

        getPackageManager().setComponentEnabledSetting(enable,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
        getPackageManager().setComponentEnabledSetting(disable,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);

        if (content != null) showBootTab();
    }

    private void disableBothLaunchers() {
        getPackageManager().setComponentEnabledSetting(mode1,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
        getPackageManager().setComponentEnabledSetting(mode2,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
    }

    private String currentMode() {
        if (isEnabled(mode1)) return "Mode 1";
        if (isEnabled(mode2)) return "Mode 2";
        return "None";
    }

    private boolean isEnabled(ComponentName component) {
        return getPackageManager().getComponentEnabledSetting(component)
            == PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
    }

    private void openHomeSettings() {
        try { startActivity(new Intent(Settings.ACTION_HOME_SETTINGS)); }
        catch (Exception ignored) {
            try { startActivity(new Intent(Settings.ACTION_SETTINGS)); } catch (Exception ignoredAgain) {}
        }
    }

    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if (event != null && event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_DOWN) {
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                volumeDownHeld = true;
                bootSettingsOpened = false;
                volumeHandler.removeCallbacks(bootSettingsAction);
                volumeHandler.postDelayed(bootSettingsAction, BOOT_SETTINGS_HOLD_MS);
            } else if (event.getAction() == KeyEvent.ACTION_UP) {
                volumeDownHeld = false;
                volumeHandler.removeCallbacks(bootSettingsAction);
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override protected void onPause() {
        volumeDownHeld = false;
        volumeHandler.removeCallbacks(bootSettingsAction);
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        bootSettingsOpened = false;
        if (content != null) showBootTab();
    }
}
