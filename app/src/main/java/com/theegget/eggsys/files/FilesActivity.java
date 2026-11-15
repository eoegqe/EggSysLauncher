package com.theegget.eggsys.files;

import android.Manifest;
import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.webkit.MimeTypeMap;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.theegget.eggsys.EggSysDeviceAdminReceiver;
import com.theegget.eggsys.eaf.EafInstaller;
import com.theegget.eggsys.eaf.EafPackage;

import java.io.File;
import java.util.Arrays;
import java.util.Comparator;

public final class FilesActivity extends Activity {
    private static final int BG = Color.rgb(10, 13, 20);
    private static final int SURFACE = Color.rgb(22, 28, 40);
    private static final int SURFACE_ALT = Color.rgb(31, 39, 54);
    private static final int TEXT = Color.rgb(246, 248, 252);
    private static final int MUTED = Color.rgb(151, 163, 184);
    private static final int ACCENT = Color.rgb(139, 169, 255);
    private static final int REQUEST_STORAGE = 40;
    private static final String[] DEFAULT_FILE_MANAGERS = {
            "com.sec.android.app.myfiles",
            "com.google.android.apps.nbu.files",
            "com.mi.android.globalFileexplorer",
            "com.coloros.filemanager",
            "com.vivo.filemanager",
            "com.huawei.hidisk",
            "com.motorola.filemanager"
    };

