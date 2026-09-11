package io.github.xiaolexldw.todomoe.glass

import android.annotation.TargetApi
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.RenderEffect
import android.graphics.RenderNode
import android.graphics.RuntimeShader
import android.graphics.Shader
import android.os.Build
import android.view.View
import android.view.ViewTreeObserver
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import kotlin.math.ceil
import kotlin.math.min

/**
 * Original Todo Moe renderer. Samples the Android/RN view tree during native
 * pre-draw, excluding every glass surface to avoid recursion/feedback. No JS
 * screenshots, timers, task copies, external library or Compose dependency.
 * SurfaceView/video contents are outside this sampling path.
 */
class MoeGlassView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  companion object { private var sampling = false }
  private var mode = "off"
  private var dark = false
  private var reducedMotion = false
  private var failed = false
  private var bitmap: Bitmap? = null
  private var sampleBitmap: Bitmap? = null
  private var sampleCanvas: Canvas? = null
  private var effectNode: Any? = null
  private var effectKey = ""
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
  private val rootPosition = IntArray(2)
  private val glassPosition = IntArray(2)
  private val bounds = RectF()
  private val clip = Path()
  private var observer: ViewTreeObserver? = null
  private val preDraw = ViewTreeObserver.OnPreDrawListener {
    if (!sampling && active() && isShown && windowVisibility == View.VISIBLE) {
      // invalidate() in pre-draw schedules another traversal on Android. Only
      // changed pixels may request it: the extra traversal compares equal and
      // stops, so a static scene cannot sustain a capture/invalidate loop.
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
    mode = if (value in setOf("off", "soft", "liquid")) value else "off"
    failed = false
    effectKey = ""
    if (mode == "off") releaseBuffer()
    invalidate()
  }
  fun setDark(value: Boolean) { dark = value; invalidate() }
  fun setReducedMotion(value: Boolean) { reducedMotion = value; effectKey = ""; invalidate() }
  private fun active() = mode != "off" && Build.VERSION.SDK_INT >= 31 && !failed && width > 0 && height > 0

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    observer = rootView.viewTreeObserver.also { it.addOnPreDrawListener(preDraw) }
  }
  override fun onDetachedFromWindow() {
    observer?.takeIf { it.isAlive }?.removeOnPreDrawListener(preDraw)
    observer = null
    releaseBuffer()
    super.onDetachedFromWindow()
  }
  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    if (visibility != View.VISIBLE) releaseBuffer()
  }
  // ExpoView extends LinearLayout, but this GroupView uses RN/Yoga layout.
  // ViewGroupManager.needsCustomLayoutForChildren=false requires us not to
  // reposition children here; RN owns every child's measured frame.
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) = Unit

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    releaseBuffer()
    bounds.set(0f, 0f, w.toFloat(), h.toFloat())
    clip.reset()
    val radius = min(28f * resources.displayMetrics.density, h / 2f)
    clip.addRoundRect(bounds, radius, radius, Path.Direction.CW)
  }

  private fun releaseBuffer() {
    bitmap?.recycle()
    bitmap = null
    sampleBitmap?.recycle()
    sampleBitmap = null
    sampleCanvas = null
    if (Build.VERSION.SDK_INT >= 31) (effectNode as? RenderNode)?.discardDisplayList()
    effectNode = null
    effectKey = ""
  }

  private fun captureBackground(): Boolean {
    if (!active() || sampling) return false
    val root = rootView
    if (root === this) return false
    try {
      // Bound buffer memory independently of device resolution.
      val scale = min(0.35f, 768f / width.coerceAtLeast(1))
      val bw = ceil(width * scale).toInt().coerceAtLeast(1)
      val bh = ceil(height * scale).toInt().coerceAtLeast(1)
      if (bitmap != null && (bitmap?.width != bw || bitmap?.height != bh)) {
        releaseBuffer()
      }
      if (sampleBitmap == null) {
        sampleBitmap = Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888)
        sampleCanvas = Canvas(sampleBitmap!!)
      }
      root.getLocationOnScreen(rootPosition)
      getLocationOnScreen(glassPosition)
      val target = sampleCanvas ?: return false
      val sampled = sampleBitmap ?: return false
      sampled.eraseColor(if (dark) Color.rgb(20, 24, 35) else Color.rgb(248, 247, 253))
      val count = target.save()
      try {
        target.scale(scale, scale)
        target.translate((rootPosition[0] - glassPosition[0]).toFloat(), (rootPosition[1] - glassPosition[1]).toFloat())
        sampling = true
        root.draw(target)
      } finally {
        sampling = false
        target.restoreToCount(count)
      }
      if (bitmap?.sameAs(sampled) == true) return false
      val previous = bitmap
      bitmap = sampled
      sampleBitmap = previous
      sampleCanvas = previous?.let { Canvas(it) }
      return true
    } catch (_: RuntimeException) {
      // Some hardware-backed views cannot draw to a software bitmap. Navigation
      // remains RN-owned and receives the same touches after a visual failure.
      failed = true
      releaseBuffer()
      return true
    } catch (_: OutOfMemoryError) {
      failed = true
      releaseBuffer()
      return true
    }
  }

  override fun draw(canvas: Canvas) {
    if (sampling) return
    super.draw(canvas)
  }

  override fun onDraw(canvas: Canvas) {
    if (sampling) return
    super.onDraw(canvas)
    val count = canvas.save()
    canvas.clipPath(clip)
    val hasGlass = active() && bitmap != null && canvas.isHardwareAccelerated
    if (hasGlass && Build.VERSION.SDK_INT >= 31) {
      try { drawEffect(canvas) } catch (_: RuntimeException) {
        failed = true
        releaseBuffer()
      }
    }
    paint.style = Paint.Style.FILL
    paint.color = when {
      !hasGlass || failed -> if (dark) Color.rgb(27, 30, 44) else Color.rgb(248, 247, 253)
      dark -> Color.argb(172, 22, 26, 40)
      else -> Color.argb(164, 255, 253, 255)
    }
    canvas.drawRect(bounds, paint)
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = resources.displayMetrics.density
    paint.color = if (dark) Color.argb(70, 255, 255, 255) else Color.argb(215, 255, 255, 255)
    canvas.drawPath(clip, paint)
    paint.style = Paint.Style.FILL
    canvas.restoreToCount(count)
  }

  @TargetApi(31)
  private fun drawEffect(canvas: Canvas) {
    val image = bitmap ?: return
    val node = (effectNode as? RenderNode) ?: RenderNode("TodoMoeGlass").also { effectNode = it }
    node.setPosition(0, 0, width, height)
    val key = "$mode:$width:$height:$reducedMotion"
    if (key != effectKey) {
      val radius = 12f * resources.displayMetrics.density
      val blur = RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.CLAMP)
      val effect = if (mode == "liquid" && !reducedMotion && Build.VERSION.SDK_INT >= 33) {
        try { RenderEffect.createChainEffect(liquidEffect(), blur) } catch (_: RuntimeException) { blur }
      } else blur
      node.setRenderEffect(effect)
      effectKey = key
    }
    val recording = node.beginRecording(width, height)
    paint.color = Color.WHITE
    recording.drawBitmap(image, Rect(0, 0, image.width, image.height), bounds, paint)
    node.endRecording()
    canvas.drawRenderNode(node)
  }

  @TargetApi(33)
  private fun liquidEffect(): RenderEffect {
    // A static edge lens: content moves behind it, the lens itself never runs
    // a clock. System reduced motion selects the plain blur path instead.
    val shader = RuntimeShader("""
      uniform shader backdrop;
      uniform float2 size;
      half4 main(float2 p) {
        float2 center = size * 0.5;
        float2 n = (p - center) / max(center, float2(1.0));
        float edge = pow(clamp(max(abs(n.x), abs(n.y)), 0.0, 1.0), 5.0);
        float2 sampleAt = clamp(p - n * edge * 9.0, float2(0.0), size);
        half4 color = backdrop.eval(sampleAt);
        half light = half(edge * 0.045);
        return half4(min(color.rgb + half3(light), half3(1.0)), color.a);
      }
    """.trimIndent())
    shader.setFloatUniform("size", width.toFloat(), height.toFloat())
    return RenderEffect.createRuntimeShaderEffect(shader, "backdrop")
  }
}
