# Android Web Telephony Integration (WTI) User Manual

This application integrates your Android device's telephony features with a Firebase Realtime Database, allowing for remote monitoring and control of calls via a web interface.

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Initial Setup](#2-initial-setup)
3. [App Interface Overview](#3-app-interface-overview)
4. [How to Use](#4-how-to-use)
5. [Permissions](#5-permissions)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Prerequisites
- An Android device running Android 7.0 (API 24) or higher.
- A Firebase project with a Realtime Database.
- Internet connectivity on the device.

## 2. Initial Setup
Before running the app for the first time, ensure the Firebase URL is configured:
1. Open `src/com/zentrixcrm/wti/firebase/FirebaseService.java`.
2. Locate the `FIREBASE_URL` constant:
   ```java
   public static final String FIREBASE_URL = "https://your-project-id.firebaseio.com";
   ```
3. Replace the URL with your actual Firebase Realtime Database URL.

## 3. App Interface Overview
- **Own Number:** Displays your device's phone number (once permissions are granted).
- **CONNECT Button:** Syncs the device status and phone number to Firebase.
- **HANG UP Button:** Resets the status on Firebase and stops active tracking.
- **Log Window:** Shows real-time events like "Idle", "Ringing", or "Starting call".

## 4. How to Use

### Connecting to Firebase
1. Launch the app.
2. If prompted, allow permissions for **Phone Calls** and **Phone State**.
3. Tap the **CONNECT** button.
   - The log will show `send connect`.
   - Your phone number and "connected: true" status will be sent to your Firebase database under `/app/number` and `/app/connected`.

### Monitoring Incoming Calls
- When the phone rings, the app automatically sends the incoming caller's number to Firebase under `/app/incoming`.
- The local log will display `RINGING: [Number]`.

### Triggering Outgoing Calls Remotely
The app listens for changes in the Firebase database at `/app/outgoing`:
1. From your web dashboard (or Firebase console), set the value of `/app/outgoing` to a phone number (e.g., `+1234567890`).
2. The app will detect this change, log `Starting call to: +1234567890`, and immediately initiate the call on your device.
3. Once the call starts, the app clears the `/app/outgoing` value to prevent redialing.

### Disconnecting
- Tap the **HANG UP** button to set your status to disconnected on the database and clear any active call data from the cloud.

## 5. Permissions
The app requires the following permissions to function:
- **READ_PHONE_STATE:** To detect when the phone is ringing or idle.
- **READ_PHONE_NUMBERS:** To identify your own device's number.
- **CALL_PHONE:** To allow the remote "Click-to-Call" functionality.
- **INTERNET:** To communicate with Firebase.

## 6. Troubleshooting
- **"Own number: Permission Denied":** Go to Android Settings > Apps > Android WTI > Permissions and ensure all requested permissions are enabled.
- **Calls not triggering:** Check your Internet connection and verify that the `FIREBASE_URL` in the code matches your database exactly.
- **"System UI isn't responding":** This is usually an emulator-only issue. Simply tap "Wait" or restart the emulator.
