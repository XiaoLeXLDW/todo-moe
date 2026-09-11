# Android 工程交付与维护

本文件描述已写入源码的工程入口，不代表 APK 已通过实机验收、已安装或已发布。真实执行结果由本次开发台账记录。当前基线是用户 fork 的 main 快照 `0b13b85a47f18360b62f657296cfd0280bb2495c`，源码版本字段为 1.3.0；**并未把这个快照认定为稳定上游 tag**。

## 身份与品牌

| 项目 | Dev（默认） | Stable（显式） |
|---|---|---|
| APP_VARIANT | development | stable |
| 显示名 | Todo Moe Dev | Todo Moe |
| Android 包名 | io.github.xiaolexldw.todomoe.dev | io.github.xiaolexldw.todomoe |
| URI scheme | todomoe-dev | todomoe |
| 签名 | Expo Android 模板的测试密钥 | 独立保管的正式密钥，仅保护环境可用 |
| 发行 | Actions 开发产物，不创建 Release | `moe-v版本-vc整数` 稳定 Release；默认草稿 |

`apps/mobile/moe/brand/config.json` 集中名称、自有版本、仓库和上游追溯信息，`config.cjs` 提供 Node/Expo 可直接加载的身份函数及类型声明；`app.config.ts` 从真实 Git HEAD 生成 `extra.todoMoe`，记录完整 SHA、dirty、channel、versionCode。不能用环境变量伪造 HEAD。Stable 拒绝 dirty 检出，必须给出 versionCode。自有版本与上游版本各自独立。

已按用户要求参考NAT Moe和VBAN Receiver生成家族角色/清单图标，来源和提示词见 [品牌记录](BRANDING-20260911.md)。`node scripts/moe/brand-assets.mjs`从工程内生成位图源离线封装标准、自适应和单色图标，不重新生成或程序重绘角色。旧占位SVG已移除，About保留AGPL与上游来源，内部协议不作全仓改名。

上游 analytics 心跳、默认反馈地址、Dropbox app key、Expo owner/projectId 和 OTA 更新在实际 Expo 配置中关闭。只支持 Android；iOS CloudKit/Widget 插件不应用。Android 深链、快捷方式和通知动作由品牌插件处理；模块内部 Kotlin/Java 包命名空间仍保持原名。空 Dropbox 身份意味着该服务不可连接，不能仅靠替换包名声称第三方回调可用。

## Windows / CI 重建

构建依赖 Bun `.bun-version` 指定版本（当前 1.3.5）、Node 22、JDK 17（本机也接受 21并记录实际版本）、Android SDK platform 36、build-tools 36.0.0、NDK 27.1.12297006、CMake 3.22.1。CI 在 Ubuntu 24.04 通过上游 SDK 安装入口取得明确 SDK 版本。Gradle Wrapper、Expo/RN 与 npm 包按仓库和 bun.lock 锁定。工具链版本和锁文件 SHA-256 写入 manifest；尚未证明 APK 字节级可重复。

在仓库根目录打开 PowerShell；设置项目内已有 JDK / SDK / Bun 路径后：

```powershell
$env:JAVA_HOME = (Resolve-Path '.tools/jdk').Path # 改成实际 JDK 根目录
$env:ANDROID_HOME = (Resolve-Path '.tools/android-sdk').Path
$env:BUN_BIN = (Resolve-Path '.tools/bun/bun-windows-x64/bun.exe').Path
$env:Path = "$env:JAVA_HOME\bin;$(Split-Path $env:BUN_BIN);$env:Path"
$env:GRADLE_USER_HOME = Join-Path $PWD '.tools/gradle-cache'
& $env:BUN_BIN install --frozen-lockfile --no-cache
node scripts/moe/build-android.mjs --check
node scripts/moe/build-android.mjs --variant development --version-code 1
```

Windows 本机已观察到 Bun 1.3.5 的缓存 HTTP 304 等待和重复补丁问题；`--no-cache` 安装入口已验证。query-string 的兼容修复由保留的幂等 postinstall 处理，`node --test scripts/moe/verify-query-string.test.cjs` 验证实际四个移动端消费者；不能同时恢复同一内容的 patchedDependencies 登记。

