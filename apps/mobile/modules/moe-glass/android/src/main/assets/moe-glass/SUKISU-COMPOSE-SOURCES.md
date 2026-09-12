# Todo Moe original floating bar adaptation

The `MoeLiquidTabBar` Expo View embeds a Compose bar. The RN application retains
navigation and commits selection through `selectedIndex` plus `selectionRevision`.
No upstream root-management application code, branding, or task data was imported.

## Fixed sources and licenses

- SukiSU-Ultra commit `9fbe8fe8ca90c62c259c5894bf96d02ac31209b9`,
  `manager/app/src/main/java/com/sukisu/ultra/ui/component/FloatingBottomBar.kt`
  and `liquid/{CombinedBackdrop,InnerShadow,Lens,Vibrancy}.kt`. These selected files
  explicitly identify Apache-2.0 compose-miuix-ui / Kyant0 ancestry. Local verified
  LanMoe adaptations supplied the package/theme seam; optical shader strings remain
  the fixed upstream implementation.
- compose-miuix-ui commit `c36fab72391801d1e3ea5a00f966bf16bac28d4c`,
  `miuix-blur/src/{commonMain,androidMain}/kotlin/top/yukonga/miuix/kmp/blur/`.
  The checked-in source snapshot includes its Apache-2.0 headers. The published
  0.9.3 binary is **not** included: this Android-only source adaptation compiles
  against this app's Kotlin 2.1.20 and Compose 1.9.0, with SDK 36.
- DampedDragAnimation: Apache-2.0 compose-miuix-ui ancestor
  `372c7943f6e89ad75f74f322cee35789cf97ebaf`,
  `example/shared/src/commonMain/kotlin/component/animation/DampedDragAnimation.kt`.
  Spring constants and velocity equations match the fixed SukiSU component.
- InteractiveHighlight: Apache-2.0 Kyant0/AndroidLiquidGlass ancestor
  `65ab177e90e5c1d8c62e70cf7755841982da65f6`,
  `app/src/commonMain/kotlin/com/kyant/backdrop/catalog/utils/InteractiveHighlight.kt`.
  Its Android binding and 0.06/0.12/1.2 coefficients follow the pinned SukiSU bar.

The accompanying `Apache-2.0.txt` and `NOTICE.txt` apply. Original file headers are
retained. Source imports are relocated under the module's `vendor` namespace.

## Deliberate adaptations

1. The complete liquid route keeps the 64/56dp layout, 4dp inset, 24/24dp outer
   lens, 4dp blur, 1.5 vibrancy, hidden accent-colored/scaled tab copy,
   CombinedBackdrop, 10/14dp pressed depth lens, seven-sample dispersion,
   dual BloomStroke lights, gravity rotations, inner shadow and original springs.
   The icons and three translated labels belong to Todo Moe. Both content copies
   consume the same `LocalContentColor`; Material3 is not required.
2. Android RuntimeShader/RenderEffect bindings replace expect/actual and the
   shader-core compatibility wrapper; shader strings and bloom formulas are kept.
   The module enables Kotlin's context-parameters option for the unchanged
   LayerRecorder helper, without changing the RN compiler version.
3. `HardwareComposeBackdrop` supplies the existing shared native window display
   list, following LayerBackdrop's inverse transform, downscale grid and residual
   offsets. The Compose host implements `GlassSourceExcluded`; its entire tree
   and historical ancestors stay outside page capture. The original tabsBackdrop
   intentionally captures only its own hidden tab row.
4. Cancellation returns to the externally committed selection and emits no
   navigation event. Successful release emits at most once; external selection
   receipts also reconcile rejected navigation without sending another event.
   Off/reduced/unsupported use basic accessible navigation; Soft uses the same
   component's blur with lens/pressed optical deformation disabled.
5. Disabling sampling freezes the source and disables gestures and the gravity
   subscription while preserving the last tilt and full composition for fade-out.
   Window/host teardown releases native leases and Compose resources. A failed
   native source keeps basic tab navigation available. The native semantics tag
   `moe-sukisu-navigation` is exposed as a resource ID for device verification.

The existing sheet GlassSurface remains separate. Its seven-sample shader's
erroneous extra green contribution in the blue sample was removed to restore
unit constant-color gain. JVM tests cover this numerical contract; compilation
does not establish GPU visual parity or device gesture correctness.
