# Android 玻璃实现与验证

当前 T02 路线为 `apps/mobile/modules/moe-glass` 的 Expo View/Kotlin/AGSL 适配，不引入 Compose/Miuix。圆角 SDF、梯度、circle-map 折射和七采样色散来自已固定来源的 LanMoe/SukiSU lens；JS/RN 继续拥有前景、手势与导航。**本轮渲染器尚待候选 APK 和设备效果/性能验证；下文 vc3 的旧实现数据不能证明新实现通过。** 完整设备矩阵与 v1.0 也未由此次代码实现放行。

## T02 原生契约

| Prop | 含义与原生边界 |
|---|---|
| `lensState` | 原子 8 元素数组 `[enabled, centerX, centerY, width, height, press, velocityX, velocityY]`。位置和尺寸按本 GlassSurface 的 layout 宽高归一化到 0..1；UI 内边距应在归一化前计入。速度单位为该框宽/高每秒，原生截断到 -4..4；press 截断到 0..1。长度不为 8 或出现 NaN/Infinity 会禁用整个 lens。0 尺寸不创建透镜区域。 |
| `cornerRadius` | 原生外框圆角，dp；默认 28，输入限制 0..128，绘制再限制为短边一半。 |
| `samplingEnabled` | 默认 true。false 移除 pre-draw 采样观察者并保留最后双缓冲供键盘淡出；后续 optics props 仍可重绘静态背景。窗口隐藏、卸载、尺寸/密度变化或 mode=off 会释放缓冲。 |
| `mode/dark/reducedMotion` | 延续原接口。API 31–32 使用模糊；API 33+ 才构造 RuntimeShader。减少动画使用柔和路径；失效保留 RN 前景和触控。 |

JS 可用 UI 线程 `useAnimatedProps` 一次发送 lensState。原生不计算业务选中项、不驱动手势/弹簧、不读取任务。每次实际变化只标记 optics dirty，下一 draw 更新 uniforms 并重建轻量 RenderEffect；编译好的 RuntimeShader 持续复用。RenderEffect/Skia 保存 shader builder 的副本，所以仅修改 uniforms 而复用旧 RenderEffect 不足以更新画面。

背景先做 saturation 1.5、4dp blur，再做 24/24dp 外框折射与 10/14dp 移动透镜。移动区域保留 35% idle 折射，press 增强深度和色散；速度最多造成 10% 光学区域形变。分析式边缘高光和内阴影为 Todo Moe 适配。此次没有复制 CombinedBackdrop 的着色/放大标签副本、BloomStroke 双光源或重力传感器，**不声称整套 SukiSU 逐像素复现**。

vc20 截图 219/222/241 已观察到透镜轮廓比外框偏软。下一候选在同一 `MoeGlassView.onDraw`、AGSL/tint 之后补约 0.75dp 的全分辨率方向性细 stroke；矩形、速度 stretch、最小尺寸与 capsule 半径严格沿用 shader 几何。只补关键轮廓，不增加厚 fill，不提高整块 shader 或采样分辨率。渐变在 optics 改变时缓存更新，RN 前景仍在其上。vc21 的实际精度、明暗层次和拖动对齐仍待实机复测。

## 采样坐标和生命周期

采样在 UI native pre-draw 中完成。40dp 外扩为折射和模糊提供边缘像素；双缓冲每个方向最多 768 像素，倍率上限为柔和 0.35、液态 0.25。倍率只影响背景采样，RN 前景与原生 rim 保持全分辨率；shader 的模糊、折射距离继续按 density × sampleScale 换算，物理单位不变。每次 root draw 跳过所有 MoeGlassView 整组，避免采到自己的玻璃、图标或文本。像素与上次相同时不再 invalidate；没有 JS 截图、循环定时器或持续 Choreographer 回调。多个 surface 目前各自有区域双缓冲，不能据此声称没有重复 root-draw 成本；T08 应测实际多 surface 场景。

本次降采样针对 vc24 外屏 440dpi、机温 30.2°C 的限定 lab 对照：预热一组后进行三组 500ms 滑动，无录屏；关闭为 469 帧、P95 13ms、卡顿 8 帧（1.71%），液态为 481 帧、P95 18ms、卡顿 78 帧（16.22%）。0.25 倍率尚待下一统一候选按同条件对照，不将参数调整写成性能验收通过。

