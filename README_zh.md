# Todo Moe

Todo Moe 是基于 [Mindwtr](https://github.com/dongdongbh/Mindwtr) 的 Android 待办清单。项目保留上游本地优先的任务模型，加入 Todo Moe 的清单执行、完成反馈、Android 界面和原生玻璃底栏。

[English](README.md) · [下载正式版](https://github.com/XiaoLeXLDW/todo-moe/releases/latest) · [使用帮助](HELP.md) · [隐私说明](PRIVACY.md) · [反馈问题](https://github.com/XiaoLeXLDW/todo-moe/issues/new/choose)

## 日常使用

- 今天、清单、分组、文件夹和收件箱继续使用 Mindwtr 原有实体与存储。
- 带小步骤的任务可以在列表中展开；步骤即时保存，最后一步可以完成父任务。
- 完成动画、触感、主题和玻璃效果均可调整或关闭。
- 本地使用无需账号；备份导出与可选同步由用户自行控制。
- Stable 与 Dev 是两个独立 Android 应用身份，数据不会自动互相迁移。

## 安装与更新

当前公开正式版是 [Todo Moe 0.4.2 / Stable vc53](https://github.com/XiaoLeXLDW/todo-moe/releases/tag/moe-v0.4.2-vc53)。从 Releases 下载 Stable APK 后直接覆盖已有 Stable 版本，不要先卸载；重要升级前先导出备份。

Todo Moe 当前只交付 Android。仓库保留上游其他平台源码用于兼容和维护，不代表这些平台已经由 Todo Moe 发布或验收。各版本改动与验证边界见 [Todo Moe 版本索引](docs/todo-moe/docs/versions/README.md)。

## 开发与维护

先读 [AGENTS.md](AGENTS.md)、[CONTEXT.md](CONTEXT.md) 和 [Todo Moe 当前维护入口](docs/todo-moe/README.md)。Android 构建与交付分别见 [WINDOWS-BUILD.md](docs/todo-moe/WINDOWS-BUILD.md) 和 [ANDROID-DELIVERY.md](docs/todo-moe/ANDROID-DELIVERY.md)。

产品改动通过 PR 和与改动范围匹配的检查进入主线。公开 Stable 必须得到明确授权，并使用自有 `moe-*` 工作流；代码检查、APK 身份核验、真机验收和公开发布是不同证据。vc53 已由[受控工作流](https://github.com/XiaoLeXLDW/todo-moe/actions/runs/35431747383)从合并后的 `main` 重建并公开。

## 来源与许可

Todo Moe 是独立品牌的个人 fork，保留 Mindwtr 作者版权和 Git 历史。仓库整体使用 [GNU AGPL v3 only](LICENSE)，复用组件继续遵循各自许可。组件和玻璃实现的来源说明见 [THIRD-PARTY.md](THIRD-PARTY.md)。

Android 应用可在「关于 → 开源许可与致谢」离线查看 AGPL 和生成的第三方许可。移动端运行依赖变化后，使用 `node scripts/moe/generate-license-notices.mjs` 重新生成并审阅差异。
