# App Store Readiness Checklist

This guide summarizes the steps to ship Splintr to the iOS App Store and Google Play using Capacitor.

## Common
- App ID (Bundle ID / Application ID): `co.splintr.app`
- App Name: Splintr
- Icons + Splash: Generate with Capacitor Assets
  - `npx @capacitor/assets generate`
- PWA Requirements
  - `public/manifest.webmanifest` configured
  - `public/sw.js` service worker
- Legal
  - Terms: `/terms`
  - Privacy: `/privacy`
- Content Rating: Answer questionnaires truthfully (UGC, camera/mic usage)

## iOS (App Store)
1. Xcode project
   - `npm run build && npx cap copy ios`
   - `npm run cap:ios` (open Xcode)
2. Capabilities
   - Push Notifications + Background Modes (Remote notifications)
   - Associated Domains (if using universal links)
   - App Groups (if needed)
3. Info.plist keys
   - Add the following keys to `ios/App/App/Info.plist`:
     - `<key>NSCameraUsageDescription</key><string>We use the camera to record videos for stories.</string>`
     - `<key>NSMicrophoneUsageDescription</key><string>We use the microphone to record audio with your videos.</string>`
     - `<key>NSPhotoLibraryAddUsageDescription</key><string>Allow saving exported videos to your library.</string>`
     - `<key>NSUserTrackingUsageDescription</key><string>We do not track you across apps. This is required by Apple if any SDKs could request it.</string>` (optional)
4. Push (APNs)
   - Enable in Apple Developer portal
   - Configure APNs key/cert in your server
   - App registers token via `/api/notifications/native/register`
5. Signing & Archive
   - Set team and bundle id, increment version/build
   - Product → Archive → Distribute to App Store Connect
6. App Store Connect
   - Create app listing: screenshots, description, keywords, support URL
   - Privacy Nutrition Labels (data collection as per privacy policy)
   - Submit for review

## Android (Google Play)
1. Android Studio project
   - `npm run build && npx cap copy android`
   - `npm run cap:android`
2. Manifest & Permissions
   - In `android/app/src/main/AndroidManifest.xml`, ensure:
     ```xml
     <uses-permission android:name="android.permission.INTERNET" />
     <uses-permission android:name="android.permission.VIBRATE" />
     <uses-permission android:name="android.permission.CAMERA" />
     <uses-permission android:name="android.permission.RECORD_AUDIO" />
     <!-- Android 13+ notifications permission -->
     <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
     ```
3. Push (FCM)
   - Add `google-services.json`
   - Integrate Firebase in Android project
4. App Links (Optional)
   - `public/.well-known/assetlinks.json` with SHA-256 of release key
5. Signing & Release
   - Configure app signing
   - Create release, upload AAB, complete listing

## In-App Purchases (Native)
- Current implementation uses web checkout (PSP) and IAP receipt verification for mobile stores.
- For native IAP, integrate platform billing (StoreKit/BillingClient) and map purchases to wallet credits.
- Ensure compliance with Apple/Google guidelines where digital content is sold.

## QA & Performance
- Test on device: video playback, recording, notifications
- Verify offline caching (Save for offline feature)
- Measure bundle size; use dynamic imports for heavy routes

## Release Ops
- Set environment variables in native projects (e.g., API base URLs)
- Update version strings per store release
- Monitor crashes and analytics (add Sentry/Firebase Crashlytics optionally)

## 14.5 Submission Steps

### iOS (App Store Connect)
1. Prepare build: `npm run app:prepare:ios` → Xcode → Archive.
2. Upload to App Store Connect (Organizer → Distribute App).
3. In App Store Connect:
   - Create/edit app listing (metadata, screenshots, privacy labels).
   - Add testers (TestFlight) and perform internal testing.
   - Submit for review.
4. After approval, release to production.

### Android (Google Play Console)
1. Prepare build: `npm run app:prepare:android` → Android Studio → Build signed AAB.
2. Create app in Play Console if not already.
3. Upload AAB to internal testing track, add testers, verify.
4. Promote to production, complete content rating, privacy, and listing.


## Assets (Icons & Splash)
- Install the Capacitor assets tool as a dev dependency and generate icons/splash:
  - `npm install -D @capacitor/assets`
  - Place source images in `resources/` (e.g., `resources/icon.png` 1024x1024, `resources/splash.png` 2732x2732)
  - Run `npx @capacitor/assets generate`
  - Then `npx cap sync`
