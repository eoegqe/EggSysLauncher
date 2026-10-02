package com.theegget.eggsys.eaf;

import android.content.Context;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public final class EafRegistry {
    private EafRegistry() {}

    public static List<EafPackage> list(Context context) {
        ArrayList<EafPackage> result = new ArrayList<>();
        File root = EafPackage.appRoot(context);
        File[] children = root.listFiles();
        if (children == null) return result;

        for (File child : children) {
            if (!child.isDirectory() || child.getName().startsWith(".")) continue;
            try {
                result.add(EafPackage.readInstalled(child));
            } catch (Exception ignored) {
                // Invalid/corrupt EAFs are not exposed to the launcher.
            }
        }

        Collections.sort(result, Comparator.comparing(p -> p.name.toLowerCase()));
        return result;
    }
}