输出目录为 `build/moe/development-版本代码-源码SHA前12位/`，包含 APK、`build-manifest.json` 和 `SHA256SUMS`。Dev 采用 release JS 打包加测试签名，可脱离 Metro 启动；不是 release 私钥，也不是正式发行身份。脚本用 aapt 检查实际 manifest 包名和版本，用 apksigner 验证 Dev 证书，并读取真正APK内 `assets/app.config` 校验源码、dirty、渠道、版本与品牌状态。默认只构建 arm64-v8a；多 ABI 可给 `--archs arm64-v8a,armeabi-v7a`。

实际交付从干净提交构建，构建期间冻结源码和文档写入。dirty Dev仅用于中间开发调试，不作为可由单一Git提交重建的候选；当前前后HEAD/dirty检查不证明dirty内容完全未变。RN的默认Gradle输入未完整覆盖图片、JSON及mobile外的workspace源码，因此脚本只对 `createBundleReleaseJsAndAssets` 禁用up-to-date和缓存复用，每次重新打JS包；RN自身同时传 `--reset-cache`，其他原生任务仍可增量构建。

脚本不执行 `prebuild --clean`，发现未带 Todo Moe 生成标记的现有 android/ 时停止，保护原生修改。应把可维护的原生改动放进 `modules/` 或 config plugin，并在干净工作树/新的检出重建。曾失败的首次 prebuild 需要先检查并保全 android/，再选择新的检出重建。不要直接删除未知 native 修改。

连续升级测试用 versionCode 1、2、3 构建 A/B/C，并保留同一测试签名。用户明确安装授权后再运行 `adb install -r <APK>`，不能用卸载清数据掩盖升级失败，也不能加入降级参数。本脚本不会安装手机、连接云端或修改真实任务。本轮用户选择暂不启用数据同步；以后若选择启用，Dev必须使用独立测试同步目录，包名不同不能证明云端隔离。

## 工作流与稳定发布

`moe-check.yml` 执行 core/mobile 类型检查、lint、测试、schema 和本项目工程策略测试；通过后显式调用 `moe-build-android.yml` 生成 Dev APK。PR / 合并检查只拥有 contents:read；没有 secrets 继承。22 个上游商店、桌面、iOS、Docker、MCP 和其他发布/写入工作流仅允许 `dongdongbh/Mindwtr` 仓库运行；`guard-upstream-workflows.mjs` 防止遗失该边界。

上游部分日期用例写死 UTC 日期；CI 显式 `TZ=UTC`。Windows 跑这些完整回归时设置当前测试进程的 `$env:TZ='UTC'`，不是更改 Windows 系统时区。亚洲时区失败不直接归因于本次功能改动，应保留原始失败和 UTC 对照。

Dev CI 编号不使用调用方 `github.run_number`：check/sync/release 的计数器彼此独立。所有 Dev 构建使用仓库统一 `moe-android-development` 并发组，拿到锁后等待下一个 UTC 整秒，以距 2026-01-01 UTC 的秒数分配版本代码；重跑重新分配。范围超出 1..2100000000、时钟回退都失败。这里依赖 GitHub runner 的 UTC 时钟正常；不要改 epoch。GitHub 并发组最多保留一个 pending，新请求可能替换旧 pending，被取消运行不能算通过。已经安装 CI Dev 后，本地 A/B/C 要从其实际 versionCode 继续增加，不要再用示例 1/2/3 覆盖。

`moe-release-android.yml` 仅手动触发、仅 fork main。输入是已验收并合入 main 的完整 SHA 和一个高于所有既有正式 tag/草稿/发行的 versionCode。Stable 工作流全局串行。既有 tag 的版本代码包括已删除 Release 留下的 tag 都占用，不能重用来发另一个 APK；失败前没有生成 tag 时可重跑，一旦有 tag/草稿则应完成原草稿验收或分配新代码，不覆盖已有资产。公开前再次检查版本分配，并以 GitHub 创建 ref API 的不覆盖语义，把新 tag 原子绑定到批准 SHA。

