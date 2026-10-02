package com.theegget.eggsys;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class SetupActivity extends Activity {
    private static final String UPTODOWN_URL = "https://1drv.ms/u/c/938a95e492e56303/IQDvFAXq45Q-TIhNqvEzsqthASt73lWSjMCZe0jwwlhnTXk?e=leBM5N&download=1";
    private long downloadId = -1L;
    private BroadcastReceiver downloadReceiver;
    private TextView status;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(0xFF000000);
        getWindow().setNavigationBarColor(0xFF000000);
        buildUi();
        startUptodownDownload();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(40, 40, 40, 40);
        root.setBackgroundColor(0xFF000000);

        TextView title = new TextView(this);
        title.setText("EggSys Setup");
        title.setTextColor(0xFFFFFFFF);
        title.setTextSize(30);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView description = new TextView(this);
        description.setText("Preparing EggSysOS and Uptodown App Store");
        description.setTextColor(0xFFBDBDBD);
        description.setTextSize(16);
        description.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams descriptionParams = new LinearLayout.LayoutParams(-1, -2);
        descriptionParams.topMargin = 18;
        root.addView(description, descriptionParams);

        status = new TextView(this);
        status.setText("Starting download...");
        status.setTextColor(0xFFFFFFFF);
        status.setTextSize(14);
        status.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams statusParams = new LinearLayout.LayoutParams(-1, -2);
        statusParams.topMargin = 20;
        root.addView(status, statusParams);

        Button continueButton = new Button(this);
        continueButton.setText("Continue to EggSysOS");
        continueButton.setOnClickListener(v -> openEggSysOS());
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(-1, -2);
        buttonParams.topMargin = 30;
        root.addView(continueButton, buttonParams);

        setContentView(root);
    }

    private void startUptodownDownload() {
        DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (manager == null) {
            status.setText("Download service unavailable.");
            return;
        }

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(UPTODOWN_URL));
        request.setTitle("Uptodown App Store");
        request.setDescription("EggSysOS setup");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "uptodown.apk");
        request.setMimeType("application/vnd.android.package-archive");

        try {
            downloadId = manager.enqueue(request);
            status.setText("Downloading Uptodown App Store...");
            registerDownloadReceiver();
        } catch (Exception e) {
            status.setText("Unable to start the Uptodown download.");
        }
    }

    private void registerDownloadReceiver() {
        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
                if (id != downloadId) return;
                status.setText("Uptodown App Store download complete.");
                installDownloadedApk();
            }
        };
        registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
    }

    private void installDownloadedApk() {
        DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (manager == null) return;
        Uri apkUri = manager.getUriForDownloadedFile(downloadId);
        if (apkUri == null) {
            status.setText("Download finished, but the APK could not be opened.");
            return;
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O
                && !getPackageManager().canRequestPackageInstalls()) {
            status.setText("Allow EggSys Setup to install the downloaded APK.");
            startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getPackageName())));
            return;
        }

        Intent install = new Intent(Intent.ACTION_VIEW);
        install.setDataAndType(apkUri, "application/vnd.android.package-archive");
        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(install);
        } catch (Exception e) {
            status.setText("Android could not open the downloaded APK.");
        }
    }

    private void openEggSysOS() {
        Intent intent = new Intent(this, NativeLauncherActivity.class);
        startActivity(intent);
        finish();
    }

    @Override
    protected void onDestroy() {
        if (downloadReceiver != null) {
            try {
                unregisterReceiver(downloadReceiver);
            } catch (Exception ignored) {
            }
        }
        super.onDestroy();
    }
}
