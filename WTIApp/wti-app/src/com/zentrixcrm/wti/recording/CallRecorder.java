package com.zentrixcrm.wti.recording;

import android.content.Context;
import android.media.MediaRecorder;
import android.util.Log;
import com.zentrixcrm.wti.database.AppDatabase;
import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class CallRecorder {
    private static final String TAG = "CallRecorder";
    private MediaRecorder recorder;
    private File audioFile;
    private Context context;
    private boolean isRecording = false;

    public CallRecorder(Context context) {
        this.context = context;
    }

    public void startRecording(String phoneNumber) {
        if (isRecording) return;

        try {
            // Ensure directory exists
            File dir = new File(context.getExternalFilesDir(null), "Recordings");
            if (!dir.exists()) dir.mkdirs();

            recorder = new MediaRecorder();
            // VOICE_COMMUNICATION is often more reliable for call recording on modern devices
            recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION); 
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);

            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            String fileName = "CALL_" + (phoneNumber != null ? phoneNumber : "Unknown") + "_" + timeStamp + ".mp4";
            
            audioFile = new File(dir, fileName);
            recorder.setOutputFile(audioFile.getAbsolutePath());

            Log.d(TAG, "Preparing recorder for call with: " + phoneNumber);
            recorder.prepare();
            recorder.start();
            isRecording = true;
            Log.d(TAG, "Recording started successfully: " + audioFile.getAbsolutePath());
        } catch (IOException | IllegalStateException e) {
            Log.e(TAG, "Start recording failed", e);
            releaseRecorder();
        }
    }

    public String stopRecording() {
        if (!isRecording || recorder == null) return null;

        String path = null;
        try {
            recorder.stop();
            path = audioFile.getAbsolutePath();
            Log.d(TAG, "Recording stopped: " + path);
        } catch (RuntimeException stopException) {
            Log.e(TAG, "Stop recording failed", stopException);
            if (audioFile != null && audioFile.exists()) {
                audioFile.delete();
            }
        } finally {
            releaseRecorder();
        }
        return path;
    }

    /**
     * Deletes all files in the Recordings folder that are not present in the local database.
     * This prevents storage bloat from "ghost" or failed recordings.
     */
    public void cleanupOrphanedFiles() {
        new Thread(() -> {
            try {
                File dir = new File(context.getExternalFilesDir(null), "Recordings");
                if (!dir.exists() || !dir.isDirectory()) return;

                File[] files = dir.listFiles();
                if (files == null) return;

                // We'll check the DB for all recording paths
                List<String> validPaths = AppDatabase.getInstance(context).callLogDao().getAllRecordingPaths();

                int count = 0;
                for (File file : files) {
                    if (!validPaths.contains(file.getAbsolutePath())) {
                        if (file.delete()) {
                            count++;
                        }
                    }
                }
                if (count > 0) {
                    Log.d(TAG, "Cleaned up " + count + " orphaned recording files.");
                }
            } catch (Exception e) {
                Log.e(TAG, "Cleanup failed", e);
            }
        }).start();
    }

    private void releaseRecorder() {
        if (recorder != null) {
            recorder.reset();
            recorder.release();
            recorder = null;
        }
        isRecording = false;
    }

    public boolean isRecording() {
        return isRecording;
    }
}
