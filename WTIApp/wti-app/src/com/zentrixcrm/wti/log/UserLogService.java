package com.zentrixcrm.wti.log;

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

  private TextView txtUserLog;
  private ArrayDeque<String> entries = new ArrayDeque<>();
  private final Handler mainHandler = new Handler(Looper.getMainLooper());


  public UserLogService(TextView txtUserLog) {
    this.txtUserLog = txtUserLog;
  }

  public void log(String text) {
    Log.d(TAG, text);
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
