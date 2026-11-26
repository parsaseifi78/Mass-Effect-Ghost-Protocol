package com.ghost.protocol;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

/** Opens external links in the phone's browser instead of inside the WebView. */
public class UrlBridge {
    private final Activity mActivity;

    public UrlBridge(Activity activity) {
        mActivity = activity;
    }

    @android.webkit.JavascriptInterface
    public void open(String url) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        mActivity.startActivity(intent);
    }
}
