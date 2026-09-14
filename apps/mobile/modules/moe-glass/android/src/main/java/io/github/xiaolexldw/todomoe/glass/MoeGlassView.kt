package io.github.xiaolexldw.todomoe.glass

import android.annotation.TargetApi
import android.content.Context
import android.content.res.Configuration
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.LinearGradient
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
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/** RN keeps foreground layout/touches. Native samples only during real pre-draw
 * traversals, excludes glass groups, and never owns an animation clock or task. */
class MoeGlassView(context: Context, appContext: AppContext) : ExpoView(context, appContext), GlassSourceExcluded {
  private var mode = "off"
  private var dark = false
  private var reducedMotion = false
  private var samplingEnabled = true
  private var cornerRadiusDp = 28f
  private var surfaceTint = Color.rgb(248, 247, 253)
  private var fallbackSurface = Color.rgb(248, 247, 253)
  private var borderColor = Color.argb(205, 255, 255, 255)
  private var tintOpacity = 0.3f
  private var blurDp = 6f
  private var refractionDp = 30f
  private var thickness = 0.92f
  private var highlight = 0.9f
  private var innerShadow = 0.72f
  private var chromaticEdge = 0.86f
  private var pressResponse = 1f
  private var velocityResponse = 0.9f
  private var lens = GlassLensState.Disabled
  private var failed = false
  private var liquidFailed = false
  private var fallbackLogged = false
  // Keep newer framework classes out of fields verified on older Android.
  private var effectNode: Any? = null
  private val sourceLeases = mutableListOf<Any>()
  private var capturedSources: List<Pair<Long, List<Float>>> = emptyList()
  private var capturedGeometry: List<Float> = emptyList()
  private var runtimeShader: Any? = null
  private var effectDirty = true
  private var sampleScale = 1f
  private var samplePadding = 0f
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
  private val lensRimPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
  private val lensRimBounds = RectF()
  private var lensRimRadius = 0f
  private var lensRimDirty = true
  private val bounds = RectF()
  private val clip = Path()
  private val glassToScreen = Matrix()
  private val screenToGlass = Matrix()
  private val sourceToScreen = Matrix()
  private val sourceToGlass = Matrix()
  private val transformValues = FloatArray(9)
  private val observers = mutableListOf<ViewTreeObserver>()
  private val preDraw = ViewTreeObserver.OnPreDrawListener {
    if (canSample()) {
      // Shared source generations exclude this glass's dirty ancestry. Optical
      // animation can update the effect without re-recording the backdrop.
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
    if (Build.VERSION.SDK_INT >= 31) sourceLeases.forEach { (it as HardwareBackdropScene.Lease).scene.invalidateSource() }
    lensRimDirty = true
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
    lensRimDirty = true
    effectDirty = true
    // UI-thread animatedProps update only optics. No JS capture or native timer.
    if (mode == "liquid" && !reducedMotion && Build.VERSION.SDK_INT >= 33) invalidate()
  }
  fun setSamplingEnabled(value: Boolean) {
    if (samplingEnabled == value) return
    samplingEnabled = value
    if (Build.VERSION.SDK_INT >= 31) sourceLeases.forEach { (it as HardwareBackdropScene.Lease).setActive(value) }
    updateObservers()
    // Retain the recorded backdrop for keyboard-driven opacity/translation exit.
    invalidate()
  }
  private fun color(value: String, fallback: Int) = try { Color.parseColor(value) } catch (_: IllegalArgumentException) { fallback }
  private fun unit(value: Double, fallback: Float) = if (value.isFinite()) value.coerceIn(0.0, 1.0).toFloat() else fallback
  private fun dp(value: Double, fallback: Float, max: Double) = if (value.isFinite()) value.coerceIn(0.0, max).toFloat() else fallback
  fun setSurfaceTint(value: String) { val next = color(value, surfaceTint); if (next != surfaceTint) { surfaceTint = next; invalidate() } }
  fun setFallbackSurface(value: String) { val next = color(value, fallbackSurface); if (next != fallbackSurface) { fallbackSurface = next; invalidate() } }
  fun setBorderColor(value: String) { val next = color(value, borderColor); if (next != borderColor) { borderColor = next; invalidate() } }
  fun setTintOpacity(value: Double) { val next = unit(value, tintOpacity); if (next != tintOpacity) { tintOpacity = next; invalidate() } }
  fun setBlurDp(value: Double) { val next = dp(value, blurDp, 40.0); if (next != blurDp) { blurDp = next; effectDirty = true; invalidate() } }
  fun setRefractionDp(value: Double) { val next = dp(value, refractionDp, 48.0); if (next != refractionDp) { refractionDp = next; effectDirty = true; releaseBuffer(); invalidate() } }
  fun setThickness(value: Double) { val next = unit(value, thickness); if (next != thickness) { thickness = next; effectDirty = true; invalidate() } }
  fun setHighlight(value: Double) { val next = unit(value, highlight); if (next != highlight) { highlight = next; lensRimDirty = true; effectDirty = true; invalidate() } }
  fun setInnerShadow(value: Double) { val next = unit(value, innerShadow); if (next != innerShadow) { innerShadow = next; effectDirty = true; invalidate() } }
  fun setChromaticEdge(value: Double) { val next = unit(value, chromaticEdge); if (next != chromaticEdge) { chromaticEdge = next; effectDirty = true; invalidate() } }
  fun setPressResponse(value: Double) { val next = unit(value, pressResponse); if (next != pressResponse) { pressResponse = next; effectDirty = true; invalidate() } }
  fun setVelocityResponse(value: Double) { val next = unit(value, velocityResponse); if (next != velocityResponse) { velocityResponse = next; lensRimDirty = true; effectDirty = true; invalidate() } }
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

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    // Mark even in Off mode, before any hardware source records these parents.
    if (Build.VERSION.SDK_INT >= 31) HardwareBackdropScene.markGlassAncestors(this)
    updateObservers()
  }
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
    if (Build.VERSION.SDK_INT >= 31) {
      (effectNode as? RenderNode)?.discardDisplayList()
      sourceLeases.forEach { (it as HardwareBackdropScene.Lease).release() }
    }
    sourceLeases.clear()
    capturedSources = emptyList()
    capturedGeometry = emptyList()
    effectNode = null
    runtimeShader = null
    lensRimPaint.shader = null
    lensRimDirty = true
    effectDirty = true
  }

  @TargetApi(31)
  private fun captureBackground(): Boolean {
    if (!canSample()) return false
    try {
      HardwareBackdropScene.markGlassAncestors(this)
      val density = resources.displayMetrics.density
      // Outer 24dp refraction + the moving 14dp lens need samples outside the
      // visible shape. Padding also keeps the 12dp soft blur off the clamp edge.
      val padding = max(8f, refractionDp + blurDp + 8f).coerceAtMost(64f) * density
      val paddedWidth = width + padding * 2f
      val paddedHeight = height + padding * 2f
      val maxScale = if (mode == "liquid") 0.25f else 0.35f
      val scale = min(maxScale, min(768f / paddedWidth, 768f / paddedHeight))
      val bw = ceil(paddedWidth * scale).toInt().coerceAtLeast(1)
      val bh = ceil(paddedHeight * scale).toInt().coerceAtLeast(1)
      if (sampleScale != scale || samplePadding != padding) effectDirty = true
      sampleScale = scale
      samplePadding = padding
      glassToScreen.reset()
      transformMatrixToGlobal(glassToScreen)
      if (!glassToScreen.invert(screenToGlass)) return false
      val roots = captureRoots().filter { it !== this && it.isShown }
      if (roots.isEmpty()) return false
      val previousLeases = sourceLeases.map { it as HardwareBackdropScene.Lease }
      if (previousLeases.size != roots.size || roots.indices.any { !previousLeases[it].scene.owns(roots[it]) }) {
        previousLeases.forEach { it.release() }
        sourceLeases.clear()
        roots.forEach { root ->
          sourceLeases.add(HardwareBackdropScene.acquire(root) {
            if (canSample() && captureBackground()) invalidate()
          })
        }
        capturedSources = emptyList()
      }
      val frames = sourceLeases.map { (it as HardwareBackdropScene.Lease).scene.currentFrame() ?: return false }
      val transforms = roots.map { root ->
        sourceToScreen.reset()
        root.transformMatrixToGlobal(sourceToScreen)
        sourceToGlass.setConcat(screenToGlass, sourceToScreen)
        Matrix(sourceToGlass)
      }
      val sources = frames.indices.map { index ->
        transforms[index].getValues(transformValues)
        frames[index].version to transformValues.toList()
      }
      val geometry = listOf(width.toFloat(), height.toFloat(), scale, padding, if (dark) 1f else 0f)
      val oldNode = effectNode as? RenderNode
      if (oldNode?.hasDisplayList() == true && sources == capturedSources && geometry == capturedGeometry) return false
      val node = oldNode ?: RenderNode("TodoMoeGlass").also { effectNode = it }
      node.setPosition(0, 0, bw, bh)
      val target = node.beginRecording(bw, bh)
      try {
        target.drawColor(fallbackSurface)
        frames.indices.forEach { index ->
          val count = target.save()
          try {
            target.scale(scale, scale)
            target.translate(padding, padding)
            target.concat(transforms[index])
            target.drawRenderNode(frames[index].node)
          } finally { target.restoreToCount(count) }
        }
      } finally { node.endRecording() }
      capturedSources = sources
      capturedGeometry = geometry
      return true
    } catch (_: RuntimeException) {
      noteFallback("Hardware backdrop recording failed; using a solid surface.")
      failed = true
      releaseBuffer()
      return true
    } catch (_: OutOfMemoryError) {
      noteFallback("Hardware backdrop allocation failed; using a solid surface.")
      failed = true
      releaseBuffer()
      return true
    }
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val count = canvas.save()
    canvas.clipPath(clip)
    var hasGlass = active() && effectNode != null && canvas.isHardwareAccelerated
    if (hasGlass && Build.VERSION.SDK_INT >= 31) {
      try { drawEffect(canvas) } catch (_: RuntimeException) {
        noteFallback("Native render effect failed; using a solid surface.")
        failed = true
        releaseBuffer()
        hasGlass = false
      }
    }
    paint.style = Paint.Style.FILL
    paint.color = if (!hasGlass) fallbackSurface else Color.argb((tintOpacity * 255f).toInt(), Color.red(surfaceTint), Color.green(surfaceTint), Color.blue(surfaceTint))
    canvas.drawRect(bounds, paint)
    if (hasGlass && mode == "liquid" && !reducedMotion && !liquidFailed && Build.VERSION.SDK_INT >= 33 && lens.enabled) {
      drawLensRim(canvas)
    }
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = resources.displayMetrics.density
    paint.color = borderColor
    canvas.drawPath(clip, paint)
    paint.style = Paint.Style.FILL
    canvas.restoreToCount(count)
  }

  /** Keep the critical edge in full-resolution Canvas. The softer AGSL rim,
   * refraction and inner shadow remain underneath; RN foreground draws later. */
  private fun drawLensRim(canvas: Canvas) {
    if (lensRimDirty) {
      val density = resources.displayMetrics.density
      // Exactly GlassLensShader's max(lensRect.zw / 2, pixel), velocity stretch
      // and min(halfSize) capsule radius, converted back from sampled pixels.
      val minHalf = (density * sampleScale).coerceAtLeast(0.25f) / sampleScale
      val halfWidth = max(lens.width * width * 0.5f, minHalf) * (1f + min(abs(lens.velocityX * velocityResponse) * 0.025f, 0.10f))
      val halfHeight = max(lens.height * height * 0.5f, minHalf) * (1f + min(abs(lens.velocityY * velocityResponse) * 0.025f, 0.10f))
      val centerX = lens.centerX * width
      val centerY = lens.centerY * height
      lensRimPaint.strokeWidth = max(1f, density * 0.75f)
      val inset = lensRimPaint.strokeWidth * 0.5f
      lensRimBounds.set(centerX - halfWidth + inset, centerY - halfHeight + inset,
        centerX + halfWidth - inset, centerY + halfHeight - inset)
      lensRimRadius = (min(halfWidth, halfHeight) - inset).coerceAtLeast(0f)
      val lightX = -0.65f + lens.velocityX * velocityResponse * 0.06f
      val lightY = -0.85f + lens.velocityY * velocityResponse * 0.06f
      val lightLength = sqrt(lightX * lightX + lightY * lightY).coerceAtLeast(0.0001f)
      val span = max(halfWidth, halfHeight)
      val dx = lightX / lightLength * span
      val dy = lightY / lightLength * span
      val primaryAlpha = ((if (dark) 102f + lens.press * 38f else 210f + lens.press * 30f) * highlight).toInt().coerceIn(0, 255)
      val secondary = if (dark) Color.argb((54f + lens.press * 22f).toInt(), 255, 255, 255)
        else Color.argb(30, 35, 40, 52)
      lensRimPaint.shader = LinearGradient(centerX + dx, centerY + dy, centerX - dx, centerY - dy,
        intArrayOf(Color.argb(primaryAlpha, 255, 255, 255), Color.argb(if (dark) 16 else 34, 255, 255, 255), secondary),
        floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP)
      lensRimDirty = false
    }
    canvas.drawRoundRect(lensRimBounds, lensRimRadius, lensRimRadius, lensRimPaint)
  }

  @TargetApi(31)
  private fun drawEffect(canvas: Canvas) {
    val node = effectNode as? RenderNode ?: return
    if (effectDirty) {
      val liquid = mode == "liquid" && !reducedMotion && !liquidFailed && Build.VERSION.SDK_INT >= 33
      val radius = blurDp * resources.displayMetrics.density * sampleScale
      val blur = RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.CLAMP)
      val effect = if (liquid && Build.VERSION.SDK_INT >= 33) {
        try {
          val saturation = ColorMatrix().apply { setSaturation(1.5f) }
          val vibrant = RenderEffect.createColorFilterEffect(ColorMatrixColorFilter(saturation))
          RenderEffect.createChainEffect(liquidEffect(), RenderEffect.createChainEffect(blur, vibrant))
        } catch (_: RuntimeException) {
          liquidFailed = true
          noteFallback("RuntimeShader failed; using the soft blur fallback.")
          val softRadius = max(12f, blurDp) * resources.displayMetrics.density * sampleScale
          RenderEffect.createBlurEffect(softRadius, softRadius, Shader.TileMode.CLAMP)
        }
      } else blur
      node.setRenderEffect(effect)
      effectDirty = false
    }
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
    shader.setFloatUniform("outerHeight", refractionDp * unit)
    shader.setFloatUniform("outerAmount", refractionDp * thickness * unit)
    shader.setFloatUniform("lensRect", lens.centerX * sw, lens.centerY * sh, lens.width * sw, lens.height * sh)
    shader.setFloatUniform("lensEnabled", if (lens.enabled) 1f else 0f)
    shader.setFloatUniform("press", (lens.press * pressResponse).coerceIn(0f, 1f))
    shader.setFloatUniform("velocity", lens.velocityX * velocityResponse, lens.velocityY * velocityResponse)
    shader.setFloatUniform("lensHeight", 10f * thickness * unit)
    shader.setFloatUniform("lensAmount", 14f * pressResponse * unit)
    shader.setFloatUniform("highlightStrength", highlight)
    shader.setFloatUniform("innerShadowStrength", innerShadow)
    shader.setFloatUniform("chromaticStrength", chromaticEdge)
    // RenderEffect/Skia snapshots the builder. Recreate the effect after new
    // uniforms, while keeping the compiled RuntimeShader until size/lifecycle reset.
    return RenderEffect.createRuntimeShaderEffect(shader, "backdrop")
  }
}
