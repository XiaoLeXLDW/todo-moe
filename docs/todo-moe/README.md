# Todo Moe 当前维护入口

Todo Moe 当前公开正式版是 [0.4.2 / Stable vc53](https://github.com/XiaoLeXLDW/todo-moe/releases/tag/moe-v0.4.2-vc53)。该版本已从合并后的 `main` 重新检查、构建、签名并公开；最后两个 checklist/列表让位补丁没有新增真机交互验收，这一边界保持不变。

当前没有待发布候选或已知发布阻塞项。新的产品问题按独立 PR 处理，不从历史开发台账推断当前任务。

## 现行产品边界

- 当前只交付 Android Stable/Dev；两者应用身份和数据独立。
- 任务、Project、Section、Area、checklist、备份和同步继续使用上游数据模型。
- 本地使用无需账号；同步与外部服务仅在用户配置后启用。
- Todo Moe 自有 UI、动效、品牌与 Android 玻璃实现不得创建第二套业务状态。
- 上游源码、许可、发布历史和兼容键继续保留；上游平台目录不等于 Todo Moe 已发布平台。

## 维护入口

| 工作 | 入口 |
|---|---|
| 领域与数据约束 | [CONTEXT.md](../../CONTEXT.md) |
| Android 构建 | [WINDOWS-BUILD.md](WINDOWS-BUILD.md) |
| APK、签名与交付 | [ANDROID-DELIVERY.md](ANDROID-DELIVERY.md) |
| 品牌与包身份 | [IDENTITY-AUDIT.md](IDENTITY-AUDIT.md) |
| 玻璃实现 | [GLASS.md](GLASS.md) |
| 发布脚本与版本证据 | [版本索引](docs/versions/README.md) |
| 需求来源摘要 | [requirements-origin.md](docs/requirements-origin.md) |

## 证据规则

代码、自动化检查、原生构建、APK 身份、真机观察和公开发布分别记录。未执行的检查保持未执行；历史失败不因后续成功而删除；一个设备上的观察不外推到全部设备。

公开 Stable、签名、合并、远端设置和删除远端引用都需要当次明确授权。当前状态只维护在本文件；历史版本记录保留当时事实，不再作为执行指令。

## 历史资料

`docs/versions/` 保存每个 Dev/Stable 候选的证据；`DEVICE-VALIDATION-20260911.md` 等日期文档保存对应阶段的真机与工程记录；`IMPLEMENTATION.md` 仅作为历史索引。上游发行说明继续保存在仓库根 `docs/release-notes/`。