    private LinearLayout list;
    private TextView location;
    private File currentDirectory;
    private boolean pickerMode;
    private String requestedMimeType;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        currentDirectory = Environment.getExternalStorageDirectory();
        pickerMode = Intent.ACTION_GET_CONTENT.equals(getIntent().getAction());
        requestedMimeType = getIntent().getType();
        buildScreen();
        if (Build.VERSION.SDK_INT >= 23 &&
                checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, REQUEST_STORAGE);
        } else {
            showDirectory(currentDirectory);
        }
        hideSamsungFilesIfAvailable();
    }

    private void buildScreen() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setPadding(dp(18), dp(18), dp(18), dp(12));

        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = new TextView(this);
        title.setText(pickerMode ? "Select a file" : "EggSys Files");
        title.setTextColor(TEXT);
        title.setTextSize(28);
        title.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        top.addView(title, new LinearLayout.LayoutParams(0, -2, 1f));

        Button refresh = new Button(this);
        refresh.setText(pickerMode ? "Cancel" : "Refresh");
        refresh.setTextColor(ACCENT);
        refresh.setAllCaps(false);
        refresh.setOnClickListener(v -> {
            if (pickerMode) finish(); else showDirectory(currentDirectory);
        });
        top.addView(refresh);
        root.addView(top);

        location = new TextView(this);
        location.setTextColor(MUTED);
        location.setTextSize(12);
        location.setPadding(dp(2), dp(8), dp(2), dp(14));
        root.addView(location);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(list);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1f));

        Button parent = new Button(this);
        parent.setText("Up one folder");
        parent.setAllCaps(false);
        parent.setTextColor(TEXT);
        parent.setBackground(round(SURFACE_ALT, dp(16)));
        parent.setOnClickListener(v -> {
            File p = currentDirectory == null ? null : currentDirectory.getParentFile();
            if (p != null && p.canRead()) showDirectory(p);
        });
        LinearLayout.LayoutParams parentParams = new LinearLayout.LayoutParams(-1, dp(48));
        parentParams.topMargin = dp(10);
        root.addView(parent, parentParams);

        Button systemFiles = new Button(this);
        systemFiles.setVisibility(pickerMode ? View.GONE : View.VISIBLE);
        systemFiles.setText("Hide / restore default file manager");
        systemFiles.setAllCaps(false);
        systemFiles.setTextColor(MUTED);
        systemFiles.setBackground(round(SURFACE, dp(16)));
        systemFiles.setOnClickListener(v -> toggleSamsungFiles());
        LinearLayout.LayoutParams systemParams = new LinearLayout.LayoutParams(-1, dp(46));
        systemParams.topMargin = dp(8);
        root.addView(systemFiles, systemParams);

        setContentView(root);
    }

    private void showDirectory(File directory) {
        if (directory == null || !directory.isDirectory() || !directory.canRead()) {
            Toast.makeText(this, "This folder can't be opened.", Toast.LENGTH_SHORT).show();
            return;
        }
        currentDirectory = directory;
        location.setText(directory.getAbsolutePath());
        list.removeAllViews();

        File[] entries = directory.listFiles();
        if (entries == null) {
            addMessage("This folder is unavailable.");
            return;
        }
        Arrays.sort(entries, Comparator.comparing((File f) -> !f.isDirectory())
                .thenComparing(f -> f.getName().toLowerCase()));
        if (entries.length == 0) {
            addMessage("This folder is empty.");
            return;
        }
        for (File entry : entries) addEntry(entry);
    }

    private void addEntry(File file) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(14), dp(10), dp(12), dp(10));
        row.setBackground(round(SURFACE, dp(15)));

        TextView glyph = new TextView(this);
        glyph.setText(file.isDirectory() ? "▰" : file.getName().toLowerCase().endsWith(".eaf") ? "E" : "•");
        glyph.setTextColor(ACCENT);
        glyph.setTextSize(22);
        glyph.setGravity(Gravity.CENTER);
        row.addView(glyph, new LinearLayout.LayoutParams(dp(38), dp(38)));

        LinearLayout labels = new LinearLayout(this);
        labels.setOrientation(LinearLayout.VERTICAL);
        labels.setPadding(dp(10), 0, 0, 0);
        TextView name = new TextView(this);
        name.setText(file.getName());
        name.setTextColor(TEXT);
        name.setTextSize(14);
        name.setMaxLines(1);
        name.setEllipsize(android.text.TextUtils.TruncateAt.END);
        labels.addView(name);
        TextView meta = new TextView(this);
        meta.setText(file.isDirectory() ? "Folder" : (isEditableText(file) ? "Text file · Tap to edit · " : "") + formatSize(file.length()));
        meta.setTextColor(MUTED);
        meta.setTextSize(11);
        labels.addView(meta);
        row.addView(labels, new LinearLayout.LayoutParams(0, -2, 1f));

        row.setOnClickListener(v -> {
            if (file.isDirectory()) {
                showDirectory(file);
            } else if (pickerMode) {
                returnSelectedFile(file);
            } else if (file.getName().toLowerCase().endsWith(".eaf")) {
                installEaf(file);
            } else if (isEditableText(file)) {
                openEditor(file);
            } else {
                openFile(file);
            }
        });

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(62));
        params.bottomMargin = dp(7);
        list.addView(row, params);
    }

    private boolean isEditableText(File file) {
        String name = file.getName().toLowerCase(java.util.Locale.ROOT);
        String[] extensions = {".txt", ".md", ".html", ".htm", ".css", ".js", ".json", ".xml", ".java", ".kt", ".gradle", ".properties", ".yml", ".yaml", ".csv", ".log", ".sh", ".py", ".c", ".cpp", ".h"};
        for (String extension : extensions) if (name.endsWith(extension)) return true;
        return false;
    }

    private void returnSelectedFile(File file) {
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", file);
            Intent result = new Intent();
            result.setData(uri);
            result.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            setResult(RESULT_OK, result);
            finish();
        } catch (Exception e) {
            Toast.makeText(this, "Couldn't select this file.", Toast.LENGTH_SHORT).show();
        }
    }

    private void openEditor(File file) {
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", file);
            Intent intent = new Intent(this, FileEditorActivity.class);
            intent.setDataAndType(uri, "text/plain");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            intent.putExtra("file_name", file.getName());
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "This file can't be edited.", Toast.LENGTH_SHORT).show();
        }
    }

    private void installEaf(File file) {
        try {
            EafPackage pkg = EafInstaller.install(this, file);
            Toast.makeText(this, pkg.name + " installed in EggSys.", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "EAF installation failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void openFile(File file) {
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            String extension = android.webkit.MimeTypeMap.getFileExtensionFromUrl(file.getName());
            String type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.toLowerCase());
            intent.setDataAndType(uri, type == null ? "*/*" : type);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "No app can open this file.", Toast.LENGTH_SHORT).show();
        }
    }

    private void hideSamsungFilesIfAvailable() {
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
        if (dpm == null || !dpm.isDeviceOwnerApp(getPackageName())) return;
        android.content.SharedPreferences prefs = getSharedPreferences("eggsys_files", MODE_PRIVATE);
        if (prefs.getBoolean("default_managers_configured", false)) return;
        ComponentName admin = new ComponentName(this, EggSysDeviceAdminReceiver.class);
        for (String packageName : DEFAULT_FILE_MANAGERS) {
            if (!isPackageInstalled(packageName)) continue;
            try {
                dpm.setApplicationHidden(admin, packageName, true);
            } catch (Exception ignored) {
            }
        }
        prefs.edit().putBoolean("default_managers_configured", true).apply();
    }

    private void toggleSamsungFiles() {
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
        if (dpm == null || !dpm.isDeviceOwnerApp(getPackageName())) {
            Toast.makeText(this, "EggSys must be the device owner to manage the default file manager.", Toast.LENGTH_LONG).show();
            return;
        }
        ComponentName admin = new ComponentName(this, EggSysDeviceAdminReceiver.class);
        boolean found = false;
        boolean restore = false;
        for (String packageName : DEFAULT_FILE_MANAGERS) {
            if (!isPackageInstalled(packageName)) continue;
            found = true;
            try {
                if (dpm.isApplicationHidden(admin, packageName)) restore = true;
            } catch (Exception ignored) {
            }
        }
        if (!found) {
            Toast.makeText(this, "No supported standalone file manager was found. Android's system file picker remains enabled.", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            for (String packageName : DEFAULT_FILE_MANAGERS) {
                if (isPackageInstalled(packageName)) dpm.setApplicationHidden(admin, packageName, !restore);
            }
            getSharedPreferences("eggsys_files", MODE_PRIVATE).edit()
                    .putBoolean("default_managers_configured", true).apply();
            Toast.makeText(this, restore ? "Default file manager apps restored." : "Default file manager apps hidden.", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "Couldn't change the default file manager.", Toast.LENGTH_LONG).show();
        }
    }

    private boolean isPackageInstalled(String packageName) {
        try {
            getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    private void addMessage(String message) {
        TextView text = new TextView(this);
        text.setText(message);
        text.setTextColor(MUTED);
        text.setGravity(Gravity.CENTER);
        text.setPadding(dp(12), dp(30), dp(12), dp(30));
        list.addView(text, new LinearLayout.LayoutParams(-1, -2));
    }

    private String formatSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format(java.util.Locale.US, "%.1f KB", bytes / 1024f);
        return String.format(java.util.Locale.US, "%.1f MB", bytes / (1024f * 1024f));
    }

    private GradientDrawable round(int color, int radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(radius);
        return d;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQUEST_STORAGE) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
                showDirectory(currentDirectory);
            } else {
                addMessage("Storage permission is required to browse device files.");
            }
        }
    }

    @Override
    public void onBackPressed() {
        File parent = currentDirectory == null ? null : currentDirectory.getParentFile();
        File root = Environment.getExternalStorageDirectory();
        if (parent != null && currentDirectory != null && !currentDirectory.equals(root)) {
            showDirectory(parent);
        } else {
            super.onBackPressed();
        }
    }
}
