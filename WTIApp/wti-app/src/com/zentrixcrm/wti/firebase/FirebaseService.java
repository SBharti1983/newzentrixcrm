package com.zentrixcrm.wti.firebase;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import com.zentrixcrm.wti.database.AppDatabase;
import com.zentrixcrm.wti.database.CallLogEntity;
import com.zentrixcrm.wti.log.UserLogService;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class FirebaseService {

    private static final String TAG = "FirebaseService";
    private String firebaseBaseUrl;
    private UserLogService userLogService;
    private ValueEventListener outgoingListener;
    private ValueEventListener configListener;
    private ValueEventListener presenceListener;
    private DatabaseReference outgoingRef;
    private DatabaseReference configRef;
    private DatabaseReference connectedRef;
    private Context context;
    private ExecutorService executor = Executors.newSingleThreadExecutor();
    private FirebaseDatabase database;
    private CallHandler outgoingHandler;

    public FirebaseService(Context context, UserLogService userLogService, String baseUrl) {
        this.context = context.getApplicationContext();
        this.userLogService = userLogService;
        this.firebaseBaseUrl = baseUrl;
        initializeDatabase(baseUrl);
    }

    private void initializeDatabase(String baseUrl) {
        if (baseUrl == null || baseUrl.isEmpty()) return;
        try {
            FirebaseOptions options = new FirebaseOptions.Builder()
                    .setDatabaseUrl(baseUrl)
                    .setApplicationId("com.zentrixcrm.wti")
                    .setProjectId("zentrix-wti")
                    .setApiKey("unused")
                    .build();

            FirebaseApp app;
            try {
                app = FirebaseApp.getInstance("zentrixWTI");
            } catch (IllegalStateException e) {
                app = FirebaseApp.initializeApp(context, options, "zentrixWTI");
            }
            database = FirebaseDatabase.getInstance(app);
            database.setPersistenceEnabled(true);
            if (userLogService != null) {
                userLogService.log("Firebase initialized: " + baseUrl);
            }
        } catch (Exception e) {
            Log.e(TAG, "Firebase init error: " + e.getMessage());
        }
    }

    public void setBaseUrl(String url) {
        this.firebaseBaseUrl = url;
        initializeDatabase(url);
    }

    public void sendConnected(boolean connected) {
        if (database == null) return;
        
        String agentName = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE)
                .getString("agent_name", "Agent_001");
        DatabaseReference statusRef = database.getReference("agents").child(agentName).child("connected");
        
        if (connected) {
            database.goOnline();
            connectedRef = database.getReference(".info/connected");
            presenceListener = new ValueEventListener() {
                @Override
                public void onDataChange(@NonNull DataSnapshot snapshot) {
                    boolean isConnected = snapshot.getValue(Boolean.class) != null && snapshot.getValue(Boolean.class);
                    if (isConnected) {
                        statusRef.setValue(true);
                        statusRef.onDisconnect().setValue(false);
                        if (userLogService != null) userLogService.log("Integration online.");
                    } else {
                        if (userLogService != null) userLogService.log("Integration connecting...");
                    }
                }

                @Override
                public void onCancelled(@NonNull DatabaseError error) {}
            };
            connectedRef.addValueEventListener(presenceListener);
            statusRef.keepSynced(true);
        } else {
            if (connectedRef != null && presenceListener != null) {
                connectedRef.removeEventListener(presenceListener);
            }
            statusRef.setValue(false);
            statusRef.keepSynced(false);
            database.goOffline();
        }
    }

    public void updateRemoteConfig(String key, Object value) {
        if (database == null) return;
        String agentName = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE)
                .getString("agent_name", "Agent_001");
        database.getReference("agents").child(agentName).child("config").child(key).setValue(value);
    }

    public void syncAgentProfile(String agentId, final ProfileSyncCallback callback) {
        if (database == null) return;
        database.getReference("agents_registry").child(agentId)
                .addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                if (snapshot.exists() && snapshot.getValue() instanceof Map) {
                    Map<String, Object> profile = (Map<String, Object>) snapshot.getValue();
                    String name = (String) profile.get("name");
                    if (name != null) {
                        callback.onProfileSynced(name);
                    }
                } else {
                    callback.onProfileSynced(agentId);
                }
            }
            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                callback.onProfileSynced(agentId);
            }
        });
    }

    public interface ProfileSyncCallback {
        void onProfileSynced(String agentName);
    }

    public void registerOutgoingCallbackHandler(CallHandler handler) {
        this.outgoingHandler = handler;
        if (database == null) return;

        unregisterOutgoingCallbackHandler();

        String agentName = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE)
                .getString("agent_name", "Agent_001");
        outgoingRef = database.getReference("agents").child(agentName).child("outgoing_call");

        outgoingListener = new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                if (snapshot.exists()) {
                    String number = snapshot.child("number").getValue(String.class);
                    String interactionId = snapshot.child("interaction_id").getValue(String.class);
                    if (number != null && !number.isEmpty()) {
                        if (userLogService != null) userLogService.log("Remote call request: " + number);
                        if (outgoingHandler != null) {
                            outgoingHandler.doCall(number, interactionId);
                        }
                        outgoingRef.removeValue();
                    }
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                Log.w(TAG, "Outgoing listener cancelled", error.toException());
            }
        };
        outgoingRef.addValueEventListener(outgoingListener);
    }

    public void unregisterOutgoingCallbackHandler() {
        if (outgoingRef != null && outgoingListener != null) {
            outgoingRef.removeEventListener(outgoingListener);
            outgoingListener = null;
        }
    }

    public void sendIncomingCall(String number) {
        if (database == null) return;
        String agentName = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE)
                .getString("agent_name", "Agent_001");
        DatabaseReference ref = database.getReference("agents").child(agentName).child("incoming_call");
        if (number == null) {
            ref.removeValue();
        } else {
            ref.setValue(number);
        }
    }

    public void sendNumber(String number) {
        if (database == null) return;
        String agentName = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE)
                .getString("agent_name", "Agent_001");
        database.getReference("agents").child(agentName).child("own_number").setValue(number);
    }

    public void sendAvailability(boolean available) {
        if (database == null) return;
        String agentName = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE)
                .getString("agent_name", "Agent_001");
        database.getReference("agents").child(agentName).child("available").setValue(available);
    }

    public void sendDisposition(String number, String outcome) {
        if (database == null) return;
        String agentName = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE)
                .getString("agent_name", "Agent_001");
        DatabaseReference ref = database.getReference("agents").child(agentName).child("last_disposition");
        Map<String, Object> data = new HashMap<>();
        data.put("number", number);
        data.put("outcome", outcome);
        data.put("timestamp", System.currentTimeMillis());
        ref.setValue(data);
    }

    public void lookupCustomerName(String phoneNumber, final CustomerLookupListener listener) {
        if (database == null) {
            listener.onResult(null);
            return;
        }
        database.getReference("customers").child(phoneNumber).child("name")
                .addListenerForSingleValueEvent(new ValueEventListener() {
                    @Override
                    public void onDataChange(@NonNull DataSnapshot snapshot) {
                        listener.onResult(snapshot.getValue(String.class));
                    }
                    @Override
                    public void onCancelled(@NonNull DatabaseError error) {
                        listener.onResult(null);
                    }
                });
    }

    public interface CustomerLookupListener {
        void onResult(String name);
    }

    public void checkAppUpdate(final UpdateCheckListener listener) {
        if (database == null) return;
        database.getReference("app_config").addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                if (snapshot.exists()) {
                    String version = snapshot.child("latest_version").getValue(String.class);
                    String url = snapshot.child("update_url").getValue(String.class);
                    if (version != null && url != null) {
                        listener.onUpdateAvailable(version, url);
                    }
                }
            }
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    public interface UpdateCheckListener {
        void onUpdateAvailable(String latestVersion, String updateUrl);
    }

    public void logCallHistory(String type, String number, long duration, int simSlot, String recordingPath, String interactionId) {
        CallLogEntity log = new CallLogEntity(type, number, duration / 1000, System.currentTimeMillis(), String.valueOf(simSlot), recordingPath, interactionId);

        executor.execute(() -> {
            AppDatabase.getInstance(context).callLogDao().insert(log);
            triggerSync();
        });
    }

    public void scheduleSync() {
        triggerSync();
    }

    private void triggerSync() {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        OneTimeWorkRequest syncRequest = new OneTimeWorkRequest.Builder(SyncWorker.class)
                .setConstraints(constraints)
                .build();

        WorkManager.getInstance(context).enqueue(syncRequest);
    }

    public void registerConfigListener() {
        if (database == null) return;
        
        unregisterConfigListener();
        
        String agentName = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE)
                .getString("agent_name", "Agent_001");
        configRef = database.getReference("agents").child(agentName).child("config");
        
        configListener = new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot dataSnapshot) {
                if (dataSnapshot.getValue() instanceof Map) {
                    Map<String, Object> config = (Map<String, Object>) dataSnapshot.getValue();
                    SharedPreferences.Editor editor = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE).edit();
                    
                    if (config.containsKey("recording_enabled")) {
                        editor.putBoolean("recording_enabled", (boolean) config.get("recording_enabled"));
                    }
                    if (config.containsKey("storage_server")) {
                        editor.putString("storage_server", (String) config.get("storage_server"));
                    }
                    if (config.containsKey("lock_settings")) {
                        boolean lock = (boolean) config.get("lock_settings");
                        editor.putBoolean("lock_settings", lock);
                        
                        Intent intent = new Intent("com.zentrixcrm.wti.CONFIG_UPDATED");
                        intent.putExtra("lock_settings", lock);
                        context.sendBroadcast(intent);
                    }
                    
                    editor.apply();
                    if (userLogService != null) userLogService.log("Config updated remotely.");
                }
            }
            @Override
            public void onCancelled(@NonNull DatabaseError databaseError) {}
        };
        configRef.addValueEventListener(configListener);
    }

    public void unregisterConfigListener() {
        if (configRef != null && configListener != null) {
            configRef.removeEventListener(configListener);
            configListener = null;
        }
    }
}
