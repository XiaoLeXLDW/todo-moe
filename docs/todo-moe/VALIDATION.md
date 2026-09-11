# 2026-09-11 本地验证

当前本机候选为家族图标版vc6：源码`70366ddb4973cd7cc4cf39815e178b4cc033513c`，APK SHA-256 `8ea2302a824866e248a249c6a360d8bfa2bbc7e53c03702652d57cdb6fbef01b`，已覆盖安装；vc6 About家族图标、build6/source70366、启动画面、家族浅色/跟随系统深色及首页已复验；默认soft/followSystem=true已恢复。vc5源码`aacdaedfb754b1354094fe1fd2edbaed9b14b4bb`已验基本/More键盘顶部，vc4→vc5导出字节一致。用户明确本轮local-only、不启用任务同步；新家族图标已集成，见[品牌记录](BRANDING-20260911.md)。各APK与CI提交身份分开，v1.0未放行。

| 检查 | 结果 | 本地证据 |
|---|---|---|
| core 全量 | 本地历史202文件/3867通过、8跳过；新增宿主2项单列；远端core3869通过/8跳过 | `core-tests-utc-node22.log`；[CI记录](CI-VALIDATION-20260911.md) |
| mobile 最终全量 | Node22 + UTC、四worker：274文件/2713测试全部通过，254.43秒；原失败和定向复测保留 | `mobile-tests-vc5-final-workers4.log` |
| core/mobile TypeScript | 均退出0；移动端已对最新修复重跑 | `typecheck-core.log`、`mobile-typecheck-vc5-final.log` |
| mobile 最新lint | 退出0，0 errors、77 warnings；历史首交付为78 warnings，不改写旧日志 | `mobile-lint-vc5-final.log`；历史 `lint-mobile-final.log` |
| 任务字段/存储映射检查 | schema parity通过；13用例通过，含LF/CRLF正例和实际缺字段负例 | `schema-check.log`、`schema-tests.log` |
| 构建/发布/真实Git合并策略 | 18用例通过；覆盖版本、身份、保留合并祖先、冲突中止、幂等、Windows CLI入口与query-string真实消费者 | `moe-engineering-tests.log`；另有独立Node入口测试 |
| 工作流/远端 | 草稿PR#1已推送；9ee08ff常规CI/Audit/Native全成功；首个50fa606 CI APK已成功并下载核验 | [CI记录](CI-VALIDATION-20260911.md)；当前Desktop也已成功 |
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

