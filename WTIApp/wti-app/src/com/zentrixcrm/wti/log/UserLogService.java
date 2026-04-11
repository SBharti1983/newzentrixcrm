package com.zentrixcrm.wti.log;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.text.format.DateFormat;
import android.util.Log;
import android.widget.TextView;

import java.util.ArrayDeque;
import java.util.Date;

public class UserLogService {

  private static final String TAG = "UserLogService";
  private static final int MAX_ELEMENTS = 20;
  public static final String ACTION_LOG_MESSAGE = "com.zentrixcrm.wti.LOG_MESSAGE";

  private TextView txtUserLog;
  private Context context;
  private ArrayDeque<String> entries = new ArrayDeque<>();
  private final Handler mainHandler = new Handler(Looper.getMainLooper());


  public UserLogService(TextView txtUserLog) {
    this.txtUserLog = txtUserLog;
  }

  public void setContext(Context context) {
    this.context = context.getApplicationContext();
  }

  public void log(String text) {
    Log.d(TAG, text);
    
    // Broadcast log for UI to pick up if service is logging
    if (context != null) {
        Intent intent = new Intent(ACTION_LOG_MESSAGE);
        intent.putExtra("message", text);
        intent.setPackage(context.getPackageName());
        context.sendBroadcast(intent);
    }

    if (txtUserLog != null) {
      mainHandler.post(() -> {
        txtUserLog.setText(appendEntryAndCreateText(text));
      });
    }
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
