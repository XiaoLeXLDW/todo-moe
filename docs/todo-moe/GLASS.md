# Android 玻璃实现与验证

当前 T02 路线为 `apps/mobile/modules/moe-glass` 的 Expo View/Kotlin/AGSL 适配，不引入 Compose/Miuix。圆角 SDF、梯度、circle-map 折射和七采样色散来自已固定来源的 LanMoe/SukiSU lens；JS/RN 继续拥有前景、手势与导航。vc25 真机 Inbox 性能未通过，现将软件 Bitmap/root.draw 采样替换为单一硬件 RenderNode 来源。**新硬件来源仍待候选 APK 的画面与性能验证；vc25 和下文 vc3 的旧实现数据不能证明它通过。** 完整设备矩阵与 v1.0 也未由此次代码实现放行。

## T02 原生契约

| Prop | 含义与原生边界 |
|---|---|
| `lensState` | 原子 8 元素数组 `[enabled, centerX, centerY, width, height, press, velocityX, velocityY]`。位置和尺寸按本 GlassSurface 的 layout 宽高归一化到 0..1；UI 内边距应在归一化前计入。速度单位为该框宽/高每秒，原生截断到 -4..4；press 截断到 0..1。长度不为 8 或出现 NaN/Infinity 会禁用整个 lens。0 尺寸不创建透镜区域。 |
| `cornerRadius` | 原生外框圆角，dp；默认 28，输入限制 0..128，绘制再限制为短边一半。 |
| `samplingEnabled` | 默认 true。false 停止本 surface 的记录更新；当窗口没有活跃采样者时也移除共享来源观察者。保留最后显示列表供键盘淡出，后续 optics props 仍可更新效果。恢复采样时重新记录来源。窗口隐藏、卸载、尺寸/密度变化或 mode=off 释放节点与来源引用。显示列表仍可能引用框架子节点，不保证 RenderThread 独立动画的逐像素冻结。 |
| `mode/dark/reducedMotion` | 延续原接口。API 31–32 使用模糊；API 33+ 才构造 RuntimeShader。减少动画使用柔和路径；失效保留 RN 前景和触控。 |

JS 可用 UI 线程 `useAnimatedProps` 一次发送 lensState。原生不计算业务选中项、不驱动手势/弹簧、不读取任务。每次实际变化只标记 optics dirty，下一 draw 更新 uniforms 并重建轻量 RenderEffect；编译好的 RuntimeShader 持续复用。RenderEffect/Skia 保存 shader builder 的副本，所以仅修改 uniforms 而复用旧 RenderEffect 不足以更新画面。

背景先做 saturation 1.5、4dp blur，再做 24/24dp 外框折射与 10/14dp 移动透镜。移动区域保留 35% idle 折射，press 增强深度和色散；速度最多造成 10% 光学区域形变。分析式边缘高光和内阴影为 Todo Moe 适配。此次没有复制 CombinedBackdrop 的着色/放大标签副本、BloomStroke 双光源或重力传感器，**不声称整套 SukiSU 逐像素复现**。

vc20 截图 219/222/241 已观察到透镜轮廓比外框偏软。下一候选在同一 `MoeGlassView.onDraw`、AGSL/tint 之后补约 0.75dp 的全分辨率方向性细 stroke；矩形、速度 stretch、最小尺寸与 capsule 半径严格沿用 shader 几何。只补关键轮廓，不增加厚 fill，不提高整块 shader 或采样分辨率。渐变在 optics 改变时缓存更新，RN 前景仍在其上。vc21 的实际精度、明暗层次和拖动对齐仍待实机复测。

## 采样坐标和生命周期

