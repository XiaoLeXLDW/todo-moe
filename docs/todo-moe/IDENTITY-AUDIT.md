# Todo Moe 安装身份、外部服务与 Dev 同步审计

日期：2026-09-11。基线提交：`0b13b85a47f18360b62f657296cfd0280bb2495c`。本文记录本次工作区实现与自动化检查；原生安装、真实同步、云空间隔离和手机更新尚未实测。

## 当前身份

| 项目 | Stable | Dev |
|---|---|---|
| 显示名 | Todo Moe | Todo Moe Dev |
| Android 包名 | `io.github.xiaolexldw.todomoe` | `io.github.xiaolexldw.todomoe.dev` |
| URI scheme | `todomoe` | `todomoe-dev` |
| 同步目标 | 由用户配置 | 必须由用户确认独立测试目标 |
| 当前图标 | 独立临时开发图标 | 独立临时开发图标；家族素材待提供 |

生成源为 `apps/mobile/moe/brand/config.json + config.cjs` 和 `apps/mobile/app.config.ts`；运行时读取 `Constants.expoConfig.extra.todoMoe`，通过 `apps/mobile/lib/app-identity.ts` 集中提供给 JS 调用点。源码 SHA、dirty 状态、版本与上游基线由构建配置生成；关于页实际显示这些字段，不用固定字符串冒充构建提交。

## 定向修复与保留边界

| 调用点 | 原行为 | 本次实现 |
|---|---|---|
| AppSearch 索引、Widget 任务与焦点链接 | 固定生成 `mindwtr://…` | 使用当前安装配置生成自有 scheme |
| capture/open/open-feature/context URL 解析、系统快速添加跳转 | 只识别官方 scheme | 只识别当前安装 scheme；Dev 不接受 Stable/官方实体链接 |
| Dropbox OAuth | 固定 `mindwtr://redirect` | callback 的 scheme 与 native URI 从当前配置生成；当前 FOSS 默认不启用 Dropbox |
| Android WidgetPayload/WidgetTapActivity | 仅接受官方链接；无数据回退官方 Focus | 按当前 package 选择 Stable/Dev scheme，含空数据回退和子清单/分组任务；拒绝其他渠道链接 |
| ContextAutomationReceiver | 官方广播 action | 使用 `${context.packageName}.action.ACTIVATE_CONTEXT/DEACTIVATE_CONTEXT`；JS 使用相同包身份 |
| 启动更新提醒、关于页版本检查与反馈 | 官方 GitHub Release/Issue | 使用 `XiaoLeXLDW/todo-moe`；下载入口明确指向本 Fork 的 Releases |
| 关于页品牌 | 官方图标和缺少 Fork 来源字段 | 使用 Todo Moe 图标，显示包名、渠道、build、自有/上游提交与图标状态 |

原生生成目录还经过 `moe/brand/with-todo-moe.cjs` 的末尾配置插件处理，保留上游插件源码而修正生成后的深链、广播与显示身份。内部 Kotlin namespace、原有本地存储键、数据格式、作者和许可证不是安装身份，按原结构保留。

Android 是本次发行目标。iOS CloudKit/App Group/Widget 等上游源码仍保留，当前配置不生成 iOS 发行；不能据此宣称自有 iOS 身份已适配。

## 外部服务默认状态

| 服务 | 当前构建默认 | 说明 |
|---|---|---|
| analytics heartbeat | URL/渠道为空 | 启动 hook 检查空 URL 后不发送心跳；没有沿用上游默认 analytics 服务 |
| 反馈上传 | endpoint 为空 | 不自动上传到上游服务；反馈界面的 GitHub 入口指向本 Fork |
| Expo owner/EAS project/OTA | 移除上游 owner/project；updates disabled | 不使用上游项目身份收取更新 |
| Dropbox | FOSS 开关启用、app key 为空 | 不盲用上游 app key；OAuth 适配保留供明确配置后的另行验证 |
| 商店更新/评分、自动捐助提示 | FOSS 与 donation 开关抑制 | 当前使用 Releases 下载入口与独立更新渠道；没有把官方商店发行当成本 Fork |
| WebDAV / 自托管 Cloud | 保留用户主动配置入口 | 不预填、注册、探测或写入用户真实云端 |
| 上游网站、教程、隐私说明与捐助链接 | 用户点击才打开 | 来源入口保留，上游网站/隐私/支持条目明确标注 Mindwtr；不冒充本 Fork 的服务 |

