package io.github.xiaolexldw.todomoe.glass

import android.os.Build
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.xiaolexldw.todomoe.glass.vendor.sukisu.FloatingBottomBar
import io.github.xiaolexldw.todomoe.glass.vendor.sukisu.FloatingBottomBarItem
import io.github.xiaolexldw.todomoe.glass.vendor.sukisu.LocalContentColor
import io.github.xiaolexldw.todomoe.glass.vendor.blur.sensor.LocalDeviceTiltEnabled

private fun color(value: String, fallback: Int) = Color(try { android.graphics.Color.parseColor(value) } catch (_: IllegalArgumentException) { fallback })

@OptIn(ExperimentalComposeUiApi::class)
@Composable
internal fun LiquidTabBarContent(host: MoeLiquidTabBarView) {
  val props = host.props
  val accent = color(props.accentColor, 0xff625bd3.toInt())
  val surface = color(props.surfaceColor, 0xffffffff.toInt())
  val content = color(props.contentColor, 0xff667085.toInt())
  val backdrop = if (Build.VERSION.SDK_INT >= 33) host.backdrop() else null
  val full = host.fullEffects() && backdrop?.failed == false
  val modifier = Modifier.fillMaxWidth().height(64.dp)
    .semantics { testTagsAsResourceId = true }.testTag("moe-sukisu-navigation")
  CompositionLocalProvider(LocalDeviceTiltEnabled provides (props.samplingEnabled && host.activeWindow)) {
    if (full && Build.VERSION.SDK_INT >= 33 && backdrop != null) {
      FloatingBottomBar(modifier = modifier, selectedIndex = { props.selectedIndex }, selectionRevision = props.selectionRevision,
        onSelected = host::select, backdrop = backdrop, tabsCount = 3, isBlurEnabled = true,
        interactionsEnabled = props.samplingEnabled && host.activeWindow,
        isLiquid = props.mode == "liquid", isInDark = props.dark, accentColor = accent,
        tabContentColor = content, surfaceContainer = surface) {
        props.labels.forEachIndexed { index, label ->
          FloatingBottomBarItem(onClick = { host.select(index) }, enabled = props.samplingEnabled && host.activeWindow,
            modifier = Modifier.semantics { selected = props.selectedIndex == index }) {
            TabIcon(index, LocalContentColor.current)
            BasicText(label, style = TextStyle(color = LocalContentColor.current, fontSize = 12.sp, fontWeight = FontWeight.Medium), maxLines = 1)
          }
        }
      }
    } else {
      Row(modifier.background(surface, CircleShape).padding(4.dp), verticalAlignment = Alignment.CenterVertically) {
        props.labels.forEachIndexed { index, label ->
          val active = props.selectedIndex == index
          Column(Modifier.weight(1f).fillMaxHeight().background(if (active) accent.copy(alpha = 0.15f) else Color.Transparent, CircleShape)
            .selectable(selected = active, enabled = props.samplingEnabled && host.activeWindow, role = Role.Tab, onClick = { host.select(index) }),
            verticalArrangement = Arrangement.spacedBy(1.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            TabIcon(index, if (active) accent else content)
            BasicText(label, style = TextStyle(color = if (active) accent else content, fontSize = 12.sp, fontWeight = FontWeight.Medium), maxLines = 1)
          }
        }
      }
    }
  }
}

/** Todo Moe calendar/folder/inbox line glyphs. Both original tab copies read the
 * same upstream LocalContentColor, so the lens gets the accented copy too. */
@Composable
private fun TabIcon(index: Int, color: Color) {
  Canvas(Modifier.size(24.dp)) {
    scale(size.width / 24f, size.height / 24f, Offset.Zero) {
      val stroke = Stroke(1.8f, cap = StrokeCap.Round, join = StrokeJoin.Round)
      when (index) {
        0 -> {
          drawRoundRect(color, Offset(3f, 5f), Size(18f, 16f), CornerRadius(2f), style = stroke)
          drawLine(color, Offset(7f, 3f), Offset(7f, 7f), 1.8f, StrokeCap.Round)
          drawLine(color, Offset(17f, 3f), Offset(17f, 7f), 1.8f, StrokeCap.Round)
          drawLine(color, Offset(3f, 11f), Offset(21f, 11f), 1.8f, StrokeCap.Round)
          drawCircle(color, 1f, Offset(8f, 16f))
        }
        1 -> drawPath(Path().apply {
          moveTo(3f, 7f); lineTo(3f, 5f); quadraticTo(3f, 3f, 5f, 3f); lineTo(10f, 3f)
          lineTo(12f, 6f); lineTo(19f, 6f); quadraticTo(21f, 6f, 21f, 8f)
          lineTo(21f, 19f); quadraticTo(21f, 21f, 19f, 21f); lineTo(5f, 21f)
          quadraticTo(3f, 21f, 3f, 19f); close()
        }, color, style = stroke)
        else -> {
          drawPath(Path().apply {
            moveTo(3f, 13f); lineTo(6f, 4f); lineTo(18f, 4f); lineTo(21f, 13f)
            lineTo(21f, 20f); lineTo(3f, 20f); close()
          }, color, style = stroke)
          drawPath(Path().apply { moveTo(3f, 13f); lineTo(8f, 13f); lineTo(10f, 16f); lineTo(14f, 16f); lineTo(16f, 13f); lineTo(21f, 13f) }, color, style = stroke)
        }
      }
    }
  }
}
