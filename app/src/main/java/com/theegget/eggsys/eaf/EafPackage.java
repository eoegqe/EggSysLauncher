package com.theegget.eggsys.eaf;

import android.content.Context;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.DataInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

public final class EafPackage {
    public static final int FORMAT_VERSION = 1;
    private static final byte[] MAGIC = new byte[] {'E','G','G','E','T','-','E','A','F',0};

    public final String id;
    public final String name;
    public final String version;
    public final String entryPoint;
    public final File directory;

    private EafPackage(String id, String name, String version, String entryPoint, File directory) {
        this.id = id;
        this.name = name;
        this.version = version;
        this.entryPoint = entryPoint;
        this.directory = directory;
    }

    public static EafPackage readInstalled(File directory) throws Exception {
        File manifest = new File(directory, "manifest.json");
        if (!manifest.isFile()) throw new IOException("Missing EAF manifest");

        byte[] data = java.nio.file.Files.readAllBytes(manifest.toPath());
        JSONObject json = new JSONObject(new String(data, StandardCharsets.UTF_8));

        require(json, "id");
        require(json, "name");
        require(json, "version");
        require(json, "entry");

        return new EafPackage(
            json.getString("id"),
            json.getString("name"),
            json.getString("version"),
            json.getString("entry"),
            directory
        );
    }

    public static void validate(File source) throws Exception {
        if (!source.isFile() || !source.getName().toLowerCase().endsWith(".eaf")) {
            throw new IOException("Not an EAF file");
        }

        try (ZipFile zip = new ZipFile(source)) {
            ZipEntry header = zip.getEntry("eaf/header");
            ZipEntry manifest = zip.getEntry("manifest.json");
            if (header == null || manifest == null) {
                throw new IOException("Invalid EAF structure");
            }

            try (DataInputStream in = new DataInputStream(
                    new BufferedInputStream(zip.getInputStream(header)))) {
                byte[] magic = new byte[MAGIC.length];
                in.readFully(magic);
                for (int i = 0; i < MAGIC.length; i++) {
                    if (magic[i] != MAGIC[i]) throw new IOException("Invalid EAF signature");
                }
                int version = in.readInt();
                if (version != FORMAT_VERSION) {
                    throw new IOException("Unsupported EAF version: " + version);
                }
            }

            byte[] bytes = zip.getInputStream(manifest).readAllBytes();
            JSONObject json = new JSONObject(new String(bytes, StandardCharsets.UTF_8));
            require(json, "id");
            require(json, "name");
            require(json, "version");
            require(json, "entry");

            String id = json.getString("id");
            if (!id.matches("[a-zA-Z0-9._-]+")) {
                throw new IOException("Invalid EAF application ID");
            }
        }
    }

    private static void require(JSONObject json, String key) throws IOException {
        if (!json.has(key) || json.optString(key).trim().isEmpty()) {
            throw new IOException("Missing EAF manifest field: " + key);
        }
    }

    public static File appRoot(Context context) {
        File root = new File(context.getFilesDir(), "eaf/apps");
        if (!root.exists() && !root.mkdirs()) throw new IllegalStateException("Cannot create EAF app directory");
        return root;
    }
}
