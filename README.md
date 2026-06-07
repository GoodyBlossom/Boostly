# Boostly

Boostly is a compact offline task manager packaged as a native Android WebView APK. It uses HTML, CSS, and JavaScript only. Tasks, priorities, completion state, and theme preference are stored locally with `localStorage`.

## What The App Does

- Add quick tasks.
- Sort tasks into Focus, Next, and Later lanes.
- Mark tasks complete.
- Filter all, focus, open, and done tasks.
- Keep data on the device with no backend and no internet requirement.

## Run The Web App Locally

Open this file in a browser:

```text
android/app/src/main/assets/www/index.html
```

The web app is fully offline and does not require a server.

## Build The APK

Install Java 17, Android SDK build tools, and Gradle, then run:

```bash
keytool -genkeypair -v -keystore boostly-release.jks -storepass boostlyrelease -keypass boostlyrelease -alias boostly -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Boostly, OU=Release, O=Boostly, L=Lagos, ST=Lagos, C=NG"
gradle :android:app:assembleRelease --no-daemon
cp android/app/build/outputs/apk/release/app-release.apk boostly.apk
```

The Android WebView loads:

```text
file:///android_asset/www/index.html
```

JavaScript and localStorage are enabled in `MainActivity`.

## Where To Find The APK

After a release build, the final APK is copied to the project root:

```text
boostly.apk
```

GitHub Actions also uploads `boostly.apk` to the latest GitHub Release.
