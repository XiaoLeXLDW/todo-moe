# Todo Moe 家族图标

按用户要求，参考两个仓库的当前图标制作新的 Todo Moe 家族成员：黑白猫耳、眨眼红瞳、金色铃铛、白色贴纸边缘；当前 Android 自适应图标使用独立全幅深色背景，不再把圆角底板画入主体；以青绿色勾选清单替换网络/音频标记。

| 参考 | 当前Git blob |
|---|---|
| [NAT Moe](https://github.com/XiaoLeXLDW/nat-moe/blob/main/assets/app-icon-window.png) | `f75ac0afbd5c59b62dbf3d245ab12603d9cb5970` |
| [VBAN Receiver](https://github.com/XiaoLeXLDW/vban-receiver-mac/blob/main/Resources/AppIconTransparent.png) | `c79341f9f4ebc4954311edc8b2963dbac15b4612` |

参考快照与原仓库MIT许可保存在`references/`，已用实时Git blob哈希核对。插画通过内置image_gen生成，提示词及一次背景修正见[generation-prompts.md](generation-prompts.md)。源图在工程内，构建不依赖生成工具或外部路径。

- `family-mascot-v1-source.png`：历史原始家族素材，保留追溯；不再用于当前图标打包。
- `family-mascot-v2-transparent.png`：1254px 真 Alpha 主体源，移除底板、边框与外部棋盘背景，保留猫咪、铃铛、清单及贴纸轮廓。
- `icon.png`：1024px 全幅深色标准图标，用于应用与启动画面，无内嵌圆角框。
- `background.png`：1024px 全幅 `#0D141B` 独立不透明背景；Expo 现有 adaptive backgroundColor 使用同色。
- `foreground.png`：1024px 真透明自适应前景。按实际主体轮廓单次缩放到 66dp 安全圆内（108dp 图层）；不再对已经含边距的整张图做二次缩小。
- `monochrome.png` / `monochrome.svg`：简化清单勾选符号，用于系统单色图标；完整角色插画没有伪造的SVG版本。
- `asset-manifest.json`：文件尺寸和SHA-256。离线重建：`node scripts/moe/brand-assets.mjs`，使用项目锁定的Expo/Jimp工具，不新增全局图像依赖。

家族主题采用浅色主色`#166D68`与深色主色`#80DFD3`，配合白色/深墨色文字；默认柔白与跟随系统设置不改变。此素材替换旧占位图标，包名、证书、版本代码规则和任务数据不变。

## 2026-09-13 Alpha 修正

内置 imagegen 两次背景提取都输出 RGB 棋盘格，均拒绝直接打包。用户明确允许程序抠图后，使用工程内 Jimp，仅从画布边界连通的近灰色棋盘区域提取 Alpha；未以暗色阈值删除毛发。透明源中的 421098 个深色像素（RGB 最大值≤76）全部保持原 RGB 与不透明 Alpha。

当前前景透明/半透明/不透明像素为 888212 / 2579 / 157785；最大不透明轮廓半径 310.501px，小于 66dp 安全圆的 312.889px。浅深背景、圆形与 squircle 本地预览和核验在 `evidence/development/icon-alpha-candidates/`。这些是静态遮罩预览，尚不代表真实 Launcher 验收。

## vc36 图标版位修正

用户指出 vc35 的图标主体偏小、视觉向左。前景改为原尺寸约112.9%，在1024px图层向右24px、向上4px；标准图标按相同比例修正。依据主角色视觉中心调整，不旋转或重绘角色。

完整 Alpha 轮廓在72dp圆形视口内无裁切（最大半径338.389px，视口半径341.333px），圆角方形亦完整。这个设计比旧66dp保守安全圆更饱满；不宣称在任意 Launcher 动态变形下都零裁切。源透明位图不变，仅打包版位变化。
