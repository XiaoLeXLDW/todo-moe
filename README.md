# Todo Moe

轻巧、顺手的 Android 待办清单。基于 [Mindwtr](https://github.com/dongdongbh/Mindwtr)，保留本地任务与清单业务，加入 Todo Moe 的视觉、完成反馈和原生玻璃底栏。

[下载正式 APK](https://github.com/XiaoLeXLDW/todo-moe/releases/latest) · [使用帮助](HELP.md) · [隐私说明](PRIVACY.md) · [问题反馈](https://github.com/XiaoLeXLDW/todo-moe/issues/new/choose)

## 日常使用

- 今天、清单和收件箱；文件夹 → 清单 → 分组 → 任务。
- 快速记录、编辑、完成和撤销；完成反馈与触感可调。
- 原生动态玻璃与连续拖动底栏；支持的设备可选择液态、柔和或关闭。
- 无需账号即可本地使用，可导出备份。可选同步服务需用户自行配置。
- Android 正式版与 Dev 版独立安装、独立数据。

## 安装与更新

从本仓库 Releases 下载 **Stable APK**。正常覆盖安装即可，保留同一签名身份；更新前可先导出备份。不要通过卸载旧版完成更新。

本项目当前交付 Android。仓库保留上游其他平台源码，不表示这些平台已经作为 Todo Moe 发布或验收。MIX Fold 2 的代表性内外屏路径已有记录；不承诺全部设备、系统版本和长期功耗已经验证。

当前正式版本为 [0.3.1 / vc50](https://github.com/XiaoLeXLDW/todo-moe/releases/tag/moe-v0.3.1-vc50)，首次正式交付为 [0.1.0 / vc33](https://github.com/XiaoLeXLDW/todo-moe/releases/tag/moe-v0.1.0-vc33)。正式版可以从空白开始，Dev 数据不会自动迁移；默认不启用同步。后续变更以对应 Release 说明为准。

## 开发与维护

先读 [AGENTS.md](AGENTS.md)、[CONTEXT.md](CONTEXT.md) 和 [开发台账](docs/todo-moe/IMPLEMENTATION.md)。Android 构建见 [Windows 构建说明](docs/todo-moe/WINDOWS-BUILD.md) 与 [交付说明](docs/todo-moe/ANDROID-DELIVERY.md)。项目工具、缓存及签名材料保存在本地忽略目录，不提交凭据。

上游通过保留历史的合并跟进，产品改动走 PR 与实际必需的检查。正式发布需明确批准；使用既有签名和发布脚本，不重新签名已经验收的 APK。0.3.1 / vc50 已由[受控 GitHub Actions 工作流](https://github.com/XiaoLeXLDW/todo-moe/actions/runs/35064591234)从合并后的 `main` 重新检查、构建、隔离签名、回读身份并公开发布；发布后又重新下载资产核对哈希。历史版本当时的验证边界保留在对应版本记录中。

应用内许可文本由 `node scripts/moe/generate-license-notices.mjs` 从仓库许可、玻璃来源材料和已安装移动端运行依赖生成；依赖变化后重新生成并审阅差异。

## 来源与许可

Todo Moe 是 Mindwtr 的个人 fork，与上游发行版身份独立。原作者版权与 Git 历史保留。整体源代码遵循 [GNU AGPL v3 only](LICENSE)；复用组件继续遵循各自许可。玻璃相关 Apache-2.0 文本、NOTICE、固定来源及改动说明见 [第三方致谢](THIRD-PARTY.md)。

从 0.2.0 起，AGPL 完整正文和已整理的第三方许可已可通过应用「关于 → 开源许可与致谢」离线阅读；0.3.1 / vc50 的正式 APK 已再次核对这些随包文件。
