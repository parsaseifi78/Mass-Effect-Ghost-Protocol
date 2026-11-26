.class public Lcom/ghost/protocol/DisplayBridge;
.super Ljava/lang/Object;
.source "DisplayBridge.java"
.implements Landroid/view/Choreographer$FrameCallback;


# instance fields
.field private mChoreographer:Landroid/view/Choreographer;
.field private mModeRate:F
.field private mWebView:Landroid/webkit/WebView;


# direct methods
.method public constructor <init>(Landroid/webkit/WebView;)V
    .locals 1

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ghost/protocol/DisplayBridge;->mWebView:Landroid/webkit/WebView;

    invoke-static {}, Landroid/view/Choreographer;->getInstance()Landroid/view/Choreographer;

    move-result-object v0

    iput-object v0, p0, Lcom/ghost/protocol/DisplayBridge;->mChoreographer:Landroid/view/Choreographer;

    invoke-direct {p0}, Lcom/ghost/protocol/DisplayBridge;->readModeRate()V

    invoke-direct {p0}, Lcom/ghost/protocol/DisplayBridge;->schedule()V

    return-void
.end method

.method private readModeRate()V
    .locals 3

    const/high16 v0, 0x42700000    # 60.0f

    :try_start_0
    iget-object v1, p0, Lcom/ghost/protocol/DisplayBridge;->mWebView:Landroid/webkit/WebView;

    invoke-virtual {v1}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;

    move-result-object v1

    invoke-virtual {v1}, Landroid/content/Context;->getWindowManager()Landroid/view/WindowManager;

    move-result-object v1

    invoke-interface {v1}, Landroid/view/WindowManager;->getDefaultDisplay()Landroid/view/Display;

    move-result-object v1

    invoke-virtual {v1}, Landroid/view/Display;->getRefreshRate()F

    move-result v0
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    :goto_0
    const/high16 v1, 0x43700000    # 240.0f

    cmpl-float v2, v0, v1

    if-lez v2, :cond_0

    move v0, v1

    :cond_0
    iput v0, p0, Lcom/ghost/protocol/DisplayBridge;->mModeRate:F

    return-void

    :catch_0
    const/high16 v0, 0x42700000    # 60.0f

    goto :goto_0
.end method

.method private schedule()V
    .locals 1

    iget-object v0, p0, Lcom/ghost/protocol/DisplayBridge;->mChoreographer:Landroid/view/Choreographer;

    if-nez v0, :cond_0

    return-void

    :cond_0
    iget-object v0, p0, Lcom/ghost/protocol/DisplayBridge;->mChoreographer:Landroid/view/Choreographer;

    invoke-virtual {v0, p0}, Landroid/view/Choreographer;->postFrameCallback(Landroid/view/Choreographer$FrameCallback;)V

    return-void
.end method


# virtual methods
.method public doFrame(J)V
    .locals 3

    # The timestamp is unused: the OS game flag holds the panel at 60 or 120,
    # and Choreographer supplies the VSync tick for the JS render loop.
    iget-object v0, p0, Lcom/ghost/protocol/DisplayBridge;->mChoreographer:Landroid/view/Choreographer;

    if-nez v0, :cond_0

    return-void

    :cond_0
    :try_start_1
    const-string v0, "if(window.GhostFrame)GhostFrame()"

    const/4 v1, 0x0

    iget-object v2, p0, Lcom/ghost/protocol/DisplayBridge;->mWebView:Landroid/webkit/WebView;

    invoke-virtual {v2, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/WebView$ValueCallback;)V
    :try_end_1
    .catch Ljava/lang/Throwable; {:try_start_1 .. :try_end_1} :catch_1

    :goto_1
    invoke-direct {p0}, Lcom/ghost/protocol/DisplayBridge;->schedule()V

    return-void

    :catch_1
    goto :goto_1
.end method

.method public getRefreshRate()F
    .locals 1

    invoke-direct {p0}, Lcom/ghost/protocol/DisplayBridge;->readModeRate()V

    iget v0, p0, Lcom/ghost/protocol/DisplayBridge;->mModeRate:F

    return v0
.end method

.method public isNativeDriven()Z
    .locals 1

    const/4 v0, 0x1

    return v0
.end method

.method public stop()V
    .locals 1

    const/4 v0, 0x0

    iput-object v0, p0, Lcom/ghost/protocol/DisplayBridge;->mChoreographer:Landroid/view/Choreographer;

    return-void
.end method
