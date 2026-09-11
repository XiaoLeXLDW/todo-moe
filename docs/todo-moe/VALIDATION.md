# 2026-09-11 本地验证

当前交付为 Android Dev 候选；本文件区分自动化、构建与运行证据。源代码身份以 Git 提交和构建产物的 `build-manifest.json` 为准，APK 哈希由对应目录的 `SHA256SUMS` 提供。

| 检查 | 结果 | 本地证据 |
|---|---|---|
| core 全量 | 202 文件通过、1 文件按上游条件跳过；3867 用例通过、8 跳过 | `core-tests-utc-node22.log` |
| mobile 全量及失败项复核 | 271 文件/2679 用例已覆盖。全量中2677通过，2条旧Widget品牌断言失败；修改测试身份与预期后，该完整16用例套件复测通过。生产代码未因这些断言变化而修改 | `mobile-tests-solo.log`、`mobile-last-regression.log` |
| core/mobile TypeScript | 均退出0 | `typecheck-core.log`、`typecheck-mobile-final.log` |
| mobile lint | 0 errors、78 warnings；未将warnings改写成0 | `lint-mobile-final.log` |
| 任务字段/存储映射检查 | schema parity通过；13用例通过，含LF/CRLF正例和实际缺字段负例 | `schema-check.log`、`schema-tests.log` |
| 构建/发布/真实Git合并策略 | 18用例通过；覆盖版本、身份、保留合并祖先、冲突中止、幂等、Windows CLI入口与query-string真实消费者 | `moe-engineering-tests.log`；另有独立Node入口测试 |
| 工作流 | 30份YAML解析通过；上游发行guard检查通过 | 本地命令；远程运行未执行 |
| 原生玻璃 | Kotlin/Java/JAR与完整APK编译通过；5项能力回退/导航节点稳定性测试通过 | `android-build-vc1-entry-fixed.log`、`glass-regression.log` |
| 原生WidgetPayload | 15用例通过，包括Dev身份、错误渠道拒绝、实际应用名称及保留任务正文 | `widget-payload-final.log` 和Gradle XML报告 |
| 未改core源代码 | Git差异检查为空 | `core-diff.log` |

以上日志位于仓库本地 `evidence/development/`，不含真实同步账户。测试环境为 Windows 11 build22631、Node22.23.2、Bun1.3.5；日期测试进程固定TZ=UTC，不修改系统时区。一次与原生编译并行的移动端测试出现超时，已停止，未用它作为通过证据；后续独立回归未复现这些超时。

## APK证据

首个中间包：`build/moe/development-1-0b13b85a47f1/todo-moe-0.1.0-development-vc1-app-release.apk`，39,598,303字节。SHA-256：`eeae88add570c195e1bba128a0d1deaedacd1722351e989319a0359fd29d0963`。aapt验证包名 `io.github.xiaolexldw.todomoe.dev`、versionName `0.1.0`、versionCode `1`；apksigner验证证书SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`。APK内有真实app.config与Hermes字节码（头部 `C6-1F-BC-03-C1-03-19-1F`）。该包是dirty工作区中间检查，最终候选从固定实现提交重建并另附清单。

Windows构建已定位并修复：Bun重复补丁与manifest缓存问题、CRLF校验误报、Metro Windows路径排除、旧Ninja长路径限制、Gradle相对JS入口与Expo工作区根目录不一致。具体入口见 [WINDOWS-BUILD](WINDOWS-BUILD.md)。没有通过移动工程或修改系统注册表来掩盖构建问题。

## 没有通过或没有执行的项目

原生Widget全套JVM在Windows上有7条上游Android/POSIX音频测试失败，分别涉及 `file://C:\...` URI及缺少文件符号链接权限；这些音频生产文件没有本轮修改。完整失败与主机说明保存在 `android-widget-tests.log`、`android-widget-host-summary.json`。本轮实际修改的WidgetPayload类15项通过；Linux构建工作流增加了完整Widget单元测试，尚无远程执行结果。未删除这些测试或把失败改为跳过。

