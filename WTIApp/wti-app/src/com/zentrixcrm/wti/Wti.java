package com.zentrixcrm.wti;

import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.telecom.TelecomManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.telephony.TelephonyManager;
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
import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.google.android.material.switchmaterial.SwitchMaterial;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.card.MaterialCardView;
import com.google.firebase.database.FirebaseDatabase;
import com.zentrixcrm.wti.database.AppDatabase;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.log.UserLogService;
import com.zentrixcrm.wti.recording.CallRecorder;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

import static com.zentrixcrm.wti.TelephonyManagerTools.getLine1Number;

public class Wti extends AppCompatActivity {

  private static final int PERMISSION_REQUEST_CODE = 101;
  private static final int DEFAULT_DIALER_REQUEST_CODE = 103;
  private static final int BATTERY_OPTIMIZATION_REQUEST_CODE = 104;
  private static final String PREFS_NAME = "ZentrixPrefs";
  private static final String KEY_FIREBASE_URL = "firebase_url";
  private static final String KEY_STORAGE_SERVER = "storage_server";
  private static final String KEY_AGENT_NAME = "agent_name";
  private static final String KEY_BRIDGE_NUMBER = "bridge_number";
  private static final String KEY_RECORDING_ENABLED = "recording_enabled";
  private static final String KEY_TRANSCRIPTION_ENABLED = "transcription_enabled";
  private static final String KEY_DELETE_AFTER_SYNC = "delete_after_sync";
  private static final String KEY_PREFERRED_SIM_SLOT = "preferred_sim_slot";
  private static final String KEY_SERVICE_ENABLED = "service_enabled";
  private static final String KEY_IS_LOGGED_IN = "is_logged_in";
  private static final String DEFAULT_URL = "https://zentrix-wti-default-rtdb.asia-southeast1.firebasedatabase.app/";

  private TelephonyManager telephonyManager;

  private TextView txtUserLog;
  private TextView txtOwnNumber;
  private TextView txtStatus;
  private TextView txtAvailabilityStatus;
  private TextView txtRecordingStatus;
  private TextView txtDialerStatus;
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
  private Button btnConnectFireBase;
  private Button btnHangUpFireBase;
  private Button btnUpdateConfig;
  private Button btnTestConnection;
  private SwitchMaterial swAvailability;
  private SwitchMaterial swRecording;
  private SwitchMaterial swDefaultDialer;
  private SwitchMaterial swTranscription;
  private SwitchMaterial swAutoCleanup;
  private SwitchMaterial swEditConfig;
  private MaterialCardView cardSyncHealth;
  private LinearLayout layoutConfigContainer;

  private FirebaseService firebaseService;
  private UserLogService userLogService;
  private SharedPreferences prefs;
  private List<Integer> simSlotIds = new ArrayList<>();

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

    checkAndRequestCriticalPermissions();

    setupListeners();

    int receiverFlags = ContextCompat.RECEIVER_NOT_EXPORTED;

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

    updateDialerStatus();
    
