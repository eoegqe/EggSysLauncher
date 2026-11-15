package com.theegget.eggsys.home;

import android.app.Activity;
import android.content.Intent;
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
        root.setPadding(dp(26), dp(22), dp(26), dp(14));

        LinearLayout brandRow = new LinearLayout(this);
        brandRow.setGravity(Gravity.CENTER_VERTICAL);
        brandRow.setOrientation(LinearLayout.HORIZONTAL);

        LinearLayout brandMark = new LinearLayout(this);
        brandMark.setGravity(Gravity.CENTER);
        brandMark.setBackground(rounded(ACCENT_DARK, dp(15)));
        TextView mark = new TextView(this);
        mark.setText("E");
        mark.setTextColor(TEXT);
        mark.setTextSize(21);
        mark.setTypeface(Typeface.create("sans-serif-black", Typeface.NORMAL));
        brandMark.addView(mark);
        brandRow.addView(brandMark, new LinearLayout.LayoutParams(dp(44), dp(44)));

        LinearLayout brandText = new LinearLayout(this);
        brandText.setOrientation(LinearLayout.VERTICAL);
        brandText.setPadding(dp(12), 0, 0, 0);
        TextView brand = new TextView(this);
        brand.setText("EggSys");
        brand.setTextColor(TEXT);
        brand.setTextSize(21);
        brand.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        brandText.addView(brand);
        TextView subtitle = new TextView(this);
        subtitle.setText("MOBILE");
        subtitle.setTextColor(MUTED);
        subtitle.setTextSize(9);
        subtitle.setLetterSpacing(0.18f);
        brandText.addView(subtitle);
        brandRow.addView(brandText, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        TextView status = new TextView(this);
        status.setText("●  READY");
        status.setTextColor(Color.rgb(135, 211, 171));
        status.setTextSize(10);
        status.setLetterSpacing(0.08f);
        status.setPadding(dp(12), dp(8), dp(12), dp(8));
        status.setBackground(rounded(Color.rgb(24, 53, 48), dp(30)));
        brandRow.addView(status);
        root.addView(brandRow);

        LinearLayout hero = new LinearLayout(this);
        hero.setOrientation(LinearLayout.VERTICAL);
        hero.setPadding(dp(22), dp(18), dp(22), dp(18));
        hero.setBackground(gradient(
                new int[]{Color.rgb(38, 54, 84), Color.rgb(24, 32, 49)},
                dp(22), GradientDrawable.Orientation.TL_BR));
        LinearLayout.LayoutParams heroParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        heroParams.topMargin = dp(24);
        root.addView(hero, heroParams);

        TextView greeting = new TextView(this);
        greeting.setText("YOUR SPACE");
        greeting.setTextColor(Color.rgb(183, 199, 232));
        greeting.setTextSize(10);
        greeting.setLetterSpacing(0.16f);
        hero.addView(greeting);

        TextClock clock = new TextClock(this);
        clock.setFormat12Hour("h:mm");
        clock.setFormat24Hour("HH:mm");
        clock.setTextColor(TEXT);
        clock.setTextSize(42);
        clock.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
        LinearLayout.LayoutParams clockParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        clockParams.topMargin = dp(3);
        hero.addView(clock, clockParams);

        TextClock date = new TextClock(this);
        date.setFormat12Hour("EEEE, MMMM d");
        date.setFormat24Hour("EEEE, MMMM d");
        date.setTextColor(Color.rgb(190, 201, 222));
        date.setTextSize(13);
        LinearLayout.LayoutParams dateParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        dateParams.topMargin = dp(1);
        hero.addView(date, dateParams);

        LinearLayout searchContainer = new LinearLayout(this);
        searchContainer.setGravity(Gravity.CENTER_VERTICAL);
        searchContainer.setPadding(dp(15), 0, dp(14), 0);
        searchContainer.setBackground(rounded(SURFACE_LIGHT, dp(15)));
        LinearLayout.LayoutParams searchContainerParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
        searchContainerParams.topMargin = dp(22);
        root.addView(searchContainer, searchContainerParams);

        TextView searchIcon = new TextView(this);
        searchIcon.setText("⌕");
        searchIcon.setTextColor(MUTED);
        searchIcon.setTextSize(27);
        searchContainer.addView(searchIcon);

        searchField = new EditText(this);
        searchField.setSingleLine(true);
        searchField.setTextSize(14);
        searchField.setTextColor(TEXT);
        searchField.setHintTextColor(MUTED);
        searchField.setHint("Find an app");
        searchField.setBackgroundColor(Color.TRANSPARENT);
        searchField.setPadding(dp(9), 0, 0, 0);
        searchField.setSelectAllOnFocus(false);
        searchContainer.addView(searchField, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.MATCH_PARENT, 1f));

        TextView sectionTitle = new TextView(this);
        sectionTitle.setText("Applications");
        sectionTitle.setTextColor(TEXT);
        sectionTitle.setTextSize(18);
        sectionTitle.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        LinearLayout.LayoutParams sectionParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        sectionParams.topMargin = dp(25);
        root.addView(sectionTitle, sectionParams);

        LinearLayout sectionRow = new LinearLayout(this);
        sectionRow.setGravity(Gravity.CENTER_VERTICAL);
        TextView sectionHint = new TextView(this);
        sectionHint.setText("Everything installed on your device");
        sectionHint.setTextColor(MUTED);
        sectionHint.setTextSize(11);
        sectionRow.addView(sectionHint, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        appCount = new TextView(this);
        appCount.setTextColor(ACCENT);
        appCount.setTextSize(11);
        appCount.setTypeface(Typeface.DEFAULT_BOLD);
        sectionRow.addView(appCount);
        LinearLayout.LayoutParams sectionRowParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        sectionRowParams.topMargin = dp(4);
        sectionRowParams.bottomMargin = dp(13);
        root.addView(sectionRow, sectionRowParams);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setClipToPadding(false);
        appGrid = new GridLayout(this);
        appGrid.setColumnCount(getColumnCount());
        appGrid.setAlignmentMode(GridLayout.ALIGN_BOUNDS);
        appGrid.setUseDefaultMargins(false);
        scroll.addView(appGrid, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        emptyState = new TextView(this);
        emptyState.setTextColor(MUTED);
        emptyState.setTextSize(13);
        emptyState.setGravity(Gravity.CENTER);
        emptyState.setVisibility(View.GONE);
        emptyState.setBackground(rounded(SURFACE, dp(18)));

        LinearLayout appArea = new LinearLayout(this);
        appArea.setOrientation(LinearLayout.VERTICAL);
        appArea.addView(scroll, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        LinearLayout.LayoutParams emptyParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(92));
        emptyParams.topMargin = dp(4);
        appArea.addView(emptyState, emptyParams);
        root.addView(appArea, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        LinearLayout footer = new LinearLayout(this);
        footer.setGravity(Gravity.CENTER);
        footer.setPadding(0, dp(10), 0, dp(2));
        TextView footerText = new TextView(this);
        footerText.setText("EGGSYS  •  HOME");
        footerText.setTextColor(Color.rgb(91, 103, 125));
        footerText.setTextSize(9);
        footerText.setLetterSpacing(0.16f);
        footer.addView(footerText);
        root.addView(footer, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(28)));

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
