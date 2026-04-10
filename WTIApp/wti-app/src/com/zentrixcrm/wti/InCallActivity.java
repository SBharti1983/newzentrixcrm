package com.zentrixcrm.wti;

import android.os.Bundle;
import android.telecom.Call;
import android.telecom.VideoProfile;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.zentrixcrm.wti.recording.CallRecorder;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.log.UserLogService;
import android.content.SharedPreferences;

public class InCallActivity extends AppCompatActivity {
    private static final String TAG = "InCallActivity";

    private TextView txtCallerName;
    private TextView txtCallNumber;
    private TextView txtCallStatus;
    private FloatingActionButton fabHangup;
    private FloatingActionButton fabAnswer;
    private View layoutActiveControls;

    private static Call currentCall;
    private CallRecorder recorder;
    private SharedPreferences prefs;
    private FirebaseService firebaseService;
    private long startTime;

    public static void setCall(Call call) {
        currentCall = call;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_in_call);

        prefs = getSharedPreferences("ZentrixPrefs", MODE_PRIVATE);
        firebaseService = new FirebaseService(this, null, prefs.getString("firebase_url", ""));
        
        txtCallerName = findViewById(R.id.txt_caller_name);
        txtCallNumber = findViewById(R.id.txt_call_number);
        txtCallStatus = findViewById(R.id.txt_call_status);
        fabHangup = findViewById(R.id.fab_hangup);
        fabAnswer = findViewById(R.id.fab_answer);
        layoutActiveControls = findViewById(R.id.layout_active_controls);

        if (currentCall != null) {
            currentCall.registerCallback(callCallback);
            updateUI(currentCall.getState());
            
            try {
                String number = currentCall.getDetails().getHandle().getSchemeSpecificPart();
                txtCallNumber.setText(number);
                
                // Real-time lookup from Firebase
                firebaseService.lookupCustomerName(number, name -> {
                    if (name != null) {
                        runOnUiThread(() -> txtCallerName.setText(name));
                    }
                });
            } catch (Exception e) {
                Log.e(TAG, "Error getting call number", e);
            }
            
            fabHangup.setOnClickListener(v -> {
                if (currentCall != null) currentCall.disconnect();
            });
            
            fabAnswer.setOnClickListener(v -> {
                if (currentCall != null) currentCall.answer(VideoProfile.STATE_AUDIO_ONLY);
            });
        } else {
            finish();
        }
    }

    private void updateUI(int state) {
        runOnUiThread(() -> {
            String statusText;
            switch (state) {
                case Call.STATE_RINGING:
                    statusText = "INCOMING CALL";
                    fabAnswer.setVisibility(View.VISIBLE);
                    layoutActiveControls.setVisibility(View.GONE);
                    break;
                case Call.STATE_DIALING:
                    statusText = "DIALING...";
                    fabAnswer.setVisibility(View.GONE);
                    layoutActiveControls.setVisibility(View.GONE);
                    break;
                case Call.STATE_ACTIVE:
                    statusText = "ACTIVE";
                    startTime = System.currentTimeMillis();
                    fabAnswer.setVisibility(View.GONE);
                    layoutActiveControls.setVisibility(View.VISIBLE);
                    break;
                case Call.STATE_DISCONNECTED:
                    statusText = "DISCONNECTED";
                    finish();
                    return;
                default:
                    statusText = "CALLING...";
                    break;
            }
            txtCallStatus.setText(statusText);
        });
    }

    private final Call.Callback callCallback = new Call.Callback() {
        @Override
        public void onStateChanged(Call call, int state) {
            updateUI(state);
        }
    };

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (currentCall != null) {
            currentCall.unregisterCallback(callCallback);
        }
    }
}
