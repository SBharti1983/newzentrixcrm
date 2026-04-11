package com.zentrixcrm.wti;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.net.ConnectivityManager;
import android.net.Network;
import android.os.Build;
import android.os.IBinder;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.log.UserLogService;
import com.zentrixcrm.wti.phonestate.PhoneStateChangedHandler;
import com.zentrixcrm.wti.phonestate.PhoneStateReceiver;

public class WtiService extends Service {

    public static final String ACTION_STOP_SERVICE = "com.zentrixcrm.wti.ACTION_STOP_SERVICE";
    private static final String CHANNEL_ID = "WtiServiceChannel";
    private static final int NOTIFICATION_ID = 1;
    private static final String PREFS_NAME = "ZentrixPrefs";
    private static final String KEY_FIREBASE_URL = "firebase_url";
    private static final String KEY_PREFERRED_SIM_SLOT = "preferred_sim_slot";
    private static final String DEFAULT_URL = "https://zentrix-wti-default-rtdb.asia-southeast1.firebasedatabase.app/";

    private TelephonyManager telephonyManager;
    private FirebaseService firebaseService;
    private PhoneStateChangedHandler phoneStateHandler;
    private UserLogService userLogService;
    private Object telephonyCallback;
    private ConnectivityManager.NetworkCallback networkCallback;

    public static boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        isRunning = true;
        
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putBoolean("service_enabled", true).apply();
        String savedUrl = prefs.getString(KEY_FIREBASE_URL, DEFAULT_URL);
        int subId = prefs.getInt(KEY_PREFERRED_SIM_SLOT, -1);
        
        userLogService = new UserLogService(null);
        firebaseService = new FirebaseService(this, userLogService, savedUrl);
        phoneStateHandler = new PhoneStateChangedHandler(this, firebaseService, userLogService);
        
        // Link the broadcast receiver to the active handler
        PhoneStateReceiver.setHandler(phoneStateHandler);
        
        telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
        
        if (subId != -1 && telephonyManager != null) {
            telephonyManager = telephonyManager.createForSubscriptionId(subId);
        }

        setupNetworkMonitoring();
    }

    private void setupNetworkMonitoring() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm != null) {
            networkCallback = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(@NonNull Network network) {
                    if (firebaseService != null) {
                        firebaseService.sendConnected(true);
                    }
                }
            };
            cm.registerDefaultNetworkCallback(networkCallback);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP_SERVICE.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        createNotificationChannel();
        
        Notification notification = createServiceNotification("Listening for calls on preferred SIM");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        if (firebaseService != null) {
            firebaseService.sendConnected(true);
            firebaseService.registerConfigListener();
            firebaseService.registerOutgoingCallbackHandler(new OutgoingCallHandler(this, userLogService, phoneStateHandler));
        }
        
        registerTelephonyListener();

        return START_STICKY;
    }

    private Notification createServiceNotification(String text) {
        Intent notificationIntent = new Intent(this, Wti.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this,
                0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent stopIntent = new Intent(this, WtiService.class);
        stopIntent.setAction(ACTION_STOP_SERVICE);
        PendingIntent stopPendingIntent = PendingIntent.getService(this,
                0, stopIntent, PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("zentrixWTI Active")
                .setContentText(text)
                .setSmallIcon(R.drawable.logo)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, 
                        getString(R.string.action_stop_service), stopPendingIntent)
                .build();
    }

    private void registerTelephonyListener() {
        if (telephonyManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            registerTelephonyCallbackV31();
        } else {
            telephonyManager.listen(phoneStateHandler, android.telephony.PhoneStateListener.LISTEN_CALL_STATE);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private void registerTelephonyCallbackV31() {
        telephonyCallback = new CallStateCallbackProxy(phoneStateHandler);
        if (telephonyManager != null) {
            telephonyManager.registerTelephonyCallback(getMainExecutor(), (TelephonyCallback)telephonyCallback);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private static class CallStateCallbackProxy extends TelephonyCallback implements TelephonyCallback.CallStateListener {
        private final PhoneStateChangedHandler handler;
        public CallStateCallbackProxy(PhoneStateChangedHandler handler) {
            this.handler = handler;
        }
        @Override
        public void onCallStateChanged(int state) {
            handler.onCallStateChanged(state, null);
        }
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putBoolean("service_enabled", false).apply();
        if (firebaseService != null) {
            firebaseService.sendConnected(false);
            firebaseService.unregisterOutgoingCallbackHandler();
            firebaseService.unregisterConfigListener();
        }
        unregisterTelephonyListener();
        
        PhoneStateReceiver.setHandler(null);
        
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm != null && networkCallback != null) {
            cm.unregisterNetworkCallback(networkCallback);
        }
        
        sendBroadcast(new Intent("com.zentrixcrm.wti.SERVICE_STOPPED"));
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d("WtiService", "Task removed, service will continue in foreground");
        super.onTaskRemoved(rootIntent);
    }

    private void unregisterTelephonyListener() {
        if (telephonyManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (telephonyCallback != null) {
                telephonyManager.unregisterTelephonyCallback((TelephonyCallback)telephonyCallback);
            }
        } else {
            telephonyManager.listen(phoneStateHandler, android.telephony.PhoneStateListener.LISTEN_NONE);
        }
    }

    public void updateNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, createServiceNotification(text));
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Zentrix WTI Service Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
}
