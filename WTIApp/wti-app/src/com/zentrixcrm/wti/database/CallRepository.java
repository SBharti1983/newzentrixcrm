package com.zentrixcrm.wti.database;

import android.content.Context;
import androidx.lifecycle.LiveData;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.log.UserLogService;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Repository class to abstract data sources (Room DB & Firebase).
 * Follows the Clean Architecture pattern for data management.
 */
public class CallRepository {
    private final CallLogDao callLogDao;
    private final FirebaseService firebaseService;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public CallRepository(Context context, UserLogService userLogService, String firebaseUrl) {
        AppDatabase db = AppDatabase.getInstance(context);
        this.callLogDao = db.callLogDao();
        this.firebaseService = new FirebaseService(context, userLogService, firebaseUrl);
    }

    public LiveData<Integer> getUnsyncedCount() {
        return callLogDao.getUnsyncedCount();
    }

    public LiveData<Integer> getTodayCallCount(long startOfDay) {
        return callLogDao.getTodayCallCount(startOfDay);
    }

    public LiveData<Long> getTodayTotalTalkTime(long startOfDay) {
        return callLogDao.getTodayTotalTalkTime(startOfDay);
    }

    public void logCall(String type, String number, long durationMs, int simSlot, String recordingPath, String interactionId) {
        executor.execute(() -> {
            CallLogEntity log = new CallLogEntity(type, number, durationMs / 1000, 
                    System.currentTimeMillis(), String.valueOf(simSlot), recordingPath, interactionId);
            callLogDao.insert(log);
            firebaseService.scheduleSync();
        });
    }

    public FirebaseService getFirebaseService() {
        return firebaseService;
    }
}
