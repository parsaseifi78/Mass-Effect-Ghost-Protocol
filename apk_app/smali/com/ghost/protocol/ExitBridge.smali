.class public Lcom/ghost/protocol/ExitBridge;
.super Ljava/lang/Object;
.source "ExitBridge.java"


# instance fields
.field private mActivity:Landroid/app/Activity;


# direct methods
.method public constructor <init>(Landroid/app/Activity;)V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ghost/protocol/ExitBridge;->mActivity:Landroid/app/Activity;

    return-void
.end method


# virtual methods
.method public exit()V
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    iget-object v0, p0, Lcom/ghost/protocol/ExitBridge;->mActivity:Landroid/app/Activity;

    invoke-virtual {v0}, Landroid/app/Activity;->finish()V

    # Force the whole app process down as well; finish() alone can leave the
    # process cached after the activity closes.
    invoke-static {}, Landroid/os/Process;->myPid()I

    move-result v0

    invoke-static {v0}, Landroid/os/Process;->killProcess(I)V

    const/4 v0, 0x0

    invoke-static {v0}, Ljava/lang/System;->exit(I)V

    return-void
.end method
