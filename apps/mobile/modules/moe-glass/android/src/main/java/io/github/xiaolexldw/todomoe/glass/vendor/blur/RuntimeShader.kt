// Android-only binding for vendored compose-miuix-ui c36fab72391801d1e3ea5a00f966bf16bac28d4c.
// Copyright 2026 compose-miuix-ui contributors. SPDX-License-Identifier: Apache-2.0
package io.github.xiaolexldw.todomoe.glass.vendor.blur

import android.os.Build
import androidx.compose.ui.graphics.Shader
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb

typealias RuntimeShader = android.graphics.RuntimeShader
fun RuntimeShader.asComposeShader(): Shader = this
fun RuntimeShader.asBrush(): ShaderBrush = ShaderBrush(this)
fun RuntimeShader.setColorUniform(name: String, color: Color) = setColorUniform(name, color.toArgb())
fun isRuntimeShaderSupported(): Boolean = Build.VERSION.SDK_INT >= 33
