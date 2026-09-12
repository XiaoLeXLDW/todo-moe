package io.github.xiaolexldw.todomoe.glass

/** Atomic UI-thread input; no task data or animation clock belongs to this view. */
internal data class GlassLensState(
  val enabled: Boolean = false,
  val centerX: Float = 0.5f,
  val centerY: Float = 0.5f,
  val width: Float = 0f,
  val height: Float = 0f,
  val press: Float = 0f,
  val velocityX: Float = 0f,
  val velocityY: Float = 0f,
) {
  companion object {
    val Disabled = GlassLensState()

    fun from(values: List<Double>): GlassLensState {
      if (values.size != 8 || values.any { !it.isFinite() }) return Disabled
      return GlassLensState(
        enabled = values[0] >= 0.5 && values[3] > 0.0 && values[4] > 0.0,
        centerX = values[1].coerceIn(0.0, 1.0).toFloat(),
        centerY = values[2].coerceIn(0.0, 1.0).toFloat(),
        width = values[3].coerceIn(0.0, 1.0).toFloat(),
        height = values[4].coerceIn(0.0, 1.0).toFloat(),
        press = values[5].coerceIn(0.0, 1.0).toFloat(),
        velocityX = values[6].coerceIn(-4.0, 4.0).toFloat(),
        velocityY = values[7].coerceIn(-4.0, 4.0).toFloat(),
      )
    }
  }
}
