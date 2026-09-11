# 2026-09-12 发布说明与草稿恢复

本次补齐发布资料和失败恢复的电脑端实现。没有创建、签名或发布正式版本；真实GitHub写入、坏版本撤回及手机更新仍需对应环境和验收。

## 发布资料绑定

每个正式语义版本须提供`docs/todo-moe/release-notes/<version>.json`，包含实际变更、明确的已知问题列表、支持设备/验收范围、验证摘要和对应版本记录路径。当前0.1.0材料明确保留尚未完成的实机与正式身份验收，没有写成已放行。

Stable构建在原生编译前从固定源码SHA的Git普通blob读取JSON和Markdown记录；不读取被修改的工作区副本、不跟随symlink或未提交文件。输出`release-notes-input.json`含版本记录原文及SHA-256，`build-manifest.json`记录整个输入文件的SHA-256。

隔离签名任务只用Node内建模块和Android SDK处理这些数据。它核对版本、资料完整性、输入与记录哈希，再生成含实际变化/限制/设备范围、签名APK身份和完整记录的`RELEASE-NOTES.md`。签名manifest保存说明文件和版本记录的哈希；发布任务再次对照批准源码的Git blob核对。

## 三种操作分别处理

| 情况 | 入口和结果 |
|---|---|
| 新的正式候选 | `moe-release-android.yml`仍要求新的版本代码；检查、构建、签名后默认生成草稿 |
| 原publish=true运行上传中断 | 重跑原失败的release job，消费原signed工件；只补缺失文件，不重签或覆盖已有文件 |
| 默认publish=false草稿已成功，稍后公开 | `moe-publish-existing.yml`指定原signed_run_id、approved_sha和version_code；默认只预览，publish=true才进入发布保护环境 |

新入口先以只读权限核对原main手动工作流、成功签名任务与唯一有效工件ID，再验证下载字节、源码、版本记录及远端状态。四个签名文件连同审查计划上传为当前运行的不可变review artifact，供人工审批；实际发布只消费该工件ID并复核输入和哈希。它不使用签名环境，也不重新构建或签名。

发布编排用草稿正文中的摘要绑定完整工件集合；已有文件必须大小和哈希一致，缺失才补传。公开前后均回读tag、四项资产和draft状态。已发布且完全相同的调用只读返回；同版本不同工件、额外APK、tag冲突、哈希错误和没有可验证草稿的孤儿tag均拒绝。新的工作流完整重跑仍不能复用已占用版本代码，不要用删除tag或覆写资产绕过检查。

## 已执行的验证与边界

- 完整工程测试116项通过、1项显式宿主签名测试默认跳过、0失败，2685次断言；随后单独执行了真实签名测试，不把跳过算通过。
- 干净提交`5fb560d6f2f2bc3a5b0af65a4491f18df5ad27d6`实际Stable无签名构建4m44通过。APK为41,986,980字节，SHA-256 `beb0dd84f855b8a5ee9ccf37635572a18e0833b66a5bb157c9421270c5ec0a26`；包名/版本/嵌入配置、无签名块、16KiB zipalign及32个ELF库对齐通过。详见[本次版本记录](docs/versions/0.1.0-stable-vc1-release-flow-2026-09-12.md)。
- 本次builder实际生成说明输入，SHA-256 `4367fe346d2fcc4f22b6d34fc03fd8771c6f392ee34f0c761ffc746a24f03d6e`。宿主签名测试直接使用该原始文件，15个场景通过（Node含父测试16 pass，14.27秒）；原APK、manifest和说明输入字节未变，临时测试证书已清理。日志为`evidence/development/signing-integration-builder-notes-5fb560d6.log`。
- 发布资料7项测试通过：固定Git源、未提交/symlink拒绝、必填资料、嵌套记录哈希、篡改和大小限制。
- 签名宿主测试使用一次性RSA测试证书；15个实际场景通过（Node汇总16 pass含父测试）。包含证书、真实APK包名/版本、资料和哈希拒绝；正式私钥未使用，临时证书和APK副本已清理。
- fake-gh覆盖上传中断、精确补传、缺失/损坏资产、成功响应却未公开、重复调用、版本递增门禁，以及默认草稿到新入口公开。它不等于真实GitHub发布验证。
- 当前手机仍为vc7。目录选择器兼容修复的受控切屏复测、完整系统/无障碍矩阵、正式签名发布和7天日用仍未完成。

显式宿主签名复核使用项目Node和已有SDK：设置`MOE_SIGNING_INTEGRATION=1`，再执行`node --test scripts/moe/sign-android.integration.test.mjs`。默认发现只跳过这项重测试；普通工程测试仍执行。`MOE_UNSIGNED_TEST_DIR`可指向本次新builder产生的vc1目录，已有sidecar会原样验证；只有旧无sidecar的工程样本使用人工测试资料。
