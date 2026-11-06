package com.theegget.eggsys;

public class NativeLauncherActivity extends LauncherBaseActivity {
    @Override
    protected int getMode() {
        return 0;
    }

    @Override
    protected String getPath() {
        return "/MobileApp";
    }
}
