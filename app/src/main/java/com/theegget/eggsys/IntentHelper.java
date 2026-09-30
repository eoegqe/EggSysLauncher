package com.theegget.eggsys;

import android.content.Context;
import android.content.Intent;

public final class IntentHelper {
    private IntentHelper() {}

    public static void openManager(Context context) {
        Intent intent = new Intent(context, ManagerActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(intent);
    }
}