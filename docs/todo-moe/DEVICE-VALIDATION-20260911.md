# 2026-09-11 Android 真机验收

当前本地Dev候选为vc7：运行源码`e6a797d50df8b9294fe3260585f71e151b69b8dc`，APK SHA-256 `03fbb33441de9dd7cca835a2a3e5f558d1f580e7274838ee1111df25fd93568f`，42,005,624字节，已同Dev证书正常覆盖安装。About显示build7/source e6a797d5，两处静态文案及1914×2160内屏More键盘/顶部已实测通过；vc6→vc7完整导出结构一致（含数组顺序、全部元数据和settings），10条active/12条总tasks，原始字节因JSON对象key顺序不同而不相同。 本轮按用户决定local-only，任务同步暂不启用。vc6已有家族图标、启动画面、浅色/系统深色及外屏证据；完整折叠切换压力、无障碍/系统入口矩阵、7天日用与正式签名发布仍未完成，v1.0未放行。

本记录仅覆盖连接的 Xiaomi MIX Fold 2（22061218C / zizhan）、Android 15 / API 35、ARM64；外屏1080×2520、440 dpi，后续内屏1914×2160。原始证据位于工程内 `evidence/development/device-20260911-153f8f46/`。没有卸载或清除应用数据，没有修改系统设置、驱动、网络或真实云端数据。

## 包与安装

| 候选 | 源码 | APK SHA-256 | 本机结果 |
|---|---|---|---|
| Dev 0.1.0 / vc2 | `d06452a5ab011a6da450409e9709b135a399ca0d` | `1102ddd36a6092b52a5c2e3bd6dc930cf04ab055517f5e3310a2d6310977fdd9` | 首次安装成功，冷启动2832ms，三页导航与设置可用 |
| Dev 0.1.0 / vc3 | `6d36f0566eb4a945f655fa5a9ca81ff75aa44bcb` | `944ae430a8cc780c26e54f70eb548c186b8d679f9258160286450a2e1362f2b7` | 同证书正常覆盖成功，冷启动1389ms；全部数据字段与顺序相同，键盘修复未通过 |

