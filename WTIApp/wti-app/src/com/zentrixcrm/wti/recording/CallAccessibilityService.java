package com.zentrixcrm.wti.recording;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.util.Log;

/**
 * Accessibility Service to help bypass Android 10+ call recording restrictions.
 * By being active during a call, it helps the app maintain the necessary state 
 * to capture audio from the VOICE_COMMUNICATION stream.
 */
public class CallAccessibilityService extends AccessibilityService {
    private static final String TAG = "CallAccessibility";

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // We don't necessarily need to process events, 
        // just having the service running with its special permissions 
        // helps keep the recording process 'visible' to the OS.
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Service Interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "Call Accessibility Service Connected");
    }
}
