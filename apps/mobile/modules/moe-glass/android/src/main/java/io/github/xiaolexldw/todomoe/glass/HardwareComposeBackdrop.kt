package io.github.xiaolexldw.todomoe.glass

import android.annotation.TargetApi
import android.graphics.Matrix
import android.graphics.RenderNode
import android.view.View
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.GraphicsLayerScope
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.unit.Density
import io.github.xiaolexldw.todomoe.glass.vendor.blur.Backdrop
import io.github.xiaolexldw.todomoe.glass.vendor.blur.BackdropEffectScope
import io.github.xiaolexldw.todomoe.glass.vendor.blur.internal.InverseLayerScope
import kotlin.math.round

/** The only page source. The original Compose tabsBackdrop captures ONLY its
 * hidden tinted tab copy; this adapter never records the Compose glass host. */
@TargetApi(33)
internal class HardwareComposeBackdrop(private val host: MoeLiquidTabBarView) : Backdrop {
  private data class Source(val root: View, val node: RenderNode, val version: Long, val matrix: List<Float>)
  private val leases = mutableListOf<HardwareBackdropScene.Lease>()
  private var sources by mutableStateOf<List<Source>>(emptyList())
  var failed by mutableStateOf(false)
    private set
  private val inverse = InverseLayerScope()
  private val values = FloatArray(9)
  override val isCoordinatesDependent = true
  override var offsetResidualX = 0f
  override var offsetResidualY = 0f

  fun updateSources() {
    if (failed) return
    try { updateSourcesUnchecked() }
    catch (_: RuntimeException) { fail() }
    catch (_: OutOfMemoryError) { fail() }
  }
  private fun fail() {
    if (failed) return
    failed = true
    release()
    Log.w("MoeGlass", "Compose backdrop source failed; keeping basic tab navigation.")
  }
  fun resetFailure() { failed = false }
  private fun updateSourcesUnchecked() {
    if (!host.maySample()) { leases.forEach { it.setActive(false) }; return }
    HardwareBackdropScene.markGlassAncestors(host)
    val roots = host.roots().filter { it.isShown }
    if (roots.size != leases.size || roots.indices.any { !leases[it].scene.owns(roots[it]) }) {
      leases.forEach { it.release() }; leases.clear()
      roots.forEach { root -> leases.add(HardwareBackdropScene.acquire(root) { updateSources() }) }
    }
    leases.forEach { it.setActive(true) }
    val next = roots.indices.mapNotNull { index ->
      val frame = leases[index].scene.currentFrame() ?: return@mapNotNull null
      val matrix = Matrix()
      roots[index].transformMatrixToGlobal(matrix)
      matrix.getValues(values)
      Source(roots[index], frame.node, frame.version, values.toList())
    }
    if (next != sources) sources = next
  }
  fun invalidateSource() { leases.forEach { it.scene.invalidateSource() } }
  fun release() { leases.forEach { it.release() }; leases.clear(); sources = emptyList() }

  override fun DrawScope.drawBackdrop(density: Density, coordinates: LayoutCoordinates?,
    layerBlock: (GraphicsLayerScope.() -> Unit)?, downscaleFactor: Int) {
    if (coordinates == null || !coordinates.isAttached) return
    val frames = sources // Snapshot read lets source updates invalidate this draw only.
    if (frames.isEmpty()) return
    val onScreen = IntArray(2); val inWindow = IntArray(2)
    host.rootView.getLocationOnScreen(onScreen); host.rootView.getLocationInWindow(inWindow)
    val offset = coordinates.positionInWindow() + Offset((onScreen[0] - inWindow[0]).toFloat(), (onScreen[1] - inWindow[1]).toFloat())
    val consumerSize = (density as? BackdropEffectScope)?.size ?: size
    withTransform({
      if (layerBlock != null) with(inverse.apply { reset() }) { inverseTransform(density, consumerSize, layerBlock) }
      if (downscaleFactor > 1) {
        val sf = downscaleFactor.toFloat()
        val x = offset.x / sf; val y = offset.y / sf
        val rx = round(x * 0.5f) * 2f; val ry = round(y * 0.5f) * 2f
        offsetResidualX = (x - rx) * sf; offsetResidualY = (y - ry) * sf
        translate(-rx, -ry); scale(1f / sf, 1f / sf, Offset.Zero)
      } else {
        offsetResidualX = 0f; offsetResidualY = 0f
        translate(-offset.x, -offset.y)
      }
    }) {
      val canvas = drawContext.canvas.nativeCanvas
      if (!canvas.isHardwareAccelerated) return@withTransform
      frames.forEach { source ->
        val count = canvas.save()
        try { canvas.concat(Matrix().apply { setValues(source.matrix.toFloatArray()) }); canvas.drawRenderNode(source.node) }
        finally { canvas.restoreToCount(count) }
      }
    }
  }
}
