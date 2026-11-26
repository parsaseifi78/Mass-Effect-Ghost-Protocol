.class Lcom/ghost/protocol/MainActivity$1;
.super Landroid/webkit/WebViewClient;
.source "MainActivity.java"

# instance fields
.field final synthetic this$0:Lcom/ghost/protocol/MainActivity;

# direct methods
.method constructor <init>(Lcom/ghost/protocol/MainActivity;)V
    .locals 0

    iput-object p1, p0, Lcom/ghost/protocol/MainActivity$1;->this$0:Lcom/ghost/protocol/MainActivity;

    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V

    return-void
.end method


# virtual methods
.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z
    .locals 3

    const-string v0, "ghost://hotspot"

    invoke-virtual {p2, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_hotspot

    new-instance v0, Landroid/content/Intent;

    const-string v1, "android.settings.TETHER_SETTINGS"

    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    iget-object v1, p0, Lcom/ghost/protocol/MainActivity$1;->this$0:Lcom/ghost/protocol/MainActivity;

    invoke-virtual {v1, v0}, Lcom/ghost/protocol/MainActivity;->startActivity(Landroid/content/Intent;)V

    const/4 v0, 0x1

    return v0

    :cond_hotspot
    const-string v0, "ghost://wifi"

    invoke-virtual {p2, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_0

    new-instance v0, Landroid/content/Intent;

    const-string v1, "android.settings.WIFI_SETTINGS"

    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    iget-object v1, p0, Lcom/ghost/protocol/MainActivity$1;->this$0:Lcom/ghost/protocol/MainActivity;

    invoke-virtual {v1, v0}, Lcom/ghost/protocol/MainActivity;->startActivity(Landroid/content/Intent;)V

    const/4 v0, 0x1

    return v0

    :cond_0
    invoke-super {p0, p1, p2}, Landroid/webkit/WebViewClient;->shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z

    move-result v0

    return v0
.end method