`HardwareBackdropScene` 通过 API 29 起公开的 `RenderNode.beginRecording()` 获取硬件 `RecordingCanvas`，API 31 起将显示列表交给既有 RenderEffect/AGSL；不再创建背景 Bitmap、执行软件 root.draw 或比较 sameAs。该链只在支持硬件 Canvas 的 API 31+ 启用，失败使用实底，不保留软件采样作为另一套渲染器。[Android RenderNode API](https://developer.android.com/reference/android/graphics/RenderNode)

每个 Activity/Dialog root 共享一个来源场景与一个 pre-draw 观察者，通过明确的引用计数 lease 持有；最后一个 glass 释放时移除观察者、池条目及缓存显示列表。遍历在任何 MoeGlassView 处剪枝，连同它的前景整组排除。含 glass 的祖先不调用 View.draw，只画背景并递归非 glass 内容；确定不含 glass 的子树才记录到子 RenderNode。隐藏的容器也检查 glass 后代，避免把暂时隐藏的 glass 误判为可整体录制的来源。子节点顺序、z、局部 matrix、滚动、alpha、clipBounds/outline、clipChildren/clipToPadding 参与组合；RN 圆角 overflow 使用当前已安装 runtime 的公开 `BackgroundStyleApplicator.clipToPaddingBox`。模块只 compileOnly 引用应用原有 react-android，不附带另一份 runtime。

vc26 在“同步、数据与高级设置”导航时出现 RenderThread SIGSEGV，`RenderNode::prepareTreeImpl` / `SkiaDisplayList::prepareListAndChildren` 大量重复，属于不可由 UI try/catch 捕获的循环显示列表。错误边界是仅用当前公开 childCount 判断无 glass：Android ViewGroup.dispatchDraw 还绘制私有 disappearing children，当前 react-native-screens 也使用 startViewTransition 和 DrawingOp 重放；公开子树已移除 glass 时，整体 ViewGroup.draw 仍可能录入它的旧 RenderNode。原始记录保留在 `evidence/development/device-20260911-153f8f46/vc26-crash.txt`，具体循环中的 View 实例不能只靠 native 栈反推出。

后续补丁用 `GlassAncestorHistory` 的 WeakHashMap 键记录“曾经是 glass 祖先”的容器，值仅 Boolean；在 glass attach（包括 Off）和来源检查时标记 parent 链，不随公开子节点移除、主题或 scene 重建清空。这些容器始终只记录背景并递归，不再整体 View.draw。新排除标记递增 revision，owner 即使早于 scene 的 pre-draw listener 调用 currentFrame，也必须先应用新排除并刷新来源，再使用缓存帧。弱键不强留 View/Window。该策略排除私有转场中的 glass，不承诺重放其退出前景；仍须在新候选重走原崩溃导航确认。

源 dirty/layout、层级与绘制属性变化才重录对应内容；glass 自身传播到祖先的 dirty 不当作源变化，因此仅 lens 动画不会触发重复来源录制。主题切换显式失效来源缓存，覆盖 RN CompositeDrawable 颜色/圆角原位变化而 identity/state/bounds 不变的情况；恢复采样也强制失效。其他需要自定义祖先 onDraw/foreground 或无主题事件的原位自定义 Drawable 变化不在通用重放契约内。每个 surface 只在来源版本或相对坐标改变时重录其效果节点，静止不无条件 invalidate；没有 JS 截图、循环定时器或自建 Choreographer frame callback。

40dp 外扩继续为折射和模糊提供边缘内容；效果节点每方向最多 768 像素，倍率仍为柔和 0.35、液态 0.25。RN 前景与原生 rim 保持全分辨率，shader 半径和折射距离仍按 density × sampleScale 换算。本次改变的是 CPU 软件栅格路径，未继续降低倍率来掩盖来源成本。

历史倍率试验：vc24 外屏 440dpi、机温 30.2°C 的限定 lab 对照中，关闭为 469 帧、P95 13ms、卡顿 8 帧（1.71%），液态为 481 帧、P95 18ms、卡顿 78 帧（16.22%）。vc25 改到 0.25 后 lab P95 仍为 18ms；实际 Inbox 关闭为 308 帧、P95 13ms、卡顿 0.97%，液态为 185 帧、P95 20ms、卡顿 39.46%。这些是软件来源的性能 RED，不能标作硬件路线的改进结果；硬件候选仍须以相同真实页面复测。[vc25 Inbox off 原始帧记录](../../evidence/development/device-20260911-153f8f46/taskpage-vc25-off-frames.txt)、[liquid 原始帧记录](../../evidence/development/device-20260911-153f8f46/taskpage-vc25-liquid-frames.txt)

普通 RN 层级绘制自己的 root。若 surface 的 root 与当前 Activity decor 不同（RN Modal/Dialog），先绘 Activity，再叠本 dialog root 内的非 glass 内容。两层分别使用 `transformMatrixToGlobal`，经 glass 的逆矩阵映射到本地，再加 padding 和下采样倍率，包含窗口偏移、滚动和 View 变换。并监听两个 root 的 pre-draw。

这只覆盖 **当前 Activity + 当前 dialog 前景**：其他堆叠 Dialog/Popup 独立窗口、系统键盘/WindowManager dim 合成层、SurfaceView/视频、独立 Surface，以及隐藏在自定义 ViewOverlay/私有转场列表中的绘制不在此来源链中。透明 RN scrim 若属于当前 dialog 的 View 树则可采入；系统合成 dim 不可冒充已覆盖。含 glass 的祖先自定义 onDraw/foreground、私有静态 transformation 与混合隔离效果也不能声称通用等价重放。记录异常/内存不足回退实底，GPU shader 异常仍在同一硬件来源上回退 blur；每个 view 首次失效使用 `Log.w("MoeGlass", 固定原因)`，不输出像素、任务或异常载荷。不能把 fallback 的截图当作 shader 成功。硬件显示列表可能引用仍由框架更新的子节点，所以 sampling=false 仅承诺停止本模块记录，不承诺所有 GPU 动画像素冻结。该坐标实现仍须通过键盘、Modal、明暗主题及实际 Inbox 的真机检查。

## 来源与当前验证边界

固定来源是 [SukiSU Lens.kt / 9fbe8fe8ca90c62c259c5894bf96d02ac31209b9](https://github.com/SukiSU-Ultra/SukiSU-Ultra/blob/9fbe8fe8ca90c62c259c5894bf96d02ac31209b9/manager/app/src/main/java/com/sukisu/ultra/ui/component/liquid/Lens.kt)，该文件明确标注 Apache-2.0 的 Kyant0/AndroidLiquidGlass / compose-miuix-ui 祖先。读取的 LanMoe 参考源码未修改。改动声明、NOTICE 与完整许可证随模块放在 `android/src/main/assets/moe-glass/`，可由 Android assets 合并入候选 APK。

原生单测复用本仓库已有 JUnit 4.13.2，覆盖 8 值原子契约、超范围/非有限输入、禁用及重复值稳定性。定向 `:moe-glass:compileReleaseKotlin :moe-glass:testReleaseUnitTest` 已通过，5 项 JVM 测试无失败；本地报告在模块 `android/build/test-results/testReleaseUnitTest/`，编译日志在 `android/build/verification/`。Kotlin 编译和单测不验证 AGSL 在手机 GPU 的输出。新 renderer 的 APK、shader 实际执行、移动透镜画面、Modal 和 T08 性能证据由本轮候选记录另填。

硬件来源补丁已单独运行上述两个 Gradle 任务，最终 `BUILD SUCCESSFUL`；5 项既有光学参数测试通过，没有用 JVM stub 冒充真实 RecordingCanvas 测试。首轮缺少 RN 编译 API 与误用非公开 Choreographer 帧时间接口的编译失败已修正，最终代码通过 SDK 36/Kotlin 编译且完全移除该帧时间调用。本地证据为 `evidence/development/glass-hardware-backdrop-compile.log`（首轮）、`glass-hardware-backdrop-compile-final.log`（最终）和 `glass-hardware-backdrop-structure-final.json`（仅结构检查）。此次未构建 APK、操作 ADB、提交或发布；真机同 Inbox、键盘、Modal、浅/深色和静止检查仍是交付条件。

vc26 崩溃修复的定向 JVM 历史策略回归先以旧“只看当前子树”判定得到 3 项中的 2 项失败（旧祖先误放行），日志为 `evidence/development/glass-ancestor-history-red.log`。修复后的编译及原生单测结果见 `glass-ancestor-history-green.log`；这些测试覆盖移除后的历史排除、新 attach 的 revision 和容器重新挂接，不能冒充 RenderThread 真机崩溃已消失。

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
