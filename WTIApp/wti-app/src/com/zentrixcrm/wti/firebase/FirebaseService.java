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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class FirebaseService {

    private static final String TAG = "FirebaseService";
    public static final String ACTION_CONNECTION_STATUS = "com.zentrixcrm.wti.CONNECTION_STATUS";
    public static final String ACTION_LATENCY_UPDATE = "com.zentrixcrm.wti.LATENCY_UPDATE";
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
        
        // Ensure URL is correctly formatted
        if (!baseUrl.endsWith("/")) baseUrl += "/";
        
        try {
            FirebaseOptions options = new FirebaseOptions.Builder()
                    .setDatabaseUrl(baseUrl)
                    .setApplicationId("com.zentrixcrm.wti")
                    .setProjectId("zentrix-wti-default")
                    .setApiKey("unused")
                    .build();

            FirebaseApp app = null;
            try {
                List<FirebaseApp> apps = FirebaseApp.getApps(context);
                for (FirebaseApp existingApp : apps) {
                    if (existingApp.getName().equals("zentrixWTI")) {
                        if (!existingApp.getOptions().getDatabaseUrl().equals(baseUrl)) {
                            existingApp.delete();
                        } else {
                            app = existingApp;
                        }
                        break;
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Checking existing Firebase apps", e);
            }

            if (app == null) {
                app = FirebaseApp.initializeApp(context, options, "zentrixWTI");
            }
            
            database = FirebaseDatabase.getInstance(app);
            try {
                database.setPersistenceEnabled(true);
            } catch (Exception e) {
                Log.d(TAG, "Persistence already active");
            }
            
            if (userLogService != null) {
                userLogService.log("Firebase Service ready.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Firebase init error: " + e.getMessage());
            if (userLogService != null) userLogService.log("Init error: " + e.getMessage());
        }
    }

    public void setBaseUrl(String url) {
        if (url != null && !url.equals(this.firebaseBaseUrl)) {
            this.firebaseBaseUrl = url;
            initializeDatabase(url);
        }
    }

    public interface TestConnectionCallback {
        void onResult(boolean success);
    }

    public void testConnection(String url, final TestConnectionCallback callback) {
        if (url == null || url.isEmpty() || !url.startsWith("https://")) {
            if (userLogService != null) userLogService.log("Test: Invalid URL protocol.");
            callback.onResult(false);
            return;
        }

        // Validate Hostname
        if (!url.contains(".firebaseio.com") && !url.contains(".firebasedatabase.app")) {
            if (userLogService != null) userLogService.log("Test: Invalid Firebase hostname.");
            callback.onResult(false);
            return;
        }

        try {
            FirebaseOptions options = new FirebaseOptions.Builder()
                    .setDatabaseUrl(url)
                    .setApplicationId("com.zentrixcrm.wti")
                    .setProjectId("zentrix-wti-default")
                    .setApiKey("unused")
                    .build();

            final FirebaseApp tempApp;
            String appName = "testApp_" + System.currentTimeMillis();
            tempApp = FirebaseApp.initializeApp(context, options, appName);
            final FirebaseDatabase tempDb = FirebaseDatabase.getInstance(tempApp);
            
            // We must declare the listener before the runnable so the runnable can reference it,
            // but the listener needs to reference the runnable to cancel it. We can bypass
            // this loop using a final array reference, or simply not removing the listener
            // inside the timeout (it will be harmless since callback only runs once logically).
            final ValueEventListener[] listenerHolder = new ValueEventListener[1];

            final Runnable timeoutTask = new Runnable() {
                @Override
                public void run() {
                    if (listenerHolder[0] != null) {
                        tempDb.getReference(".info/connected").removeEventListener(listenerHolder[0]);
                    }
                    try { tempApp.delete(); } catch (Exception ignored) {}
                    // If we haven't succeeded yet, return failure
                    callback.onResult(false);
                }
            };
            
            final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
            
            listenerHolder[0] = new ValueEventListener() {
                @Override
                public void onDataChange(@NonNull DataSnapshot snapshot) {
                    boolean connected = snapshot.getValue(Boolean.class) != null && snapshot.getValue(Boolean.class);
                    if (connected) {
                        handler.removeCallbacks(timeoutTask);
                        callback.onResult(true);
                        tempDb.getReference(".info/connected").removeEventListener(this);
                        try { tempApp.delete(); } catch (Exception ignored) {}
                    }
                }

                @Override
                public void onCancelled(@NonNull DatabaseError error) {
                    handler.removeCallbacks(timeoutTask);
                    callback.onResult(false);
                    tempDb.getReference(".info/connected").removeEventListener(this);
                    try { tempApp.delete(); } catch (Exception ignored) {}
                }
            };

            tempDb.getReference(".info/connected").addValueEventListener(listenerHolder[0]);
            handler.postDelayed(timeoutTask, 5000);

        } catch (Exception e) {
            if (userLogService != null) userLogService.log("Test error: " + e.getMessage());
            callback.onResult(false);
        }
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
                        if (userLogService != null) userLogService.log("Connection active.");
                        startLatencyMonitoring();
                    } else {
                        if (userLogService != null) userLogService.log("Offline - check URL/Network.");
                    }
                    broadcastStatus(isConnected);
                }

                @Override
                public void onCancelled(@NonNull DatabaseError error) {
                    broadcastStatus(false);
                }
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
            broadcastStatus(false);
        }
    }

    private void startLatencyMonitoring() {
        if (database == null) return;
        DatabaseReference offsetRef = database.getReference(".info/serverTimeOffset");
        offsetRef.addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                measureRealLatency();
            }
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void measureRealLatency() {
        if (database == null) return;
        long startTime = System.currentTimeMillis();
        database.getReference(".info/connected").addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                long latency = System.currentTimeMillis() - startTime;
                broadcastLatency(latency);
            }
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void broadcastLatency(long latency) {
        Intent intent = new Intent(ACTION_LATENCY_UPDATE);
        intent.setPackage(context.getPackageName());
        intent.putExtra("latency", latency);
        context.sendBroadcast(intent);
    }

    private void broadcastStatus(boolean connected) {
        Intent intent = new Intent(ACTION_CONNECTION_STATUS);
        intent.setPackage(context.getPackageName());
        intent.putExtra("connected", connected);
        context.sendBroadcast(intent);
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

        if (userLogService != null) {
            userLogService.log("Dial listener active for: " + agentName);
        }

        outgoingListener = new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                if (snapshot.exists()) {
                    String number = null;
                    String interactionId = null;

                    if (snapshot.hasChild("number")) {
                        number = snapshot.child("number").getValue(String.class);
                        interactionId = snapshot.child("interaction_id").getValue(String.class);
                    } else if (snapshot.getValue() instanceof String) {
                        number = (String) snapshot.getValue();
                    }

                    if (number != null && !number.isEmpty()) {
                        if (userLogService != null) userLogService.log("Web Dial Request: " + number);
                        if (outgoingHandler != null) {
                            outgoingHandler.doCall(number, interactionId);
                        }
                        // Important: Remove the request after triggering so it doesn't redial
                        outgoingRef.removeValue();
                    }
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                if (userLogService != null) userLogService.log("Dial error: " + error.getMessage());
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
        String finalInteractionId = (interactionId == null || interactionId.isEmpty()) ? UUID.randomUUID().toString() : interactionId;
        CallLogEntity log = new CallLogEntity(type, number, duration / 1000, System.currentTimeMillis(), String.valueOf(simSlot), recordingPath, finalInteractionId);

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
                if (dataSnapshot.exists()) {
                    SharedPreferences.Editor editor = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE).edit();
                    
                    for (DataSnapshot child : dataSnapshot.getChildren()) {
                        String key = child.getKey();
                        Object value = child.getValue();
                        
                        if (value instanceof Boolean) {
                            editor.putBoolean(key, (Boolean) value);
                        } else if (value instanceof String) {
                            editor.putString(key, (String) value);
                        } else if (value instanceof Long) {
                            editor.putLong(key, (Long) value);
                        }
                    }
                    
                    editor.apply();
                    context.sendBroadcast(new Intent("com.zentrixcrm.wti.CONFIG_UPDATED"));
                    if (userLogService != null) userLogService.log("Config updated remotely.");
                }
            }
            @Override
            public void onCancelled(@NonNull DatabaseError databaseError) {}
        };
        configRef.addValueEventListener(configListener);
        
        database.getReference("crm_config").addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                if (snapshot.exists()) {
                    SharedPreferences.Editor editor = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE).edit();
                    for (DataSnapshot child : snapshot.getChildren()) {
                        editor.putString(child.getKey(), String.valueOf(child.getValue()));
                    }
                    editor.apply();
                }
            }
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    public void unregisterConfigListener() {
        if (configRef != null && configListener != null) {
            configRef.removeEventListener(configListener);
            configListener = null;
        }
    }
}
