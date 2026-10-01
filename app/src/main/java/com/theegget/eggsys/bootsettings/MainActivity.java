package com.theegget.eggsys.bootsettings;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.database.Cursor;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.view.View;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final String MANAGER_PACKAGE = "com.theegget.eggsys";
    private static final String MANAGER_ACTIVITY = "com.theegget.eggsys.ManagerActivity";
    private static final String LAUNCHER_ACTIVITY = "com.theegget.eggsys.LauncherMode1Activity";
    private static final String PREFS = "eggsys_boot_menu";
    private static final String OS_LIST = "os_list";
    private static final int PICK_OS = 4001;

    private LinearLayout list;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showBootMenu();
    }

    @Override protected void onResume() {
        super.onResume();
        if (list != null) rebuildList();
    }

    private void showBootMenu() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(40, 40, 40, 40);

        TextView title = new TextView(this);
        title.setText("EggSys Boot Menu");
        title.setTextSize(28);
        root.addView(title);

        TextView info = new TextView(this);
        info.setText("Choose an OS to boot. OS files contain a website URL.");
        info.setTextSize(17);
        info.setPadding(0, 12, 0, 24);
        root.addView(info);

        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        root.addView(list);

        Button add = new Button(this);
        add.setText("+ Add OS");
        add.setTextSize(18);
        add.setOnClickListener(v -> pickOsFile());
        root.addView(add);

        setContentView(root);
        rebuildList();
    }

    private void rebuildList() {
        if (list == null) return;
        list.removeAllViews();

        Button eggSys = new Button(this);
        eggSys.setText("EggSys");
        eggSys.setTextSize(18);
        eggSys.setOnClickListener(v ->
            boot("https://web-egget-system.base44.app/desktop")
        );
        list.addView(eggSys);

        for (OsEntry os : loadOsEntries()) {
            Button button = new Button(this);
            button.setText(os.name);
            button.setTextSize(18);
            button.setOnClickListener(v -> boot(os.url));

            button.setOnLongClickListener(v -> {
                removeOs(os.name, os.url);
                rebuildList();
                Toast.makeText(this, "Removed " + os.name, Toast.LENGTH_SHORT).show();
                return true;
            });

            list.addView(button);
        }
    }

    private void pickOsFile() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
            "application/octet-stream",
            "text/plain"
        });
        try {
            startActivityForResult(intent, PICK_OS);
        } catch (Exception ignored) {
            Toast.makeText(this, "Unable to open file picker", Toast.LENGTH_SHORT).show();
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_OS || resultCode != RESULT_OK || data == null || data.getData() == null) return;

        Uri uri = data.getData();
        String url = readOsUrl(uri);
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
            Toast.makeText(this, "The .OS file must contain an http:// or https:// URL.", Toast.LENGTH_LONG).show();
            return;
        }

        String name = getFileName(uri);
        if (name == null || name.isEmpty()) name = "Other OS";
        if (name.toLowerCase().endsWith(".os")) name = name.substring(0, name.length() - 3);
        if (name.isEmpty()) name = "Other OS";

        saveOs(new OsEntry(name, url));
        rebuildList();
        Toast.makeText(this, "OS added: " + name, Toast.LENGTH_SHORT).show();
    }

    private String readOsUrl(Uri uri) {
        try (InputStream input = getContentResolver().openInputStream(uri);
             BufferedReader reader = new BufferedReader(new InputStreamReader(input))) {
            String line = reader.readLine();
            if (line == null) return null;
            line = line.trim();
            return line.isEmpty() ? null : line;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String getFileName(Uri uri) {
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(uri, null, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) return cursor.getString(index);
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return "Other OS";
    }

    private void boot(String url) {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(MANAGER_PACKAGE, LAUNCHER_ACTIVITY));
        intent.putExtra("eggsys_boot_url", url);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        try {
            startActivity(intent);
            finish();
        } catch (Exception ignored) {
            Toast.makeText(this, "Unable to boot OS", Toast.LENGTH_SHORT).show();
        }
    }

    private List<OsEntry> loadOsEntries() {
        List<OsEntry> result = new ArrayList<>();
        String raw = getSharedPreferences(PREFS, MODE_PRIVATE).getString(OS_LIST, "[]");
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                JSONObject object = array.getJSONObject(i);
                result.add(new OsEntry(
                    object.optString("name", "Other OS"),
                    object.optString("url", "")
                ));
            }
        } catch (Exception ignored) {
        }
        return result;
    }

    private void saveOs(OsEntry entry) {
        List<OsEntry> entries = loadOsEntries();
        for (OsEntry existing : entries) {
            if (existing.name.equals(entry.name) || existing.url.equals(entry.url)) {
                existing.name = entry.name;
                existing.url = entry.url;
                saveOsEntries(entries);
                return;
            }
        }
        entries.add(entry);
        saveOsEntries(entries);
    }

    private void removeOs(String name, String url) {
        List<OsEntry> entries = loadOsEntries();
        entries.removeIf(entry -> entry.name.equals(name) && entry.url.equals(url));
        saveOsEntries(entries);
    }

    private void saveOsEntries(List<OsEntry> entries) {
        JSONArray array = new JSONArray();
        for (OsEntry entry : entries) {
            JSONObject object = new JSONObject();
            try {
                object.put("name", entry.name);
                object.put("url", entry.url);
                array.put(object);
            } catch (Exception ignored) {
            }
        }
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(OS_LIST, array.toString()).apply();
    }

    private static class OsEntry {
        String name;
        String url;

        OsEntry(String name, String url) {
            this.name = name;
            this.url = url;
        }
    }
}
