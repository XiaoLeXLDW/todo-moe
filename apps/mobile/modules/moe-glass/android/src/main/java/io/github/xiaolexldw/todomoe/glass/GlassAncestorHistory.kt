package io.github.xiaolexldw.todomoe.glass

import java.util.WeakHashMap

/** Historical drawing exclusion only. Weak keys and Boolean values cannot keep
 * a detached View/Window tree alive. There is deliberately no per-frame reset. */
internal class GlassAncestorHistory<T : Any> {
  private val ancestors = WeakHashMap<T, Boolean>()
  var revision = 0L
    private set

  fun markAncestors(glass: T, parentOf: (T) -> T?) {
    var current = parentOf(glass)
    while (current != null) {
      if (ancestors.put(current, true) == null) revision++
      // A previously marked container may have moved under a new parent.
      current = parentOf(current)
    }
  }

  fun requiresPartition(view: T, containsGlassNow: Boolean): Boolean = containsGlassNow || ancestors.containsKey(view)
}