包名为 `io.github.xiaolexldw.todomoe.dev`，Dev 测试证书 SHA-256 为 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`。本机开始时未安装 Todo Moe、Todo Moe Dev 或 Mindwtr。以上是 Dev 验证，不代替正式签名升级或发布验收。冷启动数字是单次 `am start -W` 结果，不是统计基准。

vc4 已从干净源码 `907ce368bb8b1933a973a7a79a1f78b231915bb8` 构建，APK SHA-256 `e2bf1845f5bca4ff772f389112a3c0cbe25e2943ec4066a011b6b2b180ea260a`，39,608,835字节，正常覆盖安装成功；第二次升级保留全部旧实体及元数据和settings。构建3m27，单次冷启动1645ms。

## 已观察的业务链

通过 App 的新增与完成入口建立并完成一条人工任务；通过 Android 系统文件选择器恢复包含4任务、1清单、2分组、1文件夹的固定人工JSON，停止并重开Dev进程后重新导出，核对业务字段和active IDs。验证普通/完成/重复任务、checklist、标题、备注、关系、排序与日期；Project任务没有直接areaId，直接Area任务没有projectId或sectionId。没有直接替换手机数据库。

重复任务完成时，页面由“2 / 8次”变为一次后继“3 / 8次”，下一次日期正确推进；在撤销按钮有效期内点击后回到原任务、原日期和2 / 8次。导出确认后继为tombstone，未留下第二条active后继。较早第一次普通任务撤销点击错过时限，不计通过。

原宿主样本有未来startTime且isFocusedToday=true，以及超过7天的completedAt；真实启动按上游规则取消不符合条件的焦点并自动归档。该观察与原样本保留。第二份设备样本仅调整这两处日期，避免与“字段保留”判定冲突。它的业务字段全部核对通过；rev/revBy/updatedAt、RRULE嵌入seriesId和tombstone属于既有恢复协议的合法变化。

- 设备专用输入JSON SHA-256：`aa91a0ea23fa51251e7497f60bf781123f5162e697cfde45392ba58b250b0fe0`。
- 恢复并重启后的App导出 SHA-256：`0c631bc0ea40ab8b7be104b8c6b35904da813e2ae087d9433ae42d5a4c166eba`。
- 损坏JSON恢复前后导出相同：`9b95c81f01483c955d6e66366be0f72bb9d8965fb52615792df0f19106ada847`；冷启动路径显示“无效备份”。

具体断言、原始导出和界面记录见 [设备恢复判定](../../evidence/development/device-20260911-153f8f46/device-backup-restore-verdict.json)。原始备份文件独立保存在电脑和手机专用 `Download/TodoMoe-QA-20260911` 目录，不是用户日用同步目录。

升级前后JSON对象的键输出顺序可能不同，因此vc2→vc3两份文件SHA不同；解析后全结构（含实体数组顺序、所有元数据和settings）完全一致，详见 [覆盖升级判定](../../evidence/development/device-20260911-153f8f46/vc2-vc3-upgrade-verdict.json)。手机上的原始宿主备份和设备专用备份SHA再次读取均未改变。

三主题均可切换，家族色/不跟随系统/简洁/关闭玻璃、触感和庆祝在Dev进程重启后与重启前选择状态一致，见 [偏好重启判定](../../evidence/development/device-20260911-153f8f46/preference-restart-verdict.json)。该设置是人工测试状态，最终已恢复初始偏好。

## 玻璃

vc2与vc3均在专用lab使用关闭/柔和/液态，各3轮相同手势，同时录屏和截图。每个版本内部比较同一路径，使用相邻gfxinfo计数器与直方图差量，不把整个PID累计P95当成当前场景。已观察到背景颜色随滚动经过玻璃，前景文字清晰。

vc2的P95桶近似为16/20/22ms，液态超出off×1.2预算，柔和尚不能放行。vc3改变了滤镜输入尺寸：采样尺寸内模糊/折射后再放大，保留相同视觉半径与位移。优化后结果和边界见 [vc3差量分析](../../evidence/development/device-20260911-153f8f46/vc3-glass-performance-analysis.md)。vc2由设置弹窗进入lab，vc3直接冷启动深链；跨版本栈/温度等不同，不能把全部差额归因于一处代码。

这些结果不能替代大清单、折叠、TalkBack、旧Android回退、耗电、内存泄漏或连续日用结论。液态仍为实验选项。

## 首轮发现与修复状态（历史过程）

| 问题 | 真实证据 | 当前状态 |
|---|---|---|
| 新增时键盘遮挡保存 | vc2保存按钮底1642px，IME顶1511px；vc3禁用手工避让后底2487px，更差 | vc3方案失败，系统窗口明确带EDGE_TO_EDGE_ENFORCED，继续以Dialog自身Insets修复；不得硬加机型偏移 |
| 中文术语未生效 | vc3仍有“领域/项目/分区”；core运行key为zh而非locale文件名zh-Hans | 真实zh路径回归已先RED后GREEN，待下一APK |
| 从项目详情深链跳设置后错误Toast不可见 | 热路径不显示；同文件同恢复流程冷启动显示“无效备份” | 正在修复保留挂载页面的ToastViewport焦点生命周期，数据恢复层未改 |

独立 `capture-quick` 深链会进入另一个capture-modal，按钮位于IME上方；这不能当作首页“＋”对应QuickCaptureSheet修复通过。对照用例和原失败截图全部保留。

当时仍待完成（历史清单，后续结果见vc4—vc6）：最终键盘/Toast修复、第二次连续覆盖升级与数据核对、全部设备交互矩阵、真实隔离同步后端和第二客户端、正式签名/远端工作流/Obtainium、真实家族素材与连续日用记录。当前不放行v1.0。

## vc4 闭环与最终候选准备（历史过程）

首页“＋”已按原失败路径复测：保存按钮底1478px，IME顶1511px，完整可见；More展开后重新聚焦，保存按钮底1456px，仍可点击。5条数字命名人工任务910001—910005各保存一份，收件箱计数5。第4条自动脚本过早注入首字符，脚本在保存前发现输入不符并修正草稿；后续等待输入框就绪后继续。此记录不是极限输入速度验收。

More重新聚焦时另发现标题顶33px、状态栏底97px的遮挡，已追加Android顶部safeArea补丁及准确容器回归，待vc5设备复测。vc4 native IME诊断代码已移除，最终包会从新的干净提交构建。

真实“清单详情→Dev深链数据设置→同一损坏JSON”的热路径已在vc4显示“无效备份”，见82-vc4-warm-invalid-visible；Toast焦点修复通过设备回归。简体中文真实zh运行路径也已生效：添加新清单、文件夹筛选、分组等均在设备界面出现。

第二次升级和新建数量判定见 [vc3→vc4 数据证据](../../evidence/development/device-20260911-153f8f46/vc3-vc4-upgrade-and-capture-verdict.json)。最终回归的首次高并发全量为272/274文件通过：Review测试缺Nav Context替身而触发Node无法解析RN Flow、真实文件复制测试5.886秒超过5秒；补齐测试替身并降低并发后，两套47条定向复测全通过，未改变补丁逻辑、超时阈值或业务断言。四worker完整回归已通过：274文件、2713条测试，254.43秒；最终mobile TypeScript退出0，lint为0 errors/77 warnings。原失败与定向复测日志保留。

## vc5：已完成限定真机验收

源码 `aacdaedfb754b1354094fe1fd2edbaed9b14b4bb`，干净构建，0.1.0 / versionCode 5，39,608,779字节。APK SHA-256 `aa33ebee6b3b7a08f13bb9acf7eb046bf75e17a8089ff87c01b084dd5d9a9dc9`。证书与vc2—vc4相同；真实APK内app.config源码/dirty/版本与manifest一致，16KiB zipalign通过，构建3m7，安装成功，单次冷启动1780ms。

基本新增保存底1478px；More重新聚焦后保存底1456px，均小于IME顶1511px。More标题顶130px，大于状态栏底97px；顶部遮挡已修复。临时原生日志代码已移除。三次连续正常覆盖vc2→vc3→vc4→vc5完成，没有卸载、降级或清数据。vc4→vc5完整JSON结构与原始字节都相同，备份SHA `d2032db8be6d970564eb3f2a4eaf41acb94bd45ebc6dddf8c7434e08bb63d33e`，9条active人工任务保留。

默认柔白/跟随系统/柔和玻璃/标准动画/轻触感/庆祝已恢复，连续添加开关也恢复关闭。交付在本地 `artifacts/0.1.0-dev-vc5/`，含APK、固定源码ZIP、构建与验证清单、校验文件及精选设备证据。源码ZIP SHA `7bf0f6327435fcc13f279b07b99cb6b5aa86594205bfcba27a0d01977c72ee7d`。记录补录提交可以晚于APK源码提交，两者不混用。

完整移动端274文件/2713条测试通过，TypeScript退出0，lint 0 errors/77 warnings。完整系统入口/折叠/无障碍矩阵、正式签名/发布与日用观察仍未放行。后续用户明确暂不启用数据同步，并要求根据另外两个仓库新画家族图标，结果如下。

## vc6：家族图标已构建并覆盖安装

干净运行源码 `70366ddb4973cd7cc4cf39815e178b4cc033513c`，0.1.0 / versionCode 6，42,005,360字节；APK SHA-256 `8ea2302a824866e248a249c6a360d8bfa2bbc7e53c03702652d57cdb6fbef01b`。构建3m5，日志确认 `createBundleReleaseJsAndAssets` 实际执行；从APK解出的1024px图标与品牌源 `icon.png` 的RGBA像素逐字节相同。包内源码/版本/渠道/品牌状态、测试证书和16KiB zipalign检查通过，32个原生库与vc5已核验库字节相同。

`adb install -r` 成功并读回vc6，未卸载、清数据或降级。安装时曾处于Hangup/AOD，早先息屏导出失败保留为历史，不能冒充成功备份；随后手机解锁后的真实复验及导出见下节。

交付目录 `artifacts/0.1.0-dev-vc6/` 包含APK、固定源码ZIP、图标、提示词和独立验证摘要。源码ZIP SHA-256 `2bbb5525299540abfa7a447adefc6ec2f19c794c2026994674ef6e2ad2ecf1ee`。后续CI/文档提交与本APK运行源码分别追溯；品牌来源见 [品牌记录](BRANDING-20260911.md)。

## 2026-09-12 vc6解锁后复验

About已显示新家族猫图、build6及source70366（103-vc6-about）。[家族浅色](../../evidence/development/device-20260911-153f8f46/104-vc6-family-light.png)、[跟随系统深色](../../evidence/development/device-20260911-153f8f46/105-vc6-family-system.png)和[家族首页](../../evidence/development/device-20260911-153f8f46/106-vc6-family-home.png)均显示正确；[107默认偏好XML](../../evidence/development/device-20260911-153f8f46/107-vc6-defaults-restored.xml)确认soft/followSystem=true已恢复。

真实App系统导出`vc6-data-export.json`与`vc5-final-data-export.json`深度全结构一致，包括实体数组顺序、全部元数据和settings；9条active/11条总tasks、1project、2sections、1area。原文件SHA分别为`d2032db8be6d970564eb3f2a4eaf41acb94bd45ebc6dddf8c7434e08bb63d33e`与`a1f90450f0afa425617ce135292303c70087ec47ab2974ed39f6c8b2215c50d5`，仅JSON对象key序列化顺序不同，不能宣称字节一致。[vc5→vc6判定](../../evidence/development/device-20260911-153f8f46/vc5-vc6-upgrade-verdict.json)。

[vc6-startup-800.png](../../evidence/development/device-20260911-153f8f46/vc6-startup-800.png)已实际看到居中家族猫图。`vc6-cold-start.txt`记录COLD/TotalTime986ms，仅单次启动；`vc6-startup-capture.json`记录计划800ms、实际截图完成1440ms，文件名不是显示时间。

两处静态文案sandbox.description与settings.gettingStartedContentDesc的漏名已在brand/terminology适配层修复，真实provider先RED后GREEN、30项通过；core/CSV/真实任务未改，该修复当时未包含在vc6；现已随vc7构建安装并在真实界面复验通过。本节不将后续代码回归写成vc6已包含该修复，也不放行完整系统矩阵、正式发行或连续日用。

## 2026-09-12 vc6内屏限定验收与导出观察

外屏展开为1914×2160内屏后重新布局正常：basic保存按钮底1086px、More底1064px均小于IME顶1119px；More标题顶133px大于真实状态栏底100px。选项可滚动到日期，人工任务920010保存一次，冷重启后导出仍保留。More与滚动证据为110/111，人工任务及冷重启SAF证据为112—119；这不是完整折叠切换压力测试。

首次展开后的热路径导出转入Android系统分享，未发送；尚不知用户是否取消前面的选择器。同内屏冷重启后的SAF导出成功，vc7首次导出也成功。只读审查未发现本轮生产export或Activity配置差异，当前仅登记原因未定的观察，不能认定fold/Expo缺陷已证实，或被vc7修复。

## 2026-09-12 vc7：文案、内屏More与升级数据已验

当前本地Dev候选为vc7：运行源码`e6a797d50df8b9294fe3260585f71e151b69b8dc`，APK SHA-256 `03fbb33441de9dd7cca835a2a3e5f558d1f580e7274838ee1111df25fd93568f`，42,005,624字节，已同Dev证书正常覆盖安装。About显示build7/source e6a797d5，两处静态文案及1914×2160内屏More键盘/顶部已实测通过；vc6→vc7完整导出结构一致（含数组顺序、全部元数据和settings），10条active/12条总tasks，原始字节因JSON对象key顺序不同而不相同。 包名/版本为`io.github.xiaolexldw.todomoe.dev`、0.1.0 / versionCode7，证书与前述Dev包相同。构建3m17、embeddedConfigVerified=true，JS bundle实际执行，原生1545项up-to-date；[独立版本记录](docs/versions/0.1.0-dev-vc7-2026-09-12.md)保留源码ZIP、产物哈希和构建边界。

[120沙盒文案XML](../../evidence/development/device-20260911-153f8f46/120-vc7-sandbox-text.xml)与[121入门文案XML](../../evidence/development/device-20260911-153f8f46/121-vc7-getting-started-text.xml)确认两处品牌漏名修复；[124 About](../../evidence/development/device-20260911-153f8f46/124-vc7-about-inner.png)显示build7/source e6。修复仅在brand/terminology适配层，core/CSV/真实任务内容未改，30项真实provider回归及mobile tsc通过。

16:27:09 UTC在vc7本包完成[内屏More复测](../../evidence/development/device-20260911-153f8f46/126-vc7-inner-more.png)：保存底1064px小于IME顶1119px，标题顶133px大于当前状态栏底100px。[关闭空草稿后的首页](../../evidence/development/device-20260911-153f8f46/127-vc7-delivery-home.png)仍有10条active，未额外新增任务。

升级前`vc6-before-vc7-export.json` SHA-256为`58a3cfb5fe22814cb80a6509e1bd109eb74b3eb294a216681895cf0b3e16a551`；升级后`vc7-data-export.json`为`60ab90f1f2eb2e59aa78fc1e14f984eb8ed5b8f090524ad508a909ce84c8d538`。全结构严格相同，含数组顺序、全部元数据和settings，10条active/12条总tasks、1project/2sections/1area；仅JSON对象key序列化顺序导致字节不同。[判定JSON](../../evidence/development/device-20260911-153f8f46/vc6-vc7-upgrade-verdict.json)明确fullStructureEqual=true、exactBytes=false。以上均为人工Dev数据与限定设备路径，不放行完整矩阵、7天日用或正式签名发布。
