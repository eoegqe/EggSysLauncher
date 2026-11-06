Build without Android Studio:
1. Create a free GitHub account, make a new (private is fine) repository.
2. Upload the contents of this folder to it (drag & drop in the web UI; include the hidden .github folder).
3. Open the repo's "Actions" tab -> "Build APK" -> wait ~3-5 minutes.
4. Open the finished run, download the "EggSysOS-apk" artifact (zip), extract app-debug.apk.
5. Copy it to your phone, allow "install unknown apps", install, then press Home and pick "Egg System" as your home app.

Android APK build:
1. In the EggSysLauncher repository, open Settings -> Secrets and variables -> Actions.
2. Add a repository secret named EGGSYS_WEB_TOKEN.
3. The token must have read-only Contents access to the private eoegqe/EggSysWeb repository.
4. Run the "Build EggetSystem APK" workflow. It checks out the latest EggSysWeb main branch, builds the web app, bundles its files into the Android APK, and builds the launcher.
