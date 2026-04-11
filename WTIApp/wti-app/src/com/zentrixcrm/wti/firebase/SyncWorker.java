package com.zentrixcrm.wti.firebase;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Log;
import androidx.annotation.NonNull;
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
        String firebaseBaseUrl = prefs.getString("firebase_url", "");
        String crmApiUrl = prefs.getString("storage_server", "");
        
        String secret = prefs.getString("telephony_secret", prefs.getString("zapier_secret", "zentrix_zap_secure_8842_x"));
        String tenantId = prefs.getString("tenant_id", "6f023c0a-a505-4ae4-962a-038a944d500e");
        String agentName = prefs.getString("agent_name", "Unknown");
        String tenantSlug = prefs.getString("tenant_slug", "general");

        sendUserLog("Sync started for: " + agentName);

        FirebaseDatabase database = null;
        FirebaseStorage storage = null;
        if (!firebaseBaseUrl.isEmpty()) {
            try {
                // Ensure URL is fixed
                if (!firebaseBaseUrl.endsWith("/")) firebaseBaseUrl += "/";
                
                String projectId = "zentrix-wti-default";
                try {
                    String host = Uri.parse(firebaseBaseUrl).getHost();
                    if (host != null && host.contains(".firebasedatabase.app")) {
                        // Project ID is everything before the first "." or the "-default-rtdb"
                        if (host.contains("-default-rtdb")) {
                            projectId = host.split("-default-rtdb")[0];
                        } else {
                            projectId = host.split("\\.")[0];
                        }
                    }
                } catch (Exception e) {}

                // Standard Firebase Storage buckets use .firebasestorage.app or .appspot.com
                String storageBucket = projectId + ".firebasestorage.app";
                
                FirebaseOptions options = new FirebaseOptions.Builder()
                        .setDatabaseUrl(firebaseBaseUrl)
                        .setApplicationId("com.zentrixcrm.wti")
                        .setProjectId(projectId)
                        .setApiKey("unused_but_required_by_sdk")
                        .setStorageBucket(storageBucket)
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
            sendUserLog("Syncing Call: " + log.number);

            // 1. Storage Upload
            if (log.firebaseRecordingUrl == null && storage != null && log.recordingPath != null) {
                File file = new File(log.recordingPath);
                if (file.exists() && file.length() > 0) {
                    log.firebaseRecordingUrl = uploadToFirebaseStorage(storage, tenantSlug, agentName, log, file);
                    if (log.firebaseRecordingUrl != null) {
                        dao.update(log);
                        sendUserLog("Audio Uploaded.");
                    } else {
                        anyFailed = true;
                        sendUserLog("Audio Upload Failed - check Storage Rules.");
                    }
                } else {
                    sendUserLog("Recording file not found.");
                }
            }

            // 2. CRM Sync
            if (!log.crmSynced && !crmApiUrl.isEmpty()) {
                File file = (log.recordingPath != null) ? new File(log.recordingPath) : null;
                if (uploadToCRM(client, crmApiUrl, secret, tenantId, log, log.firebaseRecordingUrl, file)) {
                    log.crmSynced = true;
                    dao.update(log);
                    sendUserLog("CRM lead updated.");
                } else {
                    anyFailed = true;
                    sendUserLog("CRM Lead Status update failed.");
                }
            }

            // 3. RTDB History Sync
            if (!log.firebaseSynced && database != null) {
                DatabaseReference ref = database.getReference("agents").child(agentName).child("call_history");
                if (syncLogToFirebase(ref, log, log.firebaseRecordingUrl)) {
                    log.firebaseSynced = true;
                    dao.update(log);
                    sendUserLog("Saved to History.");
                } else {
                    anyFailed = true;
                    sendUserLog("History sync failed.");
                }
            }

            // 4. Finalize
            if (log.crmSynced && log.firebaseSynced) {
                log.isSynced = true;
                dao.update(log);
                sendUserLog("Sync Complete: " + log.number);

                if (log.recordingPath != null && prefs.getBoolean("delete_after_sync", true)) {
                    new File(log.recordingPath).delete();
                }
            }
        }

        return anyFailed ? Result.retry() : Result.success();
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
                .addOnSuccessListener(taskSnapshot -> {
                    storageRef.getDownloadUrl().addOnSuccessListener(uri -> {
                        resultUrl[0] = uri.toString();
                        latch.countDown();
                    }).addOnFailureListener(e -> latch.countDown());
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Storage failure: " + e.getMessage());
                    latch.countDown();
                });

            latch.await(45, TimeUnit.SECONDS);
            return resultUrl[0];
        } catch (Exception e) {
            return null;
        }
    }

    private boolean uploadToCRM(okhttp3.OkHttpClient client, String crmBaseUrl, String secret, String tenantId, CallLogEntity log, String firebaseUrl, File audioFile) {
        String uploadUrl = crmBaseUrl + "/api/telephony/upload-recording";
        try {
            String interactionId = (log.interactionId != null && !log.interactionId.isEmpty()) ? log.interactionId : UUID.randomUUID().toString();
            
            okhttp3.MultipartBody.Builder bodyBuilder = new okhttp3.MultipartBody.Builder()
                    .setType(okhttp3.MultipartBody.FORM)
                    .addFormDataPart("interactionId", interactionId)
                    .addFormDataPart("disposition", log.disposition != null ? log.disposition : "")
                    .addFormDataPart("phoneNumber", log.number != null ? log.number : "")
                    .addFormDataPart("timestamp", String.valueOf(log.timestamp))
                    .addFormDataPart("duration", String.valueOf(log.durationSeconds))
                    .addFormDataPart("callType", log.type);

            if (firebaseUrl != null) {
                bodyBuilder.addFormDataPart("recordingUrl", firebaseUrl);
            } else if (audioFile != null && audioFile.exists()) {
                // FALLBACK: Upload File directly to CRM if Firebase failed
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
        
        String interactionId = (logEntity.interactionId != null && !logEntity.interactionId.isEmpty()) ? logEntity.interactionId : UUID.randomUUID().toString();
        log.put("interaction_id", interactionId);

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
