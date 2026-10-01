package com.theegget.eggsys;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class EggSysRecoveryActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showRecovery();
    }

    private void showRecovery() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(40, 40, 40, 40);
        root.setBackgroundColor(Color.BLACK);

        TextView title = new TextView(this);
        title.setText("EGGSYS RECOVERY");
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        root.addView(title);

        TextView info = new TextView(this);
        info.setText("EggSysOS did not complete its previous startup.");
        info.setTextColor(0xFFAAAAAA);
        info.setTextSize(16);
        info.setPadding(0, 16, 0, 28);
        root.addView(info);

        Button restart = new Button(this);
        restart.setText("Restart EggSysOS");
        restart.setOnClickListener(v -> restartEggSys());
        root.addView(restart);

        Button reset = new Button(this);
        reset.setText("Reset boot state");
        reset.setOnClickListener(v -> {
            BootState.reset(this);
            showRecovery();
        });
        root.addView(reset);

        setContentView(root);
    }

    private void restartEggSys() {
        // Recovery is deliberately clearing the failed-start marker before retrying.
        BootState.reset(this);

        Intent intent = new Intent(this, BootSequenceActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
