package io.github.xiaolexldw.todomoe.glass

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GlassLensStateTest {
  @Test fun normalizedContractKeepsCenterSizePressureAndVelocityInOneSnapshot() {
    val state = GlassLensState.from(listOf(1.0, 0.25, 0.5, 0.3, 0.8, 0.75, -1.5, 2.0))
    assertTrue(state.enabled)
    assertEquals(0.25f, state.centerX, 0f)
    assertEquals(0.5f, state.centerY, 0f)
    assertEquals(0.3f, state.width, 0f)
    assertEquals(0.8f, state.height, 0f)
    assertEquals(0.75f, state.press, 0f)
    assertEquals(-1.5f, state.velocityX, 0f)
    assertEquals(2f, state.velocityY, 0f)
  }

  @Test fun overshootIsBoundedWithoutChangingTheWireUnits() {
    val state = GlassLensState.from(listOf(1.0, -0.2, 1.2, 2.0, 3.0, 2.0, -400.0, 400.0))
    assertTrue(state.enabled)
    assertEquals(0f, state.centerX, 0f)
    assertEquals(1f, state.centerY, 0f)
    assertEquals(1f, state.width, 0f)
    assertEquals(1f, state.height, 0f)
    assertEquals(1f, state.press, 0f)
    assertEquals(-4f, state.velocityX, 0f)
    assertEquals(4f, state.velocityY, 0f)
  }

  @Test fun malformedOrNonFiniteStateDisablesTheEntireLens() {
    val valid = listOf(1.0, 0.5, 0.5, 0.3, 0.8, 0.0, 0.0, 0.0)
    assertEquals(GlassLensState.Disabled, GlassLensState.from(valid.dropLast(1)))
    assertEquals(GlassLensState.Disabled, GlassLensState.from(valid + 0.0))
    for (index in valid.indices) {
      for (invalid in listOf(Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY)) {
        assertEquals(GlassLensState.Disabled, GlassLensState.from(valid.toMutableList().apply { this[index] = invalid }))
      }
    }
  }

  @Test fun disabledAndZeroSizeDoNotCreateAnOpticalRegion() {
    assertFalse(GlassLensState.from(listOf(0.0, 0.5, 0.5, 0.3, 0.8, 1.0, 0.0, 0.0)).enabled)
    assertFalse(GlassLensState.from(listOf(1.0, 0.5, 0.5, 0.0, 0.8, 1.0, 0.0, 0.0)).enabled)
    assertFalse(GlassLensState.from(listOf(1.0, 0.5, 0.5, 0.3, -0.1, 1.0, 0.0, 0.0)).enabled)
  }

  @Test fun repeatedValuesHaveStableEqualityForNativeInvalidationCoalescing() {
    val values = listOf(1.0, 0.25, 0.5, 0.3, 0.8, 0.75, -1.5, 2.0)
    assertEquals(GlassLensState.from(values), GlassLensState.from(values.toList()))
  }
}
