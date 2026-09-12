package io.github.xiaolexldw.todomoe.glass

import android.content.Context
import android.os.Build
import android.view.View
import android.view.ViewTreeObserver
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher

data class LiquidTabBarProps(
  val labels: List<String> = listOf("今天", "清单", "收件箱"),
  val selectedIndex: Int = 0, val selectionRevision: Int = 0,
  val dark: Boolean = false, val accentColor: String = "#625BD3",
  val surfaceColor: String = "#FFFFFF", val contentColor: String = "#667085",
  val mode: String = "off", val reducedMotion: Boolean = false, val samplingEnabled: Boolean = true,
)

/** RN owns only this 64dp frame. Compose owns the bar, copies, gestures and optics. */
class MoeLiquidTabBarView(context: Context, appContext: AppContext) : ExpoView(context, appContext), GlassSourceExcluded {
  val onSelect by EventDispatcher()
  internal var props by mutableStateOf(LiquidTabBarProps())
    private set
  internal var activeWindow by mutableStateOf(true)
    private set
  private var source: Any? = null
  private val compose = ComposeView(context).apply {
    clipChildren = false
    clipToPadding = false
    setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
    setContent { LiquidTabBarContent(this@MoeLiquidTabBarView) }
  }
  private val preDraw = ViewTreeObserver.OnPreDrawListener {
    if (Build.VERSION.SDK_INT >= 33) backdrop().updateSources()
    true
  }
  init {
    clipChildren = false
    clipToPadding = false
    addView(compose, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  fun update(block: LiquidTabBarProps.() -> LiquidTabBarProps) {
    val old = props
    props = old.block()
    if (Build.VERSION.SDK_INT >= 33 && source != null) {
      val backdrop = source as HardwareComposeBackdrop
      if (old.mode != props.mode) backdrop.resetFailure()
      if (old.dark != props.dark || old.surfaceColor != props.surfaceColor) backdrop.invalidateSource()
      backdrop.updateSources()
    }
  }

  internal fun fullEffects() = Build.VERSION.SDK_INT >= 33 && isHardwareAccelerated &&
    props.mode != "off" && !props.reducedMotion
  internal fun maySample() = fullEffects() && props.samplingEnabled && isAttachedToWindow &&
    isShown && windowVisibility == View.VISIBLE
  internal fun backdrop(): HardwareComposeBackdrop = (source as? HardwareComposeBackdrop)
    ?: HardwareComposeBackdrop(this).also { source = it }
  internal fun roots(): List<View> {
    val own = rootView
    val activity = appContext.currentActivity?.window?.decorView
    return if (activity != null && activity !== own && activity.isAttachedToWindow) listOf(activity, own) else listOf(own)
  }
  internal fun select(index: Int) {
    if (index !in props.labels.indices || !isAttachedToWindow || !isShown || !props.samplingEnabled) return
    onSelect(mapOf("index" to index))
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    (appContext.currentActivity as? LifecycleOwner)?.let { compose.setViewTreeLifecycleOwner(it) }
    (appContext.currentActivity as? SavedStateRegistryOwner)?.let { compose.setViewTreeSavedStateRegistryOwner(it) }
    if (Build.VERSION.SDK_INT >= 31) HardwareBackdropScene.markGlassAncestors(this)
    viewTreeObserver.addOnPreDrawListener(preDraw)
    // Fabric measures native views before attaching them. Compose's measure
    // creates its composition and needs the window recomposer. The posted pass
    // runs after our child's attach dispatch, without relying on RN to honor a
    // child requestLayout for the already measured Yoga frame.
    post {
      if (compose.isAttachedToWindow) layoutCompose(width, height)
    }
  }
  override fun onDetachedFromWindow() {
    if (viewTreeObserver.isAlive) viewTreeObserver.removeOnPreDrawListener(preDraw)
    if (Build.VERSION.SDK_INT >= 33) (source as? HardwareComposeBackdrop)?.release()
    source = null
    super.onDetachedFromWindow()
  }
  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    activeWindow = visibility == View.VISIBLE
    if (Build.VERSION.SDK_INT >= 33 && source != null) {
      if (visibility != View.VISIBLE) (source as HardwareComposeBackdrop).release()
      else (source as HardwareComposeBackdrop).updateSources()
    }
  }
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val width = MeasureSpec.getSize(widthMeasureSpec)
    val height = MeasureSpec.getSize(heightMeasureSpec)
    setMeasuredDimension(width, height)
    if (compose.isAttachedToWindow) {
      compose.measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
    }
  }
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    if (compose.isAttachedToWindow) layoutCompose(right - left, bottom - top)
  }
  private fun layoutCompose(width: Int, height: Int) {
    compose.measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
    compose.layout(0, 0, width, height)
  }
}
