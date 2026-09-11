# 增量构建的重复系统入口 · 2026-09-12

已从安装的Dev vc7和实际APK发现重复intent-filter，再以当前生成Manifest复现。此问题属于增量prebuild的系统入口生成，不是此前目录导出异常的已证实原因。

## 可复现的失败

`node evidence/development/check-apk-intent-tree.cjs evidence/development/native-intent-vc7-aapt-red.txt evidence/development/native-intent-vc7-compiled-red.json`读取aapt导出的实际vc7二进制Manifest，退出1：MainActivity38组中只有6种完整结构，ContextAutomationReceiver22组中只有2种。此包的身份仍为e6a797d5 / vc7，旧APK没有修改。

`node evidence/development/check-manifest-filters.cjs apps/mobile/android/app/src/main/AndroidManifest.xml evidence/development/native-intent-duplicates-red.json`在后续多次构建的生成目录上退出1：MainActivity56组中包含18份SEND和18份SEND_MULTIPLE，Context两组各17份；VIEW中也累积了完全相同的scheme节点。原始记录保存在本地evidence目录。

## 已定位的原因与适配

expo-share-intent 5.1.1实际插件每次concat分享过滤器；上游shortcut/context插件只用原mindwtr身份判断是否已存在，品牌最终改写后，下一次prebuild无法识别旧条目而再次添加。Expo Scheme还会向现有VIEW过滤器插入scheme，在Dev/Stable身份重写后形成相同data节点。

品牌finalized阶段现在使用Expo现有Manifest解析/写入API，仅删除组件内结构完全相同的intent-filter，以及其中完全相同的action/category/data节点。比较保留全部属性值、未知标签和数组顺序，不按action或scheme单独合并，不修改上游源码或依赖。属性键顺序不同不构成不同语义；host、path、MIME、priority和autoVerify不同均保留。

当前生成文件的内存验证为MainActivity56→7、Context34→2，第二次处理changed=false；7组包含不同exp scheme组合，不能为了固定数量而误删合法入口。

## 验证状态

真实shortcut/context/share/Expo Scheme插件加品牌最终处理的循环测试先4 RED；修复后新回归与旧native-brand共5 GREEN、41次断言。完整工程套件120 pass/1默认跳过/0 fail，2718次断言、7.72秒。宿主真实签名重测试本轮未重复执行，既有5fb560d6结果保持独立。

接下来对固定提交执行真实Dev→Stable→Dev prebuild及Dev vc11构建，并对实际APK重复检查。构建前不提前填写通过；[vc11版本记录](docs/versions/0.1.0-dev-vc11-2026-09-12.md)保存最终源码、产物和结果。手机仍为vc7，尚未安装诊断vc9或新的干净候选；导出复测、完整系统/无障碍矩阵与正式发布仍未完成。
