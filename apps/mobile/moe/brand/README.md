# Todo Moe 家族图标

按用户要求，参考两个仓库的当前图标制作新的 Todo Moe 家族成员：黑白猫耳、眨眼红瞳、金色铃铛、白色贴纸边缘、深灰底板；以青绿色勾选清单替换网络/音频标记。

| 参考 | 当前Git blob |
|---|---|
| [NAT Moe](https://github.com/XiaoLeXLDW/nat-moe/blob/main/assets/app-icon-window.png) | `f75ac0afbd5c59b62dbf3d245ab12603d9cb5970` |
| [VBAN Receiver](https://github.com/XiaoLeXLDW/vban-receiver-mac/blob/main/Resources/AppIconTransparent.png) | `c79341f9f4ebc4954311edc8b2963dbac15b4612` |

参考快照与原仓库MIT许可保存在`references/`，已用实时Git blob哈希核对。插画通过内置image_gen生成，提示词及一次背景修正见[generation-prompts.md](generation-prompts.md)。源图在工程内，构建不依赖生成工具或外部路径。

- `family-mascot-v1-source.png`：最终生成的1254px位图源，深色不透明背景；不将棋盘格冒充透明。
- `icon.png`：1024px标准图标，用于应用与启动画面。
- `foreground.png`：1024px自适应前景，内容缩至676px并居中，为Android裁切预留边距。
- `monochrome.png` / `monochrome.svg`：简化清单勾选符号，用于系统单色图标；完整角色插画没有伪造的SVG版本。
- `asset-manifest.json`：文件尺寸和SHA-256。离线重建：`node scripts/moe/brand-assets.mjs`，使用项目锁定的Expo/Jimp工具，不新增全局图像依赖。

家族主题采用浅色主色`#166D68`与深色主色`#80DFD3`，配合白色/深墨色文字；默认柔白与跟随系统设置不改变。此素材替换旧占位图标，包名、证书、版本代码规则和任务数据不变。
