package com.theegget.eggsys;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class EggSysShutdownReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_SHUTDOWN.equals(intent.getAction())) {
            BootState.reset(context);
        }
    }
}
