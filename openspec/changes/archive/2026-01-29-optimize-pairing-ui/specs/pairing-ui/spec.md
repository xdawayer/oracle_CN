## ADDED Requirements

### Requirement: 统一页面 Header 布局
页面 header SHALL 采用与 daily/self 页面一致的布局结构，MUST 包含居中标题和副标题。

#### Scenario: Header 显示正确
- **WHEN** 用户进入星座配对页面
- **THEN** 页面顶部显示居中的主标题"星缘速配"
- **AND** 主标题下方显示副标题"探索你们的缘分密码"
- **AND** header 背景与页面整体风格一致

### Requirement: 爱心中央装饰
中央装饰区域 MUST 使用爱心符号（❤️）替代原有的"对比"文字，并 SHALL 配有心跳动画效果。

#### Scenario: 爱心装饰显示
- **WHEN** 用户查看选择区域
- **THEN** 两个用户卡片之间显示红色爱心符号
- **AND** 爱心具有轻微的心跳脉动动画
- **AND** 爱心颜色使用 `var(--danger)` 或等效的玫瑰红色

### Requirement: 星座与属相双重显示
用户卡片 MUST 同时显示星座名称和属相信息，星座 SHALL 为主体信息，属相 SHALL 为辅助信息。

#### Scenario: 卡片信息完整显示
- **WHEN** 用户选择星座和属相后
- **THEN** 卡片中央显示星座名称（大字体，约 48rpx）
- **AND** 星座名称下方显示"属X"格式的属相信息（小字体，约 16rpx）
- **AND** 字体大小比例约为 3:1

#### Scenario: 选择器与卡片同步
- **WHEN** 用户通过 picker 更改星座或属相选择
- **THEN** 对应的用户卡片立即更新显示新的星座和属相信息

### Requirement: 爱情主题视觉风格
页面整体视觉风格 MUST 体现爱情/浪漫主题，SHALL 使用暖色调配色方案。

#### Scenario: 主按钮爱情风格
- **WHEN** 用户查看"立即测算缘分"按钮
- **THEN** 按钮使用爱情主题色（玫瑰红/粉色系）
- **AND** 按钮可包含爱心图标装饰

#### Scenario: 结果弹窗爱情风格
- **WHEN** 配对结果弹窗显示
- **THEN** 弹窗顶部或分数区域包含爱心装饰元素
- **AND** 整体配色与爱情主题一致

### Requirement: 结果展示包含属相信息
配对结果展示 MUST 同时包含双方的星座和属相信息。

#### Scenario: 结果头部信息完整
- **WHEN** 配对结果弹窗显示
- **THEN** 顶部的双方头像/卡片区域显示星座名称
- **AND** 同时显示对应的属相信息
- **AND** 分析文案中包含星座和属相的综合解读

## MODIFIED Requirements

（无现有需求需要修改）

## REMOVED Requirements

（无需求需要移除）
