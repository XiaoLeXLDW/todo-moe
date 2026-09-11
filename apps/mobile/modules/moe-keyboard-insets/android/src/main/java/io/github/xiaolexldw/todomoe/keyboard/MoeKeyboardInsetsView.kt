package io.github.xiaolexldw.todomoe.keyboard

import android.content.Context
import android.graphics.Rect
import android.os.Build
import android.util.Log
import android.view.View
import android.view.ViewTreeObserver
import android.view.WindowInsets
import android.view.WindowManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/** An invisible probe *inside* the RN Modal's window, never the Activity window. */
class MoeKeyboardInsetsView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  val onInsetsChange by EventDispatcher()
  private val hostLocation = IntArray(2)
  private val rootLocation = IntArray(2)
  private val visibleFrame = Rect()
  private var observer: ViewTreeObserver? = null
  private var lastFrame = ""
  private var queued = false
  private val readAfterLayout = Runnable { queued = false; publishInsets() }
  private val globalLayout = ViewTreeObserver.OnGlobalLayoutListener { queueRead() }
  // Observation only: no invalidate(), timer or self-scheduled frame. Insets can
  // change while the edge-to-edge root keeps exactly the same measured size.
  private val preDraw = ViewTreeObserver.OnPreDrawListener { publishInsets(); true }

  init {
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    isClickable = false
    isFocusable = false
    setWillNotDraw(true)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    lastFrame = ""
    observer = rootView.viewTreeObserver.also {
      it.addOnGlobalLayoutListener(globalLayout)
      it.addOnPreDrawListener(preDraw)
    }
    requestApplyInsets()
    queueRead()
  }

  override fun onDetachedFromWindow() {
    observer?.takeIf { it.isAlive }?.let {
      it.removeOnGlobalLayoutListener(globalLayout)
      it.removeOnPreDrawListener(preDraw)
    }
    observer = null
    removeCallbacks(readAfterLayout)
    queued = false
    super.onDetachedFromWindow()
  }

  override fun onApplyWindowInsets(insets: WindowInsets): WindowInsets {
    queueRead()
    return super.onApplyWindowInsets(insets)
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    queueRead()
  }

  private fun queueRead() {
    if (!isAttachedToWindow || queued) return
    queued = true
    post(readAfterLayout)
  }

  private fun publishInsets() {
    try {
      readInsets()
    } catch (error: RuntimeException) {
      // Window teardown or a React event bridge that is not ready must not
      // crash drawing. A subsequent existing layout/pre-draw can retry.
      lastFrame = ""
      if (context.packageName.endsWith(".dev")) Log.i("TodoMoeIme", "[DEBUG-moe-ime-v4] unavailable=${error.javaClass.simpleName}")
    }
  }

  private fun readInsets() {
    if (!isAttachedToWindow || height <= 0 || windowVisibility != View.VISIBLE) return
    val windowRoot = rootView
    val raw = windowRoot.rootWindowInsets ?: return
    val insets = ViewCompat.getRootWindowInsets(windowRoot) ?: return
    val imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())
    val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
    getLocationOnScreen(hostLocation)
    windowRoot.getLocationOnScreen(rootLocation)
    val density = resources.displayMetrics.density

    // getFrame (API 35) is the frame *used to calculate these same insets*,
    // which may differ from a view that has already been resized. On 30-34 use
    // the WindowManager owned by the DecorView's context. Legacy APIs expose
    // their own window's visible frame rather than an Activity keyboard event.
    val source: String
    val frameTop: Int
    val frameHeight: Int
    val keyboardTop: Int
    if (Build.VERSION.SDK_INT >= 35) {
      source = "dialog-insets-frame"
      frameTop = rootLocation[1]
      frameHeight = raw.frame.height
      keyboardTop = frameTop + frameHeight - imeBottom
    } else if (Build.VERSION.SDK_INT >= 30) {
      source = "dialog-window-metrics"
      val manager = windowRoot.context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return
      val frame = manager.currentWindowMetrics.bounds
      frameTop = frame.top
      frameHeight = frame.height()
      keyboardTop = frame.bottom - imeBottom
    } else {
      source = "dialog-visible-frame"
      windowRoot.getWindowVisibleDisplayFrame(visibleFrame)
      frameTop = rootLocation[1]
      frameHeight = windowRoot.height
      keyboardTop = visibleFrame.bottom
    }
    val signature = "$imeVisible:$imeBottom:$frameTop:$frameHeight:$keyboardTop:${hostLocation[1]}:$height:$density"
    if (frameHeight <= 0 || density <= 0f || lastFrame == signature) return
    val frame = mapOf<String, Any>(
      "imeVisible" to imeVisible,
      "imeBottomPx" to imeBottom,
      "keyboardTopPx" to keyboardTop,
      "windowTopPx" to frameTop,
      "windowHeightPx" to frameHeight,
      "hostTopPx" to hostLocation[1],
      "hostHeightPx" to height,
      "density" to density.toDouble(),
      "source" to source,
    )
    // Temporary, numeric-only Dev diagnostics for the vc4 device acceptance.
    if (context.packageName.endsWith(".dev")) Log.i("TodoMoeIme", "[DEBUG-moe-ime-v4] $frame")
    onInsetsChange(frame)
    lastFrame = signature
  }
}
