# 星象问答全屏报告规范

## MODIFIED Requirements

### Requirement: 推荐问题交互方式

系统 MUST 在用户点击推荐问题后将问题文本填入输入栏，用户可编辑后手动发送。

#### Scenario: 点击推荐问题填入输入栏

**Given** 用户在星象问答页面，推荐问题列表可见
**When** 用户点击某个推荐问题
**Then** 该问题文本出现在底部输入栏中，不自动发送
**And** 用户可以修改输入栏中的文本
**And** 用户点击发送按钮后才发起 API 请求

#### Scenario: 编辑推荐问题后发送

**Given** 用户已点击推荐问题，输入栏中显示问题文本
**When** 用户修改输入栏中的文本并点击发送
**Then** 以修改后的文本作为问题发送到后端

---

### Requirement: 全屏报告展示模式

系统 MUST 以全屏报告形式展示 AI 回答，包含 loading 状态和分层内容卡片。

#### Scenario: 发送问题后显示全屏 loading

**Given** 用户已输入问题并点击发送
**When** 请求发送到后端
**Then** 页面显示全屏 loading 遮罩
**And** loading 遮罩包含加载动画和提示文字

#### Scenario: 报告加载完成后展示全屏报告

**Given** 全屏 loading 正在显示
**When** 后端返回报告数据
**Then** loading 消失，显示全屏报告页面
**And** 报告包含：星盘图、问题回顾、星象解读、深度分析、行动建议、温暖寄语

#### Scenario: 关闭报告返回问题输入界面

**Given** 全屏报告正在显示
**When** 用户点击返回按钮
**Then** 报告关闭，返回问题输入界面
**And** 用户可以继续输入新问题

#### Scenario: 请求失败回退到输入界面

**Given** 全屏 loading 正在显示
**When** API 请求失败
**Then** loading 消失，回退到问题输入界面
**And** 显示错误提示（toast）

---

## ADDED Requirements

### Requirement: 报告星盘图展示

报告顶部 MUST 展示与问题相关的星盘图（本命盘 + 行运盘）。

#### Scenario: 报告中显示行运双环星盘

**Given** 全屏报告已加载完成
**When** 报告渲染
**Then** 报告顶部显示行运双环星盘（内环本命、外环行运）
**And** 使用 astro-chart 组件的 synastry 类型渲染

---

### Requirement: 报告内容分层递进结构

报告内容 MUST 按四层递进结构组织：星象解读 → 深度分析 → 行动建议 → 温暖寄语。

#### Scenario: 星象解读层展示核心星象

**Given** 报告已加载
**When** 用户浏览报告
**Then** "星象解读"区域展示与问题最相关的行星、宫位、相位信息
**And** 每条解读附带星象依据标注

#### Scenario: 深度分析层逐维度展开

**Given** 报告已加载
**When** 用户浏览到深度分析区域
**Then** 显示 2-3 个维度的卡片，每个卡片包含标题、分析内容和星象依据
**And** 内容从核心特质逐步展开到当前运势影响

#### Scenario: 行动建议层提供可执行建议

**Given** 报告已加载
**When** 用户浏览到行动建议区域
**Then** 显示 3-5 条具体可执行的建议
**And** 建议内容具体（包含时间、方式、目标）

---

### Requirement: Prompt 输出结构化 JSON 格式

ask-answer Prompt MUST 输出结构化 JSON，包含 astroContext 和 sections 字段。

#### Scenario: AI 返回合法结构化 JSON

**Given** 后端使用 ask-answer Prompt v10.0
**When** AI 生成回答
**Then** 输出为合法 JSON，包含 `astroContext` 和 `sections` 字段
**And** sections 数组按顺序包含 astro_insight、deep_analysis、action_plan、closing 四种类型

#### Scenario: 内容融合中国文化元素

**Given** 用户语言为中文
**When** AI 生成回答
**Then** 内容中自然融合中国传统比喻、节气节令等本土文化元素
**And** 表述风格现代、亲切，避免过度玄学化
