package io.github.xiaolexldw.todomoe.glass

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MoeGlassModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MoeGlass")
    Constants(
      "soft" to (Build.VERSION.SDK_INT >= 31),
      "liquid" to (Build.VERSION.SDK_INT >= 33)
    )
    View(MoeGlassView::class) {
      // Exclude RN foreground children from background sampling as a group.
      GroupView<MoeGlassView> { }
      Prop("mode") { view: MoeGlassView, mode: String -> view.setMode(mode) }
      Prop("dark") { view: MoeGlassView, dark: Boolean -> view.setDark(dark) }
      Prop("reducedMotion") { view: MoeGlassView, reduced: Boolean -> view.setReducedMotion(reduced) }
      Prop("lensState") { view: MoeGlassView, values: List<Double> -> view.setLensState(values) }
      Prop("cornerRadius") { view: MoeGlassView, radius: Double -> view.setCornerRadius(radius) }
      Prop("samplingEnabled") { view: MoeGlassView, enabled: Boolean -> view.setSamplingEnabled(enabled) }
      Prop("surfaceTint") { view: MoeGlassView, value: String -> view.setSurfaceTint(value) }
      Prop("fallbackSurface") { view: MoeGlassView, value: String -> view.setFallbackSurface(value) }
      Prop("borderColor") { view: MoeGlassView, value: String -> view.setBorderColor(value) }
      Prop("tintOpacity") { view: MoeGlassView, value: Double -> view.setTintOpacity(value) }
      Prop("blurDp") { view: MoeGlassView, value: Double -> view.setBlurDp(value) }
      Prop("refractionDp") { view: MoeGlassView, value: Double -> view.setRefractionDp(value) }
      Prop("thickness") { view: MoeGlassView, value: Double -> view.setThickness(value) }
      Prop("highlight") { view: MoeGlassView, value: Double -> view.setHighlight(value) }
      Prop("innerShadow") { view: MoeGlassView, value: Double -> view.setInnerShadow(value) }
      Prop("chromaticEdge") { view: MoeGlassView, value: Double -> view.setChromaticEdge(value) }
      Prop("pressResponse") { view: MoeGlassView, value: Double -> view.setPressResponse(value) }
      Prop("velocityResponse") { view: MoeGlassView, value: Double -> view.setVelocityResponse(value) }
    }
  }
}
