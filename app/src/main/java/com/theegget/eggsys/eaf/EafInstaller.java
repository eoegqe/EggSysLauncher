package com.theegget.eggsys.eaf;

import android.content.Context;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

public final class EafInstaller {
    private EafInstaller() {}

    public static EafPackage install(Context context, File source) throws Exception {
        EafPackage.validate(source);

        File staging = new File(context.getFilesDir(), "eaf/.staging");
        deleteRecursively(staging);
        if (!staging.mkdirs()) throw new IOException("Cannot create EAF staging directory");

        try (ZipFile zip = new ZipFile(source)) {
            java.util.Enumeration<? extends ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                String name = entry.getName();

                if (name.contains("..") || name.startsWith("/") || name.startsWith("\\")) {
                    throw new IOException("Unsafe EAF path");
                }

                File target = new File(staging, name);
                String root = staging.getCanonicalPath() + File.separator;
                if (!target.getCanonicalPath().startsWith(root)) {
                    throw new IOException("Unsafe EAF path");
                }

                if (entry.isDirectory()) {
                    if (!target.mkdirs() && !target.isDirectory()) {
                        throw new IOException("Cannot create EAF directory");
                    }
                    continue;
                }

                File parent = target.getParentFile();
                if (parent != null && !parent.exists() && !parent.mkdirs()) {
                    throw new IOException("Cannot create EAF directory");
                }

                try (FileInputStream ignored = null;
                     java.io.InputStream in = zip.getInputStream(entry);
                     FileOutputStream out = new FileOutputStream(target)) {
                    byte[] buffer = new byte[8192];
                    int count;
                    while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
                }
            }
        }

        EafPackage pkg = EafPackage.readInstalled(staging);
        File destination = new File(EafPackage.appRoot(context), pkg.id);
        File backup = new File(EafPackage.appRoot(context), "." + pkg.id + ".old");

        deleteRecursively(backup);
        if (destination.exists() && !destination.renameTo(backup)) {
            throw new IOException("Cannot replace existing EAF");
        }

        if (!staging.renameTo(destination)) {
            if (backup.exists()) backup.renameTo(destination);
            throw new IOException("Cannot install EAF");
        }

        deleteRecursively(backup);
        return EafPackage.readInstalled(destination);
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) deleteRecursively(child);
        }
        file.delete();
    }
}
