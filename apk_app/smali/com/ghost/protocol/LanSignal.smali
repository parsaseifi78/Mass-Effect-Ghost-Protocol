.class public Lcom/ghost/protocol/LanSignal;
.super Ljava/lang/Object;
.source "LanSignal.java"
.implements Ljava/lang/Runnable;

# static fields
.field public static volatile running:Z
.field public static serverSocket:Ljava/net/ServerSocket;


# direct methods
.method static constructor <clinit>()V
    .locals 1
    const/4 v0, 0x0
    sput-boolean v0, Lcom/ghost/protocol/LanSignal;->running:Z
    return-void
.end method

.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    return-void
.end method

.method public static stopServer()V
    .locals 1
    const/4 v0, 0x0
    sput-boolean v0, Lcom/ghost/protocol/LanSignal;->running:Z
    sget-object v0, Lcom/ghost/protocol/LanSignal;->serverSocket:Ljava/net/ServerSocket;
    if-eqz v0, :cond_0
    :try_start_0
    invoke-virtual {v0}, Ljava/net/ServerSocket;->close()V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0
    :catch_0
    :cond_0
    return-void
.end method

.method private static readAll(Ljava/io/InputStream;)Ljava/lang/String;
    .locals 6
    .annotation system Ldalvik/annotation/Throws;
        value = { Ljava/lang/Exception; }
    .end annotation
    new-instance v0, Ljava/io/ByteArrayOutputStream;
    invoke-direct {v0}, Ljava/io/ByteArrayOutputStream;-><init>()V
    const/16 v1, 0x400
    new-array v1, v1, [B
    const/4 v2, 0x0
    :cond_0
    const/4 v3, 0x0
    const/16 v4, 0x400
    invoke-virtual {p0, v1, v3, v4}, Ljava/io/InputStream;->read([BII)I
    move-result v4
    const/4 v5, -0x1
    if-eq v4, v5, :cond_1
    invoke-virtual {v0, v1, v3, v4}, Ljava/io/ByteArrayOutputStream;->write([BII)V
    add-int/2addr v2, v4
    const v3, 0x10000
    if-ge v2, v3, :cond_1
    invoke-virtual {p0}, Ljava/io/InputStream;->available()I
    move-result v3
    if-gtz v3, :cond_0
    :cond_1
    const-string v3, "UTF-8"
    invoke-virtual {v0, v3}, Ljava/io/ByteArrayOutputStream;->toString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v3
    return-object v3
.end method

.method private static send(Ljava/io/OutputStream;Ljava/lang/String;Ljava/lang/String;)V
    .locals 4
    .annotation system Ldalvik/annotation/Throws;
        value = { Ljava/lang/Exception; }
    .end annotation
    new-instance v0, Ljava/lang/StringBuilder;
    invoke-direct {v0}, Ljava/lang/StringBuilder;-><init>()V
    const-string v1, "HTTP/1.1 200 OK\r\nContent-Type: "
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v1, "\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET,POST,OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nCache-Control: no-cache\r\nConnection: close\r\nContent-Length: "
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v1, "UTF-8"
    invoke-virtual {p2, v1}, Ljava/lang/String;->getBytes(Ljava/lang/String;)[B
    move-result-object v1
    array-length v2, v1
    invoke-virtual {v0, v2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;
    const-string v2, "\r\n\r\n"
    invoke-virtual {v0, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v2
    const-string v3, "UTF-8"
    invoke-virtual {v2, v3}, Ljava/lang/String;->getBytes(Ljava/lang/String;)[B
    move-result-object v2
    invoke-virtual {p0, v2}, Ljava/io/OutputStream;->write([B)V
    invoke-virtual {p0, v1}, Ljava/io/OutputStream;->write([B)V
    invoke-virtual {p0}, Ljava/io/OutputStream;->flush()V
    return-void
.end method

.method private static body(Ljava/lang/String;)Ljava/lang/String;
    .locals 3
    const-string v0, "\r\n\r\n"
    invoke-virtual {p0, v0}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I
    move-result v0
    const/4 v1, -0x1
    if-ne v0, v1, :cond_0
    const-string v1, ""
    return-object v1
    :cond_0
    add-int/lit8 v0, v0, 0x4
    invoke-virtual {p0, v0}, Ljava/lang/String;->substring(I)Ljava/lang/String;
    move-result-object v1
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;
    move-result-object v1
    return-object v1
.end method

.method private static getOfferBySlot(I)Ljava/lang/String;
    .locals 1
    if-nez p0, :cond_0
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer:Ljava/lang/String;
    return-object v0
    :cond_0
    const/4 v0, 0x1
    if-ne p0, v0, :cond_1
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer1:Ljava/lang/String;
    return-object v0
    :cond_1
    const/4 v0, 0x2
    if-ne p0, v0, :cond_2
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer2:Ljava/lang/String;
    return-object v0
    :cond_2
    const/4 v0, 0x3
    if-ne p0, v0, :cond_3
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer3:Ljava/lang/String;
    return-object v0
    :cond_3
    const/4 v0, 0x4
    if-ne p0, v0, :cond_4
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer4:Ljava/lang/String;
    return-object v0
    :cond_4
    const/4 v0, 0x5
    if-ne p0, v0, :cond_5
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer5:Ljava/lang/String;
    return-object v0
    :cond_5
    const/4 v0, 0x6
    if-ne p0, v0, :cond_6
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer6:Ljava/lang/String;
    return-object v0
    :cond_6
    const/4 v0, 0x7
    if-ne p0, v0, :cond_7
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostOffer7:Ljava/lang/String;
    return-object v0
    :cond_7
    const-string v0, ""
    return-object v0
.end method

.method private static getAnswerBySlot(I)Ljava/lang/String;
    .locals 1
    if-nez p0, :cond_0
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer:Ljava/lang/String;
    return-object v0
    :cond_0
    const/4 v0, 0x1
    if-ne p0, v0, :cond_1
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer1:Ljava/lang/String;
    return-object v0
    :cond_1
    const/4 v0, 0x2
    if-ne p0, v0, :cond_2
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer2:Ljava/lang/String;
    return-object v0
    :cond_2
    const/4 v0, 0x3
    if-ne p0, v0, :cond_3
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer3:Ljava/lang/String;
    return-object v0
    :cond_3
    const/4 v0, 0x4
    if-ne p0, v0, :cond_4
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer4:Ljava/lang/String;
    return-object v0
    :cond_4
    const/4 v0, 0x5
    if-ne p0, v0, :cond_5
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer5:Ljava/lang/String;
    return-object v0
    :cond_5
    const/4 v0, 0x6
    if-ne p0, v0, :cond_6
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer6:Ljava/lang/String;
    return-object v0
    :cond_6
    const/4 v0, 0x7
    if-ne p0, v0, :cond_7
    sget-object v0, Lcom/ghost/protocol/LanBridge;->hostAnswer7:Ljava/lang/String;
    return-object v0
    :cond_7
    const-string v0, ""
    return-object v0
.end method

.method private static setOfferBySlot(ILjava/lang/String;)V
    .locals 1
    if-nez p0, :cond_0
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostOffer:Ljava/lang/String;
    return-void
    :cond_0
    const/4 v0, 0x1
    if-ne p0, v0, :cond_1
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostOffer1:Ljava/lang/String;
    return-void
    :cond_1
    const/4 v0, 0x2
    if-ne p0, v0, :cond_2
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostOffer2:Ljava/lang/String;
    return-void
    :cond_2
    const/4 v0, 0x3
    if-ne p0, v0, :cond_3
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostOffer3:Ljava/lang/String;
    return-void
    :cond_3
    const/4 v0, 0x4
    if-ne p0, v0, :cond_4
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostOffer4:Ljava/lang/String;
    return-void
    :cond_4
    const/4 v0, 0x5
    if-ne p0, v0, :cond_5
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostOffer5:Ljava/lang/String;
    return-void
    :cond_5
    const/4 v0, 0x6
    if-ne p0, v0, :cond_6
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostOffer6:Ljava/lang/String;
    return-void
    :cond_6
    const/4 v0, 0x7
    if-ne p0, v0, :cond_7
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostOffer7:Ljava/lang/String;
    return-void
    :cond_7
    return-void
.end method

.method private static setAnswerBySlot(ILjava/lang/String;)V
    .locals 1
    if-nez p0, :cond_0
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostAnswer:Ljava/lang/String;
    return-void
    :cond_0
    const/4 v0, 0x1
    if-ne p0, v0, :cond_1
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostAnswer1:Ljava/lang/String;
    return-void
    :cond_1
    const/4 v0, 0x2
    if-ne p0, v0, :cond_2
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostAnswer2:Ljava/lang/String;
    return-void
    :cond_2
    const/4 v0, 0x3
    if-ne p0, v0, :cond_3
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostAnswer3:Ljava/lang/String;
    return-void
    :cond_3
    const/4 v0, 0x4
    if-ne p0, v0, :cond_4
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostAnswer4:Ljava/lang/String;
    return-void
    :cond_4
    const/4 v0, 0x5
    if-ne p0, v0, :cond_5
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostAnswer5:Ljava/lang/String;
    return-void
    :cond_5
    const/4 v0, 0x6
    if-ne p0, v0, :cond_6
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostAnswer6:Ljava/lang/String;
    return-void
    :cond_6
    const/4 v0, 0x7
    if-ne p0, v0, :cond_7
    sput-object p1, Lcom/ghost/protocol/LanBridge;->hostAnswer7:Ljava/lang/String;
    return-void
    :cond_7
    return-void
.end method

.method private static parseSlot(Ljava/lang/String;Ljava/lang/String;)I
    .locals 4
    # returns slot number if path starts with prefix+digit, else -1; slot 0 for plain prefix
    invoke-virtual {p0, p1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-nez v0, :cond_no
    const/4 v0, -0x1
    return v0
    :cond_no
    invoke-virtual {p1}, Ljava/lang/String;->length()I
    move-result v1
    invoke-virtual {p0}, Ljava/lang/String;->length()I
    move-result v2
    if-le v2, v1, :cond_plain
    invoke-virtual {p0, v1}, Ljava/lang/String;->charAt(I)C
    move-result v3
    const/16 v0, 0x30
    if-lt v3, v0, :cond_plain
    const/16 v0, 0x37
    if-le v3, v0, :cond_digit
    :cond_plain
    const/4 v0, 0x0
    return v0
    :cond_digit
    add-int/lit8 v3, v3, -0x30
    return v3
.end method

.method private static handle(Ljava/lang/String;)Ljava/lang/String;
    .locals 4
    const-string v0, "GET /status"
    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_status
    sget-object v0, Lcom/ghost/protocol/LanBridge;->status:Ljava/lang/String;
    return-object v0

    :cond_status
    const-string v0, "OPTIONS"
    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_opt
    const-string v0, "ok"
    return-object v0

    :cond_opt
    # GET /offer[slot]
    const-string v1, "GET /offer"
    invoke-virtual {p0, v1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_go
    invoke-static {p0, v1}, Lcom/ghost/protocol/LanSignal;->parseSlot(Ljava/lang/String;Ljava/lang/String;)I
    move-result v2
    if-ltz v2, :cond_go
    invoke-static {v2}, Lcom/ghost/protocol/LanSignal;->getOfferBySlot(I)Ljava/lang/String;
    move-result-object v0
    return-object v0

    :cond_go
    # GET /answer[slot]
    const-string v1, "GET /answer"
    invoke-virtual {p0, v1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_ga
    invoke-static {p0, v1}, Lcom/ghost/protocol/LanSignal;->parseSlot(Ljava/lang/String;Ljava/lang/String;)I
    move-result v2
    if-ltz v2, :cond_ga
    invoke-static {v2}, Lcom/ghost/protocol/LanSignal;->getAnswerBySlot(I)Ljava/lang/String;
    move-result-object v0
    return-object v0

    :cond_ga
    # POST /offer[slot]
    const-string v1, "POST /offer"
    invoke-virtual {p0, v1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_po
    invoke-static {p0, v1}, Lcom/ghost/protocol/LanSignal;->parseSlot(Ljava/lang/String;Ljava/lang/String;)I
    move-result v2
    if-ltz v2, :cond_po
    invoke-static {p0}, Lcom/ghost/protocol/LanSignal;->body(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v3
    invoke-static {v2, v3}, Lcom/ghost/protocol/LanSignal;->setOfferBySlot(ILjava/lang/String;)V
    const-string v0, "ok"
    return-object v0

    :cond_po
    # POST /answer[slot]
    const-string v1, "POST /answer"
    invoke-virtual {p0, v1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_pa
    invoke-static {p0, v1}, Lcom/ghost/protocol/LanSignal;->parseSlot(Ljava/lang/String;Ljava/lang/String;)I
    move-result v2
    if-ltz v2, :cond_pa
    invoke-static {p0}, Lcom/ghost/protocol/LanSignal;->body(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v3
    invoke-static {v2, v3}, Lcom/ghost/protocol/LanSignal;->setAnswerBySlot(ILjava/lang/String;)V
    const-string v0, "ok"
    return-object v0

    :cond_pa
    const-string v0, ""
    return-object v0
.end method


# virtual methods
.method public run()V
    .locals 7
    const/4 v0, 0x1
    sput-boolean v0, Lcom/ghost/protocol/LanSignal;->running:Z
    :try_start_0
    new-instance v1, Ljava/net/ServerSocket;
    const/16 v2, 0x2235
    invoke-direct {v1, v2}, Ljava/net/ServerSocket;-><init>(I)V
    sput-object v1, Lcom/ghost/protocol/LanSignal;->serverSocket:Ljava/net/ServerSocket;
    const-string v2, "listening"
    sput-object v2, Lcom/ghost/protocol/LanBridge;->status:Ljava/lang/String;
    :goto_0
    sget-boolean v2, Lcom/ghost/protocol/LanSignal;->running:Z
    if-eqz v2, :cond_1
    :try_start_1
    sget-object v2, Lcom/ghost/protocol/LanSignal;->serverSocket:Ljava/net/ServerSocket;
    invoke-virtual {v2}, Ljava/net/ServerSocket;->accept()Ljava/net/Socket;
    move-result-object v2
    :try_start_2
    invoke-virtual {v2}, Ljava/net/Socket;->getInputStream()Ljava/io/InputStream;
    move-result-object v3
    invoke-static {v3}, Lcom/ghost/protocol/LanSignal;->readAll(Ljava/io/InputStream;)Ljava/lang/String;
    move-result-object v3
    invoke-static {v3}, Lcom/ghost/protocol/LanSignal;->handle(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v4
    invoke-virtual {v2}, Ljava/net/Socket;->getOutputStream()Ljava/io/OutputStream;
    move-result-object v5
    const-string v6, "text/plain; charset=utf-8"
    invoke-static {v5, v6, v4}, Lcom/ghost/protocol/LanSignal;->send(Ljava/io/OutputStream;Ljava/lang/String;Ljava/lang/String;)V
    :try_end_2
    .catch Ljava/lang/Exception; {:try_start_2 .. :try_end_2} :catch_1
    :try_start_3
    invoke-virtual {v2}, Ljava/net/Socket;->close()V
    :try_end_3
    .catch Ljava/lang/Exception; {:try_start_3 .. :try_end_3} :catch_0
    :catch_0
    goto :goto_0
    :catch_1
    move-exception v3
    :try_start_4
    invoke-virtual {v2}, Ljava/net/Socket;->close()V
    :try_end_4
    .catch Ljava/lang/Exception; {:try_start_4 .. :try_end_4} :catch_2
    :catch_2
    goto :goto_0
    :try_end_1
    .catch Ljava/lang/Exception; {:try_start_1 .. :try_end_1} :catch_3
    :catch_3
    move-exception v2
    sget-boolean v3, Lcom/ghost/protocol/LanSignal;->running:Z
    if-eqz v3, :cond_0
    goto :goto_0
    :cond_0
    :cond_1
    :try_start_5
    sget-object v1, Lcom/ghost/protocol/LanSignal;->serverSocket:Ljava/net/ServerSocket;
    if-eqz v1, :cond_2
    invoke-virtual {v1}, Ljava/net/ServerSocket;->close()V
    :try_end_5
    .catch Ljava/lang/Exception; {:try_start_5 .. :try_end_5} :catch_4
    :catch_4
    :cond_2
    const-string v1, "stopped"
    sput-object v1, Lcom/ghost/protocol/LanBridge;->status:Ljava/lang/String;
    return-void
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_5
    :catch_5
    move-exception v1
    const-string v2, "error"
    sput-object v2, Lcom/ghost/protocol/LanBridge;->status:Ljava/lang/String;
    const/4 v2, 0x0
    sput-boolean v2, Lcom/ghost/protocol/LanSignal;->running:Z
    return-void
.end method