    new Handler(Looper.getMainLooper()).postDelayed(this::checkBatteryOptimization, 2000);
  }

  @Override
  protected void onResume() {
      super.onResume();
      updateStatusUI(WtiService.isRunning);
      applyAdminLock();
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

    if (btnConnectFireBase != null) {
      btnConnectFireBase.setOnClickListener(v -> startIntegration());
    }

    if (btnHangUpFireBase != null) {
      btnHangUpFireBase.setOnClickListener(v -> stopIntegration());
    }

    if (cardSyncHealth != null) {
        cardSyncHealth.setOnClickListener(v -> {
            if (firebaseService != null) {
                userLogService.log("Manual sync triggered.");
                firebaseService.scheduleSync();
                Toast.makeText(this, "Syncing recordings...", Toast.LENGTH_SHORT).show();
            }
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

    if (swDefaultDialer != null) {
        swDefaultDialer.setOnClickListener(v -> {
            boolean isChecked = swDefaultDialer.isChecked();
            if (isChecked) {
                requestDefaultDialer();
            } else {
                Toast.makeText(this, "Change default Phone app in System Settings to disable.", Toast.LENGTH_LONG).show();
                updateDialerStatus();
            }
        });
    }

    if (swEditConfig != null) {
      swEditConfig.setOnCheckedChangeListener((buttonView, isChecked) -> toggleConfigEditing(isChecked));
    }
  }

  private void updateDialerStatus() {
      TelecomManager telecomManager = (TelecomManager) getSystemService(TELECOM_SERVICE);
      boolean isDefault = telecomManager != null && getPackageName().equals(telecomManager.getDefaultDialerPackage());
      
      if (swDefaultDialer != null) {
          swDefaultDialer.setChecked(isDefault);
      }
      if (txtDialerStatus != null) {
          txtDialerStatus.setText(isDefault ? "Enabled" : "Disabled");
          txtDialerStatus.setTextColor(ContextCompat.getColor(this, isDefault ? R.color.status_online : R.color.text_secondary));
      }
  }

  private void requestDefaultDialer() {
    TelecomManager telecomManager = (TelecomManager) getSystemService(TELECOM_SERVICE);
    if (telecomManager != null && !getPackageName().equals(telecomManager.getDefaultDialerPackage())) {
      Intent intent = new Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER)
              .putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, getPackageName());
      startActivityForResult(intent, DEFAULT_DIALER_REQUEST_CODE);
    }
  }

  @Override
  protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    if (requestCode == DEFAULT_DIALER_REQUEST_CODE) {
      updateDialerStatus();
      if (resultCode == RESULT_OK) {
        if (userLogService != null) userLogService.log("App set as default dialer.");
      } else {
        if (userLogService != null) userLogService.log("Default dialer permission denied.");
      }
    } else if (requestCode == BATTERY_OPTIMIZATION_REQUEST_CODE) {
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null && pm.isIgnoringBatteryOptimizations(getPackageName())) {
            userLogService.log("Battery optimization disabled.");
        } else {
            userLogService.log("Battery optimization still enabled.");
        }
    }
  }

  private void checkAndRequestCriticalPermissions() {
    if (hasPermissions()) {
      setupTelephony();
      setupSimSelection();
    } else {
      ActivityCompat.requestPermissions(this, getRequiredPermissions(), PERMISSION_REQUEST_CODE);
    }
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
      super.onRequestPermissionsResult(requestCode, permissions, grantResults);
      if (requestCode == PERMISSION_REQUEST_CODE) {
          if (hasPermissions()) {
              setupTelephony();
              setupSimSelection();
              if (userLogService != null) userLogService.log("Permissions granted.");
          } else {
              Toast.makeText(this, "Required permissions not granted.", Toast.LENGTH_LONG).show();
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

  private void applyAdminLock() {
      boolean locked = prefs.getBoolean("lock_settings", false);
      if (swEditConfig != null) {
          swEditConfig.setEnabled(!locked);
          if (locked) swEditConfig.setChecked(false);
      }
  }

  private void handleTestConnection() {
    String fbUrl = edtFirebaseUrl.getText().toString().trim();
    String storageUrl = edtStorageServer.getText().toString().trim();

    if (fbUrl.isEmpty() || storageUrl.isEmpty()) {
      Toast.makeText(this, "Please enter URLs first", Toast.LENGTH_SHORT).show();
      return;
    }

    userLogService.log(getString(R.string.msg_testing_connection));
    
    new Thread(() -> {
        boolean fbOk = testUrl(fbUrl);
        boolean storageOk = testUrl(storageUrl);

        runOnUiThread(() -> {
            if (fbOk && storageOk) {
                userLogService.log(getString(R.string.msg_connection_success));
                Toast.makeText(Wti.this, R.string.msg_connection_success, Toast.LENGTH_SHORT).show();
            } else {
                String error = (!fbOk ? "Firebase " : "") + (!storageOk ? "Storage " : "") + "failed";
                userLogService.log(getString(R.string.msg_connection_failed, error));
                Toast.makeText(Wti.this, getString(R.string.msg_connection_failed, error), Toast.LENGTH_LONG).show();
            }
        });
    }).start();
  }

  private boolean testUrl(String urlString) {
      try {
          java.net.URL url = new java.net.URL(urlString);
          java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
          conn.setConnectTimeout(5000);
          conn.setReadTimeout(5000);
          conn.connect();
          int code = conn.getResponseCode();
          return (code >= 200 && code < 500); 
      } catch (Exception e) {
          return false;
      }
  }

  private void saveConfiguration() {
    if (edtFirebaseUrl == null || edtAgentName == null || edtBridgeNumber == null || edtStorageServer == null)
      return;

    String firebaseUri = edtFirebaseUrl.getText().toString().trim();
    String agentName = edtAgentName.getText().toString().trim();
    String bridgeNumber = edtBridgeNumber.getText().toString().trim();
    String storageUri = edtStorageServer.getText().toString().trim();

    if (firebaseUri.isEmpty() || !firebaseUri.startsWith("http")) {
        Toast.makeText(this, "Valid Firebase URL required", Toast.LENGTH_SHORT).show();
        return;
    }

    if (storageUri.isEmpty() || !storageUri.startsWith("http")) {
        Toast.makeText(this, "Valid Storage Server URL required", Toast.LENGTH_SHORT).show();
        return;
    }

    prefs.edit()
            .putString(KEY_FIREBASE_URL, firebaseUri)
            .putString(KEY_AGENT_NAME, agentName)
            .putString(KEY_BRIDGE_NUMBER, bridgeNumber)
            .putString(KEY_STORAGE_SERVER, storageUri)
            .commit();

    if (firebaseService != null) {
      firebaseService.setBaseUrl(firebaseUri);
    }
    
    if (userLogService != null) {
      userLogService.log("Configuration saved: " + storageUri);
    }
    Toast.makeText(Wti.this, R.string.msg_url_saved, Toast.LENGTH_SHORT).show();

    if (swEditConfig != null) {
        swEditConfig.setChecked(false);
    }

    if (WtiService.isRunning) {
      stopIntegration();
      startIntegration();
    }
  }

  private void setupSyncObserver() {
    AppDatabase db = AppDatabase.getInstance(this);
    if (db != null && db.callLogDao() != null) {
      db.callLogDao().getUnsyncedCount().observe(this, count -> {
        if (txtPendingSync == null) return;
        if (count != null && count > 0) {
          txtPendingSync.setVisibility(View.VISIBLE);
          txtPendingSync.setText(getString(R.string.status_sync_pending, count));
          txtPendingSync.setTextColor(ContextCompat.getColor(Wti.this, R.color.status_offline));
          if (imgSyncHealth != null) {
              imgSyncHealth.setImageResource(android.R.drawable.stat_sys_upload);
              imgSyncHealth.setColorFilter(ContextCompat.getColor(Wti.this, R.color.status_offline));
          }
        } else {
          txtPendingSync.setVisibility(View.VISIBLE);
          txtPendingSync.setText(R.string.status_synced);
          txtPendingSync.setTextColor(ContextCompat.getColor(Wti.this, R.color.status_online));
          if (imgSyncHealth != null) {
              imgSyncHealth.setImageResource(android.R.drawable.stat_sys_upload_done);
              imgSyncHealth.setColorFilter(ContextCompat.getColor(Wti.this, R.color.status_online));
          }
        }
      });
    }
  }

  private void setupPerformanceObserver() {
      AppDatabase db = AppDatabase.getInstance(this);
      if (db == null || db.callLogDao() == null) return;

      Calendar calendar = Calendar.getInstance();
      calendar.set(Calendar.HOUR_OF_DAY, 0);
      calendar.set(Calendar.MINUTE, 0);
      calendar.set(Calendar.SECOND, 0);
      calendar.set(Calendar.MILLISECOND, 0);
      long startOfDay = calendar.getTimeInMillis();

      db.callLogDao().getTodayCallCount(startOfDay).observe(this, count -> {
          if (txtCallsToday != null) {
              txtCallsToday.setText(String.valueOf(count != null ? count : 0));
          }
      });

      db.callLogDao().getTodayTotalTalkTime(startOfDay).observe(this, seconds -> {
          if (txtTalkTime != null) {
              long totalSeconds = seconds != null ? seconds : 0;
              long minutes = totalSeconds / 60;
              txtTalkTime.setText(getString(R.string.stat_talk_time_format, (int)minutes));
          }
      });
  }

  private void setupSimSelection() {
    if (spinnerSimSelection == null) return;
    List<String> simOptions = new ArrayList<>();
    simOptions.add(getString(R.string.sim_default));
    simSlotIds.clear();
    simSlotIds.add(-1);

    try {
      SubscriptionManager sm = (SubscriptionManager) getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
      if (sm != null) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
          List<SubscriptionInfo> sis = sm.getActiveSubscriptionInfoList();
          if (sis != null && !sis.isEmpty()) {
            for (SubscriptionInfo si : sis) {
              int slot = si.getSimSlotIndex();
              String carrier = si.getDisplayName().toString();
              String number = "";
              
              if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_NUMBERS) == PackageManager.PERMISSION_GRANTED) {
                  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                      number = sm.getPhoneNumber(si.getSubscriptionId());
                  } else {
                      number = si.getNumber();
                  }
              }

              if (number != null && !number.isEmpty() && !number.startsWith("0000")) {
                  simOptions.add(getString(R.string.sim_slot_with_number_format, slot + 1, carrier, number));
              } else {
                  simOptions.add(getString(R.string.sim_slot_format, slot + 1, carrier));
              }
              simSlotIds.add(si.getSubscriptionId());
            }
          }
        }
      }
    } catch (SecurityException e) {
      Log.e("WTI", "SIM access error", e);
    }

    ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_dropdown_item_1line, simOptions);
    spinnerSimSelection.setAdapter(adapter);

    int savedSubId = prefs.getInt(KEY_PREFERRED_SIM_SLOT, -1);
    int index = simSlotIds.indexOf(savedSubId);
    if (index >= 0) {
      spinnerSimSelection.setText(simOptions.get(index), false);
    }
  }

  private void updateAvailability(boolean isAvailable) {
    if (firebaseService != null) {
      firebaseService.sendAvailability(isAvailable);
    }
    if (txtAvailabilityStatus != null) {
      txtAvailabilityStatus.setText(isAvailable ? R.string.status_available : R.string.status_dnd);
    }
    if (userLogService != null) {
      userLogService.log(getString(R.string.log_availability_format, isAvailable ? "ON" : "OFF"));
    }
  }

  private void updateRecordingPref(boolean isEnabled) {
    prefs.edit().putBoolean(KEY_RECORDING_ENABLED, isEnabled).apply();
    if (txtRecordingStatus != null) {
      txtRecordingStatus.setText(isEnabled ? R.string.status_recording_on : R.string.status_recording_off);
    }
    if (userLogService != null) {
      userLogService.log(getString(R.string.log_recording_format, isEnabled ? "ON" : "OFF"));
    }
  }

  private void updateTranscriptionPref(boolean isEnabled) {
      prefs.edit().putBoolean(KEY_TRANSCRIPTION_ENABLED, isEnabled).apply();
      if (txtTranscriptionStatus != null) {
          txtTranscriptionStatus.setText(isEnabled ? "ON" : "OFF");
      }
      
      if (firebaseService != null) {
          firebaseService.updateRemoteConfig("transcription_enabled", isEnabled);
      }

      if (userLogService != null) {
          userLogService.log("Transcription " + (isEnabled ? "ON" : "OFF"));
      }
  }

  private void updateAutoCleanupPref(boolean isEnabled) {
      prefs.edit().putBoolean(KEY_DELETE_AFTER_SYNC, isEnabled).apply();
      if (txtAutoCleanupStatus != null) {
          txtAutoCleanupStatus.setText(isEnabled ? "Delete after sync ON" : "Delete after sync OFF");
      }
      if (userLogService != null) {
          userLogService.log("Auto Cleanup " + (isEnabled ? "ON" : "OFF"));
      }
  }

  @Override
  public boolean onCreateOptionsMenu(Menu menu) {
    getMenuInflater().inflate(R.menu.main_menu, menu);
    return true;
  }

  @Override
  public boolean onOptionsItemSelected(MenuItem item) {
    if (item.getItemId() == R.id.action_logout) {
      handleLogout();
      return true;
    }
    return super.onOptionsItemSelected(item);
  }

  private void handleLogout() {
    stopIntegration();
    prefs.edit().putBoolean(KEY_IS_LOGGED_IN, false).apply();
    Intent intent = new Intent(this, LoginActivity.class);
    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    startActivity(intent);
    finish();
  }

  private void startIntegration() {
    prefs.edit().putBoolean(KEY_SERVICE_ENABLED, true).apply();
    Intent serviceIntent = new Intent(this, WtiService.class);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(serviceIntent);
    } else {
      startService(serviceIntent);
    }
    if (userLogService != null) {
      userLogService.log(getString(R.string.log_integration_active));
    }
    updateStatusUI(true);
  }

  private void stopIntegration() {
    prefs.edit().putBoolean(KEY_SERVICE_ENABLED, false).apply();
    Intent serviceIntent = new Intent(this, WtiService.class);
    stopService(serviceIntent);
    if (userLogService != null) {
      userLogService.log(getString(R.string.log_integration_offline));
    }
    updateStatusUI(false);
  }

  private void updateStatusUI(boolean connected) {
    if (txtStatus == null || statusIndicator == null) return;
    if (connected) {
      txtStatus.setText(R.string.status_connected);
      statusIndicator.setBackgroundResource(R.color.status_online);
      if (btnConnectFireBase != null) {
          btnConnectFireBase.setEnabled(false);
          btnConnectFireBase.setAlpha(0.5f);
      }
      if (btnHangUpFireBase != null) {
          btnHangUpFireBase.setEnabled(true);
          btnHangUpFireBase.setAlpha(1.0f);
      }
    } else {
      txtStatus.setText(R.string.status_disconnected);
      statusIndicator.setBackgroundResource(R.color.status_offline);
      if (btnConnectFireBase != null) {
          btnConnectFireBase.setEnabled(true);
          btnConnectFireBase.setAlpha(1.0f);
      }
      if (btnHangUpFireBase != null) {
          btnHangUpFireBase.setEnabled(false);
          btnHangUpFireBase.setAlpha(0.5f);
      }
    }
  }

  private boolean hasPermissions() {
    for (String permission : getRequiredPermissions()) {
      if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
        return false;
      }
    }
    return true;
  }

  private String[] getRequiredPermissions() {
    List<String> perms = new ArrayList<>();
    perms.add(Manifest.permission.CALL_PHONE);
    perms.add(Manifest.permission.READ_PHONE_STATE);
    perms.add(Manifest.permission.RECORD_AUDIO);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      perms.add(Manifest.permission.READ_PHONE_NUMBERS);
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      perms.add(Manifest.permission.POST_NOTIFICATIONS);
    }
    return perms.toArray(new String[0]);
  }

  private void setupTelephony() {
    if (txtOwnNumber == null) return;
    try {
      telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
      if (telephonyManager != null) {
        String number = getLine1Number(telephonyManager);
        txtOwnNumber.setText(number);
      }
    } catch (SecurityException e) {
      txtOwnNumber.setText("Permission Denied");
    }
  }

  private void initServices() {
    userLogService = new UserLogService(txtUserLog);
    String savedUrl = prefs.getString(KEY_FIREBASE_URL, DEFAULT_URL);
    String agentName = prefs.getString(KEY_AGENT_NAME, "Agent_001");
    String bridgeNumber = prefs.getString(KEY_BRIDGE_NUMBER, "");
    String storageServer = prefs.getString(KEY_STORAGE_SERVER, "https://storage.zentrixcrm.com");
    boolean recordingEnabled = prefs.getBoolean(KEY_RECORDING_ENABLED, true);
    boolean transcriptionEnabled = prefs.getBoolean(KEY_TRANSCRIPTION_ENABLED, false);
    boolean autoCleanup = prefs.getBoolean(KEY_DELETE_AFTER_SYNC, true);

    if (edtFirebaseUrl != null) edtFirebaseUrl.setText(savedUrl);
    if (edtAgentName != null) edtAgentName.setText(agentName);
    if (edtBridgeNumber != null) edtBridgeNumber.setText(bridgeNumber);
    if (edtStorageServer != null) edtStorageServer.setText(storageServer);
    
    if (swRecording != null) swRecording.setChecked(recordingEnabled);
    if (txtRecordingStatus != null) txtRecordingStatus.setText(recordingEnabled ? R.string.status_recording_on : R.string.status_recording_off);
    
    if (swTranscription != null) swTranscription.setChecked(transcriptionEnabled);
    if (txtTranscriptionStatus != null) txtTranscriptionStatus.setText(transcriptionEnabled ? "ON" : "OFF");

    if (swAutoCleanup != null) swAutoCleanup.setChecked(autoCleanup);
    if (txtAutoCleanupStatus != null) txtAutoCleanupStatus.setText(autoCleanup ? "Delete after sync ON" : "Delete after sync OFF");

    firebaseService = new FirebaseService(this, userLogService, savedUrl);
    telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);

    new CallRecorder(this).cleanupOrphanedFiles();
    checkForUpdates();
  }

  private void checkForUpdates() {
      if (firebaseService == null) return;
      firebaseService.checkAppUpdate((latestVersion, updateUrl) -> {
          try {
              String currentVersion = getPackageManager()
                      .getPackageInfo(getPackageName(), 0).versionName;
              if (isNewerVersion(currentVersion, latestVersion)) {
                  showUpdateDialog(latestVersion, updateUrl);
              }
          } catch (PackageManager.NameNotFoundException e) {
              Log.e("Wti", "Version check failed", e);
          }
      });
  }

  private boolean isNewerVersion(String current, String latest) {
      try {
          String[] curParts = current.split("\\.");
          String[] latParts = latest.split("\\.");
          int length = Math.max(curParts.length, latParts.length);
          for (int i = 0; i < length; i++) {
              int cur = i < curParts.length ? Integer.parseInt(curParts[i]) : 0;
              int lat = i < latParts.length ? Integer.parseInt(latParts[i]) : 0;
              if (lat > cur) return true;
              if (cur > lat) return false;
          }
      } catch (Exception e) {
          return false;
      }
      return false;
  }

  private void showUpdateDialog(String version, String url) {
      new MaterialAlertDialogBuilder(this)
              .setTitle(R.string.update_available_title)
              .setMessage(getString(R.string.update_available_msg, version))
              .setPositiveButton(R.string.action_update_now, (dialog, which) -> {
                  Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                  startActivity(intent);
              })
              .setNegativeButton(R.string.action_later, null)
              .show();
  }

  private void initUIElements() {
    txtUserLog = findViewById(R.id.txtUserLog);
    txtOwnNumber = findViewById(R.id.txtOwnNumber);
    txtStatus = findViewById(R.id.txtStatus);
    txtAvailabilityStatus = findViewById(R.id.txtAvailabilityStatus);
    txtRecordingStatus = findViewById(R.id.txtRecordingStatus);
    txtDialerStatus = findViewById(R.id.txtDialerStatus);
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
    btnConnectFireBase = findViewById(R.id.btnConnectFirebase);
    btnHangUpFireBase = findViewById(R.id.btnHangUpFirebase);
    btnUpdateConfig = findViewById(R.id.btnUpdateConfig);
    btnTestConnection = findViewById(R.id.btnTestConnection);
    swAvailability = findViewById(R.id.swAvailability);
    swRecording = findViewById(R.id.swRecording);
    swDefaultDialer = findViewById(R.id.swDefaultDialer);
    swTranscription = findViewById(R.id.swTranscription);
    swAutoCleanup = findViewById(R.id.swAutoCleanup);
    swEditConfig = findViewById(R.id.swEditConfig);
    cardSyncHealth = findViewById(R.id.cardSyncHealth);
    layoutConfigContainer = findViewById(R.id.layoutConfigContainer);
  }
}
