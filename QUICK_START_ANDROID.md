# Quick Start: Android App Development

## TL;DR - Get Running in 5 Minutes

### 1. Install Android Studio
Download from: https://developer.android.com/studio

### 2. Build Web Assets
```bash
npm run native:build
```

### 3. Open in Android Studio
```bash
cd android
# Then use Android Studio: File > Open > select this folder
```

### 4. Run
- In Android Studio: Click **Run** (green play button)
- Select your emulator or device
- Wait for build and launch

## Detailed Steps

### Prerequisites
- Node.js 18+ installed
- Android Studio installed
- JDK 17+ (comes with Android Studio)
- 5GB free disk space for Android SDK

### Build & Run Locally

```bash
# 1. Build everything and sync to Android
npm run native:build

# 2. Open Android folder in Android Studio
cd android
# (File > Open in Android Studio)

# 3. Let Gradle sync (takes 1-2 minutes first time)
# 4. Click green play button (Run)
# 5. Select emulator or connected device
```

### Key Commands

```bash
npm run build           # Build web app only
npm run native:build    # Build + sync to Android
npm run native:android  # Build + sync + run emulator (requires Android Studio)
npm run native:ios      # Prepare for iOS (requires Xcode)
```

## What's Configured

✅ **Capacitor 6.0** - Native app wrapper
✅ **8 Plugins** - Camera, filesystem, push notifications, etc.
✅ **Secure Storage** - Tokens stored securely (not localStorage)
✅ **Android Permissions** - Camera, storage, biometric, notifications
✅ **Splash Screen** - Custom 3-second launch screen
✅ **Status Bar** - Styled for iOS/Android
✅ **Web Sync** - Auto-copy build to Android assets
✅ **API Ready** - No CORS issues (native app)

## Testing Checklist

- [ ] App launches
- [ ] Can log in
- [ ] Dashboard loads
- [ ] Can navigate pages
- [ ] Token persists after app restart
- [ ] Logout works
- [ ] No crashes in logcat

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank white screen | Run `npm run native:build` again, check dist/ exists |
| Build fails | Click Sync Now in Android Studio, check SDK in Settings |
| Emulator won't start | Enable virtualization in BIOS, reinstall emulator |
| API calls fail | Check backend running, verify API URL in capacitor.config.ts |

## Next: Code Changes

To integrate native features later:

### Camera (Photo Upload)
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri
});
```

### File Storage
```typescript
import { Filesystem, Directory } from '@capacitor/filesystem';

await Filesystem.writeFile({
  path: 'myfile.txt',
  data: 'Hello World',
  directory: Directory.Documents,
});
```

### Push Notifications
```typescript
import { PushNotifications } from '@capacitor/push-notifications';

await PushNotifications.requestPermissions();
```

### Share Receipt
```typescript
import { Share } from '@capacitor/share';

await Share.share({
  title: 'Receipt',
  text: 'Payment receipt attached',
  url: 'file:///path/to/receipt.pdf',
});
```

## File Structure

```
android/
├── app/src/main/
│   ├── AndroidManifest.xml      ← Permissions configured
│   ├── java/io/ionic/starter/   ← Activity/app code
│   └── assets/public/            ← Web app files (auto-synced)
├── build.gradle                 ← Gradle config
└── gradle/                       ← Gradle wrapper
```

## Important Notes

1. **Always run `npm run native:build` after code changes** - Syncs web to Android
2. **Test on real device** - Emulator behavior can differ
3. **Check logcat for errors** - Android Studio → Logcat tab
4. **Offline works** - Service worker enables offline functionality
5. **No CORS** - Native apps bypass browser CORS restrictions

## Deployment Steps (Later)

1. Generate keystore: `keytool -genkey -v -keystore ...`
2. In Android Studio: Build → Generate Signed Bundle/APK
3. Select release configuration
4. Upload AAB to Google Play Console
5. Fill app listing, screenshots, privacy policy
6. Submit for review

## Resources

- 📱 Android Studio Docs: https://developer.android.com/studio/intro
- 🔗 Capacitor Docs: https://capacitorjs.com/docs
- 🎯 Google Play Console: https://play.google.com/console
- 🧪 Firebase Testing: https://firebase.google.com/docs/app-distribution

## Status

✅ **Ready for development in Android Studio**
- Web assets build successfully
- Capacitor syncs without errors
- All permissions configured
- Secure storage enabled

Next: Open `android/` folder in Android Studio and click Run!
