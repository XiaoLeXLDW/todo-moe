# Todo Moe 家族图标

Todo Moe 使用黑白猫耳、红瞳、金色铃铛与清单标记的家族角色。当前 Android 图标使用独立深色渐变背景和透明前景，不把 Launcher 圆角底板画进角色。

## 当前构建输入

- `family-mascot-v6-reference.png`：当前角色源图；肤色按保存的 Lan Moe 参考像素校正。
- `icon.png`：1024px 标准图标和启动画面。
- `foreground.png` / `background.png`：Android 自适应图标前景与背景。
- `monochrome.png` / `monochrome.svg`：系统单色图标使用的简化清单标记。
- `asset-manifest.json`：受管理输入和输出的尺寸与 SHA-256。

使用 `node scripts/moe/brand-assets.mjs` 离线重建。生成器当前会读取 v1–v6 以及全部输出，因此旧源图不能脱离脚本单独删除。重建后应比较 manifest、尺寸、Alpha 与当前图标预览，避免意外重绘或换色。

## 历史输入

`family-mascot-v1-source.png` 到 `family-mascot-v5-mid.png` 保存透明提取、版位和肤色校正过程；`generation-prompts.md` 与 `skin-edit-prompt.md` 记录可复现的艺术处理；`references/` 保存必要的参考快照、许可和来源。它们属于生成链历史，不是当前打包源。

## 来源与边界

参考素材和对应 MIT 许可保存在 `references/`。角色插画与修正记录在本目录内，构建不依赖相邻项目或在线生成工具。品牌资源变化不改变包名、证书、版本规则、任务数据或主题配色来源。

历史版本中的像素测量和真机观察保存在 `docs/todo-moe/docs/versions/` 与设备记录中；它们只适用于对应产物，不作为当前图标的自动验收。
