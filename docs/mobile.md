# Mobile (Capacitor) Setup

This project can be wrapped as a PWA into native shells using Capacitor.

## Prereqs
- Node.js 18+
- Android Studio (for Android)
- Xcode (for iOS)

## Steps
1. Install deps
   npm install

2. Ensure PWA manifest and service worker exist (they do):
   - public/manifest.webmanifest
   - public/sw.js

3. Initialize Capacitor (one time)
   npm run cap:init

4. Add platforms
   npx cap add android
   npx cap add ios

5. Development mode
   - Run the web app: npm run dev (http://localhost:3000)
   - Capacitor is configured to load from the dev server (server.url)
   - Open native IDEs:
     - Android: npm run cap:android
     - iOS: npm run cap:ios

6. Production build
   - Build the app: npm run build && npx cap copy
   - Open native IDEs and build release

Notes
- Push notifications: Web Push is implemented; native push would require platform-specific plugins.
- Camera/Native APIs: Add Capacitor plugins as needed (e.g., @capacitor/camera) and wire into upload flows.