普通 RN 层级绘制自己的 root。若 surface 的 root 与当前 Activity decor 不同（RN Modal/Dialog），先绘 Activity，再叠本 dialog root 内的非 glass 内容。两层分别使用 `transformMatrixToGlobal`，经 glass 的逆矩阵映射到本地，再加 padding 和下采样倍率，包含窗口偏移、滚动和 View 变换。并监听两个 root 的 pre-draw。

这只覆盖 **当前 Activity + 当前 dialog 前景**：其他堆叠 Dialog/Popup 独立窗口、系统键盘/WindowManager dim 合成层、SurfaceView/视频和不能画入软件 Canvas 的硬件内容不在此来源链中。透明 RN scrim 若属于当前 dialog 的 View 树则可采入；系统合成 dim 不可冒充已覆盖。采样异常/内存不足回退实底，GPU shader 异常回退 blur；每个 view 首次失效使用 `Log.w("MoeGlass", 固定原因)`，不输出像素、任务或异常载荷。不能把这类 fallback 的截图当作 shader 成功。该坐标实现仍须通过键盘、Modal、折叠/旋转的真机检查。

## 来源与当前验证边界

固定来源是 [SukiSU Lens.kt / 9fbe8fe8ca90c62c259c5894bf96d02ac31209b9](https://github.com/SukiSU-Ultra/SukiSU-Ultra/blob/9fbe8fe8ca90c62c259c5894bf96d02ac31209b9/manager/app/src/main/java/com/sukisu/ultra/ui/component/liquid/Lens.kt)，该文件明确标注 Apache-2.0 的 Kyant0/AndroidLiquidGlass / compose-miuix-ui 祖先。读取的 LanMoe 参考源码未修改。改动声明、NOTICE 与完整许可证随模块放在 `android/src/main/assets/moe-glass/`，可由 Android assets 合并入候选 APK。

原生单测复用本仓库已有 JUnit 4.13.2，覆盖 8 值原子契约、超范围/非有限输入、禁用及重复值稳定性。定向 `:moe-glass:compileReleaseKotlin :moe-glass:testReleaseUnitTest` 已通过，5 项 JVM 测试无失败；本地报告在模块 `android/build/test-results/testReleaseUnitTest/`，编译日志在 `android/build/verification/`。Kotlin 编译和单测不验证 AGSL 在手机 GPU 的输出。新 renderer 的 APK、shader 实际执行、移动透镜画面、Modal 和 T08 性能证据由本轮候选记录另填。

## 以下是旧渲染器 vc2/vc3 历史证据

旧实现已在 MIX Fold 2 / Android 15 观察到背景随滚动经过玻璃、前景文字清晰；vc3 三模式各三轮 lab 对照只在下述限定近似口径中通过预算，详见 [真机记录](DEVICE-VALIDATION-20260911.md)。

| 能力 | 路径 | 当前证据边界 |
|---|---|---|
| 关闭 | 无背景采样、清晰实底，导航仍由 RN 处理 | TypeScript 回退逻辑有自动化测试 |
| 柔和 | Android API 31+，原生pre-draw降采样，采样尺寸内模糊后放大 | vc3单机lab滚动已观察；近似P95预算通过且桶边界有余量 |
| 液态 | API 33+，模糊背景经过原创 AGSL 静态边缘折射；旧版本或减少动画降为柔和 | 实验能力；vc3 P95桶≈19ms、接近off×1.2阈值，不能作为精确百分位或SukiSU复现证明 |
| 失效回退 | 原生模块缺失、旧系统、软件画布、采样异常、内存不足 | 保留 RN 导航、选中态和操作 |

背景采用按底栏尺寸限制的双缓冲降采样，在尺寸改变、卸载或窗口隐藏时释放。vc3在采样尺寸内执行模糊/折射后再放大，保留视觉半径与位移。采样排除整个玻璃GroupView，只有像素变化才触发重绘，避免静止场景自激。没有JS定时截图或任务状态副本。SurfaceView/视频不在此路线内；硬件图像无法采样时回退实底。“API支持”和本次单机观察都不证明所有设备可用。

上述 vc3 历史实现没有采用 SukiSU、Miuix 或 AndroidLiquidGlass 代码；这项历史描述不适用于当前 T02。当前改编来源和许可见本文前段。Android 原生 API 参考：[RenderEffect](https://developer.android.com/reference/android/graphics/RenderEffect)、[RuntimeShader](https://developer.android.com/reference/android/graphics/RuntimeShader)；桥接参考 [Expo Native View](https://docs.expo.dev/modules/native-view-tutorial/)。

## 同场景验证

导航前景放在原生 Expo GroupView 内；采样跳过整个组，避免图标、文字与选中背景产生自采样重影。GroupView 遵循 RN/Yoga 子节点布局契约，覆写继承的 LinearLayout.onLayout 为不重排子节点。原生可用时关闭/开启玻璃保持同一棵导航节点树。以上两项已按本地Expo/RN框架源码独立审查，底栏触控和滚动已有设备观察；旋转/折叠等仍须验证。

开发验证页 `/moe-glass-lab` 提供 40 行彩色文字/条纹、三种玻璃模式、深色、减少动画、中文输入与可点击底栏。它不读写任务数据。

1. 固定候选 APK SHA-256、机型、Android/HyperOS、刷新率与导航方式。滚动验证页，对比关闭/柔和/液态并录屏，检查颜色和条纹是否连续随背景变化。
2. 在每种模式分别记录 `adb shell dumpsys gfxinfo io.github.xiaolexldw.todomoe.dev framestats`；记录操作时长、帧统计和内存，保持相同滚动手势与设备温度。单次截图不能证明动态能力。
3. 验证键盘、返回、手势边缘、安全区、横竖屏/折叠、前后台恢复与重复进出；检查底栏点击与 RN 列表手势均可操作。
4. 关闭玻璃和减少动画后检查相同操作仍完整；朗读/大字体检查文字、选择状态和至少 48 dp 触控目标。
5. 在实际今天/清单/收件箱页重复滚动与大清单对照。若采样或性能未达标，候选默认保留实底或已验证的柔和效果，并在版本记录标注。

## 已完成的限定lab对照

vc2和vc3各按关闭/柔和/液态执行同手势三轮，同时录屏和截图。使用前后计数器及Histogram差量，未用PID累计P95或平均三轮百分位代替场景结果。

| vc3模式 | 差量帧数 | 非legacy Janky | P95桶近似 | 相对本版off |
|---|---:|---:|---:|---:|
| 关闭 | 950 | 5 / 0.526% | 16ms | 基线 |
| 柔和 | 944 | 3 / 0.318% | 15ms | 0.938× |
| 液态 | 962 | 2 / 0.208% | 19ms | 1.188× |

预算为off×1.2（桶标签19.2ms）及非legacy Janky增加≤2个百分点。两档在本次Histogram近似口径内满足；液态桶内真实比值约(1.118,1.250)，不能无条件声称精确连续P95通过。legacy相对off反而增加10.753/11.952个百分点，不能宣称所有卡顿指标改善或120fps流畅。

vc2桶近似16/20/22ms的未放行结果保留。vc2从设置弹窗进入、vc3冷启动深链直入，视图树、温度和缓存状态不同；跨版本下降不能全部归因滤镜。每模式不足9秒，内存仅前后快照，没有耗电、泄漏、纯静止或大清单结论。完整计算见 [vc3分析](../../evidence/development/device-20260911-153f8f46/vc3-glass-performance-analysis.md) 与 [vc2分析](../../evidence/development/device-20260911-153f8f46/glass-performance-analysis.md)。

vc4首页键盘底部和热路径Toast另有通过证据；More顶部安全区待vc5实测。其余旋转/折叠、TalkBack/大字体、旧系统/异常回退、长期资源与完整页面矩阵仍按对应QA逐项记录，不由本次lab结果自动放行。

## vc3滤镜改进与测量边界

滤镜在降采样RenderNode尺寸内模糊/折射，再放大到导航尺寸；模糊半径与AGSL位移同步缩放。vc2 P95桶off/soft/liquid约16/20/22ms，vc3约16/15/19ms。vc3内部的非legacy Janky与Histogram代理预算满足本次记录；液态桶精度仍跨精确阈值，保持实验状态。旧legacy指标未同步改善，内存只是整个进程快照，不声称无泄漏或120fps。

两版进入lab的路径、启动栈及温度不同，跨版本差额不能全部归因单一改动。原始与新报告分别为本地 `glass-performance-analysis.md`、`vc3-glass-performance-analysis.md`，路径见真机记录。
