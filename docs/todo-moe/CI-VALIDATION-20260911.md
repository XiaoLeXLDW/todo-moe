# GitHub CI 首次运行与修正

PR：[Todo Moe Android开发](https://github.com/XiaoLeXLDW/todo-moe/pull/1)，开发分支`feat/todo-moe`；未合并、未创建正式Release。本机运行候选仍为vc5 / 源码aacdaedfb754b1354094fe1fd2edbaed9b14b4bb，下面的治理/测试修改不改变APK生产代码。

首次PR检查针对提交62e4075e67f3a48d82dd54ba661b383a3a425a20运行。自有[检查工作流](https://github.com/XiaoLeXLDW/todo-moe/actions/runs/34607358864)的check job已通过，APK任务排队。上游CI的core（3869通过/8跳过）、mobile、Web E2E、代码质量、性能预算、cloud/MCP、Windows Rust及Rust依赖审计已有成功结果。

| 首轮失败 | 实際原因与修正 | 本地复核 |
|---|---|---|
| Dependency Audit / Governance | 旧断言要求query-string重复patchedDependencies登记，与已实现的等效postinstall冲突；改为验证固定安全版本、两处入口、四个真实消费者、预存修复、幂等及Node解码，禁止重复登记 | 固定Bun1.3.5五项/63断言通过，安全advisory限制未放宽 |
| Governance Watch选择门槛 | 测试github上下文缺少新增仓库guard所需repository；补上上游正例及同事件fork负例，保留原六组条件 | 22项/290断言通过；README标题一致性通过 |
| iOS工程生成 | 此fork app.config只配置Android，旧CI仍生成完整iOS工程，缺少bundleIdentifier；独立Swift回归继续执行，依赖完整iOS应用的7步限定上游仓库 | 选择正/负与Android保留检查通过；原native治理6项/147断言通过 |
| Android Widget测试 | 无appLabel的legacy payload已采用中性fallback，旧测试仍期待Mindwtr文案；只更新旧文案断言 | QuickCapturePayloadAudio与WidgetPayload两套原生复核成功 |

合并执行工程策略及两份治理测试：47项通过、449断言；原始失败日志与本地复核保存在`evidence/development/`。这些修正需要新提交上的远端复跑，不能把本地通过或被跳过的完整iOS应用构建写成已完成的跨平台发行验收。
