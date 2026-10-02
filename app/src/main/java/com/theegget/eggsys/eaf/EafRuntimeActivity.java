package com.theegget.eggsys.eaf;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.nio.charset.StandardCharsets;

public class EafRuntimeActivity extends Activity {
    public static final String EXTRA_EAF_ID = "eaf_id";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String id = getIntent().getStringExtra(EXTRA_EAF_ID);
        if (id == null || !id.matches("[a-zA-Z0-9._-]+")) {
            finish();
            return;
        }

        try {
            File directory = new File(EafPackage.appRoot(this), id);
            EafPackage pkg = EafPackage.readInstalled(directory);
            render(pkg);
        } catch (Exception e) {
            showError("Unable to start EAF application.\n" + e.getMessage());
        }
    }

    private void render(EafPackage pkg) throws Exception {
        File entry = new File(pkg.directory, pkg.entryPoint);
        if (!entry.getCanonicalPath().startsWith(pkg.directory.getCanonicalPath() + File.separator)) {
            throw new Exception("Invalid EAF entry path");
        }
        if (!entry.isFile()) throw new Exception("EAF entry point not found");

        JSONObject ui = new JSONObject(
            new String(java.nio.file.Files.readAllBytes(entry.toPath()), StandardCharsets.UTF_8)
        );

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.TOP);
        root.setPadding(32, 48, 32, 32);
        root.setBackgroundColor(Color.BLACK);

        TextView title = new TextView(this);
        title.setText(ui.optString("title", pkg.name));
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView text = new TextView(this);
        text.setText(ui.optString("text", ""));
        text.setTextColor(0xFFCCCCCC);
        text.setTextSize(17);
        text.setPadding(0, 18, 0, 24);
        root.addView(text, new LinearLayout.LayoutParams(-1, -2));

        JSONArray buttons = ui.optJSONArray("buttons");
        if (buttons != null) {
            for (int i = 0; i < buttons.length(); i++) {
                JSONObject buttonData = buttons.getJSONObject(i);
                Button button = new Button(this);
                button.setText(buttonData.optString("text", "Button"));
                String action = buttonData.optString("action", "");
                button.setOnClickListener(v -> {
                    if ("close".equals(action)) finish();
                });
                root.addView(button, new LinearLayout.LayoutParams(-1, -2));
            }
        }

        setTitle(pkg.name);
        setContentView(root);
    }

    private void showError(String message) {
        TextView error = new TextView(this);
        error.setText(message);
        error.setTextColor(Color.WHITE);
        error.setTextSize(17);
        error.setPadding(32, 48, 32, 32);
        error.setBackgroundColor(Color.BLACK);
        setContentView(error);
    }
}
