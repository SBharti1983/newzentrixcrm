package com.zentrixcrm.wti;

import android.content.Context;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.telecom.Call;
import android.telecom.CallAudioState;
import android.telecom.VideoProfile;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.recording.CallRecorder;

import java.util.Locale;

public class InCallActivity extends AppCompatActivity {
    private static final String TAG = "InCallActivity";

    private TextView txtCallerName;
    private TextView txtCallNumber;
    private TextView txtCallStatus;
    private FloatingActionButton fabHangup;
    private FloatingActionButton fabAnswer;
    private FloatingActionButton fabMute;
    private FloatingActionButton fabSpeaker;
    private View layoutActiveControls;

    private static Call currentCall;
    private SharedPreferences prefs;
    private FirebaseService firebaseService;
    private long startTime = 0;
    private Handler timerHandler = new Handler(Looper.getMainLooper());
    private boolean isMuted = false;
    private boolean isSpeakerOn = false;

    public static void setCall(Call call) {
        currentCall = call;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Modern lock screen handling
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_in_call);

        prefs = getSharedPreferences("ZentrixPrefs", MODE_PRIVATE);
        firebaseService = new FirebaseService(this, null, prefs.getString("firebase_url", ""));
        
        txtCallerName = findViewById(R.id.txt_caller_name);
        txtCallNumber = findViewById(R.id.txt_call_number);
        txtCallStatus = findViewById(R.id.txt_call_status);
        fabHangup = findViewById(R.id.fab_hangup);
        fabAnswer = findViewById(R.id.fab_answer);
        fabMute = findViewById(R.id.fab_mute);
        fabSpeaker = findViewById(R.id.fab_speaker);
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

            fabMute.setOnClickListener(v -> toggleMute());
            fabSpeaker.setOnClickListener(v -> toggleSpeaker());
            
        } else {
            finish();
        }
    }

    private void toggleMute() {
        isMuted = !isMuted;
        // Communication with InCallService is required for true mute control.
        // For standard implementations, we can use AudioManager as a fallback.
        AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            audioManager.setMicrophoneMute(isMuted);
            fabMute.setAlpha(isMuted ? 1.0f : 0.5f);
        }
    }

    private void toggleSpeaker() {
        isSpeakerOn = !isSpeakerOn;
        AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            audioManager.setSpeakerphoneOn(isSpeakerOn);
            fabSpeaker.setAlpha(isSpeakerOn ? 1.0f : 0.5f);
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
                    stopTimer();
                    break;
                case Call.STATE_DIALING:
                case Call.STATE_CONNECTING:
                    statusText = "DIALING...";
                    fabAnswer.setVisibility(View.GONE);
                    layoutActiveControls.setVisibility(View.GONE);
                    stopTimer();
                    break;
                case Call.STATE_ACTIVE:
                    statusText = "ACTIVE";
                    if (startTime == 0) {
                        startTime = System.currentTimeMillis();
                        startTimer();
                    }
                    fabAnswer.setVisibility(View.GONE);
                    layoutActiveControls.setVisibility(View.VISIBLE);
                    break;
                case Call.STATE_DISCONNECTED:
                    statusText = "DISCONNECTED";
                    stopTimer();
                    finish();
                    return;
                default:
                    statusText = "CALLING...";
                    break;
            }
            txtCallStatus.setText(statusText);
        });
    }

    private void startTimer() {
        timerHandler.removeCallbacks(timerRunnable);
        timerHandler.postDelayed(timerRunnable, 0);
    }

    private void stopTimer() {
        timerHandler.removeCallbacks(timerRunnable);
        startTime = 0;
    }

    private final Runnable timerRunnable = new Runnable() {
        @Override
        public void run() {
            if (startTime > 0) {
                long millis = System.currentTimeMillis() - startTime;
                int seconds = (int) (millis / 1000);
                int minutes = seconds / 60;
                seconds = seconds % 60;
                int hours = minutes / 60;
                minutes = minutes % 60;

                String timeStr;
                if (hours > 0) {
                    timeStr = String.format(Locale.getDefault(), "%d:%02d:%02d", hours, minutes, seconds);
                } else {
                    timeStr = String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds);
                }
                txtCallStatus.setText("ACTIVE " + timeStr);
                timerHandler.postDelayed(this, 1000);
            }
        }
    };

    private final Call.Callback callCallback = new Call.Callback() {
        @Override
        public void onStateChanged(Call call, int state) {
            updateUI(state);
        }
    };

    @Override
    protected void onDestroy() {
        stopTimer();
        if (currentCall != null) {
            currentCall.unregisterCallback(callCallback);
        }
        super.onDestroy();
    }
}
