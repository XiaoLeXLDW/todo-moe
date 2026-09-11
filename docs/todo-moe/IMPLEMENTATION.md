# Todo Moe 开发与验收台账

最新补录：干净Dev vc10与Stable无签名工程包均已构建核验，当前生产源码`89fcedb9e91b54dc05e0cc24d720a84a5043f86d`的完整移动端2720项通过。手机仍是vc7，新导出兼容修复尚待切屏实测；[收尾记录](FOLLOWUP-20260912.md)列出最新产物、两个已修复的代码问题及剩余条件。下述vc7段落为已安装候选的历史验收快照。

更新：2026-09-12。当前本地Dev候选为vc7：运行源码`e6a797d50df8b9294fe3260585f71e151b69b8dc`，APK SHA-256 `03fbb33441de9dd7cca835a2a3e5f558d1f580e7274838ee1111df25fd93568f`，42,005,624字节，已同Dev证书正常覆盖安装。About显示build7/source e6a797d5，两处静态文案及1914×2160内屏More键盘/顶部已实测通过；vc6→vc7完整导出结构一致（含数组顺序、全部元数据和settings），10条active/12条总tasks，原始字节因JSON对象key顺序不同而不相同。 本轮按用户决定local-only，任务同步暂不启用。vc6已有家族图标、启动画面、浅色/系统深色及外屏证据；完整折叠切换压力、无障碍/系统入口矩阵、7天日用与正式签名发布仍未完成，v1.0未放行。 详见[vc7记录](docs/versions/0.1.0-dev-vc7-2026-09-12.md)和[真机记录](DEVICE-VALIDATION-20260911.md)。

