# Todo Moe 第三方许可与致谢

Todo Moe 基于 dongdongbh/Mindwtr，保留上游版权、历史和 [AGPL-3.0-only 完整许可](LICENSE)。Todo Moe 的更改由对应 Git 提交记录；第三方代码的原有权利声明继续适用。

## 原生玻璃

复制并适配的 SukiSU-Ultra、compose-miuix-ui / miuix-blur 和 AndroidLiquidGlass 衍生玻璃材料，在应用中保留完整 Apache-2.0 与 NOTICE。不是整个 SukiSU 应用或其品牌的复制。

- [完整 Apache-2.0](apps/mobile/modules/moe-glass/android/src/main/assets/moe-glass/Apache-2.0.txt)
- [NOTICE](apps/mobile/modules/moe-glass/android/src/main/assets/moe-glass/NOTICE.txt)
- [固定来源、许可归属及改动](apps/mobile/modules/moe-glass/android/src/main/assets/moe-glass/SUKISU-COMPOSE-SOURCES.md)
- [玻璃原始来源说明](apps/mobile/modules/moe-glass/android/src/main/assets/moe-glass/THIRD_PARTY.md)
- [逐文件来源清单](apps/mobile/modules/moe-glass/android/src/main/assets/moe-glass/VENDORED-SOURCES.json)

## 运行依赖

React Native、Expo、React、Reanimated、Zustand 等依赖保留各自许可。AndroidX Compose 等原生依赖继续适用各自声明，玻璃所需 Apache 正文随应用提供。

`scripts/moe/generate-license-notices.mjs` 读取已安装移动端运行依赖的 LICENSE/COPYING/NOTICE 文件，递归遍历声明的 dependencies 并把文本原样生成到 `apps/mobile/moe/legal/notices.generated.ts`。该文件由应用离线阅读器直接导入，包含根目录 AGPL 及玻璃材料。依赖目录没有独立许可文本或未安装的项列在覆盖范围中，而非假定其许可不存在。

这是基于依赖声明与仓库复制来源的清单，可能包含打包时被裁剪的模块，也不声称覆盖全部 Gradle 原生传递依赖或构成完整 APK 许可审计。发布时应同时提供对应源码及适用构建脚本，并保留库自带声明。

已发布的 vc33 不会因仓库增加这个阅读器而自动改变；补充许可材料与新版本内置许可分别记录。
