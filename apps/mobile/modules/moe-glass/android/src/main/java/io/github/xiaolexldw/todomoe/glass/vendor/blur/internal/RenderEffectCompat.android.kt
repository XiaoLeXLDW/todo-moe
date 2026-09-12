// Todo Moe adaptation: namespace and Android-only bindings; upstream c36fab72391801d1e3ea5a00f966bf16bac28d4c.
// Copyright 2026, compose-miuix-ui contributors
// SPDX-License-Identifier: Apache-2.0

package io.github.xiaolexldw.todomoe.glass.vendor.blur.internal

import androidx.compose.ui.graphics.RenderEffect
import androidx.compose.ui.graphics.asComposeRenderEffect
import android.graphics.RuntimeShader

internal fun RenderEffect?.chain(other: RenderEffect): RenderEffect = if (this != null) {
    android.graphics.RenderEffect.createChainEffect(
        other.asAndroidRenderEffect(),
        this.asAndroidRenderEffect(),
    ).asComposeRenderEffect()
} else {
    other
}

internal fun runtimeShaderEffect(
    runtimeShader: RuntimeShader,
    uniformShaderName: String,
): RenderEffect = android.graphics.RenderEffect.createRuntimeShaderEffect(
    runtimeShader,
    uniformShaderName,
).asComposeRenderEffect()
