package com.theegget.eggsys.home;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
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
    private static final int BACKGROUND = Color.rgb(12, 15, 22);
    private static final int SURFACE = Color.rgb(25, 30, 41);
    private static final int TEXT = Color.rgb(245, 247, 252);
    private static final int MUTED = Color.rgb(157, 167, 184);
    private static final int ACCENT = Color.rgb(137, 169, 255);

    private final List<ResolveInfo> launchableApps = new ArrayList<>();
    private GridLayout appGrid;
    private EditText searchField;
    private TextView emptyState;

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
        root.setPadding(dp(24), dp(28), dp(24), dp(16));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.VERTICAL);

        TextView brand = new TextView(this);
        brand.setText("EggSys");
        brand.setTextColor(TEXT);
        brand.setTextSize(30);
        brand.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        header.addView(brand);

        TextClock clock = new TextClock(this);
        clock.setFormat12Hour("EEEE, MMMM d  •  h:mm");
        clock.setFormat24Hour("EEEE, MMMM d  •  HH:mm");
        clock.setTextColor(MUTED);
        clock.setTextSize(14);
        LinearLayout.LayoutParams clockParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        clockParams.topMargin = dp(4);
        header.addView(clock, clockParams);
        root.addView(header);

        searchField = new EditText(this);
        searchField.setSingleLine(true);
        searchField.setTextSize(15);
        searchField.setTextColor(TEXT);
        searchField.setHintTextColor(MUTED);
        searchField.setHint("Search apps");
        searchField.setPadding(dp(16), 0, dp(16), 0);
        searchField.setBackground(rounded(SURFACE, dp(16)));
        LinearLayout.LayoutParams searchParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
        searchParams.topMargin = dp(24);
        root.addView(searchField, searchParams);

        TextView sectionTitle = new TextView(this);
        sectionTitle.setText("Applications");
        sectionTitle.setTextColor(TEXT);
        sectionTitle.setTextSize(17);
        sectionTitle.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        LinearLayout.LayoutParams sectionParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        sectionParams.topMargin = dp(26);
        sectionParams.bottomMargin = dp(12);
        root.addView(sectionTitle, sectionParams);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        appGrid = new GridLayout(this);
        appGrid.setColumnCount(getColumnCount());
        appGrid.setAlignmentMode(GridLayout.ALIGN_BOUNDS);
        scroll.addView(appGrid, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        emptyState = new TextView(this);
        emptyState.setTextColor(MUTED);
        emptyState.setTextSize(14);
        emptyState.setGravity(Gravity.CENTER);
        emptyState.setVisibility(View.GONE);

        LinearLayout appArea = new LinearLayout(this);
        appArea.setOrientation(LinearLayout.VERTICAL);
        appArea.addView(scroll, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        appArea.addView(emptyState, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(72)));
        root.addView(appArea, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        TextView footer = new TextView(this);
        footer.setText("EggSys Launcher");
        footer.setTextColor(MUTED);
        footer.setTextSize(11);
        footer.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams footerParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(28));
        footerParams.topMargin = dp(8);
        root.addView(footer, footerParams);

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
        emptyState.setVisibility(shown == 0 ? View.VISIBLE : View.GONE);
        emptyState.setText(needle.isEmpty()
                ? "No launchable applications found"
                : "No apps match \"" + filter.trim() + "\"");
    }

    private View createAppTile(ResolveInfo info, String label) {
        LinearLayout tile = new LinearLayout(this);
        tile.setOrientation(LinearLayout.VERTICAL);
        tile.setGravity(Gravity.CENTER);
        tile.setPadding(dp(5), dp(12), dp(5), dp(10));
        tile.setBackground(selectableBackground());
        tile.setClickable(true);
        tile.setFocusable(true);

        ImageView icon = new ImageView(this);
        icon.setImageDrawable(loadIcon(info));
        icon.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(48), dp(48));
        tile.addView(icon, iconParams);

        TextView name = new TextView(this);
        name.setText(label);
        name.setTextColor(TEXT);
        name.setTextSize(12);
        name.setGravity(Gravity.CENTER);
        name.setMaxLines(2);
        name.setEllipsize(android.text.TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        nameParams.topMargin = dp(8);
        tile.addView(name, nameParams);

        GridLayout.LayoutParams params = new GridLayout.LayoutParams();
        params.width = 0;
        params.height = dp(104);
        params.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
        params.setMargins(dp(3), dp(3), dp(3), dp(3));
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
        return Math.max(4, Math.min(7, (int) (widthDp / 112f)));
    }

    private GradientDrawable rounded(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private Drawable selectableBackground() {
        android.util.TypedValue value = new android.util.TypedValue();
        getTheme().resolveAttribute(android.R.attr.selectableItemBackground, value, true);
        return getDrawable(value.resourceId);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
