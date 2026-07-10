# Miku Live Wallpaper

基于网页技术制作的 Wallpaper Engine 动态壁纸：画面会按电脑本地时间在晨曦、早晨、上午、中午、下午、傍晚与晚上之间自然过渡；播放音乐时，节奏光环和底部频闪条会响应系统音频。

## 功能

- 本地时间驱动的全天场景切换，使用 `smootherstep` 缓动交叉淡化。
- 7 张高分辨率场景图，按需显示当前和下一张，避免一次性占满显存。
- 30 FPS Canvas 音乐可视化：右上节奏光环与 48 条底部频闪柱。
- 支持 16:9、超宽屏和其他屏幕比例。
- 可选 ASUS Aura Sync 联动：兼容 Aura Ready Game SDK REST 服务时，可将音乐节奏映射到已枚举的 Aura RGB 设备。

## 导入 Wallpaper Engine

1. 启动 Wallpaper Engine，点击 **创建壁纸**。
2. 选择网页壁纸，或直接拖入 [`wallpaper-engine/index.html`](wallpaper-engine/index.html)。
3. 在编辑器中预览并保存一次项目；Wallpaper Engine 会自动生成本机的 `project.json`。
4. 通过 **Workshop → Share Wallpaper** 发布。

详细时段配置及导入说明参见 [项目内 README](wallpaper-engine/README.md)。

## 时间锚点

| 场景 | 时间 |
| --- | --- |
| 晨曦 | 05:00 |
| 早晨 | 07:00 |
| 上午 | 09:00 |
| 中午 | 12:00 |
| 下午 | 14:00 |
| 傍晚 | 17:30 |
| 晚上 | 20:00 |

每张场景图会在它的锚点时刻完整呈现，再连续混合到下一张图；晚上会平滑过渡至次日晨曦。

## 音乐效果

Wallpaper Engine 会把系统音频的左右声道频段传入壁纸。低频驱动右上角的光环大小与亮度，完整频谱驱动底部频闪条。没有声音时，可视化层保持透明。

首次导入后请在 Wallpaper Engine 编辑器中保存项目一次，以启用音频处理。

## ASUS Aura Sync（可选）

`wallpaper-engine/aura-sync.js` 支持 **Aura Ready Game SDK 的 REST 服务**。服务可用且检测到音乐后，壁纸会以约 80 ms 的间隔将节奏映射为青蓝—粉色 RGB 脉冲；静音、关闭或切换壁纸时会释放控制。

使用前请确认：

1. 主板/ARGB 控制器和机箱灯带支持 ASUS Aura Sync。
2. 已安装并运行提供 `http://127.0.0.1:27339/AuraSDK` 的 Aura Ready Game SDK 兼容组件。

若仅使用 Aura SDK 3.1 / Lighting Service（COM 接口），则需要额外的 Windows 桥接程序，不能直接使用当前 REST 接入层。没有 Aura 服务时，壁纸不会更改任何灯效。

## 项目结构

```text
wallpaper-engine/
├── index.html          # Wallpaper Engine 导入入口
├── styles.css          # 场景与可视化层样式
├── wallpaper.js        # 时间切换与音频可视化
├── aura-sync.js        # 可选 Aura REST 灯效联动
└── gen-locked-scene-time/  # 7 张场景素材
```

## License

代码采用仓库中的 [MIT License](LICENSE)。场景素材的使用与再发布请确保符合其原始作者或权利人的授权要求。
