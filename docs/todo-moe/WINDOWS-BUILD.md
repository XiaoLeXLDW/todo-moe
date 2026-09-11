# Windows 本机构建记录

工程根目录为 `todo-moe/`；外层文档目录保留最初的规划。工具、Android SDK、Gradle/Bun缓存与日志存放工程的 `.tools/`、`evidence/development/`，不写入源码与发行包。

## 已定位并处理的安装问题

上游固定 Bun 1.3.5。Windows hoisted monorepo 在为 `query-string@7.1.3` 的多个消费者应用同一补丁时产生 `ENOTEMPTY ... patch_hash ... NtSetInformationFile`；单包同补丁安装可通过。Bun 1.4.2 也复现，且引入 overrides 解析差异，因此本工程继续使用 1.3.5。

根 package.json 与 bun.lock 只移除 `query-string` 的重复 patchedDependencies 登记，保留全部包版本。已有 `apps/mobile/scripts/patch_query_string_cjs.js` 完成完全相同的 CommonJS/ESM 兼容修改；扩展为逐个解析 mobile、Expo Router、两处 React Navigation 的真实消费者，校验版本和 URL decode 结果，重复执行不改变内容。根 postinstall 保证完整安装后执行，不依赖磁盘硬链接偶然传播补丁。原 patch 文件保留作来源对照。

本机还观测到 Bun 命中 HTTP 304 manifest 缓存后安装不再推进；设置 `--no-cache` 后锁定安装于约 7 秒完成。该记录仅针对当前环境，不宣称所有 Windows 都有同样问题。

```powershell
$env:PATH = (Resolve-Path '.tools/bun/bun-windows-x64').Path + ';' + $env:PATH
$env:BUN_INSTALL_CACHE_DIR = Join-Path (Get-Location) '.tools/bun-cache'
bun install --frozen-lockfile --no-cache
node --test scripts/moe/verify-query-string.test.cjs
```

工具链当前使用 Node 22.23.2、Microsoft OpenJDK 21.0.5、Android platform/build-tools 36、NDK 27.1.12297006、CMake 3.22.1；部分上游库还会安装其默认 NDK 27.0 与 build-tools 35。CI 使用 JDK 17。Bun 便携目录中同时提供 `bun.exe` 与 `bunx.exe` 以支持上游脚本。

SDK 附带 Ninja 1.10.2 无法处理 React Native codegen 超过 260 字符的对象路径。本机 Windows 长路径设置原已开启；`scripts/moe/prepare-windows-ninja.ps1` 只将工程内 CMake 的 Ninja 更新为官方 1.13.2，校验固定 SHA-256，保留原文件，不修改注册表。首次构建前执行该脚本。[Ninja 官方发行记录](https://github.com/ninja-build/ninja/releases/tag/v1.13.2)

Windows Gradle 使用相对 entry-file，但 Expo 54 export:embed 按 monorepo 根解析；构建脚本给生成工程接入 `moe/brand/expo-cli.cjs`，只将 Windows JS 入口转为绝对路径，其余参数与 Expo CLI 保持原样。相对路径、含空格路径、绝对路径与非 Windows 参数有回归测试。

```powershell
$env:JAVA_HOME = (Resolve-Path '.tools/jdk21').Path
$env:ANDROID_HOME = (Resolve-Path '.tools/android-sdk').Path
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = Join-Path (Get-Location) '.tools/gradle-home'
$env:PATH = (Resolve-Path '.tools/node22/node-v22.23.2-win-x64').Path + ";$env:JAVA_HOME/bin;" + (Resolve-Path '.tools/bun/bun-windows-x64').Path + ';' + $env:PATH
node scripts/moe/build-android.mjs --variant development --version-code 1
```

构建状态与 APK 验证以交付记录为准。本文件中的命令入口不代表原生编译或安装已经通过。`evidence/development/` 保存原始构建日志；正式密钥和云同步凭据不得放入日志。
