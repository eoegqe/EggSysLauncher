package com.theegget.eggsys.files;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class FileEditorActivity extends Activity {
    private static final int BG = Color.rgb(10, 13, 20);
    private static final int SURFACE = Color.rgb(22, 28, 40);
    private static final int TEXT = Color.rgb(246, 248, 252);
    private static final int MUTED = Color.rgb(151, 163, 184);
    private static final int ACCENT = Color.rgb(139, 169, 255);

    private Uri fileUri;
    private EditText editor;
    private boolean saved = true;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        fileUri = getIntent().getData();
        buildScreen();
        loadFile();
    }

    private void buildScreen() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setPadding(dp(16), dp(14), dp(16), dp(12));

        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = new TextView(this);
        String name = getIntent().getStringExtra("file_name");
        title.setText(name == null ? "EggSys Edit" : name);
        title.setTextColor(TEXT);
        title.setTextSize(18);
        title.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        top.addView(title, new LinearLayout.LayoutParams(0, -2, 1f));

        Button save = new Button(this);
        save.setText("Save");
        save.setAllCaps(false);
        save.setTextColor(ACCENT);
        save.setOnClickListener(v -> saveFile());
        top.addView(save);
        root.addView(top);

        TextView subtitle = new TextView(this);
        subtitle.setText("TEXT EDITOR");
        subtitle.setTextColor(MUTED);
        subtitle.setTextSize(10);
        subtitle.setLetterSpacing(0.14f);
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(-1, -2);
        subtitleParams.topMargin = dp(5);
        subtitleParams.bottomMargin = dp(10);
        root.addView(subtitle, subtitleParams);

        editor = new EditText(this);
        editor.setGravity(Gravity.TOP | Gravity.START);
        editor.setTextColor(TEXT);
        editor.setHintTextColor(MUTED);
        editor.setHint("Start typing…");
        editor.setTextSize(14);
        editor.setTypeface(Typeface.MONOSPACE);
        editor.setPadding(dp(14), dp(14), dp(14), dp(14));
        editor.setBackground(round(SURFACE, dp(16)));
        editor.setSingleLine(false);
        editor.setHorizontallyScrolling(false);
        editor.setInputType(android.text.InputType.TYPE_CLASS_TEXT
                | android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE
                | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        root.addView(editor, new LinearLayout.LayoutParams(-1, 0, 1f));
        editor.addTextChangedListener(new android.text.TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) { saved = false; }
            @Override public void afterTextChanged(android.text.Editable s) { }
        });
        setContentView(root);
    }

    private void loadFile() {
        if (fileUri == null) {
            Toast.makeText(this, "No file was provided.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        try (InputStream input = getContentResolver().openInputStream(fileUri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new IllegalStateException("File could not be opened");
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            editor.setText(new String(output.toByteArray(), StandardCharsets.UTF_8));
            saved = true;
        } catch (Exception e) {
            Toast.makeText(this, "Couldn't read this file: " + e.getMessage(), Toast.LENGTH_LONG).show();
            finish();
        }
    }

    private void saveFile() {
        if (fileUri == null) return;
        try (OutputStream output = getContentResolver().openOutputStream(fileUri, "wt")) {
            if (output == null) throw new IllegalStateException("File can't be written");
            output.write(editor.getText().toString().getBytes(StandardCharsets.UTF_8));
            output.flush();
            saved = true;
            Toast.makeText(this, "File saved.", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "Couldn't save this file: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private GradientDrawable round(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onBackPressed() {
        if (!saved) {
            new android.app.AlertDialog.Builder(this)
                    .setTitle("Discard changes?")
                    .setMessage("You have unsaved edits.")
                    .setNegativeButton("Keep editing", (dialog, which) -> dialog.dismiss())
                    .setPositiveButton("Discard", (dialog, which) -> super.onBackPressed())
                    .show();
        } else {
            super.onBackPressed();
        }
    }
}
