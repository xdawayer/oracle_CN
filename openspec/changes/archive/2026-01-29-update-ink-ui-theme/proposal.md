# Change: 全局水墨禅意 UI 风格统一（仅视觉）

## Why

当前小程序 UI 风格在不同页面与弹窗之间缺乏一致性，视觉语言不够统一，且缺少明确的品牌审美表达。需要在不改变交互与功能逻辑的前提下，统一为「水墨、纸感、东方禅意」的整体风格，同时保持阅读友好与对比度合规。

## What Changes

### 视觉与风格
- 全局背景升级为温暖纸感 + 砂纸纹理（避免纯白，保持柔和不刺眼）
- 主文本使用 `paper-900` 等深墨色系，避免纯黑；强调色沿用现有 `accent/mystic/psycho` 体系
- 卡片/弹窗/面板统一纸感底 + 低对比度边框与阴影，禁止左侧彩条与多层卡片嵌套
- 按钮、标签、输入框统一风格与过渡，保留现有交互逻辑与结构

### 字体与排版
- 引入免费开源古风字体（优先 Source Han Serif SC）
- 通过 `wx.loadFontFace` 加载字体并提供系统宋体回退（不使用付费字体）
- 调整字重与行高以保证可读性与禅意气质

### 覆盖范围
- 覆盖 AstroMind 小程序所有页面与所有弹窗内容
- 仅做视觉与样式调整，不改动交互流程与功能逻辑

## Impact

- **Affected specs**: ui-theme（新增）
- **Affected code**:
  - `miniprogram/app.wxss`（全局视觉基调、主题变量）
  - `miniprogram/app.js`（字体加载与初始化）
  - `miniprogram/pages/**`（各页面样式）
  - `miniprogram/components/**`（可复用组件样式）
  - `miniprogram/images/**`（纸感纹理与装饰资源）
