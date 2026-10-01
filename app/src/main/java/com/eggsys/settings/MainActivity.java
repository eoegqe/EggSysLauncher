package com.eggsys.settings;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;

public class MainActivity extends Activity {
    private LinearLayout content;
    private AudioManager audioManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        buildScreen();
        showTab("Display");
    }

    private void buildScreen() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(24, 24, 24, 24);

        TextView title = new TextView(this);
        title.setText("EggSys Settings");
        title.setTextSize(28);
        root.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Settings ID: com.eggsys.settings");
        subtitle.setTextSize(14);
        root.addView(subtitle);

        LinearLayout tabs = new LinearLayout(this);
        tabs.setOrientation(LinearLayout.HORIZONTAL);
        addTab(tabs, "Display");
        addTab(tabs, "Sound");
        addTab(tabs, "System");
        addTab(tabs, "Apps");
        addTab(tabs, "EggSys");
        root.addView(tabs);

        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(0, 16, 0, 0);

        android.widget.ScrollView scroll = new android.widget.ScrollView(this);
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        setContentView(root);
    }

    private void addTab(LinearLayout tabs, String name) {
        Button tab = new Button(this);
        tab.setText(name);
        tab.setOnClickListener(v -> showTab(name));
        tabs.addView(tab, new LinearLayout.LayoutParams(0, -2, 1));
    }

    private void showTab(String tab) {
        content.removeAllViews();

        if ("Display".equals(tab)) {
            addSection("Display");
            addText("These controls modify the device directly when EggSys has Modify System Settings permission.");

            addSection("Brightness");
            SeekBar brightness = new SeekBar(this);
            brightness.setMax(255);
            try {
                brightness.setProgress(Settings.System.getInt(
                    getContentResolver(), Settings.System.SCREEN_BRIGHTNESS));
            } catch (Exception ignored) {
                brightness.setProgress(128);
            }
            brightness.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
                public void onProgressChanged(SeekBar bar, int value, boolean fromUser) {
                    if (fromUser && Settings.System.canWrite(MainActivity.this)) {
                        Settings.System.putInt(getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, value);
                    }
                }
                public void onStartTrackingTouch(SeekBar bar) {}
                public void onStopTrackingTouch(SeekBar bar) {}
            });
            content.addView(brightness);

            addButton("Allow Modify System Settings", v -> {
                Intent intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS);
                intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                try { startActivity(intent); } catch (Exception ignored) {}
            });

            addButton("Wallpaper", v -> openSettings("android.settings.WALLPAPER_SETTINGS"));
            addButton("Screen Timeout", v -> showTimeoutControls());

        } else if ("Sound".equals(tab)) {
            addSection("Sound");
            addVolumeControl("Media Volume", AudioManager.STREAM_MUSIC);
            addVolumeControl("Ring Volume", AudioManager.STREAM_RING);
            addVolumeControl("Alarm Volume", AudioManager.STREAM_ALARM);
            addButton("Ringtone Settings", v -> openSettings(Settings.ACTION_SOUND_SETTINGS));

        } else if ("System".equals(tab)) {
            addSection("System");
            addText("Direct system controls are available here instead of sending you to Android Settings.");

            addButton("Date & Time", v -> openSettings(Settings.ACTION_DATE_SETTINGS));
            addButton("Open Boot Menu", v -> openBootSettings());

            addSection("Modify System Settings");
            addText(Settings.System.canWrite(this)
                ? "Permission: Allowed"
                : "Permission: Not allowed");

            addButton("Manage Modify System Settings Permission", v -> {
                Intent intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS);
                intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                try { startActivity(intent); } catch (Exception ignored) {}
            });

            addButton("Set Screen Timeout: 1 minute", v -> setTimeout(60000));
            addButton("Set Screen Timeout: 5 minutes", v -> setTimeout(300000));
            addButton("Set Screen Timeout: 10 minutes", v -> setTimeout(600000));

        } else if ("Apps".equals(tab)) {
            addSection("Apps");
            addButton("Manage Apps", v -> openSettings(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS));
            addButton("App Permissions", v -> openSettings(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS));

        } else {
            addSection("EggSys");
            addButton("EggSys Manager", v -> openManager());
            addButton("EggSys Keyboard", v -> openKeyboardSettings());
            addButton("Open Boot Settings", v -> openBootSettings());

            addSection("About");
            addText("EggSys Settings\nPart of EggSys OS");
        }
    }

    private void addVolumeControl(String label, int stream) {
        addSection(label);
        SeekBar bar = new SeekBar(this);
        int max = audioManager.getStreamMaxVolume(stream);
        bar.setMax(max);
        bar.setProgress(audioManager.getStreamVolume(stream));
        bar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar b, int value, boolean fromUser) {
                if (fromUser) audioManager.setStreamVolume(stream, value, 0);
            }
            public void onStartTrackingTouch(SeekBar b) {}
            public void onStopTrackingTouch(SeekBar b) {}
        });
        content.addView(bar);
    }

    private void showTimeoutControls() {
        addSection("Screen Timeout");
        addButton("1 minute", v -> setTimeout(60000));
        addButton("5 minutes", v -> setTimeout(300000));
        addButton("10 minutes", v -> setTimeout(600000));
    }

    private void setTimeout(int milliseconds) {
        if (Settings.System.canWrite(this)) {
            Settings.System.putInt(getContentResolver(), Settings.System.SCREEN_OFF_TIMEOUT, milliseconds);
        }
    }

    private void addSection(String text) {
        TextView heading = new TextView(this);
        heading.setText(text);
        heading.setTextSize(21);
        heading.setPadding(0, 20, 0, 8);
        content.addView(heading);
    }

    private void addText(String text) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(15);
        view.setPadding(0, 8, 0, 12);
        content.addView(view);
    }

    private void addButton(String text, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(text);
        button.setOnClickListener(listener);
        content.addView(button);
    }

    private void openSettings(String action) {
        try {
            startActivity(new Intent(action));
        } catch (Exception ignored) {}
    }

    private void openBootSettings() {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(
            "com.theegget.eggsys.bootsettings",
            "com.theegget.eggsys.bootsettings.MainActivity"
        ));
        try { startActivity(intent); } catch (Exception ignored) {}
    }

    private void openManager() {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(
            "com.theegget.eggsys",
            "com.theegget.eggsys.ManagerActivity"
        ));
        try { startActivity(intent); } catch (Exception ignored) {}
    }

    private void openKeyboardSettings() {
        openSettings(Settings.ACTION_INPUT_METHOD_SETTINGS);
    }
}
