package com.zentrixcrm.wti;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;
import com.zentrixcrm.wti.database.AppDatabase;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.log.UserLogService;

public class CallDispositionActivity extends Activity {

    public static final String EXTRA_NUMBER = "extra_number";
    private static final String PREFS_NAME = "ZentrixPrefs";
    private static final String KEY_FIREBASE_URL = "firebase_url";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setFinishOnTouchOutside(false);

        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);

        setContentView(R.layout.activity_call_disposition);

        final String number = getIntent().getStringExtra(EXTRA_NUMBER);
        final TextView txtInfo = findViewById(R.id.txtDispositionInfo);
        
        if (number != null) {
            txtInfo.setText(getString(R.string.msg_call_ended_with, number));
        }

        final RadioGroup rgOptions = findViewById(R.id.rgDisposition);
        Button btnSubmit = findViewById(R.id.btnSubmitDisposition);
        ImageButton btnClose = findViewById(R.id.btnCloseDisposition);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String savedUrl = prefs.getString(KEY_FIREBASE_URL, "https://zentrix-wti-default-rtdb.asia-southeast1.firebasedatabase.app");
        final FirebaseService firebaseService = new FirebaseService(this, new UserLogService(null), savedUrl);

        // REAL-TIME NAME LOOKUP
        if (number != null) {
            firebaseService.lookupCustomerName(number, name -> {
                if (name != null) {
                    runOnUiThread(() -> txtInfo.setText(getString(R.string.msg_call_ended_with, name + " (" + number + ")")));
                }
            });
        }

        if (btnClose != null) {
            btnClose.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    finish();
                }
            });
        }

        btnSubmit.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                int selectedId = rgOptions.getCheckedRadioButtonId();
                if (selectedId != -1) {
                    RadioButton rb = findViewById(selectedId);
                    final String outcome = rb.getText().toString();
                    
                    // 1. Update Firebase
                    firebaseService.sendDisposition(number, outcome);

                    // 2. Update local database and trigger sync
                    new Thread(() -> {
                        AppDatabase.getInstance(CallDispositionActivity.this)
                                .callLogDao().updateLatestDisposition(number, outcome);
                        
                        firebaseService.scheduleSync();
                        
                        runOnUiThread(() -> finish());
                    }).start();
                }
            }
        });
    }
}
