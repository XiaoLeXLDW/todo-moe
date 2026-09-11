# 2026-09-11 本地验证

当前本地Dev候选为vc7：运行源码`e6a797d50df8b9294fe3260585f71e151b69b8dc`，APK SHA-256 `03fbb33441de9dd7cca835a2a3e5f558d1f580e7274838ee1111df25fd93568f`，42,005,624字节，已同Dev证书正常覆盖安装。About显示build7/source e6a797d5，两处静态文案及1914×2160内屏More键盘/顶部已实测通过；vc6→vc7完整导出结构一致（含数组顺序、全部元数据和settings），10条active/12条总tasks，原始字节因JSON对象key顺序不同而不相同。 本轮按用户决定local-only，任务同步暂不启用。vc6已有家族图标、启动画面、浅色/系统深色及外屏证据；完整折叠切换压力、无障碍/系统入口矩阵、7天日用与正式签名发布仍未完成，v1.0未放行。 各APK与CI提交身份分别追溯，见[vc7记录](docs/versions/0.1.0-dev-vc7-2026-09-12.md)。

| 检查 | 结果 | 本地证据 |
|---|---|---|
| core 全量 | 本地历史202文件/3867通过、8跳过；新增宿主2项单列；远端core3869通过/8跳过 | `core-tests-utc-node22.log`；[CI记录](CI-VALIDATION-20260911.md) |
| mobile 最终全量 | Node22 + UTC、四worker：274文件/2713测试全部通过，254.43秒；原失败和定向复测保留 | `mobile-tests-vc5-final-workers4.log` |
| core/mobile TypeScript | 均退出0；移动端已对最新修复重跑 | `typecheck-core.log`、`mobile-typecheck-vc5-final.log` |
| mobile 最新lint | 退出0，0 errors、77 warnings；历史首交付为78 warnings，不改写旧日志 | `mobile-lint-vc5-final.log`；历史 `lint-mobile-final.log` |
| 任务字段/存储映射检查 | schema parity通过；13用例通过，含LF/CRLF正例和实际缺字段负例 | `schema-check.log`、`schema-tests.log` |
| 构建/发布/真实Git合并策略 | 18用例通过；覆盖版本、身份、保留合并祖先、冲突中止、幂等、Windows CLI入口与query-string真实消费者 | `moe-engineering-tests.log`；另有独立Node入口测试 |
| 工作流/远端 | 草稿PR#1已推送；首个50fa606 CI APK已成功下载核验；e6自有check含全量core/mobile及Mobile/Core/Quality/E2E/Audit/Native等已成功 | [CI记录](CI-VALIDATION-20260911.md)；e6常规CI含Desktop Rust已全成功、CI APK构建中 |
| 原生玻璃 | Kotlin/Java/JAR与完整APK编译通过；5项能力回退/导航节点稳定性测试通过 | `android-build-vc1-entry-fixed.log`、`glass-regression.log` |
| 原生WidgetPayload | 15用例通过，包括Dev身份、错误渠道拒绝、实际应用名称及保留任务正文 | `widget-payload-final.log` 和Gradle XML报告 |
| 生产core与schema | 生产实现未改；新增宿主恢复测试单独记数 | 历史 `core-diff.log`；下文宿主组合验证 |

以上日志位于仓库本地 `evidence/development/`，不含真实同步账户。测试环境为 Windows 11 build22631、Node22.23.2、Bun1.3.5；日期测试进程固定TZ=UTC，不修改系统时区。一次与原生编译并行的移动端测试出现超时，已停止，未用它作为通过证据；后续独立回归未复现这些超时。

## APK证据

首个中间包：`build/moe/development-1-0b13b85a47f1/todo-moe-0.1.0-development-vc1-app-release.apk`，39,598,303字节。SHA-256：`eeae88add570c195e1bba128a0d1deaedacd1722351e989319a0359fd29d0963`。aapt验证包名 `io.github.xiaolexldw.todomoe.dev`、versionName `0.1.0`、versionCode `1`；apksigner验证证书SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`。APK内有真实app.config与Hermes字节码（头部 `C6-1F-BC-03-C1-03-19-1F`）。该包是dirty工作区中间检查，最终候选从固定实现提交重建并另附清单。

Windows构建已定位并修复：Bun重复补丁与manifest缓存问题、CRLF校验误报、Metro Windows路径排除、旧Ninja长路径限制、Gradle相对JS入口与Expo工作区根目录不一致。具体入口见 [WINDOWS-BUILD](WINDOWS-BUILD.md)。没有通过移动工程或修改系统注册表来掩盖构建问题。

## 没有通过或没有执行的项目

原生Widget全套JVM在Windows上有7条上游Android/POSIX音频测试失败，分别涉及 `file://C:\...` URI及缺少文件符号链接权限；这些音频生产文件没有本轮修改。完整失败与主机说明保存在 `android-widget-tests.log`、`android-widget-host-summary.json`。本轮实际修改的WidgetPayload类15项通过；9ee08ff的Linux Native Platform CI及完整Widget任务已通过；这不改写Windows主机的7项历史失败。未删除这些测试或把失败改为跳过。

