# Todo Moe 开发与验收台账

更新：2026-09-11。最终本机Dev候选为vc5，运行源码 `aacdaedfb754b1354094fe1fd2edbaed9b14b4bb`，APK SHA-256 `aa33ebee6b3b7a08f13bb9acf7eb046bf75e17a8089ff87c01b084dd5d9a9dc9`。已在MIX Fold 2 / Android15完成vc2→vc3→vc4→vc5三次正常覆盖，真实备份恢复、重复任务撤销、五条新增、主题偏好、键盘与顶部安全区、热路径Toast及限定玻璃对照均有证据。完整移动端274文件/2713测试通过，TypeScript通过，lint 0错误/77警告。v1.0仍未放行，详见 [真机验收记录](DEVICE-VALIDATION-20260911.md)。

vc2是历史首次交付：运行源码 `d06452a5ab011a6da450409e9709b135a399ca0d`，APK SHA-256 `1102ddd36a6092b52a5c2e3bd6dc930cf04ab055517f5e3310a2d6310977fdd9`。后续vc3/vc4为新的代码构建，各自源码与APK身份单独记录，文档提交不能冒充旧APK源码。用户已提供 `XiaoLeXLDW/todo-moe` 并授权按方案开发；原规划文档中的“尚未开发/仓库未建立”属于历史背景。

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
| 图标 | 原创开发占位图标；尚未取得真实家族 Logo |
| 玻璃路线 | 原创 Android 原生采样 + RenderEffect/AGSL；API/异常回退；未复制 SukiSU/第三方图标 |

本轮按用户实际 fork 的固定 SHA 开发，便于保留最新已有修复；与原规划“优先稳定 tag”的选择不同，故候选不得据此标为稳定。后续上游同步只发现明确稳定 Release，使用保留历史的 merge 分支。

## 需求覆盖

| ID | 实现位置/方式 | 自动化或构建状态 | 设备/外部验收 |
|---|---|---|---|
| REQ-01 | 三页导航与独立新增，复用原QuickCaptureSheet/任务编辑 | 最终mobile四worker全量2713项通过 | vc4五条人工任务各保存一次；首页保存键位于IME上方；More顶部修复待vc5 |
| REQ-02 | Area/Project/Section及中文可见词汇映射 | 组织视图与真实zh路径回归通过 | 4任务/1清单/2分组/1文件夹恢复后关系、字段和顺序核对通过；完整交互矩阵仍待补齐 |
| REQ-03 | 集中偏好、主题、动效/触感与完成因果 | 失败/撤销/重复与并发边界自动化通过 | 重复任务后继与及时撤销、三主题/偏好重启已验；不等于全部动效/无障碍验收 |
| REQ-04 | 原任务/数据库/同步协议；Dev同步目标确认 | core 3867通过/8跳过；宿主恢复2项通过 | Android系统文件入口恢复、重启导出与损坏JSON保留数据通过；实际同步后端/对端未验 |
| REQ-05 | 保留 Git/AGPL 上游历史；集中定制、固定来源、可复现入口 | 干净源码Dev候选与独立上游Benchmark对照均构建通过；Windows兼容修复已有回归 | 原版UI/core未改，Benchmark对照已核验；实机对比未执行 |
| REQ-06 | `scripts/moe` 与 `moe-*` 工作流 | 本地Git合并/冲突及流程策略通过；GitHub身份/权限和push dry-run已验证 | 尚未实际push、创建PR、远程构建、Release或Obtainium验收 |
| REQ-07 | 品牌配置、包身份、深链、关于页和服务审计 | vc2/vc3/vc4包与同证书身份已核验 | Dev首次安装及两次正常升级通过；真实家族素材、正式签名身份和全部系统入口未验 |
| REQ-08 | 原生玻璃与lab | 原生编译及回退/节点测试通过；vc3按采样尺寸处理滤镜 | 已观察动态背景；vc3 lab三模式P95桶16/15/19ms，仅限定近似预算，液态精确边界/legacy及完整QA仍受限 |

## 阶段与放行

| 文档阶段 | 当前执行状态 | 尚需证据 |
|---|---|---|
| v0.1.0 | Dev安装、两次覆盖数据保留及Android本地恢复已验 | 正式身份、原版实机对照、实际云端隔离及全部系统能力 |
| v0.2.0 | 动态背景已观察，vc3 lab近似预算有条件通过 | 液态精确P95、legacy差异、大列表/折叠/无障碍/长期资源验证 |
| v0.3.0 | 常用输入、重复完成/撤销、偏好、vc4键盘/Toast已有设备证据 | vc5 More顶部安全区、完整交互/失败/无障碍矩阵 |
| v0.4.0 | 自有流程、本地演练和GitHub权限/dry-run完成 | 实际push/PR/CI、正式签名发布及手机更新闭环 |
| v1.0.0 | 尚未放行；仍为开发候选 | 前述必要证据、真实恢复/同步与日用观察 |

## 验证证据

原始日志保存在 `evidence/development/`。core历史全量为3867通过/8跳过，新增宿主恢复2项单列。最终mobile在Node22 + UTC、四worker下274文件/2713测试全部通过（`mobile-tests-vc5-final-workers4.log`），最新移动端tsc退出0（`mobile-typecheck-vc5-final.log`）。最新vc5 lint退出0，0错误/77警告（`mobile-lint-vc5-final.log`）；历史首交付78警告记录保留。原高并发导入缺mock/文件复制超时及所有历史失败日志保留。

首个中间验证 APK 已构建，版本0.1.0 / versionCode 1 / `io.github.xiaolexldw.todomoe.dev`，39,598,303字节，SHA-256 `eeae88add570c195e1bba128a0d1deaedacd1722351e989319a0359fd29d0963`。签名指纹 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`。日志 `android-build-vc1-entry-fixed.log` 的Gradle结果为成功，随后aapt/apksigner核验通过，APK内含Hermes bundle与真实app.config。该包对应dirty开发状态，供本机中间验证；历史首次交付versionCode 2候选从其干净源码提交重建，39,600,223字节；包名和证书与首包相同，嵌入源码SHA/dirty/版本已从APK反查一致。完整交付位于本地 `artifacts/0.1.0-dev-vc2/`。

早期隔离软件AVD在安装应用前以0xC0000005退出，历史失败仍保留。之后已连接物理手机并用全新Dev人工数据完成上述验收；没有使用真实日用任务或云凭据。当前已验设备包为vc4，源码 `907ce368bb8b1933a973a7a79a1f78b231915bb8`，APK SHA-256 `e2bf1845f5bca4ff772f389112a3c0cbe25e2943ec4066a011b6b2b180ea260a`。vc5顶部安全区与最终包尚待实测。实际后端/跨端、正式发行、Logo与连续日用仍未完成，不宣称v1.0稳定。详见 [VALIDATION](VALIDATION.md) 与 [设备记录](DEVICE-VALIDATION-20260911.md)。

## 入口

- [Windows 构建与依赖修复](WINDOWS-BUILD.md) / [Android 交付与工作流](ANDROID-DELIVERY.md)
- [验证结果与证据边界](VALIDATION.md)
- [身份与同步边界](IDENTITY-AUDIT.md)
- [玻璃实现及设备验证](GLASS.md)
- [原始产品与版本计划](README.md)
