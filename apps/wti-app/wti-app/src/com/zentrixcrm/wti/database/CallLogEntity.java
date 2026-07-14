package com.zentrixcrm.wti.database;

import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "call_logs")
public class CallLogEntity {
    @PrimaryKey(autoGenerate = true)
    public int id;
    
    public String type;
    public String number;
    public long durationSeconds;
    public long timestamp;
    public String simSlot;
    public String recordingPath;
    public String interactionId;
    public String disposition;
    public String firebaseRecordingUrl; // Store the URL after upload
    
    public boolean isSynced; // Overall status
    public boolean crmSynced; // Recording/API upload status
    public boolean firebaseSynced; // Metadata sync status

    public CallLogEntity(String type, String number, long durationSeconds, long timestamp, String simSlot, String recordingPath, String interactionId) {
        this.type = type;
        this.number = number;
        this.durationSeconds = durationSeconds;
        this.timestamp = timestamp;
        this.simSlot = simSlot;
        this.recordingPath = recordingPath;
        this.interactionId = interactionId;
        this.isSynced = false;
        this.crmSynced = false;
        this.firebaseSynced = false;
        this.disposition = "";
        this.firebaseRecordingUrl = null;
    }
}
