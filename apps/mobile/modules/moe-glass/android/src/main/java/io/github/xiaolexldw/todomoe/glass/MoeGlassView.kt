package io.github.xiaolexldw.todomoe.glass

import android.annotation.TargetApi
import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.RenderEffect
import android.graphics.RenderNode
import android.graphics.RuntimeShader
import android.graphics.Shader
import android.os.Build
import android.util.Log
import android.view.View
import android.view.ViewTreeObserver
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import kotlin.math.ceil
import kotlin.math.min

/** RN keeps foreground layout/touches. Native samples only during real pre-draw
 * traversals, excludes glass groups, and never owns an animation clock or task. */
class MoeGlassView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  companion object { private var sampling = false }
  private var mode = "off"
  private var dark = false
  private var reducedMotion = false
  private var samplingEnabled = true
  private var cornerRadiusDp = 28f
  private var lens = GlassLensState.Disabled
  private var failed = false
  private var liquidFailed = false
  private var fallbackLogged = false
  private var bitmap: Bitmap? = null
  private var sampleBitmap: Bitmap? = null
  private var sampleCanvas: Canvas? = null
  // Keep newer framework classes out of fields verified on older Android.
  private var effectNode: Any? = null
  private var runtimeShader: Any? = null
  private var effectDirty = true
  private var sampleScale = 1f
  private var samplePadding = 0f
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
  private val bounds = RectF()
  private val clip = Path()
  private val glassToScreen = Matrix()
  private val screenToGlass = Matrix()
  private val sourceToScreen = Matrix()
  private val sourceToGlass = Matrix()
  private val observers = mutableListOf<ViewTreeObserver>()
  private val preDraw = ViewTreeObserver.OnPreDrawListener {
    if (!sampling && canSample()) {
      // Only changed source pixels schedule another traversal. The comparison
      // on that traversal is equal, so a static scene cannot self-invalidate.
      if (captureBackground()) invalidate()
    }
    true
  }

  init {
    setWillNotDraw(false)
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    isClickable = false
    isFocusable = false
  }

  fun setMode(value: String) {
    val next = if (value in setOf("off", "soft", "liquid")) value else "off"
    if (mode == next) return
    mode = next
    failed = false
    liquidFailed = false
    releaseBuffer()
    updateObservers()
    invalidate()
  }
  fun setDark(value: Boolean) {
    if (dark == value) return
    dark = value
    effectDirty = true
    invalidate()
  }
  fun setReducedMotion(value: Boolean) {
    if (reducedMotion == value) return
    reducedMotion = value
    releaseBuffer()
    invalidate()
  }
  fun setCornerRadius(value: Double) {
    val next = if (value.isFinite()) value.coerceIn(0.0, 128.0).toFloat() else 28f
    if (cornerRadiusDp == next) return
    cornerRadiusDp = next
    updateClip()
    effectDirty = true
    invalidate()
  }
  fun setLensState(values: List<Double>) {
    val next = GlassLensState.from(values)
    if (lens == next) return
    lens = next
    effectDirty = true
    // UI-thread animatedProps update only optics. No JS capture or native timer.
    if (mode == "liquid" && !reducedMotion && Build.VERSION.SDK_INT >= 33) invalidate()
  }
  fun setSamplingEnabled(value: Boolean) {
    if (samplingEnabled == value) return
    samplingEnabled = value
    updateObservers()
    // Preserve the final backdrop for keyboard-driven opacity/translation exit.
    invalidate()
  }
  private fun active() = mode != "off" && Build.VERSION.SDK_INT >= 31 && !failed && width > 0 && height > 0
  private fun canSample() = active() && samplingEnabled && isAttachedToWindow && isShown && windowVisibility == View.VISIBLE && isHardwareAccelerated
  private fun noteFallback(reason: String) {
    if (fallbackLogged) return
    fallbackLogged = true
    // Fixed reasons only: never log sampled pixels, task text or app payloads.
    Log.w("MoeGlass", reason)
  }

  /** A dialog root does not contain the Activity behind its window. Composite
   * Activity first, then this dialog's foreground, in a common screen space.
   * Other windows, SurfaceView/video and compositor-only dim layers are excluded. */
  private fun captureRoots(): List<View> {
    val ownRoot = rootView
    val activityRoot = appContext.currentActivity?.window?.decorView
    return if (activityRoot != null && activityRoot !== ownRoot && activityRoot.isAttachedToWindow) {
      listOf(activityRoot, ownRoot)
    } else listOf(ownRoot)
  }
  private fun removeObservers() {
    observers.forEach { if (it.isAlive) it.removeOnPreDrawListener(preDraw) }
    observers.clear()
  }
  private fun updateObservers() {
    removeObservers()
    if (!isAttachedToWindow || !samplingEnabled || mode == "off" || windowVisibility != View.VISIBLE) return
    captureRoots().forEach { root ->
      val observer = root.viewTreeObserver
      if (observers.none { it === observer }) {
        observer.addOnPreDrawListener(preDraw)
        observers.add(observer)
      }
    }
  }

  override fun onAttachedToWindow() { super.onAttachedToWindow(); updateObservers() }
  override fun onDetachedFromWindow() {
    removeObservers()
    releaseBuffer()
    super.onDetachedFromWindow()
  }
  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    if (visibility != View.VISIBLE) releaseBuffer()
    updateObservers()
  }
  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    releaseBuffer()
    updateClip()
    updateObservers()
    invalidate()
  }
  // ExpoView is a LinearLayout, but RN/Yoga owns these child frames.
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) = Unit
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
  }
  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    releaseBuffer()
    updateClip()
  }
  private fun updateClip() {
    bounds.set(0f, 0f, width.toFloat(), height.toFloat())
    clip.reset()
    val radius = min(cornerRadiusDp * resources.displayMetrics.density, min(width, height) / 2f)
    clip.addRoundRect(bounds, radius, radius, Path.Direction.CW)
  }
  private fun releaseBuffer() {
    bitmap?.recycle(); bitmap = null
    sampleBitmap?.recycle(); sampleBitmap = null
    sampleCanvas = null
    if (Build.VERSION.SDK_INT >= 31) (effectNode as? RenderNode)?.discardDisplayList()
    effectNode = null
    runtimeShader = null
    effectDirty = true
  }

  @TargetApi(31)
  private fun captureBackground(): Boolean {
    if (!canSample() || sampling) return false
    try {
      val density = resources.displayMetrics.density
      // Outer 24dp refraction + the moving 14dp lens need samples outside the
      // visible shape. Padding also keeps the 12dp soft blur off the clamp edge.
      val padding = 40f * density
      val paddedWidth = width + padding * 2f
      val paddedHeight = height + padding * 2f
      val scale = min(0.35f, min(768f / paddedWidth, 768f / paddedHeight))
      val bw = ceil(paddedWidth * scale).toInt().coerceAtLeast(1)
      val bh = ceil(paddedHeight * scale).toInt().coerceAtLeast(1)
      if (sampleBitmap?.let { it.width != bw || it.height != bh } == true ||
          bitmap?.let { it.width != bw || it.height != bh } == true) releaseBuffer()
      if (sampleBitmap == null) {
        sampleBitmap = Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888)
        sampleCanvas = Canvas(sampleBitmap!!)
      }
      if (sampleScale != scale || samplePadding != padding) effectDirty = true
      sampleScale = scale
      samplePadding = padding
      glassToScreen.reset()
      transformMatrixToGlobal(glassToScreen)
      if (!glassToScreen.invert(screenToGlass)) return false
      val target = sampleCanvas ?: return false
      val sampled = sampleBitmap ?: return false
      sampled.eraseColor(if (dark) Color.rgb(20, 24, 35) else Color.rgb(248, 247, 253))
      sampling = true
      try {
        captureRoots().filter { it !== this && it.isShown }.forEach { root ->
          sourceToScreen.reset()
          root.transformMatrixToGlobal(sourceToScreen)
          sourceToGlass.setConcat(screenToGlass, sourceToScreen)
          val count = target.save()
          try {
            target.scale(scale, scale)
            target.translate(padding, padding)
            target.concat(sourceToGlass)
            root.draw(target)
          } finally { target.restoreToCount(count) }
        }
      } finally { sampling = false }
      if (bitmap?.sameAs(sampled) == true) return false
      val previous = bitmap
      bitmap = sampled
      sampleBitmap = previous
      sampleCanvas = previous?.let { Canvas(it) }
      return true
    } catch (_: RuntimeException) {
      noteFallback("Backdrop capture failed; using a solid surface.")
      failed = true
      releaseBuffer()
      return true
    } catch (_: OutOfMemoryError) {
      noteFallback("Backdrop allocation failed; using a solid surface.")
      failed = true
      releaseBuffer()
      return true
    }
  }

  override fun draw(canvas: Canvas) { if (!sampling) super.draw(canvas) }
  override fun onDraw(canvas: Canvas) {
    if (sampling) return
    super.onDraw(canvas)
    val count = canvas.save()
    canvas.clipPath(clip)
    var hasGlass = active() && bitmap != null && canvas.isHardwareAccelerated
    if (hasGlass && Build.VERSION.SDK_INT >= 31) {
      try { drawEffect(canvas) } catch (_: RuntimeException) {
        noteFallback("Native render effect failed; using a solid surface.")
        failed = true
        releaseBuffer()
        hasGlass = false
      }
    }
    paint.style = Paint.Style.FILL
    paint.color = when {
      !hasGlass -> if (dark) Color.rgb(27, 30, 44) else Color.rgb(248, 247, 253)
      dark -> Color.argb(96, 22, 26, 40)
      else -> Color.argb(88, 255, 253, 255)
    }
    canvas.drawRect(bounds, paint)
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = resources.displayMetrics.density
    paint.color = if (dark) Color.argb(76, 255, 255, 255) else Color.argb(205, 255, 255, 255)
    canvas.drawPath(clip, paint)
    paint.style = Paint.Style.FILL
    canvas.restoreToCount(count)
  }

  @TargetApi(31)
  private fun drawEffect(canvas: Canvas) {
    val image = bitmap ?: return
    val node = (effectNode as? RenderNode) ?: RenderNode("TodoMoeGlass").also { effectNode = it }
    node.setPosition(0, 0, image.width, image.height)
    if (effectDirty) {
      val liquid = mode == "liquid" && !reducedMotion && !liquidFailed && Build.VERSION.SDK_INT >= 33
      val radius = (if (liquid) 4f else 12f) * resources.displayMetrics.density * sampleScale
      val blur = RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.CLAMP)
      val effect = if (liquid && Build.VERSION.SDK_INT >= 33) {
        try {
          val saturation = ColorMatrix().apply { setSaturation(1.5f) }
          val vibrant = RenderEffect.createColorFilterEffect(ColorMatrixColorFilter(saturation))
          RenderEffect.createChainEffect(liquidEffect(), RenderEffect.createChainEffect(blur, vibrant))
        } catch (_: RuntimeException) {
          liquidFailed = true
          noteFallback("RuntimeShader failed; using the soft blur fallback.")
          val softRadius = 12f * resources.displayMetrics.density * sampleScale
          RenderEffect.createBlurEffect(softRadius, softRadius, Shader.TileMode.CLAMP)
        }
      } else blur
      node.setRenderEffect(effect)
      effectDirty = false
    }
    val recording = node.beginRecording(image.width, image.height)
    paint.color = Color.WHITE
    recording.drawBitmap(image, 0f, 0f, paint)
    node.endRecording()
    val count = canvas.save()
    try {
      canvas.translate(-samplePadding, -samplePadding)
      canvas.scale(1f / sampleScale, 1f / sampleScale)
      canvas.drawRenderNode(node)
    } finally { canvas.restoreToCount(count) }
  }

  @TargetApi(33)
  private fun liquidEffect(): RenderEffect {
    val shader = (runtimeShader as? RuntimeShader) ?: RuntimeShader(GlassLensShader.Source).also { runtimeShader = it }
    val unit = resources.displayMetrics.density * sampleScale
    val sw = width * sampleScale
    val sh = height * sampleScale
    shader.setFloatUniform("size", sw, sh)
    shader.setFloatUniform("padding", samplePadding * sampleScale, samplePadding * sampleScale)
    shader.setFloatUniform("cornerRadius", cornerRadiusDp * unit)
    shader.setFloatUniform("pixel", unit.coerceAtLeast(0.25f))
    shader.setFloatUniform("outerHeight", 24f * unit)
    shader.setFloatUniform("outerAmount", 24f * unit)
    shader.setFloatUniform("lensRect", lens.centerX * sw, lens.centerY * sh, lens.width * sw, lens.height * sh)
    shader.setFloatUniform("lensEnabled", if (lens.enabled) 1f else 0f)
    shader.setFloatUniform("press", lens.press)
    shader.setFloatUniform("velocity", lens.velocityX, lens.velocityY)
    shader.setFloatUniform("lensHeight", 10f * unit)
    shader.setFloatUniform("lensAmount", 14f * unit)
    // RenderEffect/Skia snapshots the builder. Recreate the effect after new
    // uniforms, while keeping the compiled RuntimeShader until size/lifecycle reset.
    return RenderEffect.createRuntimeShaderEffect(shader, "backdrop")
  }
}
