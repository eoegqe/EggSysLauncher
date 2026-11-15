package com.eggsys.settings;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final int BG = Color.rgb(10, 13, 20);
    private static final int SURFACE = Color.rgb(22, 28, 40);
    private static final int SURFACE_ALT = Color.rgb(31, 39, 54);
    private static final int TEXT = Color.rgb(246, 248, 252);
    private static final int MUTED = Color.rgb(151, 163, 184);
    private static final int ACCENT = Color.rgb(139, 169, 255);
    private static final int ACCENT_BG = Color.rgb(39, 53, 82);

    private LinearLayout content;
    private LinearLayout tabs;
    private AudioManager audioManager;
    private String selectedTab = "Display";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        getWindow().getDecorView().setSystemUiVisibility(0);
        buildScreen();
        showTab("Display");
    }

    private void buildScreen() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setPadding(dp(20), dp(22), dp(20), dp(12));

        TextView eyebrow = new TextView(this);
        eyebrow.setText("EGGSYS OS");
        eyebrow.setTextColor(ACCENT);
        eyebrow.setTextSize(11);
        eyebrow.setLetterSpacing(0.18f);
        eyebrow.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        root.addView(eyebrow);

        TextView title = new TextView(this);
        title.setText("Settings");
        title.setTextColor(TEXT);
        title.setTextSize(32);
        title.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(-1, -2);
        titleParams.topMargin = dp(3);
        root.addView(title, titleParams);

        TextView subtitle = new TextView(this);
        subtitle.setText("Make your device work the way you want.");
        subtitle.setTextColor(MUTED);
        subtitle.setTextSize(14);
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(-1, -2);
        subtitleParams.topMargin = dp(3);
        subtitleParams.bottomMargin = dp(18);
        root.addView(subtitle, subtitleParams);

        HorizontalScrollView tabScroll = new HorizontalScrollView(this);
        tabScroll.setHorizontalScrollBarEnabled(false);
        tabs = new LinearLayout(this);
        tabs.setOrientation(LinearLayout.HORIZONTAL);
        tabScroll.addView(tabs);
        root.addView(tabScroll, new LinearLayout.LayoutParams(-1, dp(46)));

        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(0, dp(14), 0, dp(24));

        android.widget.ScrollView scroll = new android.widget.ScrollView(this);
        scroll.setFillViewport(false);
        scroll.setClipToPadding(false);
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1f));

        TextView footer = new TextView(this);
        footer.setText("EGGSYS SETTINGS  •  SYSTEM CONTROL");
        footer.setTextColor(0xFF64718A);
        footer.setTextSize(9);
        footer.setLetterSpacing(0.12f);
        footer.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams footerParams = new LinearLayout.LayoutParams(-1, dp(24));
        root.addView(footer, footerParams);

        setContentView(root);
        buildTabs();
    }

    private void buildTabs() {
        tabs.removeAllViews();
        String[] names = {"Display", "Sound", "System", "Apps", "EggSys"};
        for (String name : names) {
            TextView tab = new TextView(this);
            boolean active = name.equals(selectedTab);
            tab.setText(name);
            tab.setTextSize(13);
            tab.setGravity(Gravity.CENTER);
            tab.setTextColor(active ? TEXT : MUTED);
            tab.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
            tab.setPadding(dp(17), 0, dp(17), 0);
            tab.setBackground(rounded(active ? ACCENT_BG : SURFACE, dp(24)));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, -1);
            p.rightMargin = dp(8);
            tabs.addView(tab, p);
            tab.setOnClickListener(v -> showTab(name));
        }
    }

    private void showTab(String tab) {
        selectedTab = tab;
        buildTabs();
        content.removeAllViews();

        if ("Display".equals(tab)) {
            addHeading("Display", "Control how your screen looks.");
            addCardTitle("Brightness", "Adjust screen brightness");
            SeekBar brightness = new SeekBar(this);
            brightness.setMax(255);
            try {
                brightness.setProgress(Settings.System.getInt(getContentResolver(),
                        Settings.System.SCREEN_BRIGHTNESS));
            } catch (Exception ignored) {
                brightness.setProgress(128);
            }
            brightness.setProgressTintList(android.content.res.ColorStateList.valueOf(ACCENT));
            brightness.setThumbTintList(android.content.res.ColorStateList.valueOf(ACCENT));
            brightness.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
                public void onProgressChanged(SeekBar bar, int value, boolean fromUser) {
                    if (fromUser && Settings.System.canWrite(MainActivity.this)) {
                        Settings.System.putInt(getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, value);
                    }
                }
                public void onStartTrackingTouch(SeekBar bar) { }
                public void onStopTrackingTouch(SeekBar bar) { }
            });
            addCustomToCard(brightness);
            addAction("Wallpaper", "Choose your device background", "Open", v ->
                    openSettings("android.settings.WALLPAPER_SETTINGS"));
            addAction("Screen timeout", "Choose when the display turns off", "Adjust", v ->
                    showTimeoutControls());

        } else if ("Sound".equals(tab)) {
            addHeading("Sound", "Manage audio levels on your device.");
            addVolumeControl("Media volume", AudioManager.STREAM_MUSIC);
            addVolumeControl("Ring volume", AudioManager.STREAM_RING);
            addVolumeControl("Alarm volume", AudioManager.STREAM_ALARM);
            addAction("Ringtone settings", "Choose notification and call sounds", "Open", v ->
                    openSettings(Settings.ACTION_SOUND_SETTINGS));

        } else if ("System".equals(tab)) {
            addHeading("System", "Device-wide settings and controls.");
            addAction("Date & time", "Manage clock and calendar settings", "Open", v ->
                    openSettings(Settings.ACTION_DATE_SETTINGS));
            addAction("Screen timeout · 1 minute", "Set the display timeout", "Set", v -> setTimeout(60000));
            addAction("Screen timeout · 5 minutes", "Set the display timeout", "Set", v -> setTimeout(300000));
            addAction("Screen timeout · 10 minutes", "Set the display timeout", "Set", v -> setTimeout(600000));
            addCardTitle("Modify system settings", Settings.System.canWrite(this)
                    ? "Permission is available" : "Permission is not available");
            addAction("Permission controls", "Manage system settings access", "Manage", v -> {
                Intent intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS);
                intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                try { startActivity(intent); } catch (Exception ignored) { }
            });

        } else if ("Apps".equals(tab)) {
            addHeading("Apps", "Manage applications and their access.");
            addAction("Manage apps", "View installed applications", "Open", v ->
                    openSettings(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS));
            addAction("App permissions", "Review application permissions", "Open", v ->
                    openSettings(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS));

        } else {
            addHeading("EggSys", "Information and controls for EggSys OS.");
            addAction("EggSys Manager", "Open device management", "Open", v -> openManager());
            addAction("EggSys Keyboard", "Configure the system keyboard", "Open", v ->
                    openKeyboardSettings());
            addCardTitle("About EggSys", "EggSys Settings  •  Part of EggSys OS");
            DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
            boolean owner = dpm != null && dpm.isDeviceOwnerApp(getPackageName());
            addCardTitle("Device management", owner
                    ? "EggSys currently manages this device."
                    : "EggSys is not the Device Owner of this device.");
            if (owner) {
                addAction("Remove Device Owner", "Remove EggSys device management privileges", "Remove", v ->
                        new AlertDialog.Builder(this)
                                .setTitle("Remove Device Owner?")
                                .setMessage("This removes EggSys device management privileges. EggSys will remain installed.")
                                .setNegativeButton("Cancel", null)
                                .setPositiveButton("Remove", (dialog, which) -> {
                                    try {
                                        dpm.clearDeviceOwnerApp(getPackageName());
                                        Toast.makeText(this, "EggSys Device Owner status removed.",
                                                Toast.LENGTH_LONG).show();
                                        showTab("EggSys");
                                    } catch (Exception e) {
                                        Toast.makeText(this, "Could not remove Device Owner: " + e.getMessage(),
                                                Toast.LENGTH_LONG).show();
                                    }
                                }).show());
            }
        }
    }

    private void addHeading(String title, String description) {
        TextView heading = new TextView(this);
        heading.setText(title);
        heading.setTextColor(TEXT);
        heading.setTextSize(22);
        heading.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
        content.addView(heading);
        TextView detail = new TextView(this);
        detail.setText(description);
        detail.setTextColor(MUTED);
        detail.setTextSize(13);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.topMargin = dp(4);
        p.bottomMargin = dp(14);
        content.addView(detail, p);
    }

    private void addCardTitle(String title, String subtitle) {
        LinearLayout card = createCard();
        TextView name = new TextView(this);
        name.setText(title);
        name.setTextColor(TEXT);
        name.setTextSize(15);
        name.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        card.addView(name);
        TextView detail = new TextView(this);
        detail.setText(subtitle);
        detail.setTextColor(MUTED);
        detail.setTextSize(12);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.topMargin = dp(5);
        card.addView(detail, p);
        addCard(card);
    }

    private void addAction(String title, String subtitle, String action, View.OnClickListener listener) {
        LinearLayout card = createCard();
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setOrientation(LinearLayout.HORIZONTAL);

        LinearLayout labels = new LinearLayout(this);
        labels.setOrientation(LinearLayout.VERTICAL);
        TextView name = new TextView(this);
        name.setText(title);
        name.setTextColor(TEXT);
        name.setTextSize(14);
        name.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        labels.addView(name);
        TextView detail = new TextView(this);
        detail.setText(subtitle);
        detail.setTextColor(MUTED);
        detail.setTextSize(11);
        LinearLayout.LayoutParams detailParams = new LinearLayout.LayoutParams(-1, -2);
        detailParams.topMargin = dp(4);
        labels.addView(detail, detailParams);
        row.addView(labels, new LinearLayout.LayoutParams(0, -2, 1f));

        TextView button = new TextView(this);
        button.setText(action + "  ›");
        button.setTextColor(ACCENT);
        button.setTextSize(12);
        button.setGravity(Gravity.CENTER);
        button.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        button.setPadding(dp(10), dp(9), dp(4), dp(9));
        row.addView(button);
        card.addView(row);
        card.setClickable(true);
        card.setFocusable(true);
        card.setOnClickListener(listener);
        addCard(card);
    }

    private void addVolumeControl(String title, int stream) {
        LinearLayout card = createCard();
        TextView name = new TextView(this);
        name.setText(title);
        name.setTextColor(TEXT);
        name.setTextSize(14);
        name.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        card.addView(name);
        SeekBar bar = new SeekBar(this);
        int max = audioManager.getStreamMaxVolume(stream);
        bar.setMax(max);
        bar.setProgress(audioManager.getStreamVolume(stream));
        bar.setProgressTintList(android.content.res.ColorStateList.valueOf(ACCENT));
        bar.setThumbTintList(android.content.res.ColorStateList.valueOf(ACCENT));
        bar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar b, int value, boolean fromUser) {
                if (fromUser) audioManager.setStreamVolume(stream, value, 0);
            }
            public void onStartTrackingTouch(SeekBar b) { }
            public void onStopTrackingTouch(SeekBar b) { }
        });
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.topMargin = dp(8);
        card.addView(bar, p);
        addCard(card);
    }

    private void addCustomToCard(View view) {
        LinearLayout card = createCard();
        card.addView(view);
        addCard(card);
    }

    private LinearLayout createCard() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16), dp(15), dp(16), dp(15));
        card.setBackground(rounded(SURFACE, dp(18)));
        return card;
    }

    private void addCard(LinearLayout card) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.bottomMargin = dp(10);
        content.addView(card, p);
    }

    private void showTimeoutControls() {
        content.removeAllViews();
        addHeading("Screen timeout", "Choose how long the display stays on.");
        addAction("1 minute", "Turn off the display after one minute", "Set", v -> setTimeout(60000));
        addAction("5 minutes", "Turn off the display after five minutes", "Set", v -> setTimeout(300000));
        addAction("10 minutes", "Turn off the display after ten minutes", "Set", v -> setTimeout(600000));
    }

    private void setTimeout(int milliseconds) {
        if (Settings.System.canWrite(this)) {
            Settings.System.putInt(getContentResolver(), Settings.System.SCREEN_OFF_TIMEOUT, milliseconds);
            Toast.makeText(this, "Screen timeout updated.", Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(this, "EggSys needs Modify System Settings access.", Toast.LENGTH_SHORT).show();
        }
    }

    private void openSettings(String action) {
        try {
            startActivity(new Intent(action));
        } catch (Exception ignored) { }
    }

    private void openManager() {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName("com.theegget.eggsys",
                "com.theegget.eggsys.ManagerActivity"));
        try { startActivity(intent); } catch (Exception ignored) { }
    }

    private void openKeyboardSettings() {
        openSettings(Settings.ACTION_INPUT_METHOD_SETTINGS);
    }

    private GradientDrawable rounded(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
