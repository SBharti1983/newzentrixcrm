package com.zentrixcrm.wti.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.Query;
import androidx.room.Update;
import androidx.lifecycle.LiveData;

import java.util.List;

@Dao
public interface CallLogDao {
    @Insert
    void insert(CallLogEntity callLog);

    @Query("SELECT * FROM call_logs WHERE isSynced = 0")
    List<CallLogEntity> getUnsyncedLogs();

    @Query("SELECT * FROM call_logs WHERE id = :id")
    CallLogEntity getLogById(int id);

    @Query("SELECT COUNT(*) FROM call_logs WHERE isSynced = 0")
    LiveData<Integer> getUnsyncedCount();

    @Update
    void update(CallLogEntity callLog);

    @Query("UPDATE call_logs SET disposition = :disposition, isSynced = 0, crmSynced = 0, firebaseSynced = 0 WHERE number = :number AND id = (SELECT MAX(id) FROM call_logs WHERE number = :number)")
    void updateLatestDisposition(String number, String disposition);

    @Query("SELECT recordingPath FROM call_logs WHERE recordingPath IS NOT NULL")
    List<String> getAllRecordingPaths();

    @Query("DELETE FROM call_logs WHERE isSynced = 1")
    void deleteSyncedLogs();

    @Query("SELECT COUNT(*) FROM call_logs WHERE timestamp >= :startOfDay")
    LiveData<Integer> getTodayCallCount(long startOfDay);

    @Query("SELECT SUM(durationSeconds) FROM call_logs WHERE timestamp >= :startOfDay")
    LiveData<Long> getTodayTotalTalkTime(long startOfDay);

    @Query("SELECT * FROM call_logs WHERE timestamp >= :startOfDay ORDER BY timestamp DESC LIMIT 20")
    LiveData<List<CallLogEntity>> getTodayCallLogs(long startOfDay);
}
