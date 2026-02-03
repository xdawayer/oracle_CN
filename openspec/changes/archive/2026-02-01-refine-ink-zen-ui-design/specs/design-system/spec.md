# design-system Specification Delta

## ADDED Requirements

### Requirement: 水墨层级色彩变量
app.wxss SHALL 包含三级水墨透明度变量（`--ink-wash-1/2/3`），用于背景分层和 hover 状态。

#### Scenario: 墨晕层级渲染
- **WHEN** 页面中使用 `var(--ink-wash-1)` 作为背景色
- **THEN** 显示为极淡的灰色透明背景（`rgba(26,26,26,0.03)`）
- **AND** 与 `--paper-100` 背景有可辨识但不突兀的色差

### Requirement: 文化色彩体系
app.wxss SHALL 包含四组文化色彩变量：印章红（`--seal-red`）、竹青（`--bamboo-green`）、远山蓝（`--mountain-blue`）、琥珀金（`--amber-glow`），每组含主色和浅底色变体。

#### Scenario: 印章红用于强调标签
- **WHEN** 元素使用 `.seal-stamp` 类
- **THEN** 显示为印章红底色（`#C53929`）+ 白色文字
- **AND** 视觉效果类似中国传统印章戳记

#### Scenario: 竹青色用于成功状态
- **WHEN** 元素使用 `var(--bamboo-green)` 色值
- **THEN** 显示为自然的竹叶绿色（`#5B7553`）
- **AND** 比现有 `--success`（`#2E8B57`）更沉稳

### Requirement: 呼吸间距变量
app.wxss SHALL 包含六级呼吸间距变量（`--breath-xs` 至 `--breath-xxl`），用于控制元素间留白节奏。

#### Scenario: 区块间使用长息间距
- **WHEN** 两个内容区块之间使用 `var(--breath-lg)` 间距
- **THEN** 间距为 64rpx
- **AND** 视觉上提供充足的呼吸空间

### Requirement: 字体双轨制
标题/正文 SHALL 使用宋体衬线字体，辅助文字/标签 SHALL 使用系统无衬线字体（PingFang SC），形成现代中式排版对比。

#### Scenario: 辅助文字使用无衬线字体
- **WHEN** 元素使用 `.font-body`、`.subtitle`、`.tag` 或 `.input-label` 类
- **THEN** 字体为 PingFang SC（iOS）或 Microsoft YaHei（Android）
- **AND** 与宋体标题形成明显的字体对比

### Requirement: 水墨渐变分隔线
系统 SHALL 提供 `.ink-divider` 组件类，实现从两端透明到中间淡墨的渐变分隔效果。

#### Scenario: 分隔线渲染
- **WHEN** 元素使用 `.ink-divider` 类
- **THEN** 显示为水平渐变线，两端完全透明，中间为淡墨色
- **AND** 高度为 1rpx，宽度为父容器的 80%，居中

### Requirement: 印章红使用密度限制
单屏可见区域内使用印章红（`--seal-red`）的元素 SHALL NOT 超过 3 个。

#### Scenario: 首页单屏印章红密度
- **WHEN** 用户在首页首屏（无滚动状态）
- **THEN** 可见的印章红元素不超过 3 处
- **AND** 每处印章红元素面积占比不超过屏幕的 5%

### Requirement: 禅意动画缓动规范
所有 UI 入场/退场动画 SHALL 使用 `cubic-bezier(0.25, 0.1, 0.25, 1.0)` 缓动函数，入场时长 300-400ms，退场时长 200-250ms。禁止使用 bounce/elastic 效果。

#### Scenario: 卡片入场动画
- **WHEN** 页面加载完成，卡片元素进入视口
- **THEN** 卡片从 `translateY(20rpx)` + `opacity: 0` 过渡至正常位置
- **AND** 过渡使用 `cubic-bezier(0.25, 0.1, 0.25, 1.0)` 缓动
- **AND** 过渡时长为 300-400ms
- **AND** 无弹跳或回弹效果

## MODIFIED Requirements

### Requirement: TabBar 选中态颜色
TabBar 选中态图标颜色 SHALL 从纯黑（`#000000`）改为印章红（`#C53929`）。

#### Scenario: TabBar 切换选中态
- **WHEN** 用户点击 TabBar 切换页面
- **THEN** 选中的图标和文字显示为印章红色（`#C53929`）
- **AND** 未选中的图标和文字保持淡灰色