开发分支已推送并创建[草稿PR #1](https://github.com/XiaoLeXLDW/todo-moe/pull/1)，未合并、未创建Release。e6a797d5自有check（含全量core/mobile）和Mobile/Core/Quality/E2E/Audit/Native等已成功；常规CI（含Desktop Rust）、Dependency Audit与Native均已全部成功；e6 CI APK仍在构建。历史50fa606的首个CI APK使用4GiB堆构建19m43成功、Widget46秒通过，已下载核验；9ee08ff的2GiB R8 OOM失败保留，不能把旧成功或check成功写成e6 CI APK成功。后续结果以[CI记录](CI-VALIDATION-20260911.md)与PR为准。

vc2是历史首次交付：运行源码 `d06452a5ab011a6da450409e9709b135a399ca0d`，APK SHA-256 `1102ddd36a6092b52a5c2e3bd6dc930cf04ab055517f5e3310a2d6310977fdd9`。后续vc3—vc7为各自独立的代码构建，各自源码与APK身份单独记录，文档提交不能冒充旧APK源码。用户已提供 `XiaoLeXLDW/todo-moe` 并授权按方案开发；原规划文档中的“尚未开发/仓库未建立”属于历史背景。

## 固定基线与执行决定

| 项目 | 本轮采用 |
|---|---|
| 本地源码 | `F:\Codex_Projects\xldw-mindwtr-fork\todo-moe` |
| origin | `https://github.com/XiaoLeXLDW/todo-moe.git` |
| upstream | `https://github.com/dongdongbh/Mindwtr.git` |
| 开发分支 | `feat/todo-moe` |
| 固定 fork 基线 | `0b13b85a47f18360b62f657296cfd0280bb2495c`，上游 package 1.3.0；当前 main 快照，不能称稳定 Release |
| 包身份 | Todo Moe / Todo Moe Dev；`io.github.xiaolexldw.todomoe` / `.dev`；`todomoe` / `todomoe-dev` |
| 首轮发行范围 | Android。保留上游桌面/iOS源码，自有工作流不代替上游发行 |
| 图标 | 新家族图标已生成并集成vc6，参考nat-moe/vban-receiver-mac；vc6 About/启动画面与家族配色已验 |
| 手机数据使用 | 用户选择local-only，暂不启用同步；后端与跨端测试留在后续启用阶段 |
| 玻璃路线 | 原创 Android 原生采样 + RenderEffect/AGSL；API/异常回退；未复制 SukiSU/第三方图标 |

本轮按用户实际 fork 的固定 SHA 开发，便于保留最新已有修复；与原规划“优先稳定 tag”的选择不同，故候选不得据此标为稳定。后续上游同步只发现明确稳定 Release，使用保留历史的 merge 分支。

## 需求覆盖

| ID | 实现位置/方式 | 自动化或构建状态 | 设备/外部验收 |
|---|---|---|---|
| REQ-01 | 三页导航与独立新增，复用原QuickCaptureSheet/任务编辑 | 最终mobile四worker全量2713项通过 | vc4五条人工任务各保存一次；首页保存键位于IME上方；vc5 More顶部也已通过 |
| REQ-02 | Area/Project/Section及中文可见词汇映射 | 组织视图与真实zh路径回归通过 | 4任务/1清单/2分组/1文件夹恢复后关系、字段和顺序核对通过；完整交互矩阵仍待补齐 |
| REQ-03 | 集中偏好、主题、动效/触感与完成因果 | 失败/撤销/重复与并发边界自动化通过 | 重复任务后继与及时撤销、三主题/偏好重启已验；不等于全部动效/无障碍验收 |
| REQ-04 | 原任务/数据库/同步协议；Dev同步目标确认 | 远端core 3869通过/8跳过；本地历史3867及新增恢复2项分别留证 | Android系统文件入口恢复、重启导出与损坏JSON保留数据通过；用户暂不启用同步，不把后端/对端列为本轮阻塞 |
| REQ-05 | 保留 Git/AGPL 上游历史；集中定制、固定来源、可复现入口 | 干净源码Dev候选与独立上游Benchmark对照均构建通过；Windows兼容修复已有回归 | 原版UI/core未改，Benchmark对照已核验；实机对比未执行 |
| REQ-06 | `scripts/moe` 与 `moe-*` 工作流 | 已推送并建草稿PR#1；常规CI已有成功记录 | 首个CI APK已成功并下载核验；正式Release/Obtainium未执行 |
| REQ-07 | 品牌配置、包身份、深链、关于页和服务审计 | vc7包内元数据和两处文案已核验并覆盖安装 | vc6品牌/启动画面已验；vc7文案/About/内屏More及升级数据结构已验，正式签名与完整系统矩阵未验 |
| REQ-08 | 原生玻璃与lab | 原生编译及回退/节点测试通过；vc3按采样尺寸处理滤镜 | 已观察动态背景；vc3 lab三模式P95桶16/15/19ms，仅限定近似预算，液态精确边界/legacy及完整QA仍受限 |

## 阶段与放行

| 文档阶段 | 当前执行状态 | 尚需证据 |
|---|---|---|
| v0.1.0 | Dev连续覆盖至vc7；vc2→vc5数据保留及Android本地恢复已验 | 正式身份/原版实机/完整系统能力；云端隔离随用户后续启用同步再验 |
| v0.2.0 | 动态背景已观察，vc3 lab近似预算有条件通过 | 液态精确P95、legacy差异、大列表/完整折叠切换压力/无障碍/长期资源验证 |
| v0.3.0 | 常用输入、重复撤销、偏好、Toast及vc5 More顶部/键盘已验 | 完整交互/失败/无障碍矩阵 |
| v0.4.0 | 已推送草稿PR#1，常规CI及自有check已有成功结果 | 后续提交检查、正式签名发布及更新闭环 |
| v1.0.0 | 尚未放行；本轮local-only开发候选 | 完整矩阵/正式发行与日用观察；同步随用户后续启用另验 |

## 验证证据

原始日志保存在 `evidence/development/`。core本地历史全量为3867通过/8跳过，新增宿主恢复2项单列；远端core现为3869通过/8跳过。最终mobile在Node22 + UTC、四worker下274文件/2713测试全部通过（`mobile-tests-vc5-final-workers4.log`），最新移动端tsc退出0（`mobile-typecheck-vc5-final.log`）。最新vc5 lint退出0，0错误/77警告（`mobile-lint-vc5-final.log`）；历史首交付78警告记录保留。原高并发导入缺mock/文件复制超时及所有历史失败日志保留。

首个中间验证 APK 已构建，版本0.1.0 / versionCode 1 / `io.github.xiaolexldw.todomoe.dev`，39,598,303字节，SHA-256 `eeae88add570c195e1bba128a0d1deaedacd1722351e989319a0359fd29d0963`。签名指纹 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`。日志 `android-build-vc1-entry-fixed.log` 的Gradle结果为成功，随后aapt/apksigner核验通过，APK内含Hermes bundle与真实app.config。该包对应dirty开发状态，供本机中间验证；历史首次交付versionCode 2候选从其干净源码提交重建，39,600,223字节；包名和证书与首包相同，嵌入源码SHA/dirty/版本已从APK反查一致。完整交付位于本地 `artifacts/0.1.0-dev-vc2/`。

早期软件AVD的0xC0000005失败保留为历史。之后已连接手机，使用全新Dev人工数据完成上述恢复与升级验证；没有使用真实日用任务或云凭据。vc5已验基本/More键盘顶部，vc6 About/启动画面/家族配色及升级数据结构已验。家族图标已集成，任务同步按用户选择暂不启用；当前不再以缺Logo、未push或选择后端作为阻塞。正式发行、完整设备矩阵与连续日用仍未完成，v1.0未放行。

## 入口

- [Windows 构建与依赖修复](WINDOWS-BUILD.md) / [Android 交付与工作流](ANDROID-DELIVERY.md)
- [验证结果与证据边界](VALIDATION.md)
- [身份与同步边界](IDENTITY-AUDIT.md)
- [玻璃实现及设备验证](GLASS.md)
- [原始产品与版本计划](README.md)

## 2026-09-12 vc6复验补录

vc5→vc6真实App系统导出全结构一致，含数组顺序、全部元数据和settings；9条active、11条总tasks、1project/2sections/1area。原字节不相同，仅JSON对象key序列化顺序变化，不能写成字节一致。两处静态文案sandbox.description与settings.gettingStartedContentDesc的漏名已在brand/terminology适配层修复，真实provider先RED后GREEN、30项通过；core/CSV/真实任务未改，该修复当时未包含在vc6；现已随vc7构建安装并在真实界面复验通过。首个CI APK（50fa606）已成功构建19m43，Widget测试46秒成功，下载核验完成；后续提交检查见PR，不把Dev工件写成正式Release。详细图片、启动时间口径及数据判定见[设备记录](DEVICE-VALIDATION-20260911.md)。

## 2026-09-12 vc7交付补录

当前本地Dev候选为vc7：运行源码`e6a797d50df8b9294fe3260585f71e151b69b8dc`，APK SHA-256 `03fbb33441de9dd7cca835a2a3e5f558d1f580e7274838ee1111df25fd93568f`，42,005,624字节，已同Dev证书正常覆盖安装。About显示build7/source e6a797d5，两处静态文案及1914×2160内屏More键盘/顶部已实测通过；vc6→vc7完整导出结构一致（含数组顺序、全部元数据和settings），10条active/12条总tasks，原始字节因JSON对象key顺序不同而不相同。 构建3m17，新helper核验包内metadata通过，JS bundle实际执行；原生1545项up-to-date仅表示增量复用。30项定向真实provider测试及mobile tsc通过；此前本地274文件/2713项全量记录保留在vc5基线。vc6内屏人工任务920010只保存一次、冷重启后保留；vc7 More保存底1064小于IME顶1119、标题顶133大于状态栏底100，关闭空草稿后仍10条active。首次展开后的热路径导出曾进入未发送的系统分享，原因未定；同内屏冷重启后的SAF与vc7首次导出成功，不能认定为已证实或被vc7修复的fold/Expo问题。详见[设备记录](DEVICE-VALIDATION-20260911.md)。

本次e6远端自有check实际日志：core3869通过/8跳过、mobile274文件/2713通过、工程29通过/0失败；常规CI（含Desktop Rust）、Dependency Audit与Native全部成功。仅e6自有APK仍在构建，不提前判定产物通过。
