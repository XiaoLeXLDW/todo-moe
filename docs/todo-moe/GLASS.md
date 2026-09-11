# Android 玻璃实现与验证

实现路径：`apps/mobile/modules/moe-glass`（原创 Kotlin/AGSL）和 `apps/mobile/moe/glass`。已在MIX Fold 2 / Android 15观察到背景随滚动经过玻璃、前景文字清晰；vc3完成三模式各三轮lab对照，仅在下述限定近似口径中通过预算。完整设备矩阵与v1.0尚未放行，详情见 [真机记录](DEVICE-VALIDATION-20260911.md)。

| 能力 | 路径 | 当前证据边界 |
|---|---|---|
| 关闭 | 无背景采样、清晰实底，导航仍由 RN 处理 | TypeScript 回退逻辑有自动化测试 |
| 柔和 | Android API 31+，原生pre-draw降采样，采样尺寸内模糊后放大 | vc3单机lab滚动已观察；近似P95预算通过且桶边界有余量 |
| 液态 | API 33+，模糊背景经过原创 AGSL 静态边缘折射；旧版本或减少动画降为柔和 | 实验能力；vc3 P95桶≈19ms、接近off×1.2阈值，不能作为精确百分位或SukiSU复现证明 |
| 失效回退 | 原生模块缺失、旧系统、软件画布、采样异常、内存不足 | 保留 RN 导航、选中态和操作 |

背景采用按底栏尺寸限制的双缓冲降采样，在尺寸改变、卸载或窗口隐藏时释放。vc3在采样尺寸内执行模糊/折射后再放大，保留视觉半径与位移。采样排除整个玻璃GroupView，只有像素变化才触发重绘，避免静止场景自激。没有JS定时截图或任务状态副本。SurfaceView/视频不在此路线内；硬件图像无法采样时回退实底。“API支持”和本次单机观察都不证明所有设备可用。

没有采用 SukiSU、Miuix 或 AndroidLiquidGlass 的代码和素材；用户先前使用成功的工程尚未提供。当前源码按本 fork 的 AGPL-3.0-only 保留。Android 原生 API 参考：[RenderEffect](https://developer.android.com/reference/android/graphics/RenderEffect)、[RuntimeShader](https://developer.android.com/reference/android/graphics/RuntimeShader)；桥接参考 [Expo Native View](https://docs.expo.dev/modules/native-view-tutorial/)。

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
