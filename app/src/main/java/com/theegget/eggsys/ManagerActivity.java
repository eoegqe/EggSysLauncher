package com.theegget.eggsys;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class ManagerActivity extends Activity {
    private ComponentName mode1;
    private ComponentName mode2;
    private LinearLayout content;
    private TextView status;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mode1 = new ComponentName(this, LauncherMode1Activity.class);
        mode2 = new ComponentName(this, LauncherMode2Activity.class);
        showSettings();
    }

    private void showSettings() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 32, 32, 32);

        TextView title = new TextView(this);
        title.setText("EggSys Manager");
        title.setTextSize(28);
        root.addView(title);

        LinearLayout tabs = new LinearLayout(this);
        tabs.setOrientation(LinearLayout.HORIZONTAL);

        Button behaviorTab = new Button(this);
        behaviorTab.setText("Behavior");
        Button launcherTab = new Button(this);
        launcherTab.setText("Choose Launcher");
        tabs.addView(behaviorTab, new LinearLayout.LayoutParams(0, -2, 1));
        tabs.addView(launcherTab, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(tabs);

        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(0, 24, 0, 0);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));

        Button androidSettings = new Button(this);
        androidSettings.setText("Open Android Home settings");
        androidSettings.setOnClickListener(v -> {
            try { startActivity(new Intent(Settings.ACTION_HOME_SETTINGS)); }
            catch (Exception ignored) { startActivity(new Intent(Settings.ACTION_SETTINGS)); }
        });
        root.addView(androidSettings);

        behaviorTab.setOnClickListener(v -> showBehaviorTab());
        launcherTab.setOnClickListener(v -> showLauncherTab());

        setContentView(root);
        showBehaviorTab();
    }

    private void showBehaviorTab() {
        content.removeAllViews();

        TextView heading = new TextView(this);
        heading.setText("Launcher behavior");
        heading.setTextSize(22);
        content.addView(heading);

        TextView web = new TextView(this);
        web.setText("Web — EggSys Launcher mode 1\nLoads the normal EggetSystem web interface.");
        web.setTextSize(18);
        web.setPadding(0, 24, 0, 24);
        content.addView(web);

        TextView os = new TextView(this);
        os.setText("OS — EggSys Launcher mode 2\nLoads the OS interface.");
        os.setTextSize(18);
        os.setPadding(0, 24, 0, 24);
        content.addView(os);
    }

    private void showLauncherTab() {
        content.removeAllViews();

        TextView heading = new TextView(this);
        heading.setText("Choose Launcher");
        heading.setTextSize(22);
        content.addView(heading);

        status = new TextView(this);
        status.setText("Current: " + currentMode());
        status.setTextSize(18);
        status.setPadding(0, 20, 0, 20);
        content.addView(status);

        Button mode1Button = new Button(this);
        mode1Button.setText("Activate EggSys Launcher mode 1 (Web)");
        mode1Button.setOnClickListener(v -> switchMode(1));
        content.addView(mode1Button);

        Button mode2Button = new Button(this);
        mode2Button.setText("Activate EggSys Launcher mode 2 (OS)");
        mode2Button.setOnClickListener(v -> switchMode(2));
        content.addView(mode2Button);

        Button disableButton = new Button(this);
        disableButton.setText("Deactivate both launchers");
        disableButton.setOnClickListener(v -> disableBoth());
        content.addView(disableButton);
    }

    private void switchMode(int mode) {
        ComponentName enable = mode == 1 ? mode1 : mode2;
        ComponentName disable = mode == 1 ? mode2 : mode1;

        getPackageManager().setComponentEnabledSetting(enable,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
        getPackageManager().setComponentEnabledSetting(disable,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);

        try {
            Intent home = new Intent(Intent.ACTION_MAIN);
            home.addCategory(Intent.CATEGORY_HOME);
            home.addCategory(Intent.CATEGORY_DEFAULT);
            home.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(home);
        } catch (Exception ignored) {}
        showLauncherTab();
    }

    private void disableBoth() {
        getPackageManager().setComponentEnabledSetting(mode1,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
        getPackageManager().setComponentEnabledSetting(mode2,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
        showLauncherTab();
    }

    private String currentMode() {
        if (isEnabled(mode1)) return "EggSys Launcher mode 1 (Web)";
        if (isEnabled(mode2)) return "EggSys Launcher mode 2 (OS)";
        return "None";
    }

    private boolean isEnabled(ComponentName component) {
        return getPackageManager().getComponentEnabledSetting(component)
            == PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
    }
}
