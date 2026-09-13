package io.github.xiaolexldw.todomoe.glass

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Public Android color resources only: no wallpaper bitmap or permission. */
class MoeSystemColorsModule : Module() {
  private fun palette(): Map<String, Any> {
    val context = appContext.reactContext ?: return mapOf("supported" to false)
    if (Build.VERSION.SDK_INT < 31) return mapOf("supported" to false)
    fun color(name: String): String {
      val id = context.resources.getIdentifier("system_$name", "color", "android")
      check(id != 0) { "System palette unavailable" }
      return "#%06X".format(context.getColor(id) and 0xFFFFFF)
    }
    fun scheme(dark: Boolean): Map<String, String> {
      val text = color(if (dark) "neutral1_50" else "neutral1_900")
      val secondary = color(if (dark) "neutral2_200" else "neutral2_700")
      val tint = color(if (dark) "accent1_200" else "accent1_600")
      val card = color(if (dark) "neutral1_800" else "neutral1_10")
      val input = color(if (dark) "neutral2_800" else "neutral2_100")
      return mapOf("bg" to color(if (dark) "neutral1_900" else "neutral1_50"),
        "cardBg" to card, "taskItemBg" to card, "text" to text,
        "secondaryText" to secondary, "icon" to secondary,
        "border" to color(if (dark) "neutral2_600" else "neutral2_200"),
        "tint" to tint, "onTint" to color(if (dark) "accent1_800" else "accent1_0"),
        "tabIconDefault" to secondary, "tabIconSelected" to tint,
        "inputBg" to input, "filterBg" to input,
        "danger" to if (dark) "#FFB4AB" else "#BA1A1A",
        "success" to if (dark) "#8CD6AB" else "#166D42",
        "warning" to if (dark) "#F3CD83" else "#805600")
    }
    return try { mapOf("supported" to true, "light" to scheme(false), "dark" to scheme(true)) }
    catch (_: Exception) { mapOf("supported" to false) }
  }

  override fun definition() = ModuleDefinition {
    Name("MoeSystemColors")
    Events("onPaletteChanged")
    Function("getPalette") { palette() }
    OnActivityEntersForeground { sendEvent("onPaletteChanged", palette()) }
  }
}
