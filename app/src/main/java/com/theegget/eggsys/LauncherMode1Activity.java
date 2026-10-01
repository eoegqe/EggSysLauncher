package com.theegget.eggsys;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.GridLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class LauncherMode1Activity extends Activity {
    private int dp(float value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(24), dp(20), dp(16));
        root.setBackgroundColor(Color.BLACK);

        TextView title = new TextView(this);
        title.setText("EggSysOS");
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        root.addView(title, new LinearLayout.LayoutParams(-1, dp(48)));

        TextView subtitle = new TextView(this);
        subtitle.setText("Applications");
        subtitle.setTextColor(Color.LTGRAY);
        subtitle.setTextSize(15);
        root.addView(subtitle, new LinearLayout.LayoutParams(-1, dp(36)));

        ScrollView scroll = new ScrollView(this);
        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(4);

        PackageManager pm = getPackageManager();
        Intent launcherIntent = new Intent(Intent.ACTION_MAIN);
        launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);

        for (android.content.pm.ResolveInfo info : pm.queryIntentActivities(launcherIntent, 0)) {
            if (info == null || info.activityInfo == null) continue;
            final String packageName = info.activityInfo.packageName;
            if (packageName == null || packageName.isEmpty()) continue;

            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.VERTICAL);
            item.setGravity(Gravity.CENTER);
            item.setPadding(dp(6), dp(10), dp(6), dp(10));
            item.setClickable(true);
            item.setFocusable(true);

            ImageView icon = new ImageView(this);
            icon.setImageDrawable(info.loadIcon(pm));
            icon.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
            item.addView(icon, new LinearLayout.LayoutParams(dp(56), dp(56)));

            TextView name = new TextView(this);
            CharSequence label = info.loadLabel(pm);
            name.setText(label == null ? packageName : label);
            name.setTextColor(Color.WHITE);
            name.setTextSize(12);
            name.setGravity(Gravity.CENTER);
            name.setMaxLines(2);
            item.addView(name, new LinearLayout.LayoutParams(-1, dp(38)));

            item.setOnClickListener(v -> launchPackage(packageName));

            GridLayout.LayoutParams params = new GridLayout.LayoutParams();
            params.width = 0;
            params.height = GridLayout.LayoutParams.WRAP_CONTENT;
            params.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
            grid.addView(item, params);
        }

        scroll.addView(grid, new ViewGroup.LayoutParams(-1, -2));
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1f));
        setContentView(root);
    }

    private void launchPackage(String packageName) {
        try {
            Intent intent = getPackageManager().getLaunchIntentForPackage(packageName);
            if (intent != null) startActivity(intent);
        } catch (Exception ignored) {
        }
    }
}