本次没有执行真实服务请求、设备操作或 GitHub 写操作。Mock 测试内的账号、令牌和 URL 均为人工样本。

## Dev 同步确认

独立包名只隔离本机应用空间。相同 WebDAV 目录、文件同步目录、Dropbox 账号或自托管服务仍可能操作同一份云端数据，因此不在界面宣称“云端已隔离”。

1. Dev 的同步设置入口与日用设置提示用户使用独立测试账号、目录或服务。
2. 第一次实际同步、连接能力探测或远端加密状态变更之前，前台显示明确的目标确认。取消时不运行 WebDAV 探测、不启动同步、不把待配置凭据提交为已生效连接。
3. 未确认的自动/后台同步提前返回暂停错误。用户可回到前台手动同步并确认；确认后仍使用上游原同步接口继续，不删除 WebDAV 或自托管能力。
4. 确认只存在于当前进程内。更换目标 URL、账号或凭据，或重启应用，均需重新确认。只保存内存配置指纹；不新增 schema、同步字段或持久化确认凭据。
5. 弹窗省略 URL 用户信息、query 与 fragment，认证信息不进入提示；文档、日志不记录用户真实凭据。此确认是用户对独立目标的核对，不是程序证明云端隔离。

普通同步入口位于 `lib/sync-service.ts` 的 orchestrator cycle，先核对实际使用的配置再进入网络检查与任务读写；`components/settings/use-sync-settings-transport-actions.ts` 对绕开主同步入口的连接/激活探测同样先检查；`lib/sync-encryption-service.ts` 在打开远端变更目标之前检查。Stable 的原有同步行为保持。

## 验证记录

| 检查 | 结果与证据 |
|---|---|
| Mobile TypeScript | `node ../../node_modules/typescript/bin/tsc --noEmit --pretty false`，退出码 0，日志 `evidence/development/identity-typecheck.log`（成功无输出） |
| 定向 ESLint | 自有身份/同步拦截与接入文件检查退出码 0；0 errors、8 条既有 import/unused warnings。见 `evidence/development/identity-eslint-final.log`；此前关于页 callback 常量作用域错误已修复，初次日志另存 |
| 身份/链接/Widget JS/同步/加密/设置回归 | 16 组、398 条执行；首次 397 通过，新增取消测试遇到缺失的 core fingerprint mock。位置和失败原文保留于 `evidence/development/identity-tests.log`；补齐真实函数 mock 后，完整设置 transport 套件 53/53 通过，见 `identity-transport-tests.log` |
| Dev 业务边界 | 已覆盖未确认后台同步在网络探测/任务读取前停止；取消 WebDAV 激活不探测、不保存秘密；更换目录/账号/令牌、进程重启重新确认；并发弹窗去重；Stable 不受确认规则影响 |
| Native WidgetPayload | 新增 Dev 链接、默认回退及跨渠道拒绝 Kotlin 用例；原生编译/运行结果以 Android 构建记录为准，本次 JS 测试不能替代 |
| 设备与云端 | 未执行；包名/scheme 的最终 manifest、安装共存、A→B→C 覆盖升级、Widget 点击、跨端同步与独立云空间仍需实测 |

后续真实设备验收先安装可辨识 Dev 包并使用独立样本，确认 APK 包名、scheme、签名与关于页信息一致，再演练取消/确认、同步隔离和覆盖升级。
