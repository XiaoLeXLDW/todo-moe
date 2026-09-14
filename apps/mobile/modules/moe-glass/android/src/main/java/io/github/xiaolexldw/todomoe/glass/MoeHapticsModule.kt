package io.github.xiaolexldw.todomoe.glass

import android.os.Build
import android.os.VibrationEffect
import android.os.VibrationAttributes
import android.os.VibratorManager
import android.provider.Settings
import android.view.HapticFeedbackConstants
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** One native call owns each crisp pattern. No JS timers and no global vibrator
 * cancellation, so unrelated app/system feedback survives. */
class MoeHapticsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MoeHaptics")
    AsyncFunction("performPatternAsync") { pattern: String, strength: String ->
      perform(pattern, strength)
    }.runOnQueue(Queues.MAIN)
  }

  private fun perform(pattern: String, strength: String): Boolean {
    val context = appContext.reactContext ?: return false
    val root = appContext.currentActivity?.window?.decorView ?: return false
    val systemEnabled = Settings.System.getInt(context.contentResolver, Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) != 0
    if (!systemEnabled) return false
    if (strength == "system" || Build.VERSION.SDK_INT < 31) {
      return root.performHapticFeedback(systemFeedback(pattern))
    }
    val vibrator = context.getSystemService(VibratorManager::class.java)?.defaultVibrator ?: return false
    if (!vibrator.hasVibrator()) return false
    val tick = VibrationEffect.Composition.PRIMITIVE_TICK
    val click = VibrationEffect.Composition.PRIMITIVE_CLICK
    val needsTick = pattern in setOf("selectionTick", "undoReleased", "dragStarted", "tabSelected")
    if (!vibrator.areAllPrimitivesSupported(*(if (needsTick) intArrayOf(tick) else intArrayOf(click)))) {
      return root.performHapticFeedback(systemFeedback(pattern))
    }
    val scale = if (strength == "strong") 1f else 0.68f
    val primitive = if (needsTick) tick else click
    val builder = VibrationEffect.startComposition()
    when (pattern) {
      "auditionDouble", "errorRejected" -> builder
        .addPrimitive(click, scale)
        .addPrimitive(click, scale, 48)
      "listCompleted", "auditionTriple" -> builder
        .addPrimitive(click, scale * 0.68f)
        .addPrimitive(click, scale * 0.84f, 48)
        .addPrimitive(click, scale, 56)
      else -> builder.addPrimitive(primitive, scale)
    }
    val effect = builder.compose()
    if (Build.VERSION.SDK_INT >= 33) {
      val attributes = VibrationAttributes.Builder().setUsage(VibrationAttributes.USAGE_TOUCH).build()
      vibrator.vibrate(effect, attributes)
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(effect)
    }
    return true
  }

  private fun systemFeedback(pattern: String): Int = when (pattern) {
    "selectionTick", "tabSelected" -> HapticFeedbackConstants.CLOCK_TICK
    "undoReleased", "auditionDouble" -> if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.GESTURE_END else HapticFeedbackConstants.VIRTUAL_KEY
    "dragStarted" -> if (Build.VERSION.SDK_INT >= 34) HapticFeedbackConstants.DRAG_START else HapticFeedbackConstants.LONG_PRESS
    "deleteConfirmed" -> HapticFeedbackConstants.LONG_PRESS
    "errorRejected" -> if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
    else -> if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY
  }
}
