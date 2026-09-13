# Todo Moe 家族图标

按用户要求，参考两个仓库的当前图标制作新的 Todo Moe 家族成员：黑白猫耳、眨眼红瞳、金色铃铛、白色贴纸边缘；当前 Android 自适应图标使用独立全幅深色背景，不再把圆角底板画入主体；以青绿色勾选清单替换网络/音频标记。

| 参考 | 当前Git blob |
|---|---|
| [NAT Moe](https://github.com/XiaoLeXLDW/nat-moe/blob/main/assets/app-icon-window.png) | `f75ac0afbd5c59b62dbf3d245ab12603d9cb5970` |
| [VBAN Receiver](https://github.com/XiaoLeXLDW/vban-receiver-mac/blob/main/Resources/AppIconTransparent.png) | `c79341f9f4ebc4954311edc8b2963dbac15b4612` |

参考快照与原仓库MIT许可保存在`references/`，已用实时Git blob哈希核对。插画通过内置image_gen生成，提示词及一次背景修正见[generation-prompts.md](generation-prompts.md)。源图在工程内，构建不依赖生成工具或外部路径。

- `family-mascot-v1-source.png`：历史原始家族素材，保留追溯；不再用于当前图标打包。
- `family-mascot-v2-transparent.png`：1254px 真 Alpha 主体源，移除底板、边框与外部棋盘背景，保留猫咪、铃铛、清单及贴纸轮廓。
- `family-mascot-v3-skin.png`：当前打包源，在v2基础上按Lan Moe统一脸部肤色和腮红；保留原Alpha与非脸部像素。
- `family-mascot-v4-light.png`：最新打包源。用户指出v3偏黑后，提亮肤色，保留轻暖底色和淡腮红；取代v3。
- `icon.png`：1024px 全幅深色标准图标，用于应用与启动画面，无内嵌圆角框。
- `background.png`：1024px 独立不透明渐变背景；Expo adaptive backgroundImage 实际使用此资源，可见区域从 RGB(44,54,63) 渐变至 RGB(9,14,18)。
- `foreground.png`：1024px 真透明自适应前景。按 Lan Moe 人物占比封装到108dp图层中的72dp可见区域；具体版位见下方最新记录。
- `monochrome.png` / `monochrome.svg`：简化清单勾选符号，用于系统单色图标；完整角色插画没有伪造的SVG版本。
- `asset-manifest.json`：文件尺寸和SHA-256。离线重建：`node scripts/moe/brand-assets.mjs`，使用项目锁定的Expo/Jimp工具，不新增全局图像依赖。

家族角色保留，家族色主题已在0.2.0移除；界面配色由系统动态色或用户自定义主色控制。此素材替换旧占位图标，包名、证书、版本代码规则和任务数据不变。

## 2026-09-13 Alpha 修正

内置 imagegen 两次背景提取都输出 RGB 棋盘格，均拒绝直接打包。用户明确允许程序抠图后，使用工程内 Jimp，仅从画布边界连通的近灰色棋盘区域提取 Alpha；未以暗色阈值删除毛发。透明源中的 421098 个深色像素（RGB 最大值≤76）全部保持原 RGB 与不透明 Alpha。

vc34/vc35 当时的前景透明/半透明/不透明像素为 888212 / 2579 / 157785；最大不透明轮廓半径 310.501px，小于 66dp 安全圆的 312.889px。浅深背景、圆形与 squircle 本地预览和核验在 `evidence/development/icon-alpha-candidates/`。这些是静态遮罩预览，尚不代表真实 Launcher 验收。

## vc36 图标版位修正

用户指出 vc35 的图标主体偏小、视觉向左。前景改为原尺寸约112.9%，在1024px图层向右24px、向上4px；标准图标按相同比例修正。依据主角色视觉中心调整，不旋转或重绘角色。

完整 Alpha 轮廓在72dp圆形视口内无裁切（最大半径338.389px，视口半径341.333px），圆角方形亦完整。这个设计比旧66dp保守安全圆更饱满；不宣称在任意 Launcher 动态变形下都零裁切。源透明位图不变，仅打包版位变化。

## vc37 进一步放大

按用户再次反馈，在vc36基础上再放大约8.6%，光学中心同步保持。当前前景参数为380 / +26 / -4；本机圆角方形遮罩预览无裁切。此前vc36圆形遮罩的零裁切记录仅适用于当时尺寸。

## 2026-09-14 与 Lan Moe 统一（取代 vc37 版位）

实际读取相邻 `local-lan-device-peeker` 项目的 `scripts/build-icons.ps1`、`assets/branding/README.md` 和 Android `drawable-nodpi/lan_moe.png`。Lan 的 Android Manifest 直接使用带9%透明外边距的传统PNG；Todo继续使用独立自适应图层，不将这个桌面外边距再次套入108dp前景。

按可见底板统一人物比例：完整透明主体高度80%、左边距13%、上边距12%，猫耳顶部和铃铛周边留白接近 Lan。沿用该家族顶部 RGB(44,54,63)、底部 RGB(9,14,18) 的渐变色，标准图和自适应图在72dp中心视口对应相同版位与颜色。源角色像素文件不变；不复制 Lan 的路由器，也不依赖相邻项目进行构建。

1024px前景实际Alpha边界为(259,253)–(816,798)，圆角比例23%的静态方形遮罩裁切像素为0。并排大图和64px预览位于 `evidence/development/icon-lan-family/comparison.png`。此项为资源预览，不等同新APK的Launcher真机验收；已发布vc37资产不覆盖。

## 2026-09-14 肤色统一

用户确认将偏亮粉的皮肤调成Lan Moe的暖米色、弱化腮红。使用内置imagegen，输入为v2透明源（编辑对象）和Lan Moe原插画（仅肤色参考）。生成结果附带棋盘背景，未直接打包；只从脸部肤色区域提取编辑结果，原Alpha逐像素保留，脸部区域外RGB逐像素不变。实际改变86,694个像素；Alpha变化0，脸部区域外变化0。版位和渐变背景代码不变。

提示词：[skin-edit-prompt.md](skin-edit-prompt.md)。编辑输出、提取记录和对比在 `evidence/development/icon-skin/`；当前源文件为 `family-mascot-v3-skin.png`，已经重建标准图与自适应前景。此肤色更新尚未打入新APK，vc38仍是此前肤色版本。

## 2026-09-14 提亮修正（最新）

用户指出v3偏黑，批准只提亮。内置imagegen基于原v2编辑，保留轻暖肤色和淡腮红。为避免v3局部提取边界在大图中显现，改为从脸颊肤色连通区提取并柔化边缘；保留原Alpha和连通区外RGB。变化89,020像素；Alpha变化0、区域外变化0。放大查看面部过渡和并排图已完成。大小、位置和渐变背景保持不变。源码打包已切到v4，未重新构建APK。

预览与验证：`evidence/development/icon-skin-light/`；提示词见同目录品牌文档 `skin-edit-prompt.md` 的提亮节。

## 2026-09-14 中间亮度（当前打包源v5）

用户反馈v4太白，确认在v3偏暗版和v4提亮版之间回调一半。此次不重新生成插画，使用 `scripts/moe/brand-skin-midpoint.mjs` 只调整脸部连通区的CIELAB L亮度，保留v4的a/b色度（8位量化前），边缘柔化。平均L：v3为88.572、v4为93.322，目标90.947，实际90.953。Alpha变化0、脸部区外RGB变化0。

当前源为 `family-mascot-v5-mid.png`；标准图与自适应前景已重建。布局、背景、眼睛和配件未更改，尚未打入新APK。并排预览与核验保存在 `evidence/development/icon-skin-mid/`。
