package com.theegget.eggsys;

import android.app.Activity;
import android.app.DownloadManager;
import android.app.admin.DevicePolicyManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class SetupActivity extends Activity {
    private static final String UPTODOWN_URL =
            "https://1drv.ms/u/c/938a95e492e56303/IQDvFAXq45Q-TIhNqvEzsqthASt73lWSjMCZe0jwwlhnTXk?e=leBM5N&download=1";

    private static final String SETUP_PREFS = "eggsys_setup";
    private static final String SETUP_COMPLETE = "complete";
    private static final String UPTODOWN_DOWNLOAD_ID = "uptodown_download_id";

    private static final String[] PRESERVED_PACKAGES = {
            "com.android.systemui",
            "com.android.settings",
            "com.android.permissioncontroller",
            "com.android.packageinstaller",
            "com.google.android.permissioncontroller",
            "com.google.android.webview",
            "com.google.android.gms",
            "com.google.android.gsf",
            "com.android.providers.downloads",
            "com.android.providers.downloads.ui",
            "com.android.providers.settings",
            "com.android.providers.media",
            "com.android.providers.media.module",
            "com.android.networkstack",
            "com.android.networkstack.permissionconfig",
            "com.android.networkstack.tethering",
            "com.google.android.networkstack",
            "com.google.android.networkstack.permissionconfig",
            "com.google.android.networkstack.tethering",
            "com.android.phone",
            "com.android.telephony",
            "com.android.shell",
            "com.android.vending"
    };

    private LinearLayout content;
    private TextView status;
    private TextView progress;
    private long downloadId = -1L;
    private BroadcastReceiver downloadReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(0xFF000000);
        getWindow().setNavigationBarColor(0xFF000000);
        buildUi();
        refreshSetupState();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 28, 32, 28);
        root.setBackgroundColor(0xFF000000);

        TextView title = new TextView(this);
        title.setText("EggSys Setup");
        title.setTextColor(0xFFFFFFFF);
        title.setTextSize(30);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView subtitle = new TextView(this);
        subtitle.setText("Preparing EggSysOS");
        subtitle.setTextColor(0xFFBDBDBD);
        subtitle.setTextSize(16);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(-1, -2);
        subtitleParams.topMargin = 8;
        root.addView(subtitle, subtitleParams);

        ScrollView scroll = new ScrollView(this);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(0, 22, 0, 22);
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        progress = new TextView(this);
        progress.setTextColor(0xFFBDBDBD);
        progress.setTextSize(14);
        progress.setPadding(0, 8, 0, 8);
        root.addView(progress);

        status = new TextView(this);
        status.setTextColor(0xFFFFFFFF);
        status.setTextSize(15);
        status.setPadding(0, 8, 0, 12);
        root.addView(status);

        setContentView(root);
    }

    private void refreshSetupState() {
        content.removeAllViews();

        addStep("1. EggSys core environment", "Setup, Manager, Settings, Launcher and Recovery are part of this installed EggSys package.");
        addStep("2. Device Owner", deviceOwnerStatus());
        addStep("3. Required permissions", permissionStatus());
        addStep("4. Accessibility", isAccessibilityEnabled() ? "Granted" : "Required");
        addStep("5. Overlay access", Settings.canDrawOverlays(this) ? "Granted" : "Required");
        addStep("6. Modify system settings", canWriteSettings() ? "Granted" : "Required");
        addStep("7. Uptodown App Store", isUptodownInstalled() ? "Installed" : "Download required");
        addStep("8. App restore list", restoreFileExists() ? "Saved" : "Not saved");
        addStep("9. Android app cleanup", deviceOwnerReady() ? "Ready to process user apps" : "Waiting for Device Owner");

        Button permissions = addButton("Request required Android permissions");
        permissions.setOnClickListener(v -> requestRequiredPermissions());

        Button accessibility = addButton("Open Accessibility settings");
        accessibility.setOnClickListener(v -> openAccessibilitySettings());

        Button overlay = addButton("Allow display over other apps");
        overlay.setOnClickListener(v -> openOverlaySettings());

        Button write = addButton("Allow modify system settings");
        write.setOnClickListener(v -> openWriteSettings());

        Button admin = addButton("Open EggSys device administrator");
        admin.setOnClickListener(v -> requestDeviceAdmin());

        Button download = addButton(isUptodownInstalled()
                ? "Uptodown App Store is installed"
                : "Download Uptodown App Store");
        download.setEnabled(!isUptodownInstalled());
        download.setOnClickListener(v -> startUptodownDownload());

        Button scan = addButton("Scan enabled Android apps and save restore list");
        scan.setOnClickListener(v -> scanAndSaveRestoreList());

        Button finish = addButton("Finish EggSysOS Setup");
        finish.setOnClickListener(v -> finishSetup());
        finish.setEnabled(canFinishSetup());

        progress.setText(buildProgressText());
        status.setText(canFinishSetup()
                ? "Setup requirements are ready."
                : "Complete the required setup steps above.");
    }

    private void addStep(String title, String state) {
        TextView item = new TextView(this);
        item.setText(title + "\n" + state);
        item.setTextColor(0xFFFFFFFF);
        item.setTextSize(16);
        item.setPadding(14, 14, 14, 14);
        content.addView(item);
    }

    private Button addButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.topMargin = 8;
        content.addView(button, p);
        return button;
    }

    private String buildProgressText() {
        int done = 0;
        int total = 7;
        if (deviceOwnerReady()) done++;
        if (requiredPermissionsGranted()) done++;
        if (isAccessibilityEnabled()) done++;
        if (Settings.canDrawOverlays(this)) done++;
        if (canWriteSettings()) done++;
        if (isUptodownInstalled()) done++;
        if (restoreFileExists()) done++;
        return "Setup progress: " + done + "/" + total;
    }

    private String deviceOwnerStatus() {
        return deviceOwnerReady() ? "EggSys is Device Owner" :
                "Not provisioned as Device Owner. Android requires provisioning outside a normal app.";
    }

    private boolean deviceOwnerReady() {
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
        return dpm != null && dpm.isDeviceOwnerApp(getPackageName());
    }

    private boolean requiredPermissionsGranted() {
        if (android.os.Build.VERSION.SDK_INT < 23) return true;
        String[] permissions = {
                android.Manifest.permission.RECORD_AUDIO,
                android.Manifest.permission.CAMERA,
                android.Manifest.permission.ACCESS_FINE_LOCATION
        };
        for (String permission : permissions) {
            if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) return false;
        }
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return true;
    }

    private String permissionStatus() {
        return requiredPermissionsGranted() ? "Granted" : "One or more runtime permissions are required";
    }

    private void requestRequiredPermissions() {
        List<String> permissions = new ArrayList<>();
        if (android.os.Build.VERSION.SDK_INT >= 23) {
            if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
                permissions.add(android.Manifest.permission.RECORD_AUDIO);
            if (checkSelfPermission(android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
                permissions.add(android.Manifest.permission.CAMERA);
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED)
                permissions.add(android.Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(android.Manifest.permission.POST_NOTIFICATIONS);
        }
        if (!permissions.isEmpty()) {
            requestPermissions(permissions.toArray(new String[0]), 1001);
        }
    }

    private boolean isAccessibilityEnabled() {
        String enabled = Settings.Secure.getString(
                getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabled == null) return false;
        ComponentName service = new ComponentName(this, ManagerAccessibilityService.class);
        return enabled.toLowerCase().contains(service.flattenToString().toLowerCase());
    }

    private void openAccessibilitySettings() {
        try {
            startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
        } catch (Exception ignored) {}
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

    private boolean canWriteSettings() {
        return android.os.Build.VERSION.SDK_INT < 23 || Settings.System.canWrite(this);
    }

    private void openWriteSettings() {
        if (android.os.Build.VERSION.SDK_INT < 23) return;
        try {
            startActivity(new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS,
                    Uri.parse("package:" + getPackageName())));
        } catch (Exception ignored) {}
    }

    private void requestDeviceAdmin() {
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
        ComponentName admin = new ComponentName(this, EggSysDeviceAdminReceiver.class);
        if (dpm != null && dpm.isAdminActive(admin)) {
            status.setText("EggSys device administrator is already active.");
            return;
        }
        Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, admin);
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "EggSys uses device administration for protected system functions.");
        try {
            startActivityForResult(intent, 1002);
        } catch (Exception ignored) {}
    }

    private boolean isUptodownInstalled() {
        try {
            getPackageManager().getPackageInfo("com.uptodown", 0);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void startUptodownDownload() {
        DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (manager == null) {
            status.setText("Android Download Manager is unavailable.");
            return;
        }

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(UPTODOWN_URL));
        request.setTitle("Uptodown App Store");
        request.setDescription("EggSysOS setup");
        request.setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalPublicDir(
                Environment.DIRECTORY_DOWNLOADS, "uptodown.apk");
        request.setMimeType("application/vnd.android.package-archive");

        try {
            downloadId = manager.enqueue(request);
            getSharedPreferences(SETUP_PREFS, MODE_PRIVATE).edit()
                    .putLong(UPTODOWN_DOWNLOAD_ID, downloadId).apply();
            status.setText("Downloading Uptodown App Store...");
            registerDownloadReceiver();
        } catch (Exception e) {
            status.setText("Unable to start the Uptodown download.");
        }
    }

    private void registerDownloadReceiver() {
        if (downloadReceiver != null) return;
        downloadReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
                if (id != downloadId) return;
                installDownloadedApk();
            }
        };
        registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
    }

    private void installDownloadedApk() {
        DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (manager == null) return;
        Uri apkUri = manager.getUriForDownloadedFile(downloadId);
        if (apkUri == null) {
            status.setText("Download finished, but Android could not open the APK.");
            return;
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O &&
                !getPackageManager().canRequestPackageInstalls()) {
            status.setText("Allow EggSys Setup to install Uptodown.");
            startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getPackageName())));
            return;
        }

        Intent install = new Intent(Intent.ACTION_VIEW);
        install.setDataAndType(apkUri, "application/vnd.android.package-archive");
        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivity(install);
            status.setText("Android installer opened for Uptodown App Store.");
        } catch (Exception e) {
            status.setText("Android could not open the Uptodown APK.");
        }
    }

    private void scanAndSaveRestoreList() {
        if (!deviceOwnerReady()) {
            status.setText("Device Owner is required before EggSys can disable Android apps.");
            return;
        }

        try {
            JSONArray packages = new JSONArray();
            PackageManager pm = getPackageManager();
            List<ApplicationInfo> apps =
                    pm.getInstalledApplications(PackageManager.MATCH_DISABLED_COMPONENTS);

            Set<String> preserved = new HashSet<>();
            Collections.addAll(preserved, PRESERVED_PACKAGES);
            preserved.add(getPackageName());
            preserved.add("com.chrome.beta");
            preserved.add("com.android.chrome");

            int scanned = 0;
            for (ApplicationInfo app : apps) {
                if (!pm.getApplicationEnabledSetting(app.packageName) ==
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED) {
                    continue;
                }
                if ((app.flags & ApplicationInfo.FLAG_SYSTEM) != 0) continue;
                if (preserved.contains(app.packageName)) continue;
                if (app.packageName.equals("com.uptodown")) continue;

                packages.put(app.packageName);
                scanned++;
            }

            File recoveryDir = new File(getFilesDir(), "recovery");
            if (!recoveryDir.exists() && !recoveryDir.mkdirs()) {
                status.setText("Could not create the recovery directory.");
                return;
            }

            JSONObject root = new JSONObject();
            root.put("disabledByEggSys", packages);
            root.put("createdAt", System.currentTimeMillis());

            File file = new File(recoveryDir, "disabled_apps.json");
            FileWriter writer = new FileWriter(file, false);
            writer.write(root.toString(2));
            writer.close();

            status.setText("Saved restore list for " + scanned + " Android user apps.");
            refreshSetupState();
        } catch (Exception e) {
            status.setText("Could not create the restore list: " + e.getMessage());
        }
    }

    private boolean restoreFileExists() {
        return new File(getFilesDir(), "recovery/disabled_apps.json").isFile();
    }

    private void disableAppsFromRestoreList() {
        if (!deviceOwnerReady()) return;

        File file = new File(getFilesDir(), "recovery/disabled_apps.json");
        if (!file.isFile()) return;

        try {
            StringBuilder text = new StringBuilder();
            java.io.BufferedReader reader = new java.io.BufferedReader(
                    new java.io.FileReader(file));
            String line;
            while ((line = reader.readLine()) != null) text.append(line);
            reader.close();

            JSONArray packages = new JSONObject(text.toString())
                    .optJSONArray("disabledByEggSys");
            if (packages == null) return;

            DevicePolicyManager dpm =
                    (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
            if (dpm == null) return;

            for (int i = 0; i < packages.length(); i++) {
                String packageName = packages.optString(i, "");
                if (packageName.length() == 0) continue;
                try {
                    dpm.setApplicationHidden(
                            new ComponentName(this, EggSysDeviceAdminReceiver.class),
                            packageName, true);
                } catch (SecurityException ignored) {
                    // Device Owner can hide packages; an ordinary device-admin cannot.
                }
            }
        } catch (Exception ignored) {}
    }

    private boolean canFinishSetup() {
        return requiredPermissionsGranted()
                && isAccessibilityEnabled()
                && Settings.canDrawOverlays(this)
                && canWriteSettings()
                && isUptodownInstalled()
                && restoreFileExists()
                && deviceOwnerReady();
    }

    private void finishSetup() {
        if (!canFinishSetup()) {
            status.setText("Finish the required setup steps before continuing.");
            return;
        }

        disableAppsFromRestoreList();
        getSharedPreferences(SETUP_PREFS, MODE_PRIVATE)
                .edit().putBoolean(SETUP_COMPLETE, true).apply();

        BootState.reset(this);

        Intent intent = new Intent(this, NativeLauncherActivity.class);
        startActivity(intent);
        finish();
    }

    @Override protected void onResume() {
        super.onResume();
        if (content != null) refreshSetupState();
    }

    @Override protected void onDestroy() {
        if (downloadReceiver != null) {
            try { unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
            downloadReceiver = null;
        }
        super.onDestroy();
    }
}
