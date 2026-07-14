package com.zentrixcrm.wti;

import android.telephony.TelephonyManager;
import android.view.View;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.log.UserLogService;

class ConnectFirebaseClickListener implements View.OnClickListener {

  private TelephonyManager telephonyManager;

  private final FirebaseService firebaseService;
  private UserLogService userLogService;

  public ConnectFirebaseClickListener(TelephonyManager telephonyManager, FirebaseService firebaseService, UserLogService userLogService) {
    this.telephonyManager = telephonyManager;
    this.firebaseService = firebaseService;
    this.userLogService = userLogService;
  }

  @Override
  public void onClick(View view) {
    firebaseService.sendConnected(true);
    firebaseService.sendNumber(TelephonyManagerTools.getLine1Number(telephonyManager));
    firebaseService.scheduleSync();
    userLogService.log("send connect & trigger sync");
  }

}
