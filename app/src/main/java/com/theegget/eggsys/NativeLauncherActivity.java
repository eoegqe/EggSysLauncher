package com.theegget.eggsys;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.theegget.eggsys.eaf.EafPackage;
import com.theegget.eggsys.eaf.EafRegistry;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class NativeLauncherActivity extends Activity {
    private LinearLayout appList;
    private final List<AppEntry> apps = new ArrayList<>();
    private final List<EafPackage> eafApps = new ArrayList<>();

    private static final int BG = Color.BLACK;
    private static final int FG = Color.WHITE;
    private static final int MUTED = 0xFF9E9E9E;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setNavigationBarColor(BG);
        getWindow().setStatusBarColor(BG);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );

        buildUi();
        loadApps();
        loadEafApps();

        BootState.set(this, 2);
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setPadding(28, 36, 28, 20);

        TextView title = new TextView(this);
        title.setText("EggSys");
        title.setTextColor(FG);
        title.setTextSize(30);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView subtitle = new TextView(this);
        subtitle.setText("Native Launcher");
        subtitle.setTextColor(MUTED);
        subtitle.setTextSize(14);
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(-1, -2);
        subtitleParams.bottomMargin = 22;
        root.addView(subtitle, subtitleParams);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        appList = new LinearLayout(this);
        appList.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(appList);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        TextView footer = new TextView(this);
        footer.setText("TAP AN APP TO OPEN IT");
        footer.setTextColor(MUTED);
        footer.setTextSize(12);
        footer.setPadding(0, 18, 0, 0);
        root.addView(footer, new LinearLayout.LayoutParams(-1, -2));

        setContentView(root);
    }

    private void loadApps() {
        apps.clear();
        PackageManager pm = getPackageManager();
        Intent launcherIntent = new Intent(Intent.ACTION_MAIN);
        launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);

        for (android.content.pm.ResolveInfo info : pm.queryIntentActivities(launcherIntent, 0)) {
            if (info == null || info.activityInfo == null) continue;
            String packageName = info.activityInfo.packageName;
            if (packageName == null || packageName.equals(getPackageName())) continue;
            ApplicationInfo appInfo = info.activityInfo.applicationInfo;
            CharSequence label = pm.getApplicationLabel(appInfo);
            apps.add(new AppEntry(
                packageName,
                label == null ? packageName : label.toString(),
                pm.getApplicationIcon(appInfo)
            ));
        }

        Collections.sort(apps, Comparator.comparing(a -> a.name.toLowerCase()));
        renderApps();
    }

    private void loadEafApps() {
        eafApps.clear();
        eafApps.addAll(EafRegistry.list(this));
        renderEafApps();
    }

    private void renderEafApps() {
        if (eafApps.isEmpty()) return;

        TextView header = new TextView(this);
        header.setText("EAF APPLICATIONS");
        header.setTextColor(FG);
        header.setTextSize(13);
        header.setTypeface(null, android.graphics.Typeface.BOLD);
        header.setPadding(18, 22, 18, 10);
        appList.addView(header);

        for (EafPackage eaf : eafApps) {
            TextView row = new TextView(this);
            row.setText(eaf.name + "\\n" + eaf.version);
            row.setTextColor(FG);
            row.setTextSize(17);
            row.setPadding(18, 16, 18, 16);
            row.setClickable(true);
            row.setFocusable(true);
            row.setOnClickListener(v -> launchEaf(eaf));
            appList.addView(row, new LinearLayout.LayoutParams(-1, -2));
        }
    }

    private void launchEaf(EafPackage eaf) {
        Intent intent = new Intent(this, EafRuntimeActivity.class);
        intent.putExtra(EafRuntimeActivity.EXTRA_EAF_ID, eaf.id);
        startActivity(intent);
    }

    private void renderApps() {
        appList.removeAllViews();
        if (apps.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText("No launchable applications found.");
            empty.setTextColor(MUTED);
            empty.setTextSize(16);
            appList.addView(empty);
            return;
        }

        PackageManager pm = getPackageManager();
        for (AppEntry entry : apps) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(18, 14, 18, 14);
            row.setBackgroundColor(BG);
            row.setClickable(true);
            row.setFocusable(true);
            row.setOnClickListener(v -> launchApp(entry.packageName));

            ImageView icon = new ImageView(this);
            icon.setImageDrawable(entry.icon);
            row.addView(icon, new LinearLayout.LayoutParams(48, 48));

            TextView name = new TextView(this);
            name.setText(entry.name);
            name.setTextColor(FG);
            name.setTextSize(17);
            name.setPadding(18, 0, 0, 0);
            row.addView(name, new LinearLayout.LayoutParams(0, -2, 1));

            appList.addView(row, new LinearLayout.LayoutParams(-1, -2));
        }
    }

    private void launchApp(String packageName) {
        try {
            Intent intent = getPackageManager().getLaunchIntentForPackage(packageName);
            if (intent != null) startActivity(intent);
        } catch (Exception ignored) {
        }
    }

    private static final class AppEntry {
        final String packageName;
        final String name;
        final Drawable icon;

        AppEntry(String packageName, String name, Drawable icon) {
            this.packageName = packageName;
            this.name = name;
            this.icon = icon;
        }
    }
}
