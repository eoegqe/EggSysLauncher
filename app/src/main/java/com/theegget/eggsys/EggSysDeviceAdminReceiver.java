package com.theegget.eggsys;

import android.app.admin.DeviceAdminReceiver;
import android.content.Intent;
import android.net.Uri;
import android.content.Context;

public class EggSysDeviceAdminReceiver extends DeviceAdminReceiver {
    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);

        if (context.getSharedPreferences("eggsys_boot_menu", Context.MODE_PRIVATE)
                .getBoolean("pending_uninstall", false)) {
            context.getSharedPreferences("eggsys_boot_menu", Context.MODE_PRIVATE)
                .edit()
                .putBoolean("pending_uninstall", false)
                .apply();

            Intent uninstall = new Intent(Intent.ACTION_DELETE);
            uninstall.setData(Uri.parse("package:" + context.getPackageName()));
            uninstall.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(uninstall);
        }
    }
}
