# 肤色统一编辑提示词

使用内置 image_gen，2026-09-14。输入1为本目录 `family-mascot-v2-transparent.png`；输入2为 `local-lan-device-peeker/assets/branding/lan-moe-source.png`，仅作肤色参考，不进入构建依赖。

```text
Precise local color edit. Image 1 is the EDIT TARGET: Todo Moe transparent cat mascot with clipboard. Image 2 is COLOR REFERENCE ONLY: Lan Moe cat with router. Return only edited image 1 at identical framing, pose, geometry and transparent RGBA background. Change ONLY facial skin coloration and cheek blush to match image 2's warm soft cream/beige skin: slightly darker, less pink/pale, subtle warm peach shading, gentler less saturated blush. Preserve exact face shape, eyes and mouth, black/white hair, ear colors, white sticker outline, gold bell, clipboard and cyan accents unchanged. Do not replace clipboard with router. Do not scale, translate, rotate or redraw shapes. Keep the original margins and all transparency. No background plate, checkerboard, text, new shadows or extra elements.
```

生成结果的棋盘背景未采用；只提取脸部肤色并保留原图Alpha和其他区域像素。最终源为 `family-mascot-v3-skin.png`；原v2保留。