物理设备未连接。硬件模拟器预检报告缺少hypervisor driver；另准备了隔离API33 x86_64软件AVD，修正缓存目录后以同样软件参数受控启动，仍在ADB出现前以 `0xC0000005` 退出。应用从未安装进该模拟器，无遗留模拟器进程。证据为 `software-qa-controlled.log`、`software-qa-controlled-exit.json`；未改驱动、系统虚拟化或物理手机。

因此首次启动、真实操作手感、动态玻璃/性能、键盘与折叠布局、TalkBack/大字体、安装与覆盖升级、通知/Widget真实行为、实际云后端/跨端恢复和连续日用仍待设备验收。家族Logo尚为原创占位。没有创建PR、远程构建、Stable签名密钥、Release或Obtainium更新记录，v1.0未放行。

## 最终构建交付补录

Todo Moe Dev最终候选来自干净源码提交 `d06452a5ab011a6da450409e9709b135a399ca0d`，versionCode 2，39,600,223字节，APK SHA-256 `1102ddd36a6092b52a5c2e3bd6dc930cf04ab055517f5e3310a2d6310977fdd9`；证书与首包一致，APK内app.config的源码SHA、dirty=false和包名/版本再次核验通过。源代码ZIP对应同一实现提交，SHA-256 `a5e4ed4156fd961730410cb93244f23e480aa052c83d813c2587927115b154b5`。交付目录为本地 `artifacts/0.1.0-dev-vc2/`，包含APK、源代码ZIP、构建清单、验证摘要和校验文件。后续文档补录提交与运行源码提交分别记录，不将文档提交冒充已构建APK的源码。

原版Benchmark对照也已构建：源代码 `0b13b85a47f18360b62f657296cfd0280bb2495c`，`tech.dongdongbh.mindwtr.benchmark`，1.3.0 / vc140，仅ARM64；41,395,508字节，SHA-256 `792c028e651e7bd13d374e1b58f95ff22cf62c6af1c86e154b9f31aa8f133aa4`，同Android Debug测试证书，签名及16KiB zipalign通过。精确Windows构建补丁与清单位于本地 `artifacts/upstream-baseline/`。原版UI/core/app.config/原生模块源代码未改，依赖与Bun缓存独立；该包不是Todo Moe，也不是上游正式签名发行。

上述两包均未安装或进行真实UI、同步、恢复与升级测试。135个本地文档链接检查通过，当前缺少的是设备/用户验收与正式发行条件，不是将已有二进制目录当作构建成功证据。
## 后续宿主组合恢复验证

在保持生产core、schema与移动端代码不变的情况下，新增 `packages/core/src/backup-sqlite-roundtrip.integration.test.ts`。Node22.23.2、TZ=UTC下定向2/2通过，独立纳入该测试的tsc通过，显式使用仓库Node配置的ESLint退出0。

人工样本包含Area、Project、两个Section、三条Project任务（普通/完成/重复）和一条直接Area任务。经JSON落盘、validate、prepareRestoredBackupDataForSync、真实SqliteAdapter.saveData、关闭连接、新连接/新adapter读取后，逐字段及SQL NULL断言验证层级、容器互斥、正文、日期、标签、checklist、重复规则、排序与恢复revision。4752字节原备份未变，前后SHA-256均为 `7a97f475da777d4d64bec9fd68fcde8da0576d6e829e13d7158d1b636abb9d3f`。

损坏JSON负例只证明实际解析器拒绝边界及无副作用；没有自造平台保存门禁来宣称Android导入安全。成功链也是宿主共享组件组合，不能替代Android op-sqlite、SAF、应用重启、附件字节或实际云同步验收。没有运行或改写已交付APK。

本地证据为 `artifacts/0.1.0-dev-vc2/host-backup-restore/run-ZsmgSw/`，包括原始备份、SQLite、关闭重开读取、独立预期、生成时间、测试源码及共享源码哈希。测试源码SHA-256为 `b09c17ad54c187ea9e12fb70f9692f87cb69c3910d60d8aa5134e20e9b827060`。旧的预期遗漏与不规范容器样本运行保留为历史，不作为规范样本通过依据。核心全量3867项是前轮记录，本次2项单独记数，不冒充重跑了全套。