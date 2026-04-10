package com.zentrixcrm.wti;

import android.view.View;
import com.zentrixcrm.wti.firebase.FirebaseService;
import com.zentrixcrm.wti.log.UserLogService;

class HangUpFirebaseClickListener implements View.OnClickListener {

  private final FirebaseService firebaseService;
  private UserLogService userLogService;

  public HangUpFirebaseClickListener(FirebaseService firebaseService, UserLogService userLogService) {
    this.firebaseService = firebaseService;
    this.userLogService = userLogService;
  }

  @Override
  public void onClick(View view) {
    firebaseService.sendNumber(null);
    firebaseService.sendIncomingCall(null);
    firebaseService.sendConnected(false);
    userLogService.log("send hangup");
  }
}
