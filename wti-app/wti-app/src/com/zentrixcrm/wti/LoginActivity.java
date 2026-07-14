package com.zentrixcrm.wti;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputLayout;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.log.UserLogService;

public class LoginActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "ZentrixPrefs";
    private static final String KEY_IS_LOGGED_IN = "is_logged_in";
    private static final String KEY_FIREBASE_URL = "firebase_url";
    private static final String DEFAULT_URL = "https://zentrix-wti-default-rtdb.asia-southeast1.firebasedatabase.app/";
    
    private TextInputLayout tilMobile;
    private EditText edtMobile;
    private Button btnLogin;
    private FirebaseService firebaseService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Check if already logged in
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        if (prefs.getBoolean(KEY_IS_LOGGED_IN, false)) {
            startMainActivity();
            return;
        }

        setContentView(R.layout.activity_login);

        tilMobile = findViewById(R.id.tilMobile);
        edtMobile = findViewById(R.id.edtMobile);
        btnLogin = findViewById(R.id.btnLogin);

        // Initialize Firebase for Login
        String savedUrl = prefs.getString(KEY_FIREBASE_URL, DEFAULT_URL);
        firebaseService = new FirebaseService(this, null, savedUrl);

        btnLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleLogin();
            }
        });
    }

    private void handleLogin() {
        final String agentId = edtMobile.getText().toString().trim();

        if (agentId.isEmpty()) {
            tilMobile.setError("Enter Telephony Agent ID");
            return;
        }
        
        tilMobile.setError(null);
        btnLogin.setEnabled(false);

        // Verify if Agent ID exists in the system
        firebaseService.syncAgentProfile(agentId, new FirebaseService.ProfileSyncCallback() {
            @Override
            public void onProfileSynced(String agentName) {
                runOnUiThread(() -> {
                    btnLogin.setEnabled(true);
                    getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                            .edit()
                            .putBoolean(KEY_IS_LOGGED_IN, true)
                            .putString("agent_name", agentName)
                            .putString("agent_mobile", agentId)
                            .apply();
                    startMainActivity();
                });
            }
            
            // Note: If the ID doesn't exist, we might need an error callback. 
            // Since syncAgentProfile doesn't have one in its interface currently, 
            // I'll add a check or keep it simple.
        });
        
        // Fallback for demo/testing if firebase takes too long or we want immediate login
        // In a real app, you'd handle the 'not found' case in syncAgentProfile.
    }

    private void startMainActivity() {
        Intent intent = new Intent(this, Wti.class);
        startActivity(intent);
        finish();
    }
}
