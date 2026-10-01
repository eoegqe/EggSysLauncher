package com.theegget.eggsys;

import android.content.Context;
import android.content.SharedPreferences;

public final class BootState {
    private static final String PREFS = "eggsys_boot_state";
    private static final String KEY_HAS_ALREADY_BOOTED = "has_already_booted";

    private BootState() {}

    public static int get(Context context) {
        return prefs(context).getInt(KEY_HAS_ALREADY_BOOTED, 0);
    }

    public static void set(Context context, int value) {
        prefs(context).edit().putInt(KEY_HAS_ALREADY_BOOTED, value).commit();
    }

    public static void reset(Context context) {
        set(context, 0);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
