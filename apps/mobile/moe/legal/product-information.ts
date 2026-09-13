export const productHelp = `快速开始

在底部点「＋」记录一件事。先写标题即可；需要时再选日期、清单或打开更多字段。未整理的任务可在收件箱中处理。

今天与清单

今天聚合需要关注的任务；清单用于按事情组织。文件夹收纳多个清单，清单内可用分组安排不同阶段。你可以在清单页创建和管理它们。

完成与撤销

点任务前的圆圈完成；出现撤销提示时点「撤销」恢复。完成会立即保存，连续操作无需等待动画。误删任务先查看垃圾桶；不要为解决显示问题清除应用数据。

外观与玻璃

在「设置 → 外观」选择明暗、配色与玻璃，在「动画与触感」调整强度并即时预览。液态玻璃需要支持的 Android 图形能力；柔和或关闭可减少视觉效果。减少动态效果适合对运动敏感的用户。

备份与换机

设置 → 备份与恢复 → 备份 → 导出备份，选择你能找到的文件夹。备份可能包含任务、笔记和设置，请妥善保管。恢复前先导出当前数据，按恢复界面的确认说明操作。Dev 与正式版是两个独立应用，不会自动搬运数据；正式版可以从空白开始。

更新

使用本项目 GitHub Releases 中的正式 APK，正常覆盖安装并保留同一签名。不要卸载旧版来更新。Dev 包不是正式包的升级。

反馈

在「反馈问题」中说明当前版本、手机型号、复现步骤、预期和实际结果。截图、备份和日志中可能包含个人信息，分享前先检查。`;

export const productPrivacy = `Todo Moe 隐私说明

本地使用

无需登录即可记录任务。任务与应用设置保存在设备中。正式版与 Dev 包使用独立应用身份；不会自动将 Dev 数据导入正式版。当前个人交付选择从空白开始、关闭同步，用户以后仍可自行配置同步。

可选联网功能

配置 WebDAV、文件同步或其他可用同步服务后，相应数据会发送到你选择的位置。启用 AI、语音、远程附件、外部日历等联网功能时，相关内容可能交给你配置的服务处理。使用前请确认服务地址、权限及其隐私政策。

更新与外部链接

下载、更新、源码及反馈入口会打开 GitHub；网站会按自己的政策处理访问请求。应用其他页面读取远程附件或使用可选服务时也可能联网，因此不承诺永不访问网络。

统计与反馈

本项目 Android 版本关闭上游使用统计、远端反馈服务和后台代码更新。问题反馈由你主动在 GitHub 提交。应用可保留本地诊断日志；导出或分享前请检查内容，不要公开令牌、账户地址或私人任务。

权限与备份

通知、文件、日历、麦克风等权限用于相应功能，按实际需要授权。导出的备份可能包含任务内容和设置。放到共享或云端文件夹会受到该位置访问权限的影响。卸载或清除应用数据可能移除本地记录；应用外的备份不会随之自动删除。

适用范围

这份说明描述 Todo Moe 自有 Android 构建，不替代 GitHub、同步或 AI 服务的隐私政策。源代码可供核查，第三方修改版的行为可能不同。`;

const productHelpEn = `Quick start

Tap “+” in the bottom bar to capture something. A title is enough; add a date, list, or more fields when needed. Process unorganized tasks from Inbox.

Today and lists

Today brings together tasks that need attention. Lists organize work, folders contain lists, and groups divide a list into stages.

Complete and undo

Tap the circle beside a task to complete it, then use the Undo message to restore it. Completion is saved immediately and does not wait for the animation. Check Trash before clearing app data to solve a display problem.

Appearance and glass

Choose brightness, colors, and glass under Settings → Appearance. Adjust intensity and preview completion feedback under Motion & haptics. Liquid glass requires supported Android graphics; Soft or Off reduces the effect. Reduced motion is available for motion sensitivity.

Backup and moving devices

Use Settings → Backup & restore → Backup → Export backup, and choose a folder you can find again. A backup can contain tasks, notes, and settings. Export current data before restoring. Dev and Stable are separate apps and do not move data automatically.

Updates

Install the Stable APK from this project's GitHub Releases over the existing app so the signing identity and data are retained. Do not uninstall to update. A Dev package does not update Stable.

Feedback

Include the app version, phone model, steps, expected result, and actual result. Screenshots, backups, and logs may contain personal information; inspect them before sharing.`;

const productPrivacyEn = `Todo Moe privacy information

Local use

You can record tasks without an account. Tasks and app settings are stored on the device. Stable and Dev use separate app identities and do not import data from one another automatically.

Optional network features

When you configure WebDAV, file sync, or another available sync service, relevant data is sent to the location you choose. AI, voice, remote attachments, external calendars, and similar optional features may send relevant content to the configured service. Review that service's address, permissions, and privacy policy first.

Updates and external links

Download, update, source, and feedback links open GitHub, which handles requests under its own policies. Other screens may also access the network for remote attachments or optional services, so the app does not claim to be permanently offline.

Diagnostics and feedback

This Android build disables upstream usage analytics, remote feedback services, and background code updates. Diagnostic logs may remain on the device. Inspect exports before sharing and never publish tokens, account addresses, or private tasks.

Permissions and backups

Notifications, files, calendars, and microphone permissions support their corresponding features and are optional until needed. Exported backups may contain task content and settings. Uninstalling or clearing app data can remove local records; external backups are not deleted automatically.

Scope

This information describes Todo Moe's own Android builds. It does not replace the policies of GitHub, sync providers, or AI services, and third-party builds may behave differently.`;

export const getProductHelp = (language: string) => language.startsWith('zh') ? productHelp : productHelpEn;
export const getProductPrivacy = (language: string) => language.startsWith('zh') ? productPrivacy : productPrivacyEn;
