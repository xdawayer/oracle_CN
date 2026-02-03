# page-ux Specification Delta

## MODIFIED Requirements

### Requirement: 首页问候区域增强留白
首页问候区域 SHALL 使用 `--breath-xl`（96rpx）以上的留白间距，问候语字号 SHALL 不小于 52rpx，日期展示 SHALL 包含农历和阳历双行信息。

#### Scenario: 首页问候区域显示
- **WHEN** 用户进入首页
- **THEN** 问候语以 52rpx 以上字号居左显示
- **AND** 问候语下方显示阳历日期和农历日期（双行）
- **AND** 问候区域与下方内容之间有 96rpx 以上的留白

### Requirement: 首页每日卡片视觉升级
首页每日卡片 SHALL 移除 box-shadow，使用 `--ink-wash-1` 背景色做区分；分数 SHALL 使用数据字体类（`.font-data`）以超大字号展示。

#### Scenario: 每日卡片分数展示
- **WHEN** 用户查看首页每日卡片
- **THEN** 综合评分以 64rpx 以上的数据字体显示
- **AND** 卡片无投影阴影
- **AND** 卡片通过淡墨背景色与页面背景做视觉区分

### Requirement: 今日页面日期导航印章标记
今日页面的日期导航 SHALL 使用印章红短横线标记选中日期，今天日期 SHALL 使用印章红圆点标记。

#### Scenario: 选中日期标记
- **WHEN** 用户在今日页面选中某一天
- **THEN** 该日期下方显示印章红色（`--seal-red`）短横线
- **AND** "今天"对应的日期位置有印章红色小圆点标记

### Requirement: 今日页面维度纵向列表
今日页面的维度展示 SHALL 从 2 列网格改为纵向列表，每行展示一个维度（左侧色块 + 名称 + 进度条 + 数字）。

#### Scenario: 维度列表展示
- **WHEN** 用户查看今日页面的运势维度
- **THEN** 各维度以纵向列表形式展示，每行一个维度
- **AND** 每行包含左侧小色块、维度名称、水平进度条、右侧数字
- **AND** 各行之间有 `--breath-sm` 间距

### Requirement: DO/DON'T 建议卡片分色
今日页面的建议卡片 SHALL 纵向排列（非左右分列），DO 使用竹青浅底色（`--bamboo-light`），DON'T 使用淡墨背景色（`--ink-wash-1`）。

#### Scenario: 建议卡片展示
- **WHEN** 用户查看今日建议
- **THEN** DO 建议卡片在上方，使用竹青浅底色
- **AND** DON'T 建议卡片在下方，使用淡墨浅底色
- **AND** 两张卡片纵向排列，间距为 `--breath-md`

### Requirement: 发现页面 Hero 卡片风格
发现页面 Hero 卡片 SHALL 从深墨反色改为宣纸暖底色（`--paper-warm`），文字使用深墨色（`--ink-deep`），右下角可添加淡墨山水装饰元素。

#### Scenario: Hero 卡片显示
- **WHEN** 用户进入发现页面
- **THEN** Hero 卡片背景为暖宣纸色
- **AND** 标题和描述文字为深墨色
- **AND** 按钮使用描边或印章风格

### Requirement: 本我页面付费横幅印章风格
本我页面的付费/升级横幅 SHALL 使用印章红底色（`--seal-red`）+ 白色文字，CTA 按钮使用印章式设计。

#### Scenario: 付费横幅展示
- **WHEN** 用户浏览本我页面未解锁的深度分析区域
- **THEN** 显示印章红底色的付费引导横幅
- **AND** CTA 按钮为白底红字或反色印章风格
- **AND** 横幅整体传递"解锁更多"的高级感而非促销感

### Requirement: 提问页面印章式提交按钮
提问页面的提交按钮 SHALL 使用印章式设计（`.seal-stamp` 类 + `--seal-red` 底色），按下态带轻微缩放反馈。

#### Scenario: 提问提交按钮交互
- **WHEN** 用户填写完问题准备提交
- **THEN** 提交按钮显示为印章红底色的方形按钮
- **AND** 按下时有轻微缩放反馈（scale 0.98）
- **AND** 按钮文字为白色
