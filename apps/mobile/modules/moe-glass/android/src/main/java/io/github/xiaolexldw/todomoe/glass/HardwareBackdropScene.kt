package io.github.xiaolexldw.todomoe.glass

import android.annotation.TargetApi
import android.graphics.Canvas
import android.graphics.Outline
import android.graphics.RenderNode
import android.graphics.drawable.ColorDrawable
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import com.facebook.react.uimanager.BackgroundStyleApplicator
import com.facebook.react.views.view.ReactViewGroup
import java.util.IdentityHashMap

/** One hardware display-list source per native window. Its explicit leases are
 * released with the glass views; the pool never retains an abandoned Window.
 * No real View properties, drawing order, alpha or hierarchy are changed. */
@TargetApi(31)
internal class HardwareBackdropScene private constructor(private val root: View) {
  internal class Lease internal constructor(internal val scene: HardwareBackdropScene, private val changed: () -> Unit) {
    private var released = false
    private var active = true
    fun setActive(value: Boolean) {
      if (released || active == value) return
      active = value
      scene.activeReferences += if (value) 1 else -1
      if (value) scene.invalidateSource()
      scene.updateObservation()
    }
    fun release() {
      if (released) return
      released = true
      scene.listeners.remove(changed)
      if (active) scene.activeReferences--
      scene.references--
      if (scene.references == 0) {
        pool.remove(scene.root)
        scene.close()
      } else scene.updateObservation()
    }
  }

  companion object {
    private val pool = IdentityHashMap<View, HardwareBackdropScene>()
    private val exclusionHistory = GlassAncestorHistory<View>()
    fun markGlassAncestors(glass: View) {
      exclusionHistory.markAncestors(glass) { it.parent as? View }
    }
    fun acquire(root: View, changed: () -> Unit): Lease {
      val scene = pool[root] ?: HardwareBackdropScene(root).also { pool[root] = it }
      scene.references++
      scene.activeReferences++
      scene.listeners.add(changed)
      scene.updateObservation()
      return Lease(scene, changed)
    }
  }

  internal data class Frame(val node: RenderNode, val version: Long)
  private data class Plan(val view: View, val children: List<Plan>, val hasGlass: Boolean,
    val signature: Long, val dirty: Boolean, val drawable: Boolean = true,
    val ownGeometry: Long = 0L, val ownAppearance: Long = 0L)
  private data class Cached(val signature: Long, val node: RenderNode, val probePlan: Plan?)
  private var references = 0
  private var activeReferences = 0
  private var observing = false
  private var version = 0L
  private var recordedExclusionRevision = -1L
  private var frame: Frame? = null
  private var failed = false
  private val listeners = mutableSetOf<() -> Unit>()
  private val cache = IdentityHashMap<View, Cached>()
  private val seen = java.util.Collections.newSetFromMap(IdentityHashMap<View, Boolean>())
  private val matrixValues = FloatArray(9)
  private val observer = root.viewTreeObserver
  private val preDraw = ViewTreeObserver.OnPreDrawListener {
    if (!failed) {
      val previous = frame
      try { refresh() } catch (_: RuntimeException) { failed = true }
      catch (_: OutOfMemoryError) { failed = true }
      if (failed || previous !== frame) listeners.toList().forEach { it() }
    }
    true
  }

  private fun updateObservation() {
    if (!observer.isAlive) return
    if (activeReferences > 0 && !observing) {
      observer.addOnPreDrawListener(preDraw); observing = true
    } else if (activeReferences == 0 && observing) {
      observer.removeOnPreDrawListener(preDraw); observing = false
    }
  }

  /** The shared pre-draw observer refreshes this source. A glass can initialize
   * it lazily on first capture; later consumers reuse that window's result.
   * Static scenes do not re-record, invalidate, or create another traversal. */
  fun currentFrame(): Frame? {
    check(!failed) { "Hardware backdrop source unavailable" }
    // An owner listener may precede our scene listener. A newly attached/moved
    // glass must invalidate old whole-subtree plans before this frame is read.
    if (frame == null || recordedExclusionRevision != exclusionHistory.revision) refresh()
    return frame
  }

