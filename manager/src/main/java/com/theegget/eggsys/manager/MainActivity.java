package com.theegget.eggsys.manager;

import android.app.Activity;
import android.app.role.RoleManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final int REQUEST_HOME_ROLE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (!getPreferences(MODE_PRIVATE).getBoolean("first_run_done", false)) {
            getPreferences(MODE_PRIVATE).edit().putBoolean("first_run_done", true).apply();
            launchMode("com.theegget.eggsys.launcher1");
        }
        showSettings();
    }

    private void showSettings() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(48, 48, 48, 48);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title = new TextView(this);
        title.setText("EggSys Manager");
        title.setTextSize(28);
        root.addView(title);

        TextView info = new TextView(this);
        info.setText("Launcher settings");
        info.setTextSize(18);
        root.addView(info);

        Button mode1 = new Button(this);
        mode1.setText("Activate EggSys Launcher mode 1");
        mode1.setOnClickListener(v -> launchMode("com.theegget.eggsys.launcher1"));
        root.addView(mode1);

        Button mode2 = new Button(this);
        mode2.setText("Activate EggSys Launcher mode 2");
        mode2.setOnClickListener(v -> launchMode("com.theegget.eggsys.launcher2"));
        root.addView(mode2);

        Button systemSettings = new Button(this);
        systemSettings.setText("Open Android Home settings");
        systemSettings.setOnClickListener(v -> {
            try {
                startActivity(new Intent(Settings.ACTION_HOME_SETTINGS));
            } catch (Exception ignored) {
                startActivity(new Intent(Settings.ACTION_SETTINGS));
            }
        });
        root.addView(systemSettings);

        setContentView(root);
    }

    private void launchMode(String packageName) {
        Intent intent = getPackageManager().getLaunchIntentForPackage(packageName);
        if (intent != null) {
            startActivity(intent);
        } else {
            android.widget.Toast.makeText(this, "Launcher is not installed.", android.widget.Toast.LENGTH_SHORT).show();
        }
    }
}
