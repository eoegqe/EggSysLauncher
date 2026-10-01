package com.theegget.eggsys.bootsettings;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String MANAGER_PACKAGE = "com.theegget.eggsys";
    private static final String MANAGER_ACTIVITY = "com.theegget.eggsys.ManagerActivity";

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showSettings();
    }

    private void showSettings() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(40, 40, 40, 40);

        TextView title = new TextView(this);
        title.setText("EggSys Boot Settings");
        title.setTextSize(28);
        root.addView(title);

        TextView info = new TextView(this);
        info.setText("Choose which EggSys launcher mode is used when EggSys Bootable is enabled.");
        info.setTextSize(17);
        info.setPadding(0, 16, 0, 24);
        root.addView(info);

        Button mode1 = new Button(this);
        mode1.setText("Use Mode 1");
        mode1.setOnClickListener(v -> selectMode(1));
        root.addView(mode1);

        Button mode2 = new Button(this);
        mode2.setText("Use Mode 2");
        mode2.setOnClickListener(v -> selectMode(2));
        root.addView(mode2);

        Button manager = new Button(this);
        manager.setText("Open EggSys Manager");
        manager.setOnClickListener(v -> openManager());
        root.addView(manager);

        setContentView(root);
    }

    private void selectMode(int mode) {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(MANAGER_PACKAGE, MANAGER_ACTIVITY));
        intent.putExtra("boot_settings_mode", mode);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }

    private void openManager() {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(MANAGER_PACKAGE, MANAGER_ACTIVITY));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }
}