仍缺完整交互/失败注入/折叠/TalkBack/大字体/提醒Widget设备矩阵、正式签名/Release/Obtainium及连续日用。新家族Logo已生成并集成vc6，其About/启动画面/家族配色已验；任务同步与跨端按用户明确决定暂不启用，不是本轮索取后端的阻塞。[草稿PR #1](https://github.com/XiaoLeXLDW/todo-moe/pull/1)已推送、未合并和发布。截至本次补录，远端HEAD为`efb2a335fcb8ea71c6438aed8e8bee7752af9611`：常规CI、Dependency Audit和Native Platform CI全部成功；此前efb2a335的check成功/排队状态保留为历史。9ee08ff的常规CI/Audit/Native曾全成功，但其自有APK因2GiB R8堆OOM失败；后续50fa606使用4GiB堆构建19m43成功，产物已下载并核验。后续提交检查以PR为准。

## vc2首次构建交付补录（历史）

首次可复现Todo Moe Dev候选来自干净源码提交 `d06452a5ab011a6da450409e9709b135a399ca0d`，versionCode 2，39,600,223字节，APK SHA-256 `1102ddd36a6092b52a5c2e3bd6dc930cf04ab055517f5e3310a2d6310977fdd9`；证书与首包一致，APK内app.config的源码SHA、dirty=false和包名/版本再次核验通过。源代码ZIP对应同一实现提交，SHA-256 `a5e4ed4156fd961730410cb93244f23e480aa052c83d813c2587927115b154b5`。交付目录为本地 `artifacts/0.1.0-dev-vc2/`，包含APK、源代码ZIP、构建清单、验证摘要和校验文件。后续文档补录提交与运行源码提交分别记录，不将文档提交冒充已构建APK的源码。

原版Benchmark对照也已构建：源代码 `0b13b85a47f18360b62f657296cfd0280bb2495c`，`tech.dongdongbh.mindwtr.benchmark`，1.3.0 / vc140，仅ARM64；41,395,508字节，SHA-256 `792c028e651e7bd13d374e1b58f95ff22cf62c6af1c86e154b9f31aa8f133aa4`，同Android Debug测试证书，签名及16KiB zipalign通过。精确Windows构建补丁与清单位于本地 `artifacts/upstream-baseline/`。原版UI/core/app.config/原生模块源代码未改，依赖与Bun缓存独立；该包不是Todo Moe，也不是上游正式签名发行。

首交付时上述两包均未安装，此为历史状态；后来Dev vc2已首次安装，并正常升级至vc6，其中vc2→vc5字段与元数据保留已有证据；上游Benchmark仍未做真机对照。历史135个文档链接检查记录保留，不代替后续修改的验证。

## 已验vc5与当前vc6状态

真实Android系统文件入口已恢复4任务/1清单/2分组/1文件夹，停止并重开后导出核对业务字段、顺序和两类容器；原备份hash保持。重复任务完成只生成一次后继，及时撤销后原日期/次数恢复、后继转为tombstone。损坏JSON没有覆盖当前数据，vc4热路径可见“无效备份”Toast。五条新增人工任务各一份；三主题切换与偏好重启保持。

vc4首页保存按钮底1478px，IME顶1511px；More后重新聚焦底1456px，底部避让通过。当时发现的More顶部遮挡随后已在vc5修复并按原路径通过：标题顶130px高于状态栏底97px，基本/More保存按钮均在IME之上；临时原生日志已移除。vc3 lab关闭/柔和/液态P95桶16/15/19ms，按同版本off的Histogram近似预算有条件通过；液态精确桶边界和legacy统计不能省略，详见 [GLASS](GLASS.md)。这些局部结果不代替全部设备矩阵。

vc5首轮高并发全量的Review测试因缺NavigationContext替身而加载RN Flow，真实包复制测试5.886秒超过5秒。补齐局部mock后两套47条通过，再以四worker取得274文件/2713测试全量通过。补丁实现、超时阈值和业务断言没有因该超时而放宽；最新tsc退出0、lint退出0且77警告。详细逐包身份、失败历史及设备证据继续保留于 [真机记录](DEVICE-VALIDATION-20260911.md)。

## 后续宿主组合恢复验证

在保持生产core、schema与移动端代码不变的情况下，新增 `packages/core/src/backup-sqlite-roundtrip.integration.test.ts`。Node22.23.2、TZ=UTC下定向2/2通过，独立纳入该测试的tsc通过，显式使用仓库Node配置的ESLint退出0。

人工样本包含Area、Project、两个Section、三条Project任务（普通/完成/重复）和一条直接Area任务。经JSON落盘、validate、prepareRestoredBackupDataForSync、真实SqliteAdapter.saveData、关闭连接、新连接/新adapter读取后，逐字段及SQL NULL断言验证层级、容器互斥、正文、日期、标签、checklist、重复规则、排序与恢复revision。4752字节原备份未变，前后SHA-256均为 `7a97f475da777d4d64bec9fd68fcde8da0576d6e829e13d7158d1b636abb9d3f`。

损坏JSON负例只证明实际解析器拒绝边界及无副作用；没有自造平台保存门禁来宣称Android导入安全。成功链也是宿主共享组件组合，不能替代Android op-sqlite、SAF、应用重启、附件字节或实际云同步验收。没有运行或改写已交付APK。

本地证据为 `artifacts/0.1.0-dev-vc2/host-backup-restore/run-ZsmgSw/`，包括原始备份、SQLite、关闭重开读取、独立预期、生成时间、测试源码及共享源码哈希。测试源码SHA-256为 `b09c17ad54c187ea9e12fb70f9692f87cb69c3910d60d8aa5134e20e9b827060`。旧的预期遗漏与不规范容器样本运行保留为历史，不作为规范样本通过依据。核心全量3867项是前轮记录，本次2项单独记数，不冒充重跑了全套。

当前最新已安装包仍为vc6；About/启动画面/家族浅深色和首页已有新设备证据，vc5→vc6数据全结构一致但非原字节一致。详见[DEVICE-VALIDATION](DEVICE-VALIDATION-20260911.md)；vc7仅为待构建的后续文案修复。

vc6包内图标 `res/Sj.png` 与源 `icon.png` 解码后的RGBA逐字节一致，构建日志确认JS bundle任务实际执行；见本地 `artifacts/0.1.0-dev-vc6/packaged-brand-asset-verification.json` 与[vc6版本记录](docs/versions/0.1.0-dev-vc6-2026-09-11.md)。包内资产核验与后来取得的About/启动画面/主题UI证据分别记录。

## 2026-09-12 vc6运行与数据补验

vc5→vc6真实App系统导出全结构一致，含数组顺序、全部元数据和settings；9条active、11条总tasks、1project/2sections/1area。原字节不相同，仅JSON对象key序列化顺序变化，不能写成字节一致。vc5导出SHA-256为`d2032db8be6d970564eb3f2a4eaf41acb94bd45ebc6dddf8c7434e08bb63d33e`，vc6为`a1f90450f0afa425617ce135292303c70087ec47ab2974ed39f6c8b2215c50d5`；[判定JSON](../../evidence/development/device-20260911-153f8f46/vc5-vc6-upgrade-verdict.json)记录exactBytes=false、fullStructureEqual=true。

About与家族浅/系统深色、首页、默认偏好恢复对应103—107证据。冷启动成功单次TotalTime986ms；`vc6-startup-800.png`实际截图完成1440ms，800仅计划延时，不能当显示耗时。两处静态文案sandbox.description与settings.gettingStartedContentDesc的漏名已在brand/terminology适配层修复，真实provider先RED后GREEN、30项通过；core/CSV/真实任务未改，vc7尚未构建，不能把该修复写成vc6已安装结果。首个CI APK的19m43构建、46秒Widget与下载核验见[CI记录](CI-VALIDATION-20260911.md)。
