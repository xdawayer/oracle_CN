## ADDED Requirements

### Requirement: 百科详情全屏展示

系统 SHALL 在用户点击百科条目时，以全屏覆盖层（overlay）形式展示该条目的完整详情内容，替代当前的底部弹窗模式。

详情页 SHALL 包含以下分段卡片（按顺序），每个卡片仅在对应字段有内容时显示：

| 序号 | 卡片标题 | 数据字段 | 卡片颜色 |
|------|----------|----------|----------|
| 1 | 核心要义 | description | accent-red |
| 2 | 天文与神话 | astronomy_myth | info |
| 3 | 心理学解读 | psychology | info |
| 4 | 阴影面 | shadow | warning |
| 5 | 整合之道 | integration | success |
| 6 | 生活领域 | life_areas | default |
| 7 | 实用建议 | practical_tips | success |
| 8 | 常见误区 | common_misconceptions | warning |
| 9 | 成长路径 | growth_path | success |
| 10 | 深度探索 | deep_dive | info |
| 11 | 肯定语 | affirmation | accent-red |
| 12 | 组合解读 | combinations | default |

#### Scenario: 用户查看行星条目详情
- **WHEN** 用户在百科列表中点击"土星 Saturn"条目
- **THEN** 全屏覆盖层打开，显示土星的分类标签、标题、副标题
- **AND** 按顺序展示核心要义、天文与神话、心理学解读、阴影面、整合之道等卡片
- **AND** 每个卡片使用对应的 cardColor 色彩编码
- **AND** 空字段对应的卡片不显示

#### Scenario: 用户关闭详情页
- **WHEN** 用户在详情覆盖层中点击返回按钮
- **THEN** 覆盖层关闭，返回百科列表页
- **AND** 列表滚动位置保持不变

### Requirement: 百科搜索多字段模糊匹配

系统 SHALL 在用户输入搜索关键词时，同时匹配以下字段：title、subtitle、description、keywords（数组）、prototype、analogy。

系统 SHALL 支持空格分词的多关键词搜索，所有关键词 MUST 同时匹配才返回结果。

搜索 SHALL 不区分大小写。

#### Scenario: 单关键词搜索匹配 prototype
- **WHEN** 用户在搜索栏输入"严师"
- **THEN** 搜索结果中包含"土星 Saturn"（因为其 prototype 为"严师 / 建筑师 / 守门人"）

#### Scenario: 多关键词搜索
- **WHEN** 用户在搜索栏输入"时间 责任"
- **THEN** 搜索结果中包含"土星 Saturn"（因为其 keywords 同时包含"时间"和"责任"）
- **AND** 不包含仅匹配"时间"但不匹配"责任"的条目

#### Scenario: 搜索无结果
- **WHEN** 用户输入的关键词与所有条目的搜索字段均不匹配
- **THEN** 显示"没有找到相关知识条目"空状态提示

### Requirement: 百科详情卡片样式一致性

详情页的分段卡片 SHALL 使用与"本我"页面 detail-card 相同的样式系统，包括：
- 左侧色彩标识条（`detail-card__accent`）
- 卡片标题（`detail-card__title`）
- 文本内容（`detail-card__text`）
- 编号列表（`detail-card__list`，用于 practical_tips、common_misconceptions）

所有样式 SHALL 使用 COLOR_SYSTEM_GUIDE 中定义的 ink/paper 色系变量。

#### Scenario: 列表类型内容展示
- **WHEN** 条目包含 practical_tips 字段（字符串数组）
- **THEN** "实用建议"卡片以编号列表形式展示每条建议
- **AND** 使用 success（绿色）色彩编码

#### Scenario: 步骤类型内容展示
- **WHEN** 条目包含 deep_dive 字段（步骤数组，含 step/title/description）
- **THEN** "深度探索"卡片以步骤序号 + 标题 + 描述的形式展示每个步骤
- **AND** 使用 info（蓝色）色彩编码

### Requirement: 百科条目数据完整性

后端返回的百科条目详情 SHALL 包含 WikiItem 接口定义的所有字段。对于每个条目，以下字段 MUST 有非空内容：
- description（核心要义）
- psychology（心理学解读）

以下字段 SHOULD 有内容（允许部分条目为空）：
- astronomy_myth、shadow、integration、practical_tips、common_misconceptions、affirmation、growth_path

#### Scenario: 条目详情 API 返回完整数据
- **WHEN** 前端请求 `/api/wiki/items/saturn?lang=zh`
- **THEN** 返回的 item 对象包含 description、psychology、shadow、integration 等字段
- **AND** description 和 psychology 字段为非空字符串

### Requirement: 导航栏中文化

百科页面的微信原生导航栏标题 SHALL 显示为"星象百科"（替代当前的"Wiki"）。

页面 SHALL NOT 在内容区域内添加带返回按钮的自定义导航栏（遵循 CLAUDE.md 禁止重复导航栏规范）。

#### Scenario: 页面加载显示中文标题
- **WHEN** 用户进入星象百科页面
- **THEN** 微信原生导航栏显示"星象百科"
- **AND** 页面内不出现重复的导航栏或返回按钮