连接手机之前，硬件模拟器预检缺少hypervisor driver；隔离API33 x86_64软件AVD修正缓存目录后仍在ADB出现前以 `0xC0000005` 退出。应用从未安装进该模拟器，无遗留进程。历史证据仍为 `software-qa-controlled.log`、`software-qa-controlled-exit.json`；后来已连接物理手机并完成Dev验收，不再以“未连接手机”描述当前状态。

仍缺完整交互/失败注入/折叠切换压力/TalkBack/大字体/提醒Widget设备矩阵、正式签名/Release/Obtainium及7天日用。外→内屏重新布局、vc6新增与vc7 More限定路径已有实测，不等于全部矩阵。任务同步与跨端按用户决定暂不启用。开发分支已推送并创建[草稿PR #1](https://github.com/XiaoLeXLDW/todo-moe/pull/1)，未合并、未创建Release。e6a797d5自有check（含全量core/mobile）和Mobile/Core/Quality/E2E/Audit/Native等已成功；常规CI（含Desktop Rust）、Dependency Audit与Native均已全部成功；e6 CI APK仍在构建。历史50fa606的首个CI APK使用4GiB堆构建19m43成功、Widget46秒通过，已下载核验；9ee08ff的2GiB R8 OOM失败保留，不能把旧成功或check成功写成e6 CI APK成功。后续结果以[CI记录](CI-VALIDATION-20260911.md)与PR为准。

## vc2首次构建交付补录（历史）

首次可复现Todo Moe Dev候选来自干净源码提交 `d06452a5ab011a6da450409e9709b135a399ca0d`，versionCode 2，39,600,223字节，APK SHA-256 `1102ddd36a6092b52a5c2e3bd6dc930cf04ab055517f5e3310a2d6310977fdd9`；证书与首包一致，APK内app.config的源码SHA、dirty=false和包名/版本再次核验通过。源代码ZIP对应同一实现提交，SHA-256 `a5e4ed4156fd961730410cb93244f23e480aa052c83d813c2587927115b154b5`。交付目录为本地 `artifacts/0.1.0-dev-vc2/`，包含APK、源代码ZIP、构建清单、验证摘要和校验文件。后续文档补录提交与运行源码提交分别记录，不将文档提交冒充已构建APK的源码。

原版Benchmark对照也已构建：源代码 `0b13b85a47f18360b62f657296cfd0280bb2495c`，`tech.dongdongbh.mindwtr.benchmark`，1.3.0 / vc140，仅ARM64；41,395,508字节，SHA-256 `792c028e651e7bd13d374e1b58f95ff22cf62c6af1c86e154b9f31aa8f133aa4`，同Android Debug测试证书，签名及16KiB zipalign通过。精确Windows构建补丁与清单位于本地 `artifacts/upstream-baseline/`。原版UI/core/app.config/原生模块源代码未改，依赖与Bun缓存独立；该包不是Todo Moe，也不是上游正式签名发行。

首交付时上述两包均未安装，此为历史状态；后来Dev vc2已首次安装，并正常升级至vc7，其中vc2→vc5字段与元数据保留已有证据；上游Benchmark仍未做真机对照。历史135个文档链接检查记录保留，不代替后续修改的验证。

## vc5基线及历史行为验证

真实Android系统文件入口已恢复4任务/1清单/2分组/1文件夹，停止并重开后导出核对业务字段、顺序和两类容器；原备份hash保持。重复任务完成只生成一次后继，及时撤销后原日期/次数恢复、后继转为tombstone。损坏JSON没有覆盖当前数据，vc4热路径可见“无效备份”Toast。五条新增人工任务各一份；三主题切换与偏好重启保持。

vc4首页保存按钮底1478px，IME顶1511px；More后重新聚焦底1456px，底部避让通过。当时发现的More顶部遮挡随后已在vc5修复并按原路径通过：标题顶130px高于状态栏底97px，基本/More保存按钮均在IME之上；临时原生日志已移除。vc3 lab关闭/柔和/液态P95桶16/15/19ms，按同版本off的Histogram近似预算有条件通过；液态精确桶边界和legacy统计不能省略，详见 [GLASS](GLASS.md)。这些局部结果不代替全部设备矩阵。

vc5首轮高并发全量的Review测试因缺NavigationContext替身而加载RN Flow，真实包复制测试5.886秒超过5秒。补齐局部mock后两套47条通过，再以四worker取得274文件/2713测试全量通过。补丁实现、超时阈值和业务断言没有因该超时而放宽；最新tsc退出0、lint退出0且77警告。详细逐包身份、失败历史及设备证据继续保留于 [真机记录](DEVICE-VALIDATION-20260911.md)。

## 后续宿主组合恢复验证

在保持生产core、schema与移动端代码不变的情况下，新增 `packages/core/src/backup-sqlite-roundtrip.integration.test.ts`。Node22.23.2、TZ=UTC下定向2/2通过，独立纳入该测试的tsc通过，显式使用仓库Node配置的ESLint退出0。

人工样本包含Area、Project、两个Section、三条Project任务（普通/完成/重复）和一条直接Area任务。经JSON落盘、validate、prepareRestoredBackupDataForSync、真实SqliteAdapter.saveData、关闭连接、新连接/新adapter读取后，逐字段及SQL NULL断言验证层级、容器互斥、正文、日期、标签、checklist、重复规则、排序与恢复revision。4752字节原备份未变，前后SHA-256均为 `7a97f475da777d4d64bec9fd68fcde8da0576d6e829e13d7158d1b636abb9d3f`。

损坏JSON负例只证明实际解析器拒绝边界及无副作用；没有自造平台保存门禁来宣称Android导入安全。成功链也是宿主共享组件组合，不能替代Android op-sqlite、SAF、应用重启、附件字节或实际云同步验收。没有运行或改写已交付APK。

本地证据为 `artifacts/0.1.0-dev-vc2/host-backup-restore/run-ZsmgSw/`，包括原始备份、SQLite、关闭重开读取、独立预期、生成时间、测试源码及共享源码哈希。测试源码SHA-256为 `b09c17ad54c187ea9e12fb70f9692f87cb69c3910d60d8aa5134e20e9b827060`。旧的预期遗漏与不规范容器样本运行保留为历史，不作为规范样本通过依据。核心全量3867项是前轮记录，本次2项单独记数，不冒充重跑了全套。

当前最新已安装包为vc7；两处文案、About及内屏More回归通过。vc6→vc7全结构一致、非字节一致，详见[DEVICE-VALIDATION](DEVICE-VALIDATION-20260911.md)与[vc7版本记录](docs/versions/0.1.0-dev-vc7-2026-09-12.md)。

vc6包内图标 `res/Sj.png` 与源 `icon.png` 解码后的RGBA逐字节一致，构建日志确认JS bundle任务实际执行；见本地 `artifacts/0.1.0-dev-vc6/packaged-brand-asset-verification.json` 与[vc6版本记录](docs/versions/0.1.0-dev-vc6-2026-09-11.md)。包内资产核验与后来取得的About/启动画面/主题UI证据分别记录。

## 2026-09-12 vc6运行与数据补验

vc5→vc6真实App系统导出全结构一致，含数组顺序、全部元数据和settings；9条active、11条总tasks、1project/2sections/1area。原字节不相同，仅JSON对象key序列化顺序变化，不能写成字节一致。vc5导出SHA-256为`d2032db8be6d970564eb3f2a4eaf41acb94bd45ebc6dddf8c7434e08bb63d33e`，vc6为`a1f90450f0afa425617ce135292303c70087ec47ab2974ed39f6c8b2215c50d5`；[判定JSON](../../evidence/development/device-20260911-153f8f46/vc5-vc6-upgrade-verdict.json)记录exactBytes=false、fullStructureEqual=true。

About与家族浅/系统深色、首页、默认偏好恢复对应103—107证据。冷启动成功单次TotalTime986ms；`vc6-startup-800.png`实际截图完成1440ms，800仅计划延时，不能当显示耗时。两处静态文案sandbox.description与settings.gettingStartedContentDesc的漏名已在brand/terminology适配层修复，真实provider先RED后GREEN、30项通过；core/CSV/真实任务未改，该修复当时未包含在vc6；现已随vc7构建安装并在真实界面复验通过。首个CI APK的19m43构建、46秒Widget与下载核验见[CI记录](CI-VALIDATION-20260911.md)。

## 2026-09-12 vc7与内屏限定验证

vc7构建3m17，42,005,624字节；构建清单embeddedConfigVerified=true，JS bundle实际执行，原生1545项up-to-date。30项定向真实provider回归与mobile tsc通过；本地274文件/2713项全量属于此前vc5基线，e6远端自有check另含全量core/mobile成功。

1914×2160内屏：vc6外→内布局正常，basic/More保存底1086/1064均小于IME顶1119，More标题133大于状态栏底100；滚动到日期、920010保存一次及冷重启保留已验。vc7本包More按原内屏路径再验，保存底1064、标题133均满足上述边界，关闭空草稿后10条active未增加。vc6→vc7严格全结构相同，10条active/12条总tasks、1project/2sections/1area；原始字节因对象key顺序不同而不同，判定见[vc6→vc7 JSON](../../evidence/development/device-20260911-153f8f46/vc6-vc7-upgrade-verdict.json)。

首次展开热路径导出曾进入系统分享且未发送；同内屏冷重启后SAF与vc7首次导出成功。用户是否取消首次选择器仍不明，只读审查未发现本轮生产export/Activity配置差异；不认定fold/Expo缺陷已证实或被vc7修复。完整切换压力与系统矩阵仍待验。