  fun invalidateSource() {
    // Theme changes can mutate RN composite drawables in place, without a new
    // Drawable identity/state. This explicit event also refreshes glass ancestors.
    cache.clear(); frame = null
    root.invalidate()
  }

  private fun refresh() {
    seen.clear()
    val plan = inspect(root) ?: return
    if (!plan.drawable) return
    val node = record(plan)
    cache.keys.removeAll { !seen.contains(it) }
    if (frame?.node !== node) frame = Frame(node, ++version)
    recordedExclusionRevision = exclusionHistory.revision
  }

  fun owns(view: View) = root === view

  private fun inspect(view: View): Plan? {
    // Stop before examining or retaining any glass foreground descendants.
    if (view is MoeGlassView) {
      markGlassAncestors(view)
      return Plan(view, emptyList(), true, 0L, false, false)
    }
    val children = if (view is ViewGroup) {
      (0 until view.childCount).map { view.getChildAt(view.getChildDrawingOrder(it)) }
        .sortedBy { it.z }.mapNotNull { inspect(it) }
    } else emptyList()
    // Android/RNScreens retain removed children in private transition lists.
    // Losing the last PUBLIC glass child does not make ViewGroup.draw safe.
    val hasGlass = exclusionHistory.requiresPartition(view, children.any { it.hasGlass })
    if (hasGlass) markGlassAncestors(view)
    // Inspect hidden containers too: a cached framework subtree must never be
    // classified as glass-free merely because its glass is temporarily hidden.
    if (view.visibility != View.VISIBLE || view.alpha <= 0f || view.width <= 0 || view.height <= 0) {
      return Plan(view, emptyList(), hasGlass, 0L, false, false)
    }
    seen.add(view)
    val sources = children.filter { it.drawable }
    var signature = 17L
    fun include(value: Int) { signature = signature * 31L + value }
    include(System.identityHashCode(view))
    include(view.left); include(view.top); include(view.width); include(view.height)
    include(view.scrollX); include(view.scrollY); include(view.alpha.toBits()); include(view.z.toBits())
    view.matrix.getValues(matrixValues)
    matrixValues.forEach { include(it.toBits()) }
    val ownGeometry = signature
    signature = 17L
    include(view.clipBounds?.hashCode() ?: 0); include(if (view.clipToOutline) 1 else 0)
    val background = view.background
    include(System.identityHashCode(background)); include(background?.bounds?.hashCode() ?: 0)
    include(background?.state?.contentHashCode() ?: 0)
    if (background is ColorDrawable) include(background.color)
    if (view is ViewGroup) {
      include(if (view.clipChildren) 1 else 0); include(if (view.clipToPadding) 1 else 0)
      include(view.paddingLeft); include(view.paddingTop); include(view.paddingRight); include(view.paddingBottom)
    }
    if (view is ReactViewGroup) include(view.overflow?.hashCode() ?: 0)
    include(if (hasGlass) 1 else 0)
    val ownAppearance = signature
    signature = ownGeometry * 31L + ownAppearance
    sources.forEach { signature = signature * 31L + it.signature }
    // Glass invalidations propagate to its ancestors. Counting those as source
    // dirt would make our own invalidate -> preDraw -> invalidate loop forever.
    // Real source descendants retain their own dirty/layout signals.
    val dirty = sources.any { it.dirty } || view.isLayoutRequested || (!hasGlass && view.isDirty)
    return Plan(view, sources, hasGlass, signature, dirty, true, ownGeometry, ownAppearance)
  }

