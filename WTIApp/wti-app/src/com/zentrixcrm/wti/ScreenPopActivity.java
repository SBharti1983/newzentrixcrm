package com.zentrixcrm.wti;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.log.UserLogService;

public class ScreenPopActivity extends Activity {

    public static final String EXTRA_NUMBER = "extra_number";
    private static final String PREFS_NAME = "ZentrixPrefs";
    private static final String KEY_FIREBASE_URL = "firebase_url";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Show over lock screen
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);

        setContentView(R.layout.activity_screen_pop);

        String number = getIntent().getStringExtra(EXTRA_NUMBER);
        
        TextView txtCallerName = findViewById(R.id.txtCallerName);
        TextView txtCallerNumber = findViewById(R.id.txtCallerNumber);
        Button btnDismiss = findViewById(R.id.btnDismissPop);

        txtCallerName.setText(R.string.label_loading);
        txtCallerNumber.setText(number != null ? number : "Unknown");

        // Lookup Customer Name from Firebase
        if (number != null) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String savedUrl = prefs.getString(KEY_FIREBASE_URL, "https://zentrix-wti-default-rtdb.asia-southeast1.firebasedatabase.app");
            FirebaseService firebaseService = new FirebaseService(this, new UserLogService(null), savedUrl);
            
            firebaseService.lookupCustomerName(number, name -> {
                runOnUiThread(() -> {
                    if (name != null) {
                        txtCallerName.setText(name);
                    } else {
                        txtCallerName.setText(R.string.label_incoming_call);
                    }
                });
            });
        } else {
            txtCallerName.setText(R.string.label_incoming_call);
        }

        btnDismiss.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
    }
}
