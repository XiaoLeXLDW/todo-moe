# 肤色统一编辑提示词

使用内置 image_gen，2026-09-14。输入1为本目录 `family-mascot-v2-transparent.png`；输入2为 `local-lan-device-peeker/assets/branding/lan-moe-source.png`，仅作肤色参考，不进入构建依赖。

```text
Precise local color edit. Image 1 is the EDIT TARGET: Todo Moe transparent cat mascot with clipboard. Image 2 is COLOR REFERENCE ONLY: Lan Moe cat with router. Return only edited image 1 at identical framing, pose, geometry and transparent RGBA background. Change ONLY facial skin coloration and cheek blush to match image 2's warm soft cream/beige skin: slightly darker, less pink/pale, subtle warm peach shading, gentler less saturated blush. Preserve exact face shape, eyes and mouth, black/white hair, ear colors, white sticker outline, gold bell, clipboard and cyan accents unchanged. Do not replace clipboard with router. Do not scale, translate, rotate or redraw shapes. Keep the original margins and all transparency. No background plate, checkerboard, text, new shadows or extra elements.
```

生成结果的棋盘背景未采用；只提取脸部肤色并保留原图Alpha和其他区域像素。最终源为 `family-mascot-v3-skin.png`；原v2保留。

## 提亮修正

内置imagegen，编辑对象为v2透明源，输出经脸部连通区提取保存为 `family-mascot-v4-light.png`；不采用生成图的棋盘背景。

```text
Precise minimal color edit of this exact icon mascot. Keep all original geometry, framing, linework, facial expression, eye, mouth, hair, ears, bell and clipboard unchanged. Only facial skin and blush: keep skin LIGHT and luminous, near the original brightness, add a VERY SUBTLE warm cream undertone and soften the pink blush slightly. Do not darken or tan the face. Preserve seamless soft skin shading; no hard edged patches, polygonal shadows or changes to mouth. Genuine transparent RGBA background, no checkerboard. Original 1254x1254 framing and scale. No new objects or redraw.
```
