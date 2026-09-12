package io.github.xiaolexldw.todomoe.glass

import org.junit.Assert.assertEquals
import org.junit.Test

class GlassDispersionTest {
  @Test fun dispersionPreservesAConstantColorInEveryChannel() {
    val shader = GlassLensShader.Source.substringAfter("half4 dispersed").substringBefore("half4 main")
    for (channel in "rgba") {
      val weights = Regex("color\\.$channel \\+= [a-z]+\\.$channel / ([0-9.]+)")
        .findAll(shader).map { 1.0 / it.groupValues[1].toDouble() }.sum()
      assertEquals("constant-color $channel gain", 1.0, weights, 0.000001)
    }
  }
}
