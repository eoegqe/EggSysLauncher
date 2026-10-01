package com.theegget.eggsys;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class EggSysSettingsActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showSettings();
    }

    private void showSettings() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 32, 32, 32);

        TextView title = new TextView(this);
        title.setText("EggSys Settings");
        title.setTextSize(28);
        root.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("System settings for EggSys");
        subtitle.setTextSize(15);
        subtitle.setPadding(0, 8, 0, 24);
        root.addView(subtitle);

        addSection(root, "Display");
        addButton(root, "Brightness", v -> openSettings(Settings.ACTION_DISPLAY_SETTINGS));
        addButton(root, "Dark Mode", v -> openSettings(Settings.ACTION_DISPLAY_SETTINGS));
        addButton(root, "Wallpaper", v -> openSettings(Settings.ACTION_WALLPAPER_SETTINGS));

        addSection(root, "Sound");
        addButton(root, "Volume", v -> openSettings(Settings.ACTION_SOUND_SETTINGS));
        addButton(root, "Ringtone", v -> openSettings(Settings.ACTION_SOUND_SETTINGS));

        addSection(root, "Apps");
        addButton(root, "Manage Apps", v -> openSettings(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS));

        addSection(root, "Network");
        addButton(root, "Wi-Fi", v -> openSettings(Settings.ACTION_WIFI_SETTINGS));
        addButton(root, "Bluetooth", v -> openSettings(Settings.ACTION_BLUETOOTH_SETTINGS));

        addSection(root, "System");
        addButton(root, "Date & Time", v -> openSettings(Settings.ACTION_DATE_SETTINGS));
        addButton(root, "Open Boot Menu", v -> openBootSettings());

        addSection(root, "EggSys");
        addButton(root, "EggSys Manager", v -> openManager());
        addButton(root, "EggSys Keyboard", v -> openKeyboardSettings());

        addSection(root, "About");
        TextView about = new TextView(this);
        about.setText("EggSys Settings\nPart of EggSys Manager");
        about.setTextSize(16);
        root.addView(about);

        android.widget.ScrollView scroll = new android.widget.ScrollView(this);
        scroll.addView(root);
        setContentView(scroll);
    }

    private void addSection(LinearLayout root, String text) {
        TextView heading = new TextView(this);
        heading.setText(text);
        heading.setTextSize(21);
        heading.setPadding(0, 24, 0, 8);
        root.addView(heading);
    }

    private void addButton(LinearLayout root, String text, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(text);
        button.setOnClickListener(listener);
        root.addView(button);
    }

    private void openSettings(String action) {
        try {
            startActivity(new Intent(action));
        } catch (Exception ignored) {
            try {
                startActivity(new Intent(Settings.ACTION_SETTINGS));
            } catch (Exception ignoredAgain) {}
        }
    }

    private void openBootSettings() {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(
            "com.theegget.eggsys.bootsettings",
            "com.theegget.eggsys.bootsettings.MainActivity"
        ));
        try {
            startActivity(intent);
        } catch (Exception ignored) {}
    }

    private void openManager() {
        try {
            startActivity(new Intent(this, ManagerActivity.class));
        } catch (Exception ignored) {}
    }

    private void openKeyboardSettings() {
        openSettings(Settings.ACTION_INPUT_METHOD_SETTINGS);
    }
}
