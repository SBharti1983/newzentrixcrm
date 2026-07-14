package com.zentrixcrm.wti.log;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.text.format.DateFormat;
import android.util.Log;
import android.widget.TextView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Date;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class UserLogService {

  private static final String TAG = "UserLogService";
  private static final int MAX_ELEMENTS = 20;
  private static final String LOG_FILE_NAME = "zentrix_activity.log";
  public static final String ACTION_LOG_MESSAGE = "com.zentrixcrm.wti.LOG_MESSAGE";

  private TextView txtUserLog;
  private Context context;
  private ArrayDeque<String> entries = new ArrayDeque<>();
  private String lastLoggedText = "";
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final ExecutorService diskExecutor = Executors.newSingleThreadExecutor();

  public UserLogService(TextView txtUserLog) {
    this.txtUserLog = txtUserLog;
  }

  public void setContext(Context context) {
    this.context = context.getApplicationContext();
  }

  public void log(String text) {
    if (text == null || text.equals(lastLoggedText)) {
        return; 
    }
    lastLoggedText = text;

    String formattedMsg = DateFormat.format("yyyy-MM-dd HH:mm:ss", new Date()) + "> " + text + "\n";
    Log.d(TAG, text);
    
    // 1. Persist to Disk
    if (context != null) {
        saveLogToDisk(formattedMsg);
    }

    // 2. Broadcast log
    if (context != null) {
        Intent intent = new Intent(ACTION_LOG_MESSAGE);
        intent.putExtra("message", text);
        intent.setPackage(context.getPackageName());
        context.sendBroadcast(intent);
    }

    // 3. Update UI
    if (txtUserLog != null) {
      mainHandler.post(() -> {
        txtUserLog.setText(appendEntryAndCreateText(text));
      });
    }
  }

  private void saveLogToDisk(String message) {
    diskExecutor.execute(() -> {
        try {
            File logFile = new File(context.getExternalFilesDir(null), LOG_FILE_NAME);
            try (FileOutputStream fos = new FileOutputStream(logFile, true)) {
                fos.write(message.getBytes(StandardCharsets.UTF_8));
            }
        } catch (IOException e) {
            Log.e(TAG, "Failed to write log to disk", e);
        }
    });
  }

  public File getLogFile() {
      if (context == null) return null;
      return new File(context.getExternalFilesDir(null), LOG_FILE_NAME);
  }

  private String appendEntryAndCreateText(String text) {
    CharSequence time = DateFormat.format("hh:mm", new Date());
    entries.offer(time + "> " + text + "\n");
    while (entries.size() > MAX_ELEMENTS) {
      entries.removeFirst();
    }
    StringBuilder sb = new StringBuilder();
    for (String entry : entries) {
      sb.append(entry);
    }
    return sb.toString();
  }
}
