## ADDED Requirements

### Requirement: 全局水墨纸感主题
小程序全局背景 MUST 使用温暖纸感色系并叠加轻微砂纸纹理，SHALL 避免纯白与过度高亮背景。

#### Scenario: 页面背景呈现纸感
- **WHEN** 用户进入任意页面
- **THEN** 页面背景为 `paper-100` 等纸感色基底
- **AND** 背景叠加低对比度纸纹理
- **AND** 不出现 `#fff` 纯白背景

### Requirement: 文本与图标颜色合规
主要文本 MUST 使用 `paper-900` 等深墨色，次要文本 SHALL 使用 `paper-600`，弱化文本 SHALL 使用 `paper-400`，并满足 WCAG AA 对比度要求。

#### Scenario: 文本颜色符合规范
- **WHEN** 用户查看页面主文本与次要说明文本
- **THEN** 主文本使用 `paper-900`
- **AND** 次要文本使用 `paper-600`
- **AND** 不使用 `#000` 纯黑

### Requirement: 古风字体加载与回退
系统 MUST 使用免费开源古风字体作为主字体，并在加载失败时提供系统宋体/衬线回退。

#### Scenario: 字体加载成功或回退
- **WHEN** 小程序启动
- **THEN** 通过 `wx.loadFontFace` 加载开源字体
- **AND** 若加载失败，自动回退到系统宋体/衬线字体
- **AND** 不使用付费字体

### Requirement: 卡片与弹窗统一纸感样式
卡片、面板与弹窗 MUST 使用纸感底色、浅色边框与克制阴影，且 MUST 避免左侧彩条与多层卡片嵌套。

#### Scenario: 卡片与弹窗风格统一
- **WHEN** 用户浏览列表卡片或打开弹窗
- **THEN** 背景为 `bg-paper-100/85` 等纸感底色
- **AND** 边框为 `border-paper-300/60` 等浅色边框
- **AND** 不出现左侧彩条或多层嵌套卡片

### Requirement: 装饰与图标资源规范
装饰与图标 MUST 使用 PNG/SVG 等资源文件，Unicode 符号仅在真机验证通过时使用，禁止使用 Emoji。

#### Scenario: 装饰元素符合规范
- **WHEN** 页面展示装饰图标或符号
- **THEN** 使用本地 PNG/SVG 资源
- **AND** 不使用 Emoji
- **AND** 若使用 Unicode 符号，已通过真机显示验证

### Requirement: 仅视觉层变更
本次变更 MUST 仅调整视觉风格，不得改变交互流程、功能逻辑或数据结构。

#### Scenario: 功能行为保持一致
- **WHEN** 用户完成任意现有功能流程
- **THEN** 功能行为与数据结果保持不变
- **AND** 仅视觉样式发生变化

## MODIFIED Requirements

（无现有需求需要修改）

## REMOVED Requirements

（无需求需要移除）
