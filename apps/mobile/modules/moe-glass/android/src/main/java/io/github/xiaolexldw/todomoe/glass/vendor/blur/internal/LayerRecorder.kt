// Todo Moe adaptation: namespace and Android-only bindings; upstream c36fab72391801d1e3ea5a00f966bf16bac28d4c.
// Copyright 2026, compose-miuix-ui contributors
// SPDX-License-Identifier: Apache-2.0

package io.github.xiaolexldw.todomoe.glass.vendor.blur.internal

import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.layer.GraphicsLayer
import androidx.compose.ui.node.DelegatableNode
import androidx.compose.ui.node.requireDensity
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.toIntSize

// inline so the caller's [block] isn't allocated per frame; it must be crossinline because it is
// forwarded into record()'s own (non-inline) lambda, leaving just that one unavoidable allocation.
context(node: DelegatableNode)
internal inline fun DrawScope.recordLayer(
    layer: GraphicsLayer,
    size: IntSize = this.size.toIntSize(),
    crossinline block: DrawScope.() -> Unit,
) {
    val density = node.requireDensity()
    layer.record(size) {
        val prevDensity = drawContext.density
        drawContext.density = density
        try {
            this.block()
        } finally {
            drawContext.density = prevDensity
        }
    }
}
