package com.zentrixcrm.wti;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.core.content.ContextCompat;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";
    private static final String PREFS_NAME = "ZentrixPrefs";
    private static final String KEY_SERVICE_ENABLED = "service_enabled";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received broadcast: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isEnabled = prefs.getBoolean(KEY_SERVICE_ENABLED, false);
            
            if (isEnabled) {
                Log.d(TAG, "Starting WtiService automatically...");
                Intent serviceIntent = new Intent(context, WtiService.class);
                try {
                    ContextCompat.startForegroundService(context, serviceIntent);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start service on boot", e);
                }
            }
        }
    }
}
