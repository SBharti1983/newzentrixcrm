package com.zentrixcrm.wti;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import com.zentrixcrm.wti.firebase.CallHandler;
import com.zentrixcrm.wti.log.UserLogService;

class OutgoingCallHandler implements CallHandler {

  private final Context context;
  private final UserLogService userLogService;
  private final com.zentrixcrm.wti.phonestate.PhoneStateChangedHandler phoneStateHandler;
  private static final String PREFS_NAME = "ZentrixPrefs";
  private static final String KEY_BRIDGE_NUMBER = "bridge_number";
  private static final String KEY_RECORDING_ENABLED = "recording_enabled";

  public OutgoingCallHandler(Context context, UserLogService userLogService, com.zentrixcrm.wti.phonestate.PhoneStateChangedHandler phoneStateHandler) {
    this.context = context;
    this.userLogService = userLogService;
    this.phoneStateHandler = phoneStateHandler;
  }

  @Override
  public void doCall(String number, String interactionId) {
    if (context == null) return;
    
    if (phoneStateHandler != null) {
        phoneStateHandler.prepareOutgoingCall(number, interactionId);
    }
    
    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    String bridgeNumber = prefs.getString(KEY_BRIDGE_NUMBER, "");
    boolean isRecordingEnabled = prefs.getBoolean(KEY_RECORDING_ENABLED, true);

    String targetNumber;
    if (isRecordingEnabled && !bridgeNumber.isEmpty()) {
        // Recording is ON and Bridge is configured: Use Bridge
        targetNumber = bridgeNumber;
        userLogService.log("Bridging call through server for recording...");
    } else {
        // Recording is OFF or no Bridge: Call directly
        targetNumber = number;
        if (isRecordingEnabled) {
            userLogService.log("Direct calling (Recording ON but no bridge configured)");
        } else {
            userLogService.log("Direct calling (Recording OFF)");
        }
    }

    userLogService.log("Dialing: " + targetNumber);
    String uriString = "tel:" + targetNumber.trim();
    Uri uri = Uri.parse(uriString);
    
    // On Android 10+, background activity launches are blocked. 
    // We must use TelecomManager to place the call directly.
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
        android.telecom.TelecomManager telecomManager = (android.telecom.TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
        if (telecomManager != null && context.checkSelfPermission(android.Manifest.permission.CALL_PHONE) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            try {
                telecomManager.placeCall(uri, null);
                userLogService.log("TelecomManager call initiated.");
                return;
            } catch (Exception e) {
                userLogService.log("TelecomManager failed: " + e.getMessage());
            }
        }
    }

    // Fallback to standard ACTION_CALL intent for older APIs or if TelecomManager fails
    Intent callIntent = new Intent(Intent.ACTION_CALL, uri);
    callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    
    try {
        context.startActivity(callIntent);
    } catch (Exception e) {
      userLogService.log("Error: " + e.getMessage());
    }
  }
}
