package com.theegget.eggsys;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class ManagerActivity extends Activity {
    private ComponentName mode1;
    private ComponentName mode2;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mode1 = new ComponentName(this, LauncherMode1Activity.class);
        mode2 = new ComponentName(this, LauncherMode2Activity.class);
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

        TextView status = new TextView(this);
        status.setText("Launcher mode: " + (isEnabled(mode1) ? "1" : "2"));
        status.setTextSize(18);
        root.addView(status);

        Button mode1Button = new Button(this);
        mode1Button.setText("Activate EggSys Launcher mode 1");
        mode1Button.setOnClickListener(v -> switchMode(1));
        root.addView(mode1Button);

        Button mode2Button = new Button(this);
        mode2Button.setText("Activate EggSys Launcher mode 2");
        mode2Button.setOnClickListener(v -> switchMode(2));
        root.addView(mode2Button);

        Button homeSettings = new Button(this);
        homeSettings.setText("Open Android Home settings");
        homeSettings.setOnClickListener(v -> {
            try {
                startActivity(new Intent(Settings.ACTION_HOME_SETTINGS));
            } catch (Exception ignored) {
                startActivity(new Intent(Settings.ACTION_SETTINGS));
            }
        });
        root.addView(homeSettings);

        setContentView(root);
    }

    private void switchMode(int mode) {
        ComponentName enable = mode == 1 ? mode1 : mode2;
        ComponentName disable = mode == 1 ? mode2 : mode1;

        getPackageManager().setComponentEnabledSetting(
            enable, PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP);
        getPackageManager().setComponentEnabledSetting(
            disable, PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP);

        Toast.makeText(this, "Launcher mode " + mode + " activated.", Toast.LENGTH_SHORT).show();

        try {
            Intent home = new Intent(Intent.ACTION_MAIN);
            home.addCategory(Intent.CATEGORY_HOME);
            home.addCategory(Intent.CATEGORY_DEFAULT);
            home.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(home);
        } catch (Exception ignored) {}

        showSettings();
    }

    private boolean isEnabled(ComponentName component) {
        int state = getPackageManager().getComponentEnabledSetting(component);
        if (state == PackageManager.COMPONENT_ENABLED_STATE_DISABLED) return false;
        if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) return true;
        return component.equals(mode1);
    }
}
