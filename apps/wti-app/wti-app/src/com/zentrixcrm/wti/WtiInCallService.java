package com.zentrixcrm.wti;

import android.content.Intent;
import android.telecom.Call;
import android.telecom.InCallService;
import android.util.Log;

public class WtiInCallService extends InCallService {
    private static final String TAG = "WtiInCallService";

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        Log.d(TAG, "onCallAdded: " + call);
        
        InCallActivity.setCall(call);
        
        Intent intent = new Intent(this, InCallActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        Log.d(TAG, "onCallRemoved: " + call);
        InCallActivity.setCall(null);
    }
}
