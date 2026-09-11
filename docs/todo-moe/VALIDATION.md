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
