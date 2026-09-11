# Android 玻璃实现与验证

实现路径：`apps/mobile/modules/moe-glass`（原创 Kotlin/AGSL）和 `apps/mobile/moe/glass`（React Native 接入与回退）。当前是开发实现，设备表现尚未验收。

| 能力 | 路径 | 当前证据边界 |
|---|---|---|
| 关闭 | 无背景采样、清晰实底，导航仍由 RN 处理 | TypeScript 回退逻辑有自动化测试 |
| 柔和 | Android API 31+，原生 pre-draw 对真实 RN View 树局部降采样，RenderNode/RenderEffect 模糊 | 需要 APK 与设备滚动验证 |
| 液态 | API 33+，模糊背景经过原创 AGSL 静态边缘折射；旧版本或减少动画降为柔和 | 实验能力，不能称为复现 SukiSU 成品效果 |
| 失效回退 | 原生模块缺失、旧系统、软件画布、采样异常、内存不足 | 保留 RN 导航、选中态和操作 |

背景双缓冲最长边按底栏宽度限制到 768 像素，并在尺寸改变、卸载或窗口隐藏时释放。采样发生在 Android 原生绘制周期，排除全部玻璃 View，避免递归与玻璃采样自身。只有采样像素变化才触发自身重绘；额外一次绘制比较相等后停止，避免 pre-draw 无条件 invalidate 造成静止场景循环。没有 JS 定时截图、任务状态副本或持续 JS 动画时钟。SurfaceView/视频不在该采样路线的覆盖范围。部分硬件图像不能绘入软件位图时使用实底，因此“API 支持”不等于当前设备动态效果已通过。

没有采用 SukiSU、Miuix 或 AndroidLiquidGlass 的代码和素材；用户先前使用成功的工程尚未提供。当前源码按本 fork 的 AGPL-3.0-only 保留。Android 原生 API 参考：[RenderEffect](https://developer.android.com/reference/android/graphics/RenderEffect)、[RuntimeShader](https://developer.android.com/reference/android/graphics/RuntimeShader)；桥接参考 [Expo Native View](https://docs.expo.dev/modules/native-view-tutorial/)。

## 同场景验证

导航前景放在原生 Expo GroupView 内；采样跳过整个组，避免图标、文字与选中背景产生自采样重影。GroupView 遵循 RN/Yoga 子节点布局契约，覆写继承的 LinearLayout.onLayout 为不重排子节点。原生可用时关闭/开启玻璃保持同一棵导航节点树。以上两项已按本地 Expo/RN 框架源码独立审查，真实触控、首帧和旋转仍须设备验证。

开发验证页 `/moe-glass-lab` 提供 40 行彩色文字/条纹、三种玻璃模式、深色、减少动画、中文输入与可点击底栏。它不读写任务数据。

1. 固定候选 APK SHA-256、机型、Android/HyperOS、刷新率与导航方式。滚动验证页，对比关闭/柔和/液态并录屏，检查颜色和条纹是否连续随背景变化。
2. 在每种模式分别记录 `adb shell dumpsys gfxinfo io.github.xiaolexldw.todomoe.dev framestats`；记录操作时长、帧统计和内存，保持相同滚动手势与设备温度。单次截图不能证明动态能力。
3. 验证键盘、返回、手势边缘、安全区、横竖屏/折叠、前后台恢复与重复进出；检查底栏点击与 RN 列表手势均可操作。
4. 关闭玻璃和减少动画后检查相同操作仍完整；朗读/大字体检查文字、选择状态和至少 48 dp 触控目标。
5. 在实际今天/清单/收件箱页重复滚动与大清单对照。若采样或性能未达标，候选默认保留实底或已验证的柔和效果，并在版本记录标注。

结果填入 `docs/versions/v0.2.0.md` 与 `docs/versions/v1.0.0.md` 对应 QA。本轮未连接 Android 设备，以上项目不能标为通过。
