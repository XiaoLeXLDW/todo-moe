// Todo Moe adaptation of pinned SukiSU 9fbe8fe8ca90c62c259c5894bf96d02ac31209b9.
// Modified for LanMoe: package namespace only. See android/third-party/SOURCES.md.
// Adapted from Kyant0/AndroidLiquidGlass — https://github.com/Kyant0/AndroidLiquidGlass (Apache 2.0).
// Mirrored from compose-miuix-ui example.

package io.github.xiaolexldw.todomoe.glass.vendor.sukisu.liquid

import io.github.xiaolexldw.todomoe.glass.vendor.blur.BackdropEffectScope
import io.github.xiaolexldw.todomoe.glass.vendor.blur.colorControls

fun BackdropEffectScope.vibrancy() {
    colorControls(
        brightness = 0f,
        contrast = 1f,
        saturation = 1.5f,
    )
}
