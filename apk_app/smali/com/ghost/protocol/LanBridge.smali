.class public Lcom/ghost/protocol/LanBridge;
.super Ljava/lang/Object;
.source "LanBridge.java"


# static fields
.field public static hostOffer:Ljava/lang/String;
.field public static hostAnswer:Ljava/lang/String;
.field public static hostOffer1:Ljava/lang/String;
.field public static hostAnswer1:Ljava/lang/String;
.field public static hostOffer2:Ljava/lang/String;
.field public static hostAnswer2:Ljava/lang/String;
.field public static hostOffer3:Ljava/lang/String;
.field public static hostAnswer3:Ljava/lang/String;
.field public static hostOffer4:Ljava/lang/String;
.field public static hostAnswer4:Ljava/lang/String;
.field public static hostOffer5:Ljava/lang/String;
.field public static hostAnswer5:Ljava/lang/String;
.field public static hostOffer6:Ljava/lang/String;
.field public static hostAnswer6:Ljava/lang/String;
.field public static hostOffer7:Ljava/lang/String;
.field public static hostAnswer7:Ljava/lang/String;
.field public static clientOffer:Ljava/lang/String;
.field public static clientAnswer:Ljava/lang/String;
.field public static status:Ljava/lang/String;
.field public static server:Ljava/lang/Thread;


# direct methods
.method static constructor <clinit>()V
    .locals 1
    const-string v0, ""
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer1:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer1:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer2:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer2:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer3:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer3:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer4:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer4:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer5:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer5:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer6:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer6:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer7:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer7:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->clientOffer:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->clientAnswer:Ljava/lang/String;
    const-string v0, "idle"
    sput-object v0, Lcom/ghost/protocol/LanBridge;->status:Ljava/lang/String;
    return-void
.end method

.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    return-void
.end method


# virtual methods
.method public clear()V
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    const-string v0, ""
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer1:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer1:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer2:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer2:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer3:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer3:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer4:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer4:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer5:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer5:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer6:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer6:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer7:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer7:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->clientOffer:Ljava/lang/String;
    sput-object v0, Lcom/ghost/protocol/LanBridge;->clientAnswer:Ljava/lang/String;
    const-string v0, "idle"
    sput-object v0, Lcom/ghost/protocol/LanBridge;->status:Ljava/lang/String;
    return-void
.end method

.method public getHostAnswerSlot(I)Ljava/lang/String;
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    if-nez p1, :c1
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer:Ljava/lang/String;
    return-object v0
    :c1
    const/4 v0, 0x1
    if-ne p1, v0, :c2
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer1:Ljava/lang/String;
    return-object v0
    :c2
    const/4 v0, 0x2
    if-ne p1, v0, :c3
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer2:Ljava/lang/String;
    return-object v0
    :c3
    const/4 v0, 0x3
    if-ne p1, v0, :c4
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer3:Ljava/lang/String;
    return-object v0
    :c4
    const/4 v0, 0x4
    if-ne p1, v0, :c5
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer4:Ljava/lang/String;
    return-object v0
    :c5
    const/4 v0, 0x5
    if-ne p1, v0, :c6
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer5:Ljava/lang/String;
    return-object v0
    :c6
    const/4 v0, 0x6
    if-ne p1, v0, :c7
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer6:Ljava/lang/String;
    return-object v0
    :c7
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer7:Ljava/lang/String;
    return-object v0
.end method

.method public setHostOfferSlot(ILjava/lang/String;)V
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    if-nez p2, :c0
    const-string p2, ""
    :c0
    if-nez p1, :c1
    sput-object p2, Lcom/ghost/protocol/LanBridge;->hostOffer:Ljava/lang/String;
    return-void
    :c1
    const/4 v0, 0x1
    if-ne p1, v0, :c2
    sput-object p2, Lcom/ghost/protocol/LanBridge;->hostOffer1:Ljava/lang/String;
    return-void
    :c2
    const/4 v0, 0x2
    if-ne p1, v0, :c3
    sput-object p2, Lcom/ghost/protocol/LanBridge;->hostOffer2:Ljava/lang/String;
    return-void
    :c3
    const/4 v0, 0x3
    if-ne p1, v0, :c4
    sput-object p2, Lcom/ghost/protocol/LanBridge;->hostOffer3:Ljava/lang/String;
    return-void
    :c4
    const/4 v0, 0x4
    if-ne p1, v0, :c5
    sput-object p2, Lcom/ghost/protocol/LanBridge;->hostOffer4:Ljava/lang/String;
    return-void
    :c5
    const/4 v0, 0x5
    if-ne p1, v0, :c6
    sput-object p2, Lcom/ghost/protocol/LanBridge;->hostOffer5:Ljava/lang/String;
    return-void
    :c6
    const/4 v0, 0x6
    if-ne p1, v0, :c7
    sput-object p2, Lcom/ghost/protocol/LanBridge;->hostOffer6:Ljava/lang/String;
    return-void
    :c7
    sput-object p2, Lcom/ghost/protocol/LanBridge;->hostOffer7:Ljava/lang/String;
    return-void
.end method

.method public getHostAnswer()Ljava/lang/String;
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer:Ljava/lang/String;
    return-object v0
.end method

.method public getHostOffer()Ljava/lang/String;
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer:Ljava/lang/String;
    return-object v0
.end method

.method public getStatus()Ljava/lang/String;
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    sget-object v0, Lcom/ghost/protocol/LanBridge;->status:Ljava/lang/String;
    return-object v0
.end method

.method public setHostAnswer(Ljava/lang/String;)V
    .locals 0
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    if-nez p1, :cond_0
    const-string p1, ""
    :cond_0
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostAnswer:Ljava/lang/String;
    return-void
.end method

.method public setHostOffer(Ljava/lang/String;)V
    .locals 0
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    if-nez p1, :cond_0
    const-string p1, ""
    :cond_0
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostOffer:Ljava/lang/String;
    return-void
.end method

.method public startHost()V
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    sget-object v0, Lcom/ghost/protocol/LanBridge;->server:Ljava/lang/Thread;
    if-eqz v0, :cond_0
    return-void
    :cond_0
    const-string v0, "starting"
    sput-object v0, Lcom/ghost/protocol/LanBridge;->status:Ljava/lang/String;
    new-instance v0, Ljava/lang/Thread;
    new-instance v1, Lcom/ghost/protocol/LanSignal;
    invoke-direct {v1}, Lcom/ghost/protocol/LanSignal;-><init>()V
    invoke-direct {v0, v1}, Ljava/lang/Thread;-><init>(Ljava/lang/Runnable;)V
    sput-object v0, Lcom/ghost/protocol/LanBridge;->server:Ljava/lang/Thread;
    invoke-virtual {v0}, Ljava/lang/Thread;->start()V
    return-void
.end method

.method public stopHost()V
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    invoke-static {}, Lcom/ghost/protocol/LanSignal;->stopServer()V
    const/4 v0, 0x0
    sput-object v0, Lcom/ghost/protocol/LanBridge;->server:Ljava/lang/Thread;
    const-string v0, "stopped"
    sput-object v0, Lcom/ghost/protocol/LanBridge;->status:Ljava/lang/String;
    return-void
.end method
