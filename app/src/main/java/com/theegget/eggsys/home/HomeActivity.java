package com.theegget.eggsys.home;

import android.app.Activity;
import android.content.Intent;
import android.content.ComponentName;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextClock;
import android.widget.TextView;

import java.text.Collator;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

public final class HomeActivity extends Activity {
    private static final int BACKGROUND = Color.rgb(10, 13, 20);
    private static final int SURFACE = Color.rgb(22, 28, 40);
    private static final int SURFACE_LIGHT = Color.rgb(31, 39, 54);
    private static final int TEXT = Color.rgb(246, 248, 252);
    private static final int MUTED = Color.rgb(151, 163, 184);
    private static final int ACCENT = Color.rgb(139, 169, 255);
    private static final int ACCENT_DARK = Color.rgb(48, 65, 104);

    private final List<ResolveInfo> launchableApps = new ArrayList<>();
    private GridLayout appGrid;
    private EditText searchField;
    private TextView emptyState;
    private TextView appCount;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BACKGROUND);
        getWindow().setNavigationBarColor(BACKGROUND);
        getWindow().getDecorView().setSystemUiVisibility(0);
        buildHome();
        loadApps();
        renderApps("");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (appGrid != null) {
            loadApps();
            renderApps(searchField == null ? "" : searchField.getText().toString());
        }
    }

    private void buildHome() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BACKGROUND);
        root.setPadding(dp(20), dp(18), dp(20), dp(12));

        LinearLayout clockArea = new LinearLayout(this);
        clockArea.setOrientation(LinearLayout.VERTICAL);
        clockArea.setGravity(Gravity.CENTER);
        clockArea.setMinimumHeight(dp(220));
        LinearLayout.LayoutParams clockAreaParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
        root.addView(clockArea, clockAreaParams);

        TextClock clock = new TextClock(this);
        clock.setFormat12Hour("h:mm");
        clock.setFormat24Hour("HH:mm");
        clock.setTextColor(TEXT);
        clock.setTextSize(68);
        clock.setGravity(Gravity.CENTER);
        clock.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
        clockArea.addView(clock);

        TextClock date = new TextClock(this);
        date.setFormat12Hour("EEEE, MMMM d");
        date.setFormat24Hour("EEEE, MMMM d");
        date.setTextColor(MUTED);
        date.setTextSize(15);
        date.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams dateParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        dateParams.topMargin = dp(2);
        clockArea.addView(date, dateParams);

        LinearLayout searchContainer = new LinearLayout(this);
        searchContainer.setGravity(Gravity.CENTER_VERTICAL);
        searchContainer.setPadding(dp(16), 0, dp(14), 0);
        searchContainer.setBackground(rounded(SURFACE_LIGHT, dp(28)));
        LinearLayout.LayoutParams searchParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(50));
        searchParams.bottomMargin = dp(14);
        root.addView(searchContainer, searchParams);

        TextView searchIcon = new TextView(this);
        searchIcon.setText("⌕");
        searchIcon.setTextColor(MUTED);
        searchIcon.setTextSize(25);
        searchContainer.addView(searchIcon);

        searchField = new EditText(this);
        searchField.setSingleLine(true);
        searchField.setTextSize(14);
        searchField.setTextColor(TEXT);
        searchField.setHintTextColor(MUTED);
        searchField.setHint("Search apps");
        searchField.setBackgroundColor(Color.TRANSPARENT);
        searchField.setPadding(dp(9), 0, 0, 0);
        searchField.setSelectAllOnFocus(false);
        searchContainer.addView(searchField, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.MATCH_PARENT, 1f));

        GridLayout systemGrid = new GridLayout(this);
        systemGrid.setColumnCount(2);
        systemGrid.setUseDefaultMargins(false);
        systemGrid.addView(createSystemTile("EggSys Settings", "", "S",
                "com.eggsys.settings.MainActivity"));
        systemGrid.addView(createSystemTile("EggSys Manager", "", "M",
                "com.theegget.eggsys.ManagerActivity"));
        LinearLayout.LayoutParams systemGridParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        systemGridParams.bottomMargin = dp(10);
        root.addView(systemGrid, systemGridParams);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(false);
        scroll.setClipToPadding(false);
        appGrid = new GridLayout(this);
        appGrid.setColumnCount(getColumnCount());
        appGrid.setAlignmentMode(GridLayout.ALIGN_BOUNDS);
        appGrid.setUseDefaultMargins(false);
        scroll.addView(appGrid, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(scroll, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        emptyState = new TextView(this);
        emptyState.setTextColor(MUTED);
        emptyState.setTextSize(13);
        emptyState.setGravity(Gravity.CENTER);
        emptyState.setVisibility(View.GONE);
        emptyState.setBackground(rounded(SURFACE, dp(18)));
        LinearLayout.LayoutParams emptyParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(70));
        emptyParams.topMargin = dp(6);
        root.addView(emptyState, emptyParams);

        searchField.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                renderApps(s.toString());
            }
            @Override public void afterTextChanged(Editable s) { }
        });

        setContentView(root);
    }

    private void loadApps() {
        launchableApps.clear();
        Intent query = new Intent(Intent.ACTION_MAIN, null);
        query.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> results = getPackageManager().queryIntentActivities(query, 0);
        for (ResolveInfo info : results) {
            if (info.activityInfo == null) continue;
            if (getPackageName().equals(info.activityInfo.packageName)) continue;
            launchableApps.add(info);
        }
        Collator collator = Collator.getInstance(Locale.getDefault());
        Collections.sort(launchableApps, (a, b) ->
                collator.compare(a.loadLabel(getPackageManager()).toString(),
                        b.loadLabel(getPackageManager()).toString()));
    }

    private void renderApps(String filter) {
        if (appGrid == null) return;
        appGrid.removeAllViews();
        String needle = filter == null ? "" : filter.trim().toLowerCase(Locale.getDefault());
        int shown = 0;
        for (ResolveInfo info : launchableApps) {
            String label = info.loadLabel(getPackageManager()).toString();
            if (!label.toLowerCase(Locale.getDefault()).contains(needle)) continue;
            appGrid.addView(createAppTile(info, label));
            shown++;
        }
        appCount.setText(shown + (shown == 1 ? " APP" : " APPS"));
        emptyState.setVisibility(shown == 0 ? View.VISIBLE : View.GONE);
        emptyState.setText(needle.isEmpty()
                ? "No launchable applications found"
                : "No apps match \"" + filter.trim() + "\"");
    }

    private View createAppTile(ResolveInfo info, String label) {
        LinearLayout tile = new LinearLayout(this);
        tile.setOrientation(LinearLayout.VERTICAL);
        tile.setGravity(Gravity.CENTER);
        tile.setPadding(dp(8), dp(13), dp(8), dp(11));
        tile.setBackground(rounded(SURFACE, dp(18)));
        tile.setClickable(true);
        tile.setFocusable(true);
        tile.setElevation(dp(1));

        LinearLayout iconHolder = new LinearLayout(this);
        iconHolder.setGravity(Gravity.CENTER);
        iconHolder.setBackground(rounded(SURFACE_LIGHT, dp(17)));
        ImageView icon = new ImageView(this);
        icon.setImageDrawable(loadIcon(info));
        icon.setScaleType(ImageView.ScaleType.FIT_CENTER);
        iconHolder.addView(icon, new LinearLayout.LayoutParams(dp(43), dp(43)));
        tile.addView(iconHolder, new LinearLayout.LayoutParams(dp(60), dp(60)));

        TextView name = new TextView(this);
        name.setText(label);
        name.setTextColor(TEXT);
        name.setTextSize(11);
        name.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        name.setGravity(Gravity.CENTER);
        name.setMaxLines(2);
        name.setEllipsize(android.text.TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        nameParams.topMargin = dp(9);
        tile.addView(name, nameParams);

        GridLayout.LayoutParams params = new GridLayout.LayoutParams();
        params.width = 0;
        params.height = dp(116);
        params.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
        params.setMargins(dp(4), dp(4), dp(4), dp(4));
        tile.setLayoutParams(params);

        tile.setOnClickListener(v -> {
            String packageName = info.activityInfo.packageName;
            Intent launch = getPackageManager().getLaunchIntentForPackage(packageName);
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(launch);
            }
        });
        return tile;
    }

    private View createSystemTile(String title, String description, String symbol,
                                   String activityClass) {
        LinearLayout tile = new LinearLayout(this);
        tile.setOrientation(LinearLayout.VERTICAL);
        tile.setGravity(Gravity.CENTER);
        tile.setPadding(dp(8), dp(12), dp(8), dp(10));
        tile.setBackground(rounded(SURFACE, dp(18)));
        tile.setClickable(true);
        tile.setFocusable(true);

        LinearLayout iconHolder = new LinearLayout(this);
        iconHolder.setGravity(Gravity.CENTER);
        iconHolder.setBackground(rounded(SURFACE_LIGHT, dp(17)));
        TextView icon = new TextView(this);
        icon.setText(symbol);
        icon.setTextColor(TEXT);
        icon.setTextSize(25);
        icon.setTypeface(Typeface.create("sans-serif-bold", Typeface.NORMAL));
        icon.setGravity(Gravity.CENTER);
        iconHolder.addView(icon, new LinearLayout.LayoutParams(dp(48), dp(48)));
        tile.addView(iconHolder, new LinearLayout.LayoutParams(dp(66), dp(66)));

        TextView name = new TextView(this);
        name.setText(title);
        name.setTextColor(TEXT);
        name.setTextSize(11);
        name.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        name.setGravity(Gravity.CENTER);
        name.setMaxLines(2);
        name.setEllipsize(android.text.TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        nameParams.topMargin = dp(8);
        tile.addView(name, nameParams);

        GridLayout.LayoutParams params = new GridLayout.LayoutParams();
        params.width = 0;
        params.height = dp(112);
        params.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
        params.setMargins(dp(4), dp(4), dp(4), dp(4));
        tile.setLayoutParams(params);

        tile.setOnClickListener(v -> {
            Intent launch = new Intent();
            launch.setComponent(new ComponentName(getPackageName(), activityClass));
            try {
                startActivity(launch);
            } catch (Exception ignored) {
            }
        });
        return tile;
    }

    private Drawable loadIcon(ResolveInfo info) {
        try {
            return info.loadIcon(getPackageManager());
        } catch (Exception ignored) {
            return getDrawable(android.R.drawable.sym_def_app_icon);
        }
    }

    private int getColumnCount() {
        float widthDp = getResources().getDisplayMetrics().widthPixels
                / getResources().getDisplayMetrics().density;
        return Math.max(4, Math.min(7, (int) (widthDp / 116f)));
    }

    private GradientDrawable rounded(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private GradientDrawable gradient(int[] colors, int radius,
                                      GradientDrawable.Orientation orientation) {
        GradientDrawable drawable = new GradientDrawable(orientation, colors);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
