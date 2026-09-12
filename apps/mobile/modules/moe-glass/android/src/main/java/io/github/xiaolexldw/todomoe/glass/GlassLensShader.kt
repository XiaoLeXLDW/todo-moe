package io.github.xiaolexldw.todomoe.glass

// SDF, circle-map refraction and seven-sample dispersion adapted from
// SukiSU-Ultra 9fbe8fe8ca90c62c259c5894bf96d02ac31209b9, liquid/Lens.kt.
// That file identifies Kyant0/AndroidLiquidGlass and compose-miuix-ui, Apache-2.0.
// Modified for Todo Moe: sampled-pixel coordinates, moving normalized lens,
// bounded velocity response and analytic highlight/inner shadow. See the bundled
// assets/moe-glass/THIRD_PARTY.md and Apache-2.0.txt for provenance and license.
internal object GlassLensShader {
  const val Source = """
    uniform shader backdrop;
    uniform float2 size;
    uniform float2 padding;
    uniform float cornerRadius;
    uniform float pixel;
    uniform float outerHeight;
    uniform float outerAmount;
    uniform float4 lensRect;
    uniform float lensEnabled;
    uniform float press;
    uniform float2 velocity;
    uniform float lensHeight;
    uniform float lensAmount;

    float sdRoundedRect(float2 coord, float2 halfSize, float radius) {
      float2 cornerCoord = abs(coord) - (halfSize - float2(radius));
      float outside = length(max(cornerCoord, 0.0)) - radius;
      float inside = min(max(cornerCoord.x, cornerCoord.y), 0.0);
      return outside + inside;
    }

    float2 safeNormal(float2 value) {
      return value / max(length(value), 0.0001);
    }

    float2 gradSdRoundedRect(float2 coord, float2 halfSize, float radius) {
      float2 cornerCoord = abs(coord) - (halfSize - float2(radius));
      if (cornerCoord.x >= 0.0 || cornerCoord.y >= 0.0) {
        return sign(coord) * safeNormal(max(cornerCoord, 0.0));
      }
      float gradX = step(cornerCoord.y, cornerCoord.x);
      return sign(coord) * float2(gradX, 1.0 - gradX);
    }

    float circleMap(float x) {
      x = clamp(x, 0.0, 1.0);
      return 1.0 - sqrt(max(0.0, 1.0 - x * x));
    }

    float2 refraction(float2 centered, float2 halfSize, float radius,
                      float height, float amount, float depth) {
      float sd = sdRoundedRect(centered, halfSize, radius);
      if (height <= 0.0 || sd > 0.0 || -sd >= height) return float2(0.0);
      float d = circleMap(1.0 + sd / height) * amount;
      float gradRadius = min(radius * 1.5, min(halfSize.x, halfSize.y));
      float2 grad = safeNormal(gradSdRoundedRect(centered, halfSize, gradRadius)
                              + depth * safeNormal(centered));
      return d * grad;
    }

    half4 dispersed(float2 coord, float2 offset) {
      half4 color = half4(0.0);
      half4 red = backdrop.eval(coord + offset);
      color.r += red.r / 3.5; color.a += red.a / 7.0;
      half4 orange = backdrop.eval(coord + offset * (2.0 / 3.0));
      color.r += orange.r / 3.5; color.g += orange.g / 7.0; color.a += orange.a / 7.0;
      half4 yellow = backdrop.eval(coord + offset * (1.0 / 3.0));
      color.r += yellow.r / 3.5; color.g += yellow.g / 3.5; color.a += yellow.a / 7.0;
      half4 green = backdrop.eval(coord);
      color.g += green.g / 3.5; color.a += green.a / 7.0;
      half4 cyan = backdrop.eval(coord - offset * (1.0 / 3.0));
      color.g += cyan.g / 3.5; color.b += cyan.b / 3.0; color.a += cyan.a / 7.0;
      half4 blue = backdrop.eval(coord - offset * (2.0 / 3.0));
      color.b += blue.b / 3.0; color.a += blue.a / 7.0;
      half4 purple = backdrop.eval(coord - offset);
      color.r += purple.r / 7.0; color.b += purple.b / 3.0; color.a += purple.a / 7.0;
      return color;
    }

    half4 main(float2 coord) {
      float2 local = coord - padding;
      float2 halfSize = size * 0.5;
      float2 centered = local - halfSize;
      float radius = min(cornerRadius, min(halfSize.x, halfSize.y));
      float2 sampleAt = coord + refraction(centered, halfSize, radius,
                                           outerHeight, -outerAmount, 0.0);
      half4 color = backdrop.eval(sampleAt);
      if (lensEnabled > 0.5) {
        float2 lensHalf = max(lensRect.zw * 0.5, float2(pixel));
        // Velocity is a bounded optical deformation, not a native gesture driver.
        lensHalf *= float2(1.0 + min(abs(velocity.x) * 0.025, 0.10),
                          1.0 + min(abs(velocity.y) * 0.025, 0.10));
        float2 lensCoord = local - lensRect.xy;
        float lensRadius = min(lensHalf.x, lensHalf.y);
        float sd = sdRoundedRect(lensCoord, lensHalf, lensRadius);
        if (sd <= pixel) {
          float amount = lensAmount * (0.35 + 0.65 * press);
          float2 bend = refraction(lensCoord, lensHalf, lensRadius,
                                   lensHeight, -amount, press);
          float dispersion = 0.5 * press * (lensCoord.x * lensCoord.y)
                            / max(lensHalf.x * lensHalf.y, 1.0);
          color = press > 0.01 ? dispersed(sampleAt + bend, bend * dispersion)
                              : backdrop.eval(sampleAt + bend);
          float2 normal = gradSdRoundedRect(lensCoord, lensHalf, lensRadius);
          float2 lightDir = safeNormal(float2(-0.65, -0.85) + velocity * 0.06);
          float rim = 1.0 - smoothstep(pixel * 0.4, pixel * 1.8, abs(sd));
          float lighting = 0.45 + 0.55 * abs(dot(normal, lightDir));
          float innerShadow = (1.0 - smoothstep(0.0, pixel * 8.0, -min(sd, 0.0)))
                              * max(dot(normal, -lightDir), 0.0) * press * 0.12;
          float spot = 1.0 - smoothstep(0.0, max(lensHalf.x, lensHalf.y) * 1.2,
                                     length(lensCoord - lensHalf * float2(-0.25, -0.3)));
          half shine = half(rim * lighting * (0.10 + 0.16 * press) + spot * press * 0.06);
          color.rgb = max(color.rgb - half3(innerShadow), half3(0.0));
          color.rgb = min(color.rgb + half3(shine) * color.a, half3(color.a));
        }
      }
      return color;
    }
  """
}
