package com.theegget.eggsys;

import android.content.Intent;
import android.inputmethodservice.InputMethodService;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.InputConnection;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class EggSysKeyboardService extends InputMethodService {
    private boolean shift = false;
    private LinearLayout root;

    @Override public View onCreateInputView() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(4, 4, 4, 4);
        root.setGravity(Gravity.CENTER);

        addRow("qwertyuiop");
        addRow("asdfghjkl");
        addRow("zxcvbnm");

        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.HORIZONTAL);
        addButton(bottom, "⚙", 1f, v -> openManager());
        addButton(bottom, "123", 1f, v -> commitText("123"));
        addButton(bottom, ",", 1f, v -> commitText(","));
        addButton(bottom, "SPACE", 3f, v -> commitText(" "));
        addButton(bottom, ".", 1f, v -> commitText("."));
        addButton(bottom, "↵", 1f, v -> sendEnter());
        addButton(bottom, "⌫", 1f, v -> deleteOne());
        root.addView(bottom, new LinearLayout.LayoutParams(-1, 0, 1f));

        return root;
    }

    private void addRow(String letters) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        for (int i = 0; i < letters.length(); i++) {
            String letter = String.valueOf(letters.charAt(i));
            addButton(row, letter, 1f, v -> commitText(shift ? letter.toUpperCase() : letter));
        }
        root.addView(row, new LinearLayout.LayoutParams(-1, 0, 1f));
    }

    private void addButton(LinearLayout row, String text, float weight, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextSize(text.length() > 3 ? 12 : 16);
        button.setAllCaps(false);
        button.setPadding(0, 0, 0, 0);
        button.setOnClickListener(listener);
        row.addView(button, new LinearLayout.LayoutParams(0, -1, weight));
    }

    private void commitText(String text) {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) ic.commitText(text, 1);
    }

    private void deleteOne() {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) ic.deleteSurroundingText(1, 0);
    }

    private void sendEnter() {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) {
            ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER));
            ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER));
        }
    }

    private void openManager() {
        Intent intent = new Intent(this, ManagerActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
    }
}
