package com.zentrixcrm.wti;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.telephony.TelephonyManager;
import android.text.TextUtils;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.card.MaterialCardView;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.switchmaterial.SwitchMaterial;
import com.zentrixcrm.wti.database.CallRepository;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.firebase.SyncWorker;
import com.zentrixcrm.wti.log.UserLogService;
import com.zentrixcrm.wti.recording.CallAccessibilityService;

import java.io.File;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class Wti extends AppCompatActivity {

    private static final String PREFS_NAME = "ZentrixPrefs";
    private static final int PERMISSION_REQUEST_CODE = 100;
    private static final int BATTERY_OPTIMIZATION_REQUEST_CODE = 102;
    private static final String DEFAULT_URL = "https://zentrix-wti-default-rtdb.asia-southeast1.firebasedatabase.app/";
    private static final String DEFAULT_STORAGE_SERVER = "https://zentrixcrmindia-production.up.railway.app";
    private static final String DEFAULT_BRIDGE_NUMBER = "sip:4aec8313-ce5d-4c6a-805a-436d2c2f6e99@sip.vapi.ai";
    private static final String KEY_PREFERRED_SIM_SLOT = "preferred_sim_slot";
    private static final String KEY_ONBOARDING_COMPLETE = "onboarding_complete";

    private TelephonyManager telephonyManager;

    private TextView txtUserLog;
    private TextView txtOwnNumber;
    private TextView txtStatus;
    private TextView txtLatency;
    private TextView txtSignalStrength;
    private View viewLatencyIndicator;
    private TextView txtAvailabilityStatus;
    private TextView txtRecordingStatus;
    private TextView txtTranscriptionStatus;
    private TextView txtAutoCleanupStatus;
    private TextView txtPendingSync;
    private TextView txtCallsToday;
    private TextView txtTalkTime;
    private ImageView imgSyncHealth;
    private EditText edtFirebaseUrl;
    private EditText edtAgentName;
    private EditText edtBridgeNumber;
    private EditText edtStorageServer;
    private AutoCompleteTextView spinnerSimSelection;
    private View statusIndicator;
    private Button btnConnectFirebase;
    private Button btnHangUpFirebase;
    private Button btnUpdateConfig;
    private Button btnTestConnection;
    private SwitchMaterial swAvailability;
    private SwitchMaterial swRecording;
    private SwitchMaterial swTranscription;
    private SwitchMaterial swAutoCleanup;
    private SwitchMaterial swEditConfig;
    private MaterialCardView cardSyncHealth;
    private LinearLayout layoutConfigContainer;

    private FirebaseService firebaseService;
    private UserLogService userLogService;
    private CallRepository callRepository;
    private SharedPreferences prefs;
    private List<SubscriptionInfo> availableSims = new ArrayList<>();

    private final BroadcastReceiver syncLogReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (SyncWorker.ACTION_SYNC_LOG.equals(intent.getAction())) {
                String msg = intent.getStringExtra("message");
                if (userLogService != null && msg != null) {
                    userLogService.log(msg);
                }
            }
        }
    };

    private final BroadcastReceiver connectionStatusReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (FirebaseService.ACTION_CONNECTION_STATUS.equals(intent.getAction())) {
                boolean connected = intent.getBooleanExtra("connected", false);
                updateStatusUI(connected);
            }
        }
    };

    private final BroadcastReceiver latencyUpdateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (FirebaseService.ACTION_LATENCY_UPDATE.equals(intent.getAction())) {
                long latency = intent.getLongExtra("latency", 0);
                if (txtLatency != null) {
                    txtLatency.setText("Ping: " + latency + " ms");
                    int color = latency < 200 ? R.color.status_online : (latency < 500 ? R.color.status_busy : R.color.status_offline);
                    viewLatencyIndicator.setBackgroundColor(ContextCompat.getColor(context, color));
                }
            }
        }
    };

    private final BroadcastReceiver diagnosticReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (WtiService.ACTION_DIAGNOSTIC_UPDATE.equals(intent.getAction())) {
                int signal = intent.getIntExtra("signal", -1);
                if (txtSignalStrength != null && signal != -1) {
                    txtSignalStrength.setText("Signal: " + signal + " dBm");
                }
            }
        }
    };

    @Override
    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setTheme(R.style.Theme_ZentrixWTI);
        setContentView(R.layout.main);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);

        initUIElements();
        initServices();
        setupSyncObserver();
        setupPerformanceObserver();

        if (!prefs.getBoolean(KEY_ONBOARDING_COMPLETE, false)) {
            showPermissionRationale();
        } else {
            checkAndRequestCriticalPermissions();
        }

        setupListeners();

        int receiverFlags = ContextCompat.RECEIVER_EXPORTED;

        ContextCompat.registerReceiver(this, new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                applyAdminLock();
            }
        }, new IntentFilter("com.zentrixcrm.wti.CONFIG_UPDATED"), receiverFlags);

        ContextCompat.registerReceiver(this, new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                updateStatusUI(false);
                if (userLogService != null) {
                    userLogService.log(getString(R.string.log_integration_offline));
                }
            }
        }, new IntentFilter("com.zentrixcrm.wti.SERVICE_STOPPED"), receiverFlags);

        ContextCompat.registerReceiver(this, syncLogReceiver, new IntentFilter(SyncWorker.ACTION_SYNC_LOG), receiverFlags);
        ContextCompat.registerReceiver(this, connectionStatusReceiver, new IntentFilter(FirebaseService.ACTION_CONNECTION_STATUS), receiverFlags);
        ContextCompat.registerReceiver(this, latencyUpdateReceiver, new IntentFilter(FirebaseService.ACTION_LATENCY_UPDATE), receiverFlags);
        ContextCompat.registerReceiver(this, diagnosticReceiver, new IntentFilter(WtiService.ACTION_DIAGNOSTIC_UPDATE), receiverFlags);

        initSimSelection();
        
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            checkBatteryOptimization();
        }, 2000);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == R.id.action_share_log) {
            shareDebugLog();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void shareDebugLog() {
        File logFile = userLogService.getLogFile();
        if (logFile != null && logFile.exists()) {
            Uri logUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", logFile);
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("text/plain");
            intent.putExtra(Intent.EXTRA_SUBJECT, "zentrixWTI Debug Log: " + prefs.getString("agent_name", "Unknown"));
            intent.putExtra(Intent.EXTRA_STREAM, logUri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(intent, "Share Debug Log via"));
        } else {
            Toast.makeText(this, "Log file not found", Toast.LENGTH_SHORT).show();
        }
    }

    private void showPermissionRationale() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View view = LayoutInflater.from(this).inflate(R.layout.layout_permission_rationale, null);
        
        Button btnGrant = view.findViewById(R.id.btnGrantPermissions);
        btnGrant.setOnClickListener(v -> {
            dialog.dismiss();
            prefs.edit().putBoolean(KEY_ONBOARDING_COMPLETE, true).apply();
            checkAndRequestCriticalPermissions();
        });

        dialog.setContentView(view);
        dialog.setCancelable(false);
        dialog.show();
    }

    private void checkAccessibilityService() {
        if (!isAccessibilityServiceEnabled()) {
            new MaterialAlertDialogBuilder(this)
                    .setTitle("Enable Recording Support")
                    .setMessage("To bypass Android's silence restrictions and record both sides of the call, please enable the Accessibility Service for zentrixWTI.")
                    .setPositiveButton("Enable Now", (dialog, which) -> {
                        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                        startActivity(intent);
                    })
                    .setNegativeButton("Later", null)
                    .show();
        } else {
            if (userLogService != null) userLogService.log("Call Accessibility Service Connected");
        }
    }

    private boolean isAccessibilityServiceEnabled() {
        String service = getPackageName() + "/" + CallAccessibilityService.class.getCanonicalName();
        int accessibilityEnabled = 0;
        try {
            accessibilityEnabled = Settings.Secure.getInt(getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED);
        } catch (Settings.SettingNotFoundException e) {
            Log.e("Wti", "Error finding setting: " + e.getMessage());
        }

        TextUtils.SimpleStringSplitter mStringColonSplitter = new TextUtils.SimpleStringSplitter(':');

        if (accessibilityEnabled == 1) {
            String settingValue = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (settingValue != null) {
                mStringColonSplitter.setString(settingValue);
                while (mStringColonSplitter.hasNext()) {
                    String accessibilityService = mStringColonSplitter.next();
                    if (accessibilityService.equalsIgnoreCase(service)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    @Override
    protected void onDestroy() {
        try {
            unregisterReceiver(syncLogReceiver);
            unregisterReceiver(connectionStatusReceiver);
            unregisterReceiver(latencyUpdateReceiver);
            unregisterReceiver(diagnosticReceiver);
        } catch (Exception e) {}
        super.onDestroy();
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatusUI(WtiService.isRunning);
        applyAdminLock();
        initSimSelection();
    }

    private void checkBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                showBatteryOptimizationDialog();
            }
        }
    }

    private void showBatteryOptimizationDialog() {
        new MaterialAlertDialogBuilder(this)
                .setTitle("Stability Required")
                .setMessage("To ensure call recording and syncing works in the background, please disable Battery Optimization for Zentrix WTI.")
                .setPositiveButton("Settings", (dialog, which) -> {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivityForResult(intent, BATTERY_OPTIMIZATION_REQUEST_CODE);
                })
                .setNegativeButton("Later", null)
                .show();
    }

    private void setupListeners() {
        if (btnUpdateConfig != null) {
            btnUpdateConfig.setOnClickListener(v -> saveConfiguration());
        }

        if (btnTestConnection != null) {
            btnTestConnection.setOnClickListener(v -> handleTestConnection());
        }

        if (btnConnectFirebase != null) {
            btnConnectFirebase.setOnClickListener(v -> startIntegration());
        }

        if (btnHangUpFirebase != null) {
            btnHangUpFirebase.setOnClickListener(v -> stopIntegration());
        }

        if (cardSyncHealth != null) {
            cardSyncHealth.setOnClickListener(v -> {
                userLogService.log("Manual sync triggered from Dashboard.");
                SyncWorker.enqueue(this);
                Toast.makeText(this, "Syncing recordings...", Toast.LENGTH_SHORT).show();
            });
        }

        if (swAvailability != null) {
            swAvailability.setOnCheckedChangeListener((buttonView, isChecked) -> updateAvailability(isChecked));
        }

        if (swRecording != null) {
            swRecording.setOnCheckedChangeListener((buttonView, isChecked) -> updateRecordingPref(isChecked));
        }

        if (swTranscription != null) {
            swTranscription.setOnCheckedChangeListener((buttonView, isChecked) -> updateTranscriptionPref(isChecked));
        }

        if (swAutoCleanup != null) {
            swAutoCleanup.setOnCheckedChangeListener((buttonView, isChecked) -> updateAutoCleanupPref(isChecked));
        }

        if (swEditConfig != null) {
            swEditConfig.setOnCheckedChangeListener((buttonView, isChecked) -> toggleConfigEditing(isChecked));
        }
    }

    private void initSimSelection() {
        if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        SubscriptionManager sm = (SubscriptionManager) getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
        if (sm == null) return;

        availableSims = sm.getActiveSubscriptionInfoList();
        List<String> simNames = new ArrayList<>();
        simNames.add("Default SIM (System)");

        int selectedIndex = 0;
        int savedSubId = prefs.getInt(KEY_PREFERRED_SIM_SLOT, -1);

        if (availableSims != null) {
            for (int i = 0; i < availableSims.size(); i++) {
                SubscriptionInfo info = availableSims.get(i);
                String name = "SIM " + (info.getSimSlotIndex() + 1) + " - " + info.getDisplayName();
                simNames.add(name);
                if (info.getSubscriptionId() == savedSubId) {
                    selectedIndex = i + 1;
                }
            }
        }

        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_dropdown_item_1line, simNames);
        spinnerSimSelection.setAdapter(adapter);
        spinnerSimSelection.setText(simNames.get(selectedIndex), false);

        spinnerSimSelection.setOnItemClickListener((parent, view, position, id) -> {
            if (position == 0) {
                prefs.edit().putInt(KEY_PREFERRED_SIM_SLOT, -1).apply();
                if (userLogService != null) userLogService.log("Preferred SIM: System Default");
            } else {
                int subId = availableSims.get(position - 1).getSubscriptionId();
                prefs.edit().putInt(KEY_PREFERRED_SIM_SLOT, subId).apply();
                if (userLogService != null) userLogService.log("Preferred SIM: " + simNames.get(position));
            }
            Toast.makeText(this, "SIM Preference Saved", Toast.LENGTH_SHORT).show();
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == BATTERY_OPTIMIZATION_REQUEST_CODE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                if (pm != null && pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    if (userLogService != null) userLogService.log("Battery optimization disabled.");
                }
            }
        }
    }

    private void initUIElements() {
        txtUserLog = findViewById(R.id.txtUserLog);
        txtOwnNumber = findViewById(R.id.txtOwnNumber);
        txtStatus = findViewById(R.id.txtStatus);
        txtLatency = findViewById(R.id.txtLatency);
        txtSignalStrength = findViewById(R.id.txtSignalStrength);
        viewLatencyIndicator = findViewById(R.id.viewLatencyIndicator);
        txtAvailabilityStatus = findViewById(R.id.txtAvailabilityStatus);
        txtRecordingStatus = findViewById(R.id.txtRecordingStatus);
        txtTranscriptionStatus = findViewById(R.id.txtTranscriptionStatus);
        txtAutoCleanupStatus = findViewById(R.id.txtAutoCleanupStatus);
        txtPendingSync = findViewById(R.id.txtPendingSync);
        txtCallsToday = findViewById(R.id.txtCallsToday);
        txtTalkTime = findViewById(R.id.txtTalkTime);
        imgSyncHealth = findViewById(R.id.imgSyncHealth);
        edtFirebaseUrl = findViewById(R.id.edtFirebaseUrl);
        edtAgentName = findViewById(R.id.edtAgentName);
        edtBridgeNumber = findViewById(R.id.edtBridgeNumber);
        edtStorageServer = findViewById(R.id.edtStorageServer);
        spinnerSimSelection = findViewById(R.id.spinnerSimSelection);
        statusIndicator = findViewById(R.id.statusIndicator);
        btnConnectFirebase = findViewById(R.id.btnConnectFirebase);
        btnHangUpFirebase = findViewById(R.id.btnHangUpFirebase);
        btnUpdateConfig = findViewById(R.id.btnUpdateConfig);
        btnTestConnection = findViewById(R.id.btnTestConnection);
        swAvailability = findViewById(R.id.swAvailability);
        swRecording = findViewById(R.id.swRecording);
        swTranscription = findViewById(R.id.swTranscription);
        swAutoCleanup = findViewById(R.id.swAutoCleanup);
        swEditConfig = findViewById(R.id.swEditConfig);
        cardSyncHealth = findViewById(R.id.cardSyncHealth);
        layoutConfigContainer = findViewById(R.id.layoutConfigContainer);

        userLogService = new UserLogService(txtUserLog);
        loadPreferences();
    }

    private void loadPreferences() {
        edtFirebaseUrl.setText(prefs.getString("firebase_url", DEFAULT_URL));
        edtAgentName.setText(prefs.getString("agent_name", ""));
        edtBridgeNumber.setText(prefs.getString("bridge_number", DEFAULT_BRIDGE_NUMBER));
        edtStorageServer.setText(prefs.getString("storage_server", DEFAULT_STORAGE_SERVER));
        
        swAvailability.setChecked(prefs.getBoolean("available", true));
        swRecording.setChecked(prefs.getBoolean("recording_enabled", true));
        swTranscription.setChecked(prefs.getBoolean("transcription_enabled", false));
        swAutoCleanup.setChecked(prefs.getBoolean("delete_after_sync", true));
        
        updateAvailabilityUI(swAvailability.isChecked());
        updateRecordingUI(swRecording.isChecked());
        updateTranscriptionUI(swTranscription.isChecked());
        updateAutoCleanupUI(swAutoCleanup.isChecked());
    }

    private void initServices() {
        telephonyManager = (TelephonyManager) getSystemService(TELEPHONY_SERVICE);
        String firebaseUrl = prefs.getString("firebase_url", DEFAULT_URL);
        callRepository = new CallRepository(this, userLogService, firebaseUrl);
        firebaseService = callRepository.getFirebaseService();
    }

    private void setupSyncObserver() {
        callRepository.getUnsyncedCount().observe(this, count -> {
            if (txtPendingSync != null) {
                if (count != null && count > 0) {
                    txtPendingSync.setText(count + " Pending Syncs");
                    txtPendingSync.setTextColor(ContextCompat.getColor(this, R.color.status_busy));
                    if (imgSyncHealth != null) {
                        imgSyncHealth.setColorFilter(ContextCompat.getColor(this, R.color.status_offline));
                    }
                } else {
                    txtPendingSync.setText("Cloud Synced");
                    txtPendingSync.setTextColor(ContextCompat.getColor(this, R.color.status_online));
                    if (imgSyncHealth != null) {
                        imgSyncHealth.setColorFilter(ContextCompat.getColor(this, R.color.status_online));
                    }
                }
            }
        });
    }

    private void setupPerformanceObserver() {
        long startOfDay = getStartOfDay();
        callRepository.getTodayCallCount(startOfDay).observe(this, count -> {
            if (txtCallsToday != null) txtCallsToday.setText(String.valueOf(count != null ? count : 0));
        });

        callRepository.getTodayTotalTalkTime(startOfDay).observe(this, duration -> {
            if (txtTalkTime != null) {
                long totalSeconds = duration != null ? duration : 0;
                long hours = totalSeconds / 3600;
                long minutes = (totalSeconds % 3600) / 60;
                long seconds = totalSeconds % 60;
                txtTalkTime.setText(String.format(Locale.getDefault(), "%02d:%02d:%02d", hours, minutes, seconds));
            }
        });
    }

    private long getStartOfDay() {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }

    private void checkAndRequestCriticalPermissions() {
        List<String> permissions = new ArrayList<>();
        permissions.add(android.Manifest.permission.READ_PHONE_STATE);
        permissions.add(android.Manifest.permission.READ_CALL_LOG);
        permissions.add(android.Manifest.permission.RECORD_AUDIO);
        permissions.add(android.Manifest.permission.CALL_PHONE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(android.Manifest.permission.POST_NOTIFICATIONS);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(android.Manifest.permission.READ_PHONE_NUMBERS);
        }

        List<String> listPermissionsNeeded = new ArrayList<>();
        for (String p : permissions) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                listPermissionsNeeded.add(p);
            }
        }

        if (!listPermissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this, listPermissionsNeeded.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    private void startIntegration() {
        Intent serviceIntent = new Intent(this, WtiService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
        
        updateStatusUI(true);
        if (userLogService != null) {
            String agentName = prefs.getString("agent_name", "Unknown");
            userLogService.log("Integration sync started for: " + agentName);
        }
        Toast.makeText(this, "Connecting integration...", Toast.LENGTH_SHORT).show();
    }

    private void stopIntegration() {
        if (WtiService.isRunning) {
            Intent serviceIntent = new Intent(this, WtiService.class);
            stopService(serviceIntent);
            updateStatusUI(false);
            if (userLogService != null) userLogService.log(getString(R.string.log_integration_stopped));
        }
    }

    private void updateStatusUI(boolean running) {
        if (txtStatus != null) {
            txtStatus.setText(running ? R.string.status_connected : R.string.status_disconnected);
        }
        if (statusIndicator != null) {
            statusIndicator.setBackgroundColor(ContextCompat.getColor(this, running ? R.color.status_online : R.color.status_offline));
        }
        
        if (running) {
            if (btnConnectFirebase != null) {
                btnConnectFirebase.setText("REFRESH INTEGRATION");
                btnConnectFirebase.setAlpha(1.0f);
            }
            if (btnHangUpFirebase != null) {
                btnHangUpFirebase.setEnabled(true);
                btnHangUpFirebase.setAlpha(1.0f);
            }
        } else {
            if (btnConnectFirebase != null) {
                btnConnectFirebase.setText(R.string.action_connect);
                btnConnectFirebase.setEnabled(true);
                btnConnectFirebase.setAlpha(1.0f);
            }
            if (btnHangUpFirebase != null) {
                btnHangUpFirebase.setEnabled(false);
                btnHangUpFirebase.setAlpha(0.5f);
            }
        }
    }

    private void toggleConfigEditing(boolean enabled) {
        if (layoutConfigContainer != null) {
            layoutConfigContainer.setAlpha(enabled ? 1.0f : 0.5f);
        }
        if (edtFirebaseUrl != null) edtFirebaseUrl.setEnabled(enabled);
        if (edtAgentName != null) edtAgentName.setEnabled(enabled);
        if (edtBridgeNumber != null) edtBridgeNumber.setEnabled(enabled);
        if (edtStorageServer != null) edtStorageServer.setEnabled(enabled);
        if (btnUpdateConfig != null) btnUpdateConfig.setEnabled(enabled);
        if (btnTestConnection != null) btnTestConnection.setEnabled(enabled);
    }

    private void saveConfiguration() {
        String url = edtFirebaseUrl.getText().toString().trim();
        String agentName = edtAgentName.getText().toString().trim();
        String bridgeNum = edtBridgeNumber.getText().toString().trim();
        String storageServer = edtStorageServer.getText().toString().trim();

        if (url.isEmpty()) {
            Toast.makeText(this, "Firebase URL is required", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("firebase_url", url);
        editor.putString("agent_name", agentName);
        editor.putString("bridge_number", bridgeNum);
        editor.putString("storage_server", storageServer);
        editor.apply();

        Toast.makeText(this, "Settings saved. Click Refresh to apply.", Toast.LENGTH_LONG).show();
        if (userLogService != null) userLogService.log("Settings saved: " + agentName);
        
        swEditConfig.setChecked(false);
    }

    private void handleTestConnection() {
        String url = edtFirebaseUrl.getText().toString().trim();
        if (url.isEmpty()) {
            Toast.makeText(this, "Please enter a URL first", Toast.LENGTH_SHORT).show();
            return;
        }
        
        Toast.makeText(this, "Testing connection...", Toast.LENGTH_SHORT).show();
        if (firebaseService != null) {
            firebaseService.testConnection(url, success -> {
                runOnUiThread(() -> {
                    String msg = success ? "Connection successful!" : "Connection failed. Check URL and Network.";
                    Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
                    if (userLogService != null) userLogService.log("Test Connection: " + (success ? "Success" : "Failed"));
                });
            });
        }
    }

    private void updateAvailability(boolean available) {
        prefs.edit().putBoolean("available", available).apply();
        updateAvailabilityUI(available);
        if (userLogService != null) userLogService.log("Availability changed: " + (available ? "ON" : "OFF"));
    }

    private void updateAvailabilityUI(boolean available) {
        if (txtAvailabilityStatus != null) {
            txtAvailabilityStatus.setText(available ? R.string.status_available : R.string.status_unavailable);
            txtAvailabilityStatus.setTextColor(ContextCompat.getColor(this, available ? R.color.status_online : R.color.status_busy));
        }
    }

    private void updateRecordingPref(boolean enabled) {
        prefs.edit().putBoolean("recording_enabled", enabled).apply();
        updateRecordingUI(enabled);
        if (userLogService != null) userLogService.log("Recording " + (enabled ? "enabled" : "disabled"));
    }

    private void updateRecordingUI(boolean enabled) {
        if (txtRecordingStatus != null) {
            txtRecordingStatus.setText(enabled ? R.string.status_recording_on : R.string.status_recording_off);
        }
    }

    private void updateTranscriptionPref(boolean enabled) {
        prefs.edit().putBoolean("transcription_enabled", enabled).apply();
        updateTranscriptionUI(enabled);
        if (userLogService != null) userLogService.log("Transcription " + (enabled ? "enabled" : "disabled"));
    }

    private void updateTranscriptionUI(boolean enabled) {
        if (txtTranscriptionStatus != null) {
            txtTranscriptionStatus.setText(enabled ? "ON" : "OFF");
        }
    }

    private void updateAutoCleanupPref(boolean enabled) {
        prefs.edit().putBoolean("delete_after_sync", enabled).apply();
        updateAutoCleanupUI(enabled);
        if (userLogService != null) userLogService.log("Auto-cleanup " + (enabled ? "enabled" : "disabled"));
    }

    private void updateAutoCleanupUI(boolean enabled) {
        if (txtAutoCleanupStatus != null) {
            txtAutoCleanupStatus.setText(enabled ? "Delete after sync ON" : "Delete after sync OFF");
        }
    }

    private void applyAdminLock() {
        boolean lock = prefs.getBoolean("admin_lock", false);
        if (swEditConfig != null) swEditConfig.setEnabled(!lock);
        if (lock && swEditConfig != null) swEditConfig.setChecked(false);
    }
}