  private fun record(plan: Plan): RenderNode {
    val view = plan.view
    val previous = cache[view]
    if (previous != null && previous.signature == plan.signature && !plan.dirty) return previous.node
    if (GlassSourceProbe.enabled && previous != null) {
      // Probe before any View.draw can clear the actual native flags.
      if (previous.signature == plan.signature && plan.dirty) probeUnchangedDirty(plan)
      else previous.probePlan?.let { probeSignatureChange(it, plan) }
    }
    val node = RenderNode("TodoMoeBackdropContent")
    node.setPosition(0, 0, view.width, view.height)
    node.clipToBounds = false
    node.alpha = view.alpha
    node.setClipRect(view.clipBounds)
    if (view.clipToOutline) {
      val outline = Outline()
      view.outlineProvider?.getOutline(view, outline)
      node.setOutline(outline)
      node.clipToOutline = true
    }
    val target = node.beginRecording(view.width, view.height)
    try {
      if (!plan.hasGlass) {
        // View.draw records commands into a hardware canvas. Its own child
        // display lists remain hardware accelerated; no pixels cross to CPU.
        // Match View.updateDisplayListIfDirty's local scroll origin.
        target.translate(-view.scrollX.toFloat(), -view.scrollY.toFloat())
        view.draw(target)
      } else {
        // Never call draw on an ancestor that contains OR HAS CONTAINED glass:
        // private disappearing children are absent from the public tree.
        // Its cached native
        // child display lists could otherwise form root -> glass -> root cycles.
        view.background?.draw(target)
        drawChildren(target, view as ViewGroup, plan.children)
      }
    } finally { node.endRecording() }
    cache[view] = Cached(plan.signature, node, if (GlassSourceProbe.enabled) plan else null)
    return node
  }

  private fun probeUnchangedDirty(plan: Plan) {
    fun contributor(node: Plan): Plan? {
      node.children.firstNotNullOfOrNull { if (it.dirty) contributor(it) else null }?.let { return it }
      return if (node.view.isLayoutRequested || (!node.hasGlass && node.view.isDirty)) node else null
    }
    val cause = contributor(plan) ?: return
    GlassSourceProbe.node(cause.view, if (cause.view.isLayoutRequested) "unchanged-layout-request" else "unchanged-dirty", cause.hasGlass)
  }

  private fun probeSignatureChange(old: Plan, next: Plan) {
    val reason = when {
      old.ownGeometry != next.ownGeometry -> "geometry-or-matrix"
      old.ownAppearance != next.ownAppearance -> "clip-or-background-state"
      old.children.size != next.children.size || old.children.indices.any { old.children[it].view !== next.children[it].view } -> "hierarchy-or-order"
      else -> null
    }
    if (reason != null) {
      GlassSourceProbe.node(next.view, reason, next.hasGlass)
      return
    }
    val changed = old.children.indices.firstOrNull { old.children[it].signature != next.children[it].signature }
    if (changed != null) probeSignatureChange(old.children[changed], next.children[changed])
  }

  private fun drawChildren(target: Canvas, group: ViewGroup, children: List<Plan>) {
    val count = target.save()
    try {
      if (group.clipChildren) target.clipRect(0, 0, group.width, group.height)
      if (group.clipToPadding) target.clipRect(group.paddingLeft, group.paddingTop,
        group.width - group.paddingRight, group.height - group.paddingBottom)
      target.translate(-group.scrollX.toFloat(), -group.scrollY.toFloat())
      // Reuse the installed RN renderer's public rounded overflow clipping,
      // including border insets; rectangular Android clipping alone is not RN.
      if (group is ReactViewGroup && group.overflow != "visible") {
        BackgroundStyleApplicator.clipToPaddingBox(group, target)
      }
      children.forEach { child ->
        val childCount = target.save()
        try {
          target.translate(child.view.left.toFloat(), child.view.top.toFloat())
          target.concat(child.view.matrix)
          target.drawRenderNode(record(child))
        } finally { target.restoreToCount(childCount) }
      }
    } finally { target.restoreToCount(count) }
  }

  private fun close() {
    if (observer.isAlive) observer.removeOnPreDrawListener(preDraw)
    observing = false
    cache.values.forEach { it.node.discardDisplayList() }
    cache.clear(); seen.clear(); listeners.clear(); frame = null
  }
}