维护者在 GitHub 建立 `todo-moe-signing`、`todo-moe-publish` 保护环境，并配置 required reviewers、限制 main。签名环境保存 `MOE_KEYSTORE_BASE64`、`MOE_KEYSTORE_PASSWORD`、`MOE_KEY_ALIAS`、`MOE_KEY_PASSWORD` 四项秘密；环境变量 `MOE_CERT_SHA256` 保存固定证书指纹。密钥另做离线加密备份，口令与备份分开；源码、文档和构建日志不得保存私钥或口令。本次没有创建或修改这些远程设置。

流程是确定 SHA→重验与 Dev 构建→无签名 Stable APK→签名环境批准→独立签名 job→实际 APK 包名/versionCode/versionName/证书/zipalign 检验→上传签名产物→发行环境批准→同 SHA 对应的 Release 草稿。签名 job 不安装 npm 依赖、不跑项目构建，也不执行产物附带代码；只运行受信任 workflow main 提交的 Node 内建脚本和 Android SDK。签名秘密仅在签名那个 step 的环境中出现。`publish` 默认 false；显式 true 且通过最后环境批准后才公开。

Dev 与 Stable 的包名和二进制不同。批准 Dev 测试只能证明对应源码的那部分行为，不能声称批准了尚未产生的 Stable APK。最终发布批准必须查看已签名产物 SHA-256、正式签名和未验收项。发布使用对应提交、AGPL 声明、上游 SHA、版本代码、APK 哈希和证书指纹；下载后的 APK 再核对 `SHA256SUMS`。正式升级 A→B→C、同步/恢复、通知/Widget/深链和 Obtainium 仍须设备证据。

Obtainium 建议手动添加本 fork 的 GitHub Releases，关闭预发行，Release tag 筛选 `^moe-v[0-9]+\.[0-9]+\.[0-9]+-vc[0-9]+$`，APK 筛选 `^todo-moe-.*-stable-vc[0-9]+\.apk$`。Dev 只放 Actions 工件，不进入此渠道。本次未配置或安装 Obtainium；不假定手机允许静默安装。

## 上游同步与故障恢复

`node scripts/moe/upstream.mjs discover` 只读取 release / git 信息并把报告写入 `build/moe/upstream-report.json`。只选择非草稿、非 prerelease 的 `v?x.y.z`，按语义版本比较；没有稳定发布时明确失败，不把 main 当稳定。网络/API 错误是错误而非“无更新”。报告包含检查时间、tag、双方 SHA。

`prepare` 明确执行 fetch、在 `build/upstream/` 建隔离 worktree，以 `--no-ff` 合并默认分支和稳定上游，保留双方历史；也更新品牌配置中的上游 tag/version/SHA。它本身不推送、不建 PR。发现已有 `moe/upstream-sync` 分支时从该分支续接，不强推或覆盖自有更改。同一上游已包含且无需改变时为 no-update。冲突先记录文件与双方 SHA，再 abort 隔离工作树的 merge；工作树和报告留下供排查，没有自动解决冲突或碰真实任务。

`moe-sync-upstream.yml` 手动默认仅发现。每日 03:23 UTC 检查只有仓库变量 `MOE_UPSTREAM_SYNC_ENABLED=true` 才生效；启用后准备、普通 push 单个 `moe/upstream-sync` 分支并创建/更新一个 PR。成功合并才建 PR；冲突产出报告工件并失败。用 reusable workflow 显式对 merge SHA 执行检查与 Dev APK，不依赖机器人建 PR 是否自动启动 CI。父工作流失败或检查未运行都不能视为通过。

手动检查可补偿定时失效。维护者每次看 Actions 最后成功时间与 report；网络故障重跑、冲突在隔离分支人工处理后重跑、检查失败先修复对应错误。已发布数据库不能靠旧 APK 回滚，应先导出测试/真实数据备份并按已验证恢复流程操作。

平台参考（2026-09-11 查询）：[GitHub 工作流触发规则](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) 当前说明 `GITHUB_TOKEN` 的 opened/synchronize/reopened PR 可能进入“需要批准”状态，因此这里保留显式调用链；[Expo app 配置](https://docs.expo.dev/versions/latest/config/app/) 给出包身份、scheme、updates 和 extra 的实际配置入口。这些文档不能替代本仓库首次远程演练。
