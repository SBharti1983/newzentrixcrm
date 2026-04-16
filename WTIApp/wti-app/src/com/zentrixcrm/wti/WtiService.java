package com.zentrixcrm.wti;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.net.ConnectivityManager;
import android.net.Network;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.telephony.PhoneStateListener;
import android.telephony.SignalStrength;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.firebase.SyncWorker;
import com.zentrixcrm.wti.log.UserLogService;
import com.zentrixcrm.wti.phonestate.PhoneStateChangedHandler;
import com.zentrixcrm.wti.phonestate.PhoneStateReceiver;

public class WtiService extends Service {

    public static final String ACTION_STOP_SERVICE = "com.zentrixcrm.wti.ACTION_STOP_SERVICE";
    public static final String ACTION_SYNC_NOW = "com.zentrixcrm.wti.ACTION_SYNC_NOW";
    public static final String ACTION_DIAGNOSTIC_UPDATE = "com.zentrixcrm.wti.DIAGNOSTIC_UPDATE";

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
    private Handler diagnosticHandler = new Handler(Looper.getMainLooper());
    private int currentSignalDbm = -1;

    public static boolean isRunning = false;

    private final BroadcastReceiver batteryReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            float batteryPct = level * 100 / (float) scale;
            if (firebaseService != null) {
                firebaseService.updateRemoteConfig("battery_level", Math.round(batteryPct));
            }
            broadcastDiagnostic();
        }
    };

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
        
        PhoneStateReceiver.setHandler(phoneStateHandler);
        
        telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
        if (subId != -1 && telephonyManager != null) {
            telephonyManager = telephonyManager.createForSubscriptionId(subId);
        }

        setupNetworkMonitoring();
        registerReceiver(batteryReceiver, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        startDiagnosticLoop();
    }

    private void startDiagnosticLoop() {
        diagnosticHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (firebaseService != null && currentSignalDbm != -1) {
                    firebaseService.updateRemoteConfig("signal_strength", currentSignalDbm);
                }
                broadcastDiagnostic();
                diagnosticHandler.postDelayed(this, 60000); // Every 1 minute
            }
        }, 10000);
    }

    private void broadcastDiagnostic() {
        Intent intent = new Intent(ACTION_DIAGNOSTIC_UPDATE);
        intent.setPackage(getPackageName());
        intent.putExtra("signal", currentSignalDbm);
        sendBroadcast(intent);
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
        if (intent != null) {
            if (ACTION_STOP_SERVICE.equals(intent.getAction())) {
                stopSelf();
                return START_NOT_STICKY;
            } else if (ACTION_SYNC_NOW.equals(intent.getAction())) {
                SyncWorker.enqueue(this);
                if (userLogService != null) userLogService.log("Manual sync triggered from notification.");
            }
        }

        createNotificationChannel();
        Notification notification = createServiceNotification("Integration Active");

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
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent stopIntent = new Intent(this, WtiService.class);
        stopIntent.setAction(ACTION_STOP_SERVICE);
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent syncIntent = new Intent(this, WtiService.class);
        syncIntent.setAction(ACTION_SYNC_NOW);
        PendingIntent syncPendingIntent = PendingIntent.getService(this, 1, syncIntent, PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("zentrixWTI")
                .setContentText(text)
                .setSmallIcon(R.drawable.logo)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .addAction(android.R.drawable.stat_sys_upload, "SYNC NOW", syncPendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "STOP", stopPendingIntent)
                .build();
    }

    private void registerTelephonyListener() {
        if (telephonyManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            registerTelephonyCallbackV31();
        } else {
            telephonyManager.listen(new PhoneStateListener() {
                @Override
                public void onSignalStrengthsChanged(SignalStrength signalStrength) {
                    currentSignalDbm = getDbm(signalStrength);
                    broadcastDiagnostic();
                }
                
                @Override
                public void onCallStateChanged(int state, String phoneNumber) {
                    phoneStateHandler.onCallStateChanged(state, phoneNumber);
                }
            }, PhoneStateListener.LISTEN_CALL_STATE | PhoneStateListener.LISTEN_SIGNAL_STRENGTHS);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private void registerTelephonyCallbackV31() {
        telephonyCallback = new CallStateCallbackProxy();
        if (telephonyManager != null) {
            telephonyManager.registerTelephonyCallback(getMainExecutor(), (TelephonyCallback)telephonyCallback);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private class CallStateCallbackProxy extends TelephonyCallback implements TelephonyCallback.CallStateListener, TelephonyCallback.SignalStrengthsListener {
        @Override
        public void onCallStateChanged(int state) {
            phoneStateHandler.onCallStateChanged(state, null);
        }

        @Override
        public void onSignalStrengthsChanged(@NonNull SignalStrength signalStrength) {
            currentSignalDbm = getDbm(signalStrength);
            broadcastDiagnostic();
        }
    }

    private int getDbm(SignalStrength signalStrength) {
        if (signalStrength.isGsm()) {
            return (signalStrength.getGsmSignalStrength() * 2) - 113;
        } else {
            return signalStrength.getCdmaDbm();
        }
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        diagnosticHandler.removeCallbacksAndMessages(null);
        try { unregisterReceiver(batteryReceiver); } catch (Exception e) {}
        
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

    private void unregisterTelephonyListener() {
        if (telephonyManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (telephonyCallback != null) {
                telephonyManager.unregisterTelephonyCallback((TelephonyCallback)telephonyCallback);
            }
        } else {
            telephonyManager.listen(null, PhoneStateListener.LISTEN_NONE);
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
            NotificationChannel serviceChannel = new NotificationChannel(CHANNEL_ID, "Zentrix WTI Service Channel", NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(serviceChannel);
        }
    }
}
