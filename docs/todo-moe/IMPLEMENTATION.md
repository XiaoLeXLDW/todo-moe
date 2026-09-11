# Todo Moe 开发与验收台账

更新：2026-09-11。最终Dev候选已交付：运行源码提交 `d06452a5ab011a6da450409e9709b135a399ca0d`，versionCode 2，APK SHA-256 `1102ddd36a6092b52a5c2e3bd6dc930cf04ab055517f5e3310a2d6310977fdd9`。本次后续提交仅补录文档，不改变APK的源码身份。用户已提供 `XiaoLeXLDW/todo-moe` 并明确授权按方案开发。原规划文档保存在本目录 `docs/`，其中“尚未开发/仓库未建立”是整理方案时的历史状态；实际执行状态以本台账和对应构建日志为准。

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
| REQ-01 | 三页日用导航与独立新增，复用上游 QuickCaptureSheet/任务编辑 | 已接入，定向交互回归通过；全量及修复复测完成 | 未执行 |
| REQ-02 | 原 Area/Project/Section 与中文可见词汇映射；原创建/移动/分组/折叠 | 已接入，组织视图回归通过 | 未执行 |
| REQ-03 | `apps/mobile/moe` 集中偏好、主题、动效/触感；共享任务行完成反馈与庆祝因果判定 | 已接入，失败/撤销/重复与并发边界回归通过 | 未执行 |
| REQ-04 | 原任务/数据库/同步协议；Dev同步目标确认与后台保护 | core 3867通过/8跳过；追加宿主JSON→SQLite恢复2项通过；身份与同步保护定向回归通过 | 无测试后端/对端，未执行真实同步 |
| REQ-05 | 保留 Git/AGPL 上游历史；集中定制、固定来源、可复现入口 | 干净源码Dev候选与独立上游Benchmark对照均构建通过；Windows兼容修复已有回归 | 原版UI/core未改，Benchmark对照已核验；实机对比未执行 |
| REQ-06 | `scripts/moe` 与 `moe-*` 工作流；稳定版本发现、merge、PR、确定SHA构建/签名校验 | 本地脚本/真实Git合并与冲突演练通过 | 未推送/触发GitHub/发布/Obtainium验收 |
| REQ-07 | `moe/brand`、Expo配置、Widget/快捷方式/深链/关于页；服务身份审计 | 最终APK真实包名/版本/Dev签名核验通过；可见应用文案已补齐 | 家族素材未定，安装/同证书升级未执行 |
| REQ-08 | `modules/moe-glass`、`moe/glass`、`/moe-glass-lab` | 5项回退/组件稳定性测试通过，Kotlin/Java及APK编译通过 | 动态背景/性能/手势/无障碍未执行 |

## 阶段与放行

| 文档阶段 | 当前执行状态 | 尚需证据 |
|---|---|---|
| v0.1.0 | 工程与品牌配置实现，首个Dev APK构建及签名/包信息核验通过 | 手机安装、连续覆盖升级与原版实机对比 |
| v0.2.0 | 原生玻璃和开发验证页实现，设备验收前候选 | 真机动态效果、开关对照、帧时间/安全区/键盘 |
| v0.3.0 | 日用交互与自动化回归已完成，真机待验 | 真机连续操作、完成/撤销/重复任务、主题/无障碍 |
| v0.4.0 | 自有构建/同步/发行脚本与工作流实现及本地演练中 | GitHub实际运行/PR、稳定签名/发布与手机更新闭环 |
| v1.0.0 | 尚未放行；仍为开发候选 | 前述必要证据、真实恢复/同步与日用观察 |

## 验证证据

原始日志保存在工程 `evidence/development/`。锁定依赖安装、query-string 四处真实消费者解码与幂等、移动端类型检查、schema完整性、脚本/工作流检查均已通过。core 全量在Node 22 + UTC环境下为3867通过/8跳过。移动端已在原生编译结束后独立完成全量回归，并复测最后两条旧品牌断言所在的完整套件；历史失败日志保留。

首个中间验证 APK 已构建，版本0.1.0 / versionCode 1 / `io.github.xiaolexldw.todomoe.dev`，39,598,303字节，SHA-256 `eeae88add570c195e1bba128a0d1deaedacd1722351e989319a0359fd29d0963`。签名指纹 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`。日志 `android-build-vc1-entry-fixed.log` 的Gradle结果为成功，随后aapt/apksigner核验通过，APK内含Hermes bundle与真实app.config。该包对应dirty开发状态，供本机中间验证；最终versionCode 2候选已经从上述干净源码提交重建，39,600,223字节；包名和证书与首包相同，嵌入源码SHA/dirty/版本已从APK反查一致。完整交付位于本地 `artifacts/0.1.0-dev-vc2/`。

本轮没有连接的 Android 物理设备。硬件加速缺失；隔离软件AVD在应用安装前以0xC0000005退出。没有使用真实待办或云同步凭据。代码/自动化通过不能替代实机、同步、升级或连续日用结果。完整验证及失败边界见 [VALIDATION](VALIDATION.md)，未取得必要设备证据前不宣称 v1.0 稳定完成。

## 入口

- [Windows 构建与依赖修复](WINDOWS-BUILD.md) / [Android 交付与工作流](ANDROID-DELIVERY.md)
- [验证结果与证据边界](VALIDATION.md)
- [身份与同步边界](IDENTITY-AUDIT.md)
- [玻璃实现及设备验证](GLASS.md)
- [原始产品与版本计划](README.md)
