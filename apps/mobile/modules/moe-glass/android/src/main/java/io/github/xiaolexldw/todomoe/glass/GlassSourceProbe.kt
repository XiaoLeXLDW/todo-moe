package io.github.xiaolexldw.todomoe.glass

import android.content.Context
import android.graphics.Rect
import android.os.Process
import android.view.View
import org.json.JSONObject
import java.io.File

/** TEMP: one Dev-only evidence candidate. Remove with the source invalidation fix. */
internal object GlassSourceProbe {
  private var initialized = false
  private var file: File? = null
  private val nodes = mutableSetOf<String>()
  private val outputs = mutableSetOf<String>()
  val enabled get() = file != null

  fun initialize(context: Context) {
    if (initialized) return
    initialized = true
    if (context.packageName != "io.github.xiaolexldw.todomoe.dev") return
    try {
      val target = File(context.filesDir, "moe-glass-source-probe.jsonl")
      target.writeText(JSONObject().put("event", "init").put("pid", Process.myPid())
        .put("dev", true).put("file", target.name).toString() + "\n")
      file = target
    } catch (_: Exception) { file = null }
  }

  fun node(view: View, reason: String, ancestor: Boolean) {
    if (!enabled || nodes.size >= 16) return
    val hash = System.identityHashCode(view)
    if (!nodes.add("$hash:$reason")) return
    val rect = Rect()
    val visible = view.getGlobalVisibleRect(rect)
    append(JSONObject().put("event", "node").put("reason", reason).put("class", view.javaClass.name)
      .put("id", view.id).put("hash", hash).put("left", view.left).put("top", view.top)
      .put("right", view.right).put("bottom", view.bottom).put("layoutRequested", view.isLayoutRequested)
      .put("dirty", view.isDirty).put("shown", view.isShown).put("visible", visible).put("ancestor", ancestor)
      .put("visibleLeft", rect.left).put("visibleTop", rect.top).put("visibleRight", rect.right).put("visibleBottom", rect.bottom))
  }

  fun output(versions: Boolean, matrices: Boolean, geometry: Boolean, displayList: Boolean) {
    if (!enabled || outputs.size >= 8 || !outputs.add("$versions:$matrices:$geometry:$displayList")) return
    append(JSONObject().put("event", "output").put("versionsChanged", versions).put("matricesChanged", matrices)
      .put("geometryChanged", geometry).put("displayList", displayList))
  }

  private fun append(record: JSONObject) {
    try { file?.appendText(record.toString() + "\n") } catch (_: Exception) { file = null }
  }
}
