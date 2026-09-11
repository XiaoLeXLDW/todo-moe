package io.github.xiaolexldw.todomoe.keyboard

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MoeKeyboardInsetsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MoeKeyboardInsets")
    View(MoeKeyboardInsetsView::class) {
      Events("onInsetsChange")
    }
  }
}
