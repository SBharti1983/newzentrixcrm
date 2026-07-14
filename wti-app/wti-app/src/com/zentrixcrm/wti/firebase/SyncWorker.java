package com.zentrixcrm.wti.firebase;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;
import com.zentrixcrm.wti.database.AppDatabase;
import com.zentrixcrm.wti.database.CallLogDao;
import com.zentrixcrm.wti.database.CallLogEntity;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class SyncWorker extends Worker {
    private static final String TAG = "SyncWorker";
    public static final String ACTION_SYNC_LOG = "com.zentrixcrm.wti.SYNC_LOG";

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    /**
     * Optimized trigger method with Backoff Policy and Constraints.
     */
    public static void enqueue(Context context) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        OneTimeWorkRequest syncRequest = new OneTimeWorkRequest.Builder(SyncWorker.class)
                .setConstraints(constraints)
                .setBackoffCriteria(
                        BackoffPolicy.EXPONENTIAL,
                        OneTimeWorkRequest.MIN_BACKOFF_MILLIS,
                        TimeUnit.MILLISECONDS)
                .addTag("call_sync")
                .build();

        WorkManager.getInstance(context).enqueue(syncRequest);
    }

    private void sendUserLog(String message) {
        Intent intent = new Intent(ACTION_SYNC_LOG);
        intent.setPackage(getApplicationContext().getPackageName());
        intent.putExtra("message", message);
        getApplicationContext().sendBroadcast(intent);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        AppDatabase db = AppDatabase.getInstance(context);
        CallLogDao dao = db.callLogDao();
        List<CallLogEntity> unsyncedLogs = dao.getUnsyncedLogs();

        if (unsyncedLogs.isEmpty()) {
            return Result.success();
        }

        SharedPreferences prefs = context.getSharedPreferences("ZentrixPrefs", Context.MODE_PRIVATE);
        
        // --- SMART DATA USAGE CHECK ---
        boolean wifiOnly = prefs.getBoolean("wifi_only_sync", false);
        if (wifiOnly && !isWifiConnected(context)) {
            sendUserLog("Sync paused: Waiting for WiFi.");
            return Result.retry(); // Will retry automatically when constraints (NetworkType.CONNECTED) are met
        }

        String firebaseBaseUrl = prefs.getString("firebase_url", "");
        String crmApiUrl = prefs.getString("storage_server", "");
        
        String secret = prefs.getString("telephony_secret", "zentrix_zap_secure_8842_x");
        String tenantId = prefs.getString("tenant_id", "6f023c0a-a505-4ae4-962a-038a944d500e");
        String agentName = prefs.getString("agent_name", "Unknown");
        String tenantSlug = prefs.getString("tenant_slug", "general");

        sendUserLog("Sync started for: " + agentName);

        FirebaseDatabase database = null;
        FirebaseStorage storage = null;
        if (!firebaseBaseUrl.isEmpty()) {
            try {
                if (!firebaseBaseUrl.endsWith("/")) firebaseBaseUrl += "/";
                
                String projectId = "zentrix-wti-default";
                try {
                    String host = Uri.parse(firebaseBaseUrl).getHost();
                    if (host != null && host.contains(".firebasedatabase.app")) {
                        projectId = host.contains("-default-rtdb") ? host.split("-default-rtdb")[0] : host.split("\\.")[0];
                    }
                } catch (Exception e) {}

                FirebaseOptions options = new FirebaseOptions.Builder()
                        .setDatabaseUrl(firebaseBaseUrl)
                        .setApplicationId("com.zentrixcrm.wti")
                        .setProjectId(projectId)
                        .setApiKey("unused_but_required")
                        .setStorageBucket(projectId + ".firebasestorage.app")
                        .build();

                FirebaseApp app;
                try {
                    app = FirebaseApp.getInstance("zentrix_sync");
                } catch (IllegalStateException e) {
                    app = FirebaseApp.initializeApp(context, options, "zentrix_sync");
                }
                database = FirebaseDatabase.getInstance(app);
                storage = FirebaseStorage.getInstance(app);
            } catch (Exception e) {
                sendUserLog("Sync Init Error: " + e.getMessage());
            }
        }

        okhttp3.OkHttpClient client = new okhttp3.OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build();

        boolean anyFailed = false;
        for (CallLogEntity log : unsyncedLogs) {
            try {
                processLog(log, dao, storage, database, client, crmApiUrl, secret, tenantId, agentName, tenantSlug, prefs);
            } catch (Exception e) {
                Log.e(TAG, "Failed to process log: " + log.number, e);
                anyFailed = true;
            }
        }

        return anyFailed ? Result.retry() : Result.success();
    }

    private boolean isWifiConnected(Context context) {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkCapabilities capabilities = cm.getNetworkCapabilities(cm.getActiveNetwork());
        return capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
    }

    private void processLog(CallLogEntity log, CallLogDao dao, FirebaseStorage storage, FirebaseDatabase database, 
                            okhttp3.OkHttpClient client, String crmApiUrl, String secret, String tenantId, 
                            String agentName, String tenantSlug, SharedPreferences prefs) {
        
        sendUserLog("Syncing Call: " + log.number);

        // 1. Audio Upload
        if (log.firebaseRecordingUrl == null && storage != null && log.recordingPath != null) {
            File file = new File(log.recordingPath);
            if (file.exists() && file.length() > 0) {
                log.firebaseRecordingUrl = uploadToFirebaseStorage(storage, tenantSlug, agentName, log, file);
                if (log.firebaseRecordingUrl != null) {
                    dao.update(log);
                    sendUserLog("Audio Uploaded.");
                }
            }
        }

        // 2. CRM Sync
        if (!log.crmSynced && !crmApiUrl.isEmpty()) {
            File file = (log.recordingPath != null) ? new File(log.recordingPath) : null;
            if (uploadToCRM(client, crmApiUrl, secret, tenantId, log, log.firebaseRecordingUrl, file, prefs)) {
                log.crmSynced = true;
                dao.update(log);
                sendUserLog("CRM lead updated.");
            }
        }

        // 3. RTDB History Sync
        if (!log.firebaseSynced && database != null) {
            DatabaseReference ref = database.getReference("agents").child(agentName).child("call_history");
            if (syncLogToFirebase(ref, log, log.firebaseRecordingUrl)) {
                log.firebaseSynced = true;
                dao.update(log);
                sendUserLog("Saved to History.");
            }
        }

        // 4. Finalize & Cleanup
        if (log.crmSynced && log.firebaseSynced) {
            log.isSynced = true;
            dao.update(log);
            sendUserLog("Sync Complete: " + log.number);

            if (log.recordingPath != null && prefs.getBoolean("delete_after_sync", true)) {
                new File(log.recordingPath).delete();
            }
        }
    }

    private String uploadToFirebaseStorage(FirebaseStorage storage, String tenantSlug, String agentName, CallLogEntity log, File file) {
        try {
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date(log.timestamp));
            String fileName = agentName.replaceAll("[^a-zA-Z0-9]", "") + "_" + timeStamp + ".mp4";
            String storagePath = "recordings/" + tenantSlug + "/" + fileName;

            StorageReference storageRef = storage.getReference().child(storagePath);
            final CountDownLatch latch = new CountDownLatch(1);
            final String[] resultUrl = {null};

            storageRef.putFile(Uri.fromFile(file))
                .addOnSuccessListener(taskSnapshot -> storageRef.getDownloadUrl().addOnSuccessListener(uri -> {
                    resultUrl[0] = uri.toString();
                    latch.countDown();
                }).addOnFailureListener(e -> latch.countDown()))
                .addOnFailureListener(e -> latch.countDown());

            latch.await(45, TimeUnit.SECONDS);
            return resultUrl[0];
        } catch (Exception e) {
            return null;
        }
    }

    private boolean uploadToCRM(okhttp3.OkHttpClient client, String crmBaseUrl, String secret, String tenantId, CallLogEntity log, String firebaseUrl, File audioFile, SharedPreferences prefs) {
        String uploadUrl = crmBaseUrl + (crmBaseUrl.endsWith("/") ? "" : "/") + "api/telephony/upload-recording";
        try {
            String interactionId = (log.interactionId != null && !log.interactionId.isEmpty()) ? log.interactionId : UUID.randomUUID().toString();
            
            boolean requestTranscription = prefs.getBoolean("transcription_enabled", false);

            okhttp3.MultipartBody.Builder bodyBuilder = new okhttp3.MultipartBody.Builder()
                    .setType(okhttp3.MultipartBody.FORM)
                    .addFormDataPart("interactionId", interactionId)
                    .addFormDataPart("disposition", log.disposition != null ? log.disposition : "")
                    .addFormDataPart("phoneNumber", log.number != null ? log.number : "")
                    .addFormDataPart("timestamp", String.valueOf(log.timestamp))
                    .addFormDataPart("duration", String.valueOf(log.durationSeconds))
                    .addFormDataPart("callType", log.type)
                    .addFormDataPart("requestTranscription", String.valueOf(requestTranscription));

            if (firebaseUrl != null) {
                bodyBuilder.addFormDataPart("recordingUrl", firebaseUrl);
            } else if (audioFile != null && audioFile.exists()) {
                bodyBuilder.addFormDataPart("audio", audioFile.getName(),
                        okhttp3.RequestBody.create(audioFile, okhttp3.MediaType.parse("audio/mp4")));
            }

            okhttp3.Request request = new okhttp3.Request.Builder()
                    .url(uploadUrl)
                    .header("X-Zapier-Token", secret + ":" + tenantId)
                    .post(bodyBuilder.build())
                    .build();

            try (okhttp3.Response response = client.newCall(request).execute()) {
                return response.isSuccessful();
            }
        } catch (Exception e) {
            return false;
        }
    }

    private boolean syncLogToFirebase(DatabaseReference ref, CallLogEntity logEntity, String recordingUrl) {
        final CountDownLatch latch = new CountDownLatch(1);
        final boolean[] success = {false};
        Map<String, Object> log = new HashMap<>();
        log.put("type", logEntity.type);
        log.put("number", logEntity.number);
        log.put("duration_seconds", logEntity.durationSeconds);
        log.put("timestamp", logEntity.timestamp);
        log.put("interaction_id", logEntity.interactionId);
        log.put("disposition", logEntity.disposition);
        if (recordingUrl != null) log.put("recording_url", recordingUrl);

        ref.push().setValue(log, (databaseError, databaseReference) -> {
            success[0] = (databaseError == null);
            latch.countDown();
        });
        try {
            return latch.await(15, TimeUnit.SECONDS) && success[0];
        } catch (InterruptedException e) {
            return false;
        }
    }
}
