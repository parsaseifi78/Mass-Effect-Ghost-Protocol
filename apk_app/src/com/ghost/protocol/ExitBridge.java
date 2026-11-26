package com.ghost.protocol;

import android.app.Activity;
import android.os.Process;

/** Hard-exit bridge used by the title-screen Exit button. */
public class ExitBridge {
    private final Activity mActivity;

    public ExitBridge(Activity activity) {
        mActivity = activity;
    }

    @android.webkit.JavascriptInterface
    public void exit() {
        mActivity.finish();
        // finish() closes the activity but can leave the process cached.
        Process.killProcess(Process.myPid());
        System.exit(0);
    }
}
