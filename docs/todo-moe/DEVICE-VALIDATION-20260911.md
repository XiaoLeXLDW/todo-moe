# 2026-09-11 Android 真机验收

本记录仅覆盖连接的 Xiaomi MIX Fold 2（22061218C / zizhan）、Android 15 / API 35、ARM64、1080×2520、440 dpi。原始证据位于工程内 `evidence/development/device-20260911-153f8f46/`。没有卸载或清除应用数据，没有修改系统设置、驱动、网络或真实云端数据。

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

三主题均可切换，家族色/不跟随系统/简洁/关闭玻璃、触感和庆祝在Dev进程重启后与重启前选择状态一致，见 [偏好重启判定](../../evidence/development/device-20260911-153f8f46/preference-restart-verdict.json)。该设置是人工测试状态，最终交付前恢复初始偏好。

## 玻璃

vc2与vc3均在专用lab使用关闭/柔和/液态，各3轮相同手势，同时录屏和截图。每个版本内部比较同一路径，使用相邻gfxinfo计数器与直方图差量，不把整个PID累计P95当成当前场景。已观察到背景颜色随滚动经过玻璃，前景文字清晰。

vc2的P95桶近似为16/20/22ms，液态超出off×1.2预算，柔和尚不能放行。vc3改变了滤镜输入尺寸：采样尺寸内模糊/折射后再放大，保留相同视觉半径与位移。优化后结果和边界见 [vc3差量分析](../../evidence/development/device-20260911-153f8f46/vc3-glass-performance-analysis.md)。vc2由设置弹窗进入lab，vc3直接冷启动深链；跨版本栈/温度等不同，不能把全部差额归因于一处代码。

这些结果不能替代大清单、折叠、TalkBack、旧Android回退、耗电、内存泄漏或连续日用结论。液态仍为实验选项。

## 本轮发现与修复状态

| 问题 | 真实证据 | 当前状态 |
|---|---|---|
| 新增时键盘遮挡保存 | vc2保存按钮底1642px，IME顶1511px；vc3禁用手工避让后底2487px，更差 | vc3方案失败，系统窗口明确带EDGE_TO_EDGE_ENFORCED，继续以Dialog自身Insets修复；不得硬加机型偏移 |
| 中文术语未生效 | vc3仍有“领域/项目/分区”；core运行key为zh而非locale文件名zh-Hans | 真实zh路径回归已先RED后GREEN，待下一APK |
| 从项目详情深链跳设置后错误Toast不可见 | 热路径不显示；同文件同恢复流程冷启动显示“无效备份” | 正在修复保留挂载页面的ToastViewport焦点生命周期，数据恢复层未改 |

独立 `capture-quick` 深链会进入另一个capture-modal，按钮位于IME上方；这不能当作首页“＋”对应QuickCaptureSheet修复通过。对照用例和原失败截图全部保留。

仍待完成：最终键盘/Toast修复、第二次连续覆盖升级与数据核对、全部设备交互矩阵、真实隔离同步后端和第二客户端、正式签名/远端工作流/Obtainium、真实家族素材与连续日用记录。当前不放行v1.0。

## vc4 闭环与最终候选准备

首页“＋”已按原失败路径复测：保存按钮底1478px，IME顶1511px，完整可见；More展开后重新聚焦，保存按钮底1456px，仍可点击。5条数字命名人工任务910001—910005各保存一份，收件箱计数5。第4条自动脚本过早注入首字符，脚本在保存前发现输入不符并修正草稿；后续等待输入框就绪后继续。此记录不是极限输入速度验收。

More重新聚焦时另发现标题顶33px、状态栏底97px的遮挡，已追加Android顶部safeArea补丁及准确容器回归，待vc5设备复测。vc4 native IME诊断代码已移除，最终包会从新的干净提交构建。

真实“清单详情→Dev深链数据设置→同一损坏JSON”的热路径已在vc4显示“无效备份”，见82-vc4-warm-invalid-visible；Toast焦点修复通过设备回归。简体中文真实zh运行路径也已生效：添加新清单、文件夹筛选、分组等均在设备界面出现。

第二次升级和新建数量判定见 [vc3→vc4 数据证据](../../evidence/development/device-20260911-153f8f46/vc3-vc4-upgrade-and-capture-verdict.json)。最终回归的首次高并发全量为272/274文件通过：Review测试缺Nav Context替身而触发Node无法解析RN Flow、真实文件复制测试5.886秒超过5秒；补齐测试替身并降低并发后，两套47条定向复测全通过，未改变补丁逻辑、超时阈值或业务断言。四worker完整回归已通过：274文件、2713条测试，254.43秒；最终mobile TypeScript退出0，lint为0 errors/77 warnings。原失败与定向复测日志保留。
