.class public Lcom/ghost/protocol/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

# instance fields
.field private displayBridge:Lcom/ghost/protocol/DisplayBridge;

# direct methods
.method public constructor <init>()V
    .locals 0

    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method

# virtual methods
.method public onBackPressed()V
    .locals 0

    # Swallow Back so the game cannot be exited accidentally.
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 4
    .param p1, "savedInstanceState"    # Landroid/os/Bundle;

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    new-instance v0, Landroid/webkit/WebView;

    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;

    move-result-object v1

    const/4 v2, 0x1

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowUniversalAccessFromFileURLs(Z)V

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccessFromFileURLs(Z)V

    const/4 v2, 0x2

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setCacheMode(I)V

    const/4 v2, 0x0

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V

    new-instance v2, Lcom/ghost/protocol/MainActivity$1;

    invoke-direct {v2, p0}, Lcom/ghost/protocol/MainActivity$1;-><init>(Lcom/ghost/protocol/MainActivity;)V

    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    new-instance v2, Lcom/ghost/protocol/LanBridge;

    invoke-direct {v2}, Lcom/ghost/protocol/LanBridge;-><init>()V

    const-string v3, "LanBridge"

    invoke-virtual {v0, v2, v3}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    new-instance v2, Lcom/ghost/protocol/DisplayBridge;

    invoke-direct {v2, v0}, Lcom/ghost/protocol/DisplayBridge;-><init>(Landroid/webkit/WebView;)V

    iput-object v2, p0, Lcom/ghost/protocol/MainActivity;->displayBridge:Lcom/ghost/protocol/DisplayBridge;

    const-string v3, "DisplayBridge"

    invoke-virtual {v0, v2, v3}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    new-instance v2, Lcom/ghost/protocol/ExitBridge;

    invoke-direct {v2, p0}, Lcom/ghost/protocol/ExitBridge;-><init>(Landroid/app/Activity;)V

    const-string v3, "ExitBridge"

    invoke-virtual {v0, v2, v3}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    new-instance v2, Lcom/ghost/protocol/UrlBridge;

    invoke-direct {v2, p0}, Lcom/ghost/protocol/UrlBridge;-><init>(Landroid/app/Activity;)V

    const-string v3, "UrlBridge"

    invoke-virtual {v0, v2, v3}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    const-string v2, "file:///android_asset/index.html"

    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    invoke-virtual {p0, v0}, Lcom/ghost/protocol/MainActivity;->setContentView(Landroid/view/View;)V

    invoke-virtual {p0}, Lcom/ghost/protocol/MainActivity;->hideSystemUI()V

    return-void
.end method

.method public hideSystemUI()V
    .locals 3

    invoke-virtual {p0}, Lcom/ghost/protocol/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0}, Landroid/view/Window;->getDecorView()Landroid/view/View;

    move-result-object v0

    # SYSTEM_UI_FLAG_LAYOUT_STABLE(0x100) | LAYOUT_HIDE_NAVIGATION(0x200) | LAYOUT_FULLSCREEN(0x400)
    # | HIDE_NAVIGATION(0x2) | FULLSCREEN(0x4) | IMMERSIVE_STICKY(0x1000) = 0x1706
    const/16 v1, 0x1706

    invoke-virtual {v0, v1}, Landroid/view/View;->setSystemUiVisibility(I)V

    return-void
.end method

.method public onWindowFocusChanged(Z)V
    .locals 1
    .param p1, "hasFocus"    # Z

    invoke-super {p0, p1}, Landroid/app/Activity;->onWindowFocusChanged(Z)V

    if-eqz p1, :cond_0

    invoke-virtual {p0}, Lcom/ghost/protocol/MainActivity;->hideSystemUI()V

    :cond_0
    return-void
.end method

.method protected onDestroy()V
    .locals 1

    iget-object v0, p0, Lcom/ghost/protocol/MainActivity;->displayBridge:Lcom/ghost/protocol/DisplayBridge;

    if-eqz v0, :skip

    invoke-virtual {v0}, Lcom/ghost/protocol/DisplayBridge;->stop()V

    :skip
    invoke-super {p0}, Landroid/app/Activity;->onDestroy()V

    return-void
.end method
