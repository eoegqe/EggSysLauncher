package com.theegget.eggsys;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public abstract class LauncherBaseActivity extends Activity {
    private static final String HOST = "web-egget-system.base44.app";
    private static final String BASE_URL = "https://" + HOST + "/";
    private boolean volumeUpDown;
    private long volumeUpAt;
    private long volumeDownAt;
    protected WebView webView;
    private PasskeyBridge passkeyBridge;

    protected abstract int getMode();
    protected abstract String getPath();

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (android.os.Build.VERSION.SDK_INT >= 28) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
        }
        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        setContentView(webView);
        goImmersive();
        passkeyBridge = new PasskeyBridge(this);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });

        webView.addJavascriptInterface(new Bridge(), "EggSysOS");
        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl(BASE_URL + getPath());
    }

    private class Bridge {
        @JavascriptInterface public boolean open(String appId) {
            if (appId == null || appId.isEmpty() || !isTrustedPage()) return false;
            Intent i = getPackageManager().getLaunchIntentForPackage(appId);
            if (i == null) {
                runOnUiThread(() -> Toast.makeText(LauncherBaseActivity.this,
                    "App not installed: " + appId, Toast.LENGTH_SHORT).show());
                return false;
            }
            startActivity(i);
            return true;
        }

        @JavascriptInterface public int mode() { return getMode(); }

        @JavascriptInterface public void getPasskey(String requestJson) {
            if (!isTrustedPage() || requestJson == null || requestJson.isEmpty()) return;
            passkeyBridge.getPasskey(requestJson, new PasskeyBridge.ResultCallback() {
                @Override public void success(String responseJson) {
                    runOnUiThread(() -> webView.evaluateJavascript(
                        "window.EggSysPasskeyResult(" + JSONObject.quote(responseJson) + ", null)", null));
                }
                @Override public void error(String message) {
                    runOnUiThread(() -> webView.evaluateJavascript(
                        "window.EggSysPasskeyResult(null, " + JSONObject.quote(message) + ")", null));
                }
            });
        }
    }

    private boolean isTrustedPage() {
        String url = webView.getUrl();
        return url != null && HOST.equals(Uri.parse(url).getHost());
    }

    private void goImmersive() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override public boolean onKeyDown(int keyCode, android.view.KeyEvent event) {
        if (!getSharedPreferences("eggsys_manager", MODE_PRIVATE).getBoolean("volume_shortcut_enabled", true)) return super.onKeyDown(keyCode, event);
        if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP) { volumeUpDown = true; volumeUpAt = System.currentTimeMillis(); checkVolumeShortcut(); return true; }
        if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_DOWN) { volumeDownAt = System.currentTimeMillis(); checkVolumeShortcut(); return true; }
        return super.onKeyDown(keyCode, event);
    }

    @Override public boolean onKeyUp(int keyCode, android.view.KeyEvent event) {
        if (!getSharedPreferences("eggsys_manager", MODE_PRIVATE).getBoolean("volume_shortcut_enabled", true)) return super.onKeyUp(keyCode, event);
        if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP) { volumeUpDown = false; return true; }
        if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_DOWN) return true;
        return super.onKeyUp(keyCode, event);
    }

    private void checkVolumeShortcut() {
        long now = System.currentTimeMillis();
        if (volumeUpDown && volumeDownAt != 0 && Math.abs(volumeUpAt - volumeDownAt) <= 350) openManager();
    }

    private void openManager() {
        volumeDownAt = 0; volumeUpAt = 0;
        try { startActivity(new Intent(this, ManagerActivity.class)); } catch (Exception ignored) {}
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) goImmersive(); }
    @Override public void onBackPressed() { if (webView.canGoBack()) webView.goBack(); }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); webView.saveState(out); }
    @Override protected void onPause() { super.onPause(); webView.onPause(); }
    @Override protected void onResume() { super.onResume(); webView.onResume(); }
}
