package com.eggsys.os;

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

public class MainActivity extends Activity {

    private static final String HOST = "web-egget-system.base44.app";
    private static final String BASE_URL = "https://" + HOST + "/";

    private WebView webView;

    /** Mode number, overridden by SecondActivity. */
    protected int getMode() { return 1; }

    /** Path appended to the site root for this mode. Mode 1 = root. */
    protected String getPath() { return ""; }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        setContentView(webView);
        goImmersive();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false; // stay in app
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });

        webView.addJavascriptInterface(new Bridge(), "EggSysOS");

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(BASE_URL + getPath());
        }
    }

    /** JS bridge: EggSysOS.open("com.example.app") */
    private class Bridge {
        @JavascriptInterface
        public boolean open(String appId) {
            if (appId == null || appId.isEmpty() || !isTrustedPage()) return false;
            Intent i = getPackageManager().getLaunchIntentForPackage(appId);
            if (i == null) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                        "App not installed: " + appId, Toast.LENGTH_SHORT).show());
                return false;
            }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            return true;
        }

        @JavascriptInterface
        public int mode() { return getMode(); }
    }

    private boolean isTrustedPage() {
        // getUrl must be called on the UI thread; bridge calls arrive on a background thread.
        final String[] url = new String[1];
        final Object lock = new Object();
        runOnUiThread(() -> { synchronized (lock) { url[0] = webView.getUrl(); lock.notifyAll(); } });
        synchronized (lock) {
            try { if (url[0] == null) lock.wait(1000); } catch (InterruptedException ignored) {}
        }
        return url[0] != null && HOST.equals(Uri.parse(url[0]).getHost());
    }

    private void goImmersive() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goImmersive();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack(); // as a home screen, never exit
    }

    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); }

    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        webView.saveState(out);
    }

    @Override protected void onPause() { super.onPause(); webView.onPause(); }
    @Override protected void onResume() { super.onResume(); webView.onResume(); }
}
