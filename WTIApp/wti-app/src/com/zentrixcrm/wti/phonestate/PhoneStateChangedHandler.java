package com.zentrixcrm.wti.phonestate;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.telephony.PhoneStateListener;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.telephony.TelephonyManager;
import android.util.Log;
import com.zentrixcrm.wti.CallDispositionActivity;
import com.zentrixcrm.wti.R;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.log.UserLogService;
import com.zentrixcrm.wti.recording.CallRecorder;

import java.util.List;

public class PhoneStateChangedHandler extends PhoneStateListener {

    private static final String TAG = "PhoneStateHandler";
    private Context context;
    private FirebaseService firebaseService;
    private UserLogService userLogService;
    private CallRecorder callRecorder;
    private Handler mainHandler = new Handler(Looper.getMainLooper());
    
    private int lastState = TelephonyManager.CALL_STATE_IDLE;
    private long callStartTime = 0;
    private String lastNumber = "";
    private boolean isIncoming = false;
    private String currentInteractionId = null;

    public PhoneStateChangedHandler(Context context, FirebaseService firebaseService, UserLogService userLogService) {
        this.context = context;
        this.firebaseService = firebaseService;
        this.userLogService = userLogService;
        this.callRecorder = new CallRecorder(context);
    }

    @Override
    public void onCallStateChanged(int state, String incomingNumber) {
        if (incomingNumber != null && !incomingNumber.isEmpty()) {
            lastNumber = incomingNumber;
        }

        switch (state) {
            case TelephonyManager.CALL_STATE_RINGING:
                isIncoming = true;
                handleRinging(lastNumber);
                break;
                
            case TelephonyManager.CALL_STATE_OFFHOOK:
                mainHandler.postDelayed(this::handleOffHook, 1000);
                break;
                
            case TelephonyManager.CALL_STATE_IDLE:
                handleIdle();
                break;
        }
        lastState = state;
    }

    public void setInteractionId(String id) {
        this.currentInteractionId = id;
    }

    public void prepareOutgoingCall(String number, String interactionId) {
        this.lastNumber = number;
        this.currentInteractionId = interactionId;
        this.isIncoming = false;
        userLogService.log("Preparing outgoing call to: " + number);
    }

    private void handleRinging(String number) {
        userLogService.log("RINGING: " + number);
        firebaseService.sendIncomingCall(number);
        if (context instanceof com.zentrixcrm.wti.WtiService) {
            ((com.zentrixcrm.wti.WtiService)context).updateNotification(context.getString(R.string.status_available) + ": " + number);
        }
    }

    private void handleOffHook() {
        if (lastState == TelephonyManager.CALL_STATE_IDLE) return; 

        if (isIncoming) {
            userLogService.log("Incoming Call Answered: " + lastNumber);
        } else {
            userLogService.log("Outgoing Call: " + lastNumber);
        }
        callStartTime = System.currentTimeMillis();
        firebaseService.sendIncomingCall(null);
        
        if (isRecordingEnabled()) {
            userLogService.log("Starting recorder for: " + (lastNumber.isEmpty() ? "Unknown" : lastNumber));
            callRecorder.startRecording(lastNumber);
            if (context instanceof com.zentrixcrm.wti.WtiService) {
                ((com.zentrixcrm.wti.WtiService)context).updateNotification("Recording: " + (lastNumber.isEmpty() ? "In progress" : lastNumber));
            }
        }
    }

    private void handleIdle() {
        mainHandler.removeCallbacksAndMessages(null); 

        if (lastState != TelephonyManager.CALL_STATE_IDLE) {
            long duration = System.currentTimeMillis() - callStartTime;
            String currentLastNumber = lastNumber;
            String interactionId = currentInteractionId;
            
            String recordingPath = callRecorder.stopRecording();
            
            if (lastState == TelephonyManager.CALL_STATE_OFFHOOK || (lastState == TelephonyManager.CALL_STATE_RINGING && isIncoming)) {
                String type = isIncoming ? "INCOMING" : "OUTGOING";
                int activeSimSlot = getActiveSimSlot();
                
                if (duration > 3000) { 
                    userLogService.log("Call Ended (" + type + "). Triggering Auto-Sync.");
                    firebaseService.logCallHistory(type, currentLastNumber, duration, activeSimSlot, recordingPath, interactionId);
                    
                    // Explicitly trigger sync after a short delay to ensure DB insertion is finished
                    mainHandler.postDelayed(() -> {
                        firebaseService.scheduleSync();
                    }, 1500);

                    Intent intent = new Intent(context, CallDispositionActivity.class);
                    intent.putExtra(CallDispositionActivity.EXTRA_NUMBER, currentLastNumber);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    context.startActivity(intent);
                } else {
                    userLogService.log("Call too short - discarding.");
                    if (recordingPath != null) {
                        try {
                            new java.io.File(recordingPath).delete();
                        } catch (Exception e) {}
                    }
                }
            }
        }
        
        if (context instanceof com.zentrixcrm.wti.WtiService) {
            ((com.zentrixcrm.wti.WtiService)context).updateNotification(context.getString(R.string.status_available));
        }
        
        firebaseService.sendIncomingCall(null);
        firebaseService.clearOutgoingCall();
        isIncoming = false; 
        callStartTime = 0;
        currentInteractionId = null;
        lastNumber = "";
    }

    private boolean isRecordingEnabled() {
        return context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE)
                .getBoolean("recording_enabled", true);
    }

    private int getActiveSimSlot() {
        try {
            SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
            if (sm != null) {
                List<SubscriptionInfo> sis = sm.getActiveSubscriptionInfoList();
                if (sis != null && !sis.isEmpty()) {
                    return sis.get(0).getSimSlotIndex();
                }
            }
        } catch (SecurityException e) {
            Log.e(TAG, "SIM access denied");
        }
        return -1;
    }
}
