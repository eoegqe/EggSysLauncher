package com.theegget.eggsys.eaf;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class EafInstallerActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Uri uri = getIntent().getData();
        if (uri == null) {
            finish();
            return;
        }

        try {
            File incoming = new File(getCacheDir(), "incoming.eaf");
            try (InputStream in = getContentResolver().openInputStream(uri);
                 FileOutputStream out = new FileOutputStream(incoming)) {
                if (in == null) throw new Exception("Cannot read EAF file");
                byte[] buffer = new byte[8192];
                int count;
                while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
            }

            EafPackage pkg = EafInstaller.install(this, incoming);
            Toast.makeText(this, pkg.name + " installed in EggetSystem", Toast.LENGTH_LONG).show();

            Intent launcher = new Intent(this, com.theegget.eggsys.NativeLauncherActivity.class);
            launcher.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(launcher);
            finish();
        } catch (Exception e) {
            Toast.makeText(this, "EAF installation failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
            finish();
        }
    }
}
