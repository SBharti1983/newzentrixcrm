package com.zentrixcrm.wti.firebase;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class SyncWorker extends Worker {
    private static final String TAG = "SyncWorker";

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
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
        String zapierSecret = prefs.getString("zapier_secret", "zentrix_zap_secure_8842_x");
        String tenantId = prefs.getString("tenant_id", "6f023c0a-a505-4ae4-962a-038a944d500e");
        String agentName = prefs.getString("agent_name", "Unknown");
        String tenantSlug = prefs.getString("tenant_slug", "general");

        if (crmApiUrl.isEmpty()) {
            Log.e(TAG, "CRM Storage server not configured.");
            return Result.failure();
        }

        FirebaseDatabase database = null;
        FirebaseStorage storage = null;
        if (!firebaseBaseUrl.isEmpty()) {
            try {
                FirebaseOptions options = new FirebaseOptions.Builder()
                        .setDatabaseUrl(firebaseBaseUrl)
                        .setApplicationId("com.zentrixcrm.wti")
                        .setProjectId("zentrix-wti")
                        .setApiKey("unused")
                        .setStorageBucket("zentrix-wti.firebasestorage.app")
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
                Log.e(TAG, "Firebase init failed", e);
            }
        }

        okhttp3.OkHttpClient client = new okhttp3.OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true)
                .build();

        boolean allSynced = true;
        for (CallLogEntity log : unsyncedLogs) {

            // STEP 1: Upload to Firebase Storage if not already uploaded
            if (log.firebaseRecordingUrl == null && storage != null && log.recordingPath != null && !log.recordingPath.isEmpty()) {
                File file = new File(log.recordingPath);
                if (file.exists() && file.length() > 0) {
                    log.firebaseRecordingUrl = uploadToFirebaseStorage(storage, tenantSlug, agentName, log, file);
                    if (log.firebaseRecordingUrl != null) {
                        dao.update(log); // Persist the URL immediately
                    }
                }
            }

            // STEP 2: Notify CRM Backend
            if (!log.crmSynced) {
                if (uploadToCRM(client, crmApiUrl, zapierSecret, tenantId, log, log.firebaseRecordingUrl)) {
                    log.crmSynced = true;
                    dao.update(log);
                } else {
                    allSynced = false;
                    continue;
                }
            }

            // STEP 3: Sync to Firebase RTDB
            if (!log.firebaseSynced) {
                if (database != null) {
                    DatabaseReference ref = database.getReference("agents").child(agentName).child("call_history");
                    if (syncLogToFirebase(ref, log, log.firebaseRecordingUrl)) {
                        log.firebaseSynced = true;
                        dao.update(log);
                    } else {
                        allSynced = false;
                    }
                } else {
                    log.firebaseSynced = true;
                    dao.update(log);
                }
            }

            // STEP 4: Cleanup
            if (log.crmSynced && log.firebaseSynced) {
                log.isSynced = true;
                dao.update(log);

                if (log.recordingPath != null && prefs.getBoolean("delete_after_sync", true)) {
                    File localFile = new File(log.recordingPath);
                    if (localFile.exists()) localFile.delete();
                }
            }
        }

        return allSynced ? Result.success() : Result.retry();
    }

    private String uploadToFirebaseStorage(FirebaseStorage storage, String tenantSlug, String agentName, CallLogEntity log, File file) {
        try {
            String yearMonth = new SimpleDateFormat("yyyy-MM", Locale.US).format(new Date(log.timestamp));
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date(log.timestamp));
            String fileName = agentName.replaceAll("[^a-zA-Z0-9]", "") + "_" + timeStamp + ".mp4";
            String storagePath = "recordings/" + tenantSlug + "/" + yearMonth + "/" + fileName;

            StorageReference storageRef = storage.getReference().child(storagePath);
            final CountDownLatch latch = new CountDownLatch(1);
            final String[] downloadUrl = {null};

            storageRef.putFile(Uri.fromFile(file)).addOnSuccessListener(taskSnapshot -> {
                storageRef.getDownloadUrl().addOnSuccessListener(uri -> {
                    downloadUrl[0] = uri.toString();
                    latch.countDown();
                }).addOnFailureListener(e -> latch.countDown());
            }).addOnFailureListener(e -> latch.countDown());

            latch.await(120, TimeUnit.SECONDS);
            return downloadUrl[0];
        } catch (Exception e) {
            return null;
        }
    }

    private boolean uploadToCRM(okhttp3.OkHttpClient client, String crmBaseUrl, String secret, String tenantId, CallLogEntity log, String firebaseUrl) {
        String uploadUrl = crmBaseUrl + "/api/telephony/upload-recording";
        try {
            okhttp3.MultipartBody.Builder bodyBuilder = new okhttp3.MultipartBody.Builder()
                    .setType(okhttp3.MultipartBody.FORM)
                    .addFormDataPart("interactionId", log.interactionId != null ? log.interactionId : "")
                    .addFormDataPart("disposition", log.disposition != null ? log.disposition : "")
                    .addFormDataPart("phoneNumber", log.number != null ? log.number : "")
                    .addFormDataPart("timestamp", String.valueOf(log.timestamp))
                    .addFormDataPart("duration", String.valueOf(log.durationSeconds))
                    .addFormDataPart("callType", log.type);

            if (firebaseUrl != null) {
                bodyBuilder.addFormDataPart("recordingUrl", firebaseUrl);
            } else if (log.recordingPath != null) {
                File file = new File(log.recordingPath);
                if (file.exists()) {
                    bodyBuilder.addFormDataPart("audio", file.getName(), 
                        okhttp3.RequestBody.create(file, okhttp3.MediaType.parse("audio/mp4")));
                }
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
