# GitHub CI 首次运行与修正

**首个远端APK已成功并下载核验。** [运行34615262274](https://github.com/XiaoLeXLDW/todo-moe/actions/runs/34615262274)使用4GiB Gradle堆，完整Android构建19m43成功，随后POSIX Widget测试46秒成功。源码`50fa606deb53f2f6a392c08cc2f5b7224ca549fe`，Dev versionCode21915124，42,030,840字节，APK SHA-256 `be4dac07b46ff0f3f4ce2069e1c6d0d38aedbaf4a4dc7be6406219fb58c02156`。此结果关闭该轮R8内存不足问题；后续提交的实时检查见[PR #1](https://github.com/XiaoLeXLDW/todo-moe/pull/1)。

下载的Actions ZIP SHA-256与GitHub artifact digest完全一致：`ab3936a768e5f09ca5dd1e19c5617174a4358687d3551e29f9969a8d335f19a2`。本机再次核验APK哈希、aapt包/版本、apksigner测试证书、实际app.config、品牌图标像素、16KiB zipalign及32个ELF库所有PT_LOAD对齐，均通过。记录保存在`artifacts/ci-21915124-50fa606/verification.json`；没有安装这个CI包，手机仍是vc6，不能用CI结果代替新UI或正式发行验收。

下文保留此前失败、排队与修复过程；其中“待构建结果”是各次补录时的历史状态。

PR：[Todo Moe Android开发](https://github.com/XiaoLeXLDW/todo-moe/pull/1)，开发分支`feat/todo-moe`；未合并、未创建正式Release。本机候选已更新到vc6 / 源码70366ddb4973cd7cc4cf39815e178b4cc033513c；家族图标已集成并覆盖安装，手机界面待解锁复验。后续治理/构建脚本提交与本机APK运行源码分开记录。

首次PR检查针对提交62e4075e67f3a48d82dd54ba661b383a3a425a20运行。自有[检查工作流](https://github.com/XiaoLeXLDW/todo-moe/actions/runs/34607358864)的check job已通过，APK任务排队。上游CI的core（3869通过/8跳过）、mobile、Web E2E、代码质量、性能预算、cloud/MCP、Windows Rust及Rust依赖审计已有成功结果。

| 首轮失败 | 实際原因与修正 | 本地复核 |
|---|---|---|
| Dependency Audit / Governance | 旧断言要求query-string重复patchedDependencies登记，与已实现的等效postinstall冲突；改为验证固定安全版本、两处入口、四个真实消费者、预存修复、幂等及Node解码，禁止重复登记 | 固定Bun1.3.5五项/63断言通过，安全advisory限制未放宽 |
| Governance Watch选择门槛 | 测试github上下文缺少新增仓库guard所需repository；补上上游正例及同事件fork负例，保留原六组条件 | 22项/290断言通过；README标题一致性通过 |
| iOS工程生成 | 此fork app.config只配置Android，旧CI仍生成完整iOS工程，缺少bundleIdentifier；独立Swift回归继续执行，依赖完整iOS应用的7步限定上游仓库 | 选择正/负与Android保留检查通过；原native治理6项/147断言通过 |
| Android Widget测试 | 无appLabel的legacy payload已采用中性fallback，旧测试仍期待Mindwtr文案；只更新旧文案断言 | QuickCapturePayloadAudio与WidgetPayload两套原生复核成功 |

合并执行工程策略及两份治理测试：47项通过、449断言；原始失败日志与本地复核保存在`evidence/development/`。这些修正需要新提交上的远端复跑，不能把本地通过或被跳过的完整iOS应用构建写成已完成的跨平台发行验收。
## 后续结果与R8内存修正

提交9ee08ff30fd39c19f8e76a0b50e754898212c6b9的常规CI、Dependency Audit、Native Platform CI及自有check job均已通过；Linux的完整Widget任务也通过，独立Swift回归继续执行，完整iOS应用步骤按Android范围跳过。

自有APK job 103299017326 在26m29后因 `R8: java.lang.OutOfMemoryError: Java heap space` 失败；项目默认Gradle堆为2GiB，本机成功交付使用4GiB堆、1GiB metaspace及最多4个worker。CI现将这些成功参数写入其项目内GRADLE_USER_HOME，并缓存依赖与wrapper。

同时增加实际APK内 `assets/app.config` 检查，防止缓存或构建期间源码变化造成源码SHA/版本/渠道/图标身份不一致；只读取有大小上限的单一元数据项。真实压缩ZIP的缺失、错误来源、错误渠道/版本/包名及超大元数据负例均能拒绝，已用于现有vc6实际APK。工程24项测试通过，缓存与资源修复仍需新CI构建完成后才能写为成功。
## 开发构建去重

首次实际运行显示同一开发提交同时由push和PR触发，Dev APK又在同一并发组串行等待。开发分支现在通过PR（可为草稿）执行完整检查及APK构建，main推送、手动与复用入口仍保留；不重复排入两个相同代码的Dev构建。没有跳过检查或签名/身份校验。

## 完成的检查与本机构建缓存验证

提交`efb2a335fcb8ea71c6438aed8e8bee7752af9611`的[常规CI](https://github.com/XiaoLeXLDW/todo-moe/actions/runs/34616624257)、[Native Platform CI](https://github.com/XiaoLeXLDW/todo-moe/actions/runs/34616624246)和[Dependency Audit](https://github.com/XiaoLeXLDW/todo-moe/actions/runs/34616624186)全部成功，自有check也成功。补录时APK仍排队，上一轮50fa606的push构建仍在执行；没有将排队或取消记作成功。

独立审查确认Expo每次preBuild都生成app.config，新校验读取真正APK元数据；签名job没有引入依赖安装或缓存。另发现RN的Gradle输入只列mobile内的JS/TS，缺少图片、JSON及workspace外层源码。已为唯一的 `createBundleReleaseJsAndAssets` 任务注入强制执行和禁止缓存复用规则，保留全部原生增量；RN任务原本已有 `--reset-cache`。工程29项测试通过。

用项目内Gradle8.14.3/JDK21执行独立fixture三次，耗时74.498秒：bundle每次执行；原生模拟任务第一次执行、第二次UP-TO-DATE、移除该fixture输出后第三次FROM-CACHE。规则真实生效且未影响其他任务。证据：`evidence/development/gradle-bundle-fixture-5Njitl/verdict.json`及三份日志；这不是完整Android构建。vc6的历史构建日志已确认bundle实际执行，且APK内图标解码像素与品牌源完全一致。
