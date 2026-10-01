package com.theegget.eggsys;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;

public class BootSequenceActivity extends Activity {
    private boolean finished;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        runBootSequence();
    }

    private void runBootSequence() {
        if (finished) return;
        finished = true;

        // Stage 1: only value 2 has meaning here.
        // A successful previous boot is consumed and reset to 0.
        if (BootState.get(this) == 2) {
            BootState.reset(this);
        }

        // Stage 2: value 1 means the previous startup never completed.
        if (BootState.get(this) == 1) {
            startRecovery();
            return;
        }

        // Mark this startup as in progress before launching the actual launcher.
        BootState.set(this, 1);
        startActualLauncher();
    }

    private void startActualLauncher() {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(
            this,
            LauncherMode1Activity.class
        ));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        try {
            startActivity(intent);
            finish();
        } catch (Exception ignored) {
            // Leave the state at 1 so the next boot enters EggSysRE.
            startRecovery();
        }
    }

    private void startRecovery() {
        Intent intent = new Intent(this, EggSysRecoveryActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }
}
