package com.snapforge.preview

import android.annotation.SuppressLint
import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AndroidBridge(private val onComplete: () -> Unit) {
    @JavascriptInterface
    fun onRenderComplete() {
        onComplete()
    }
}

/**
 * P4.7: Offline Sandboxed WebView for structural TSX preview
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun PreviewWebView(
    layoutJson: String,
    indexSfx: String,
    onRenderComplete: () -> Unit
) {
    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var isLoaded by remember { mutableStateOf(false) }
    
    // Effect to push layout data when it changes and page is loaded
    LaunchedEffect(layoutJson, indexSfx, webViewRef, isLoaded) {
        val wv = webViewRef
        if (wv != null && isLoaded && layoutJson.isNotEmpty()) {
            withContext(Dispatchers.Main) {
                // Escape JSON strings to safely inject into JS evaluation
                val safeJson = layoutJson.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
                val safeIndex = indexSfx.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
                
                val script = "onForgeComplete(\"$safeJson\", \"$safeIndex\");"
                wv.evaluateJavascript(script, null)
            }
        }
    }

    AndroidView(
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                
                // Dossier: Offline sandbox enforcement
                settings.blockNetworkImage = true
                settings.blockNetworkLoads = true
                
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        isLoaded = true
                    }
                }
                webChromeClient = WebChromeClient()
                
                addJavascriptInterface(AndroidBridge(onRenderComplete), "AndroidBridge")
                
                loadUrl("file:///android_asset/preview.html")
                
                webViewRef = this
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}
