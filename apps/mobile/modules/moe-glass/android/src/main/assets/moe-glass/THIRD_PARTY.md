# Todo Moe lens provenance

`GlassLensShader.kt` adapts the expressly Apache-2.0 lens file from
[SukiSU-Ultra 9fbe8fe8ca90c62c259c5894bf96d02ac31209b9](https://github.com/SukiSU-Ultra/SukiSU-Ultra/blob/9fbe8fe8ca90c62c259c5894bf96d02ac31209b9/manager/app/src/main/java/com/sukisu/ultra/ui/component/liquid/Lens.kt).
That file identifies [Kyant0/AndroidLiquidGlass](https://github.com/Kyant0/AndroidLiquidGlass)
and the [compose-miuix-ui examples](https://github.com/compose-miuix-ui/miuix) as its Apache-2.0 ancestors.
The inspected local reference is LanMoe's `ui/glass/liquid/Lens.kt`, whose
`android/third-party/SOURCES.md` pins the same SukiSU commit and documents its
package-only adaptation. No file in the reference project was modified.

Retained mechanisms: rounded-rectangle signed distance and gradient, circle-map
edge refraction with a negative sampling amount, depth contribution and the
seven red/orange/yellow/green/cyan/blue/purple sample weights.

Todo Moe changes: guard zero-length normals and numerical square-root bounds;
use padded sampled-pixel coordinates; add a moving lens rectangle controlled by
one normalized 8-value native prop; clamp velocity and pressure; add bounded
velocity deformation and analytic rim/press highlight/inner shadow. The bar's
4dp blur, 1.5 saturation, 24/24dp outer lens and 10/14dp moving-lens scale follow
the fixed reference's effect parameters. The moving lens keeps a 35% idle
refraction amount so its region remains visible without a held press.

This is an Expo View/Kotlin/AGSL adapter. It does not reproduce the Compose
`CombinedBackdrop` tinted/scaled tab layer, `BloomStroke` dual lights, device
tilt or upstream gesture/spring code. RN foreground text/icons are excluded
from sampling and stay sharp. It is not a source- or GPU-parity claim for the
entire SukiSU floating bar.

The copied lens mechanisms retain Apache-2.0 terms. Other original Todo Moe
adapter code remains governed by the repository license. `NOTICE.txt` and the
complete `Apache-2.0.txt` are bundled beside this file as Android assets.
