package io.github.xiaolexldw.todomoe.glass

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MoeLiquidTabBarModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MoeLiquidTabBar")
    Constants("renderer" to "sukisu-compose")
    View(MoeLiquidTabBarView::class) {
      Events("onSelect")
      Prop("labels") { view: MoeLiquidTabBarView, labels: List<String> -> view.update { copy(labels = labels.take(3).takeIf { it.size == 3 } ?: this.labels) } }
      Prop("selectedIndex") { view: MoeLiquidTabBarView, index: Int -> view.update { copy(selectedIndex = index.coerceIn(0, 2)) } }
      Prop("selectionRevision") { view: MoeLiquidTabBarView, revision: Int -> view.update { copy(selectionRevision = revision) } }
      Prop("dark") { view: MoeLiquidTabBarView, value: Boolean -> view.update { copy(dark = value) } }
      Prop("accentColor") { view: MoeLiquidTabBarView, value: String -> view.update { copy(accentColor = value) } }
      Prop("surfaceColor") { view: MoeLiquidTabBarView, value: String -> view.update { copy(surfaceColor = value) } }
      Prop("contentColor") { view: MoeLiquidTabBarView, value: String -> view.update { copy(contentColor = value) } }
      Prop("mode") { view: MoeLiquidTabBarView, value: String -> view.update { copy(mode = value.takeIf { it in setOf("off", "soft", "liquid") } ?: "off") } }
      Prop("reducedMotion") { view: MoeLiquidTabBarView, value: Boolean -> view.update { copy(reducedMotion = value) } }
      Prop("samplingEnabled") { view: MoeLiquidTabBarView, value: Boolean -> view.update { copy(samplingEnabled = value) } }
    }
  }
}
