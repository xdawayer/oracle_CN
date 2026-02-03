# Spec: 本命盘深度解读报告

## Overview

为用户提供基于本命星盘数据的个性化深度解读报告，包含 8 个模块：星盘总览、思维沟通、情感世界、爱情关系、事业方向、财富关系、健康能量、灵魂成长，总计约 5000-6500 字的系统性解读。复用通用报告生成框架（从 annual-task 抽象），支持异步分模块并行生成。

---

## ADDED Requirements

### Requirement: 通用报告生成框架

系统 SHALL 提供通用的报告生成框架 `report-task`，支持多种报告类型共享同一套任务管理机制。

框架 SHALL 包含以下能力：
- 任务状态管理（pending → processing → completed/failed）
- 可配置的分批并行生成策略
- 单模块最多 3 次重试（递增延迟）
- 通用缓存 key 格式：`report_task:{reportType}:{userId}:{chartHash}`（任务）和 `report:{reportType}:{userId}:{moduleId}:{chartHash}`（内容）

每种报告类型 SHALL 通过 `ReportConfig` 接口注册，包含：moduleIds、moduleMeta、batchConfig、promptPrefix、TTL 配置。

#### Scenario: 注册新的报告类型
- **GIVEN** 开发者定义了 `NatalReportConfig` 实现 `ReportConfig` 接口
- **AND** 配置包含 8 个模块 ID、4 个批次、prompt 前缀 `natal-report-`
- **WHEN** 用户请求创建 natal-report 类型的报告
- **THEN** 框架按配置启动分批并行生成
- **AND** 任务状态正确管理

#### Scenario: 现有 annual 报告向后兼容
- **GIVEN** `annual-task.ts` 改为调用通用框架
- **WHEN** 用户通过 `/api/annual-task/*` 端点操作流年报告
- **THEN** 行为与重构前完全一致
- **AND** 缓存数据可正常读取

---

### Requirement: 本命深度解读报告生成

系统 SHALL 支持基于用户本命盘数据生成深度解读报告。

报告 SHALL 包含以下 8 个模块：
- 星盘总览与人格画像（overview）：600-800 字
- 思维与沟通方式（mind）：500-700 字
- 情感世界与内在需求（emotion）：600-800 字
- 爱情与亲密关系（love）：800-1100 字
- 事业与人生方向（career）：700-900 字
- 财富与金钱关系（wealth）：500-700 字
- 健康与能量管理（health）：400-600 字
- 人生课题与灵魂成长（soul）：700-900 字

报告总字数 SHALL 在 5000-6500 字范围。

#### Scenario: 用户请求生成本命深度解读
- **GIVEN** 用户已完成付费
- **AND** 用户本命盘数据已存在（出生日期、时间、地点）
- **WHEN** 用户请求生成本命深度解读报告
- **THEN** 系统按 4 个批次启动模块生成
- **AND** 各模块完成后可逐个查看

#### Scenario: 缺少出生时间
- **GIVEN** 用户未设置出生时间（accuracy = 'time_unknown'）
- **WHEN** 用户请求生成本命深度解读
- **THEN** 系统使用默认中午 12:00 计算
- **AND** 报告中标注"由于未提供精确出生时间，宫位相关解读仅供参考"

---

### Requirement: 分批并行生成策略

系统 SHALL 按以下 4 个批次生成本命解读模块：

- 批次 1（立即）：overview
- 批次 2（批次 1 完成后）：love, career, emotion
- 批次 3（批次 2 完成后并行）：mind, wealth, health
- 批次 4（批次 3 完成后）：soul

soul 模块 SHALL 在所有其他模块完成后最后生成，因为它需要回顾整份报告的核心发现。

#### Scenario: 分批生成顺序
- **GIVEN** 用户请求生成报告
- **WHEN** overview 完成
- **THEN** 立即启动 love、career、emotion 的并行生成
- **AND** 不等待用户查看即启动下一批次

#### Scenario: soul 模块等待前序完成
- **GIVEN** 批次 1-3 的 7 个模块均已完成
- **WHEN** 系统启动 soul 模块生成
- **THEN** soul 的 prompt 上下文中 SHALL 包含前序模块的核心摘要

---

### Requirement: 模块间衔接与摘要注入

系统 SHALL 在后续模块的 prompt 上下文中注入前序模块的核心摘要，保证叙事连贯。

每个模块完成后，系统 SHALL 提取 2-3 句核心结论作为摘要。

后续模块的 user prompt SHALL 包含衔接指令，要求 AI 在章节开头用 1 句话自然过渡。

#### Scenario: overview 摘要注入到后续模块
- **GIVEN** overview 模块已完成，提取摘要为"你是一个外在理性内在感性的人..."
- **WHEN** 系统生成 love 模块
- **THEN** love 模块的 prompt 上下文中包含 overview 摘要
- **AND** love 模块输出以衔接语开头

#### Scenario: 全部摘要注入到 soul 模块
- **GIVEN** 前 7 个模块均已完成
- **WHEN** 系统生成 soul 模块
- **THEN** soul 模块的 prompt 上下文中包含所有前序模块的摘要
- **AND** soul 模块输出回顾全报告核心发现

---

### Requirement: Prompt 全局规则

所有本命解读 Prompt 的 system prompt SHALL 包含以下全局规则：

**角色**：拥有 15 年经验的专业占星师，风格温暖、有洞察力、尊重独特性。

**核心原则**：
- 占星是自我认知工具，不是宿命判决书
- 任何配置都有正面和挑战两面
- 困难相位代表成长张力，不等于坏事
- 不做绝对化表述，给用户自由意志空间

**禁止事项**：
- 不预测具体事件
- 不做医学诊断
- 不给投资/理财建议
- 不说造成恐惧的话
- 不使用"注定""命中注定""劫难"等宿命论词汇

**数据严谨性**：
- 只解读实际存在的星盘数据
- 空宫通过宫主星解读
- 区分紧密相位（<2°）和松散相位（>5°）

**语言风格**：
- 面向中国大陆 20-35 岁年轻用户
- 现代、有亲和力、术语首现时解释
- 不要每段以"你"开头

#### Scenario: 系统规则生效
- **GIVEN** 系统生成 overview 模块
- **WHEN** 用户盘面有月冥合相
- **THEN** 输出不 SHALL 包含"你情感上有创伤"等负面表述
- **AND** 输出 SHALL 用温柔的方式描述，如"你从小学会了独自承受..."

#### Scenario: 空宫处理
- **GIVEN** 用户第 7 宫没有行星落入
- **WHEN** 系统生成 love 模块
- **THEN** 输出 SHALL 说明空宫不代表该领域不重要
- **AND** 通过 7 宫宫头星座和宫主星位置进行解读

---

### Requirement: 质量校验

系统 SHALL 对每个模块的生成结果进行自动质量校验。

校验项 SHALL 包含：
- 字数在目标范围内（±20% 容差）
- 包含该模块必须提及的关键行星/宫位
- 不包含禁止词汇（"注定""劫难""一定会""肯定会""绝不会""你的盘很凶""这个相位很危险"）
- 不包含不存在于用户星盘中的数据（编造的相位）

校验不通过时，系统 SHALL 重新生成该模块（最多 1 次额外重试）。

#### Scenario: 字数超范围触发重试
- **GIVEN** overview 模块目标字数为 600-800 字
- **WHEN** AI 生成了 1200 字的内容
- **THEN** 系统标记质量不合格
- **AND** 重新生成该模块

#### Scenario: 禁止词触发重试
- **GIVEN** 禁止词列表包含"注定"
- **WHEN** career 模块输出包含"你注定要走这条路"
- **THEN** 系统检测到禁止词
- **AND** 重新生成该模块

---

### Requirement: 报告缓存

本命解读报告 SHALL 使用以下缓存策略：

- 任务记录 TTL：7 天
- 报告内容 TTL：90 天
- 缓存 key：`report:natal-report:{userId}:{moduleId}:{chartHash}`

chartHash 基于用户出生信息计算，出生信息变更后缓存自动失效。

#### Scenario: 缓存命中
- **GIVEN** 用户之前已生成过本命深度解读
- **AND** 出生信息未变更
- **WHEN** 用户再次查看报告
- **THEN** 系统从缓存返回内容
- **AND** 不调用 AI 生成

#### Scenario: 出生信息变更
- **GIVEN** 用户修改了出生时间
- **WHEN** 用户查看本命深度解读
- **THEN** chartHash 变更导致缓存不命中
- **AND** 系统重新生成报告

---

### Requirement: 报告内容规范

各模块 Prompt 的 user prompt SHALL 直接使用用户提供的详细提示词设计，包含：

- **overview**：太阳/月亮/上升三维人格画像、比喻意象总结
- **mind**：大脑工作方式、表达风格、信息关系、水星逆行解读
- **emotion**：安全感来源、情绪模式、原生家庭印记、内在小孩
- **love**：爱情吸引力、欲望模式、伴侣画像、关系课题、感情时间线
- **career**：职业天赋、工作风格、权威关系、人生使命、发展建议
- **wealth**：金钱关系、财富来源、深层模式、免责声明
- **health**：能量特征、压力模式、能量管理方式、免责声明
- **soul**：灵魂功课、凯龙伤痛、潜意识世界、整合祝福

wealth 和 health 模块 SHALL 在末尾包含免责声明。

#### Scenario: wealth 模块包含免责声明
- **GIVEN** 系统生成 wealth 模块
- **WHEN** 内容生成完成
- **THEN** 末尾 SHALL 包含"以上内容不构成投资、理财或财务决策建议"的声明

#### Scenario: health 模块包含免责声明
- **GIVEN** 系统生成 health 模块
- **WHEN** 内容生成完成
- **THEN** 末尾 SHALL 包含"本内容不构成医学建议，如有健康问题请咨询专业医疗人员"的声明

---

### Requirement: 前端展示

系统 SHALL 提供通用报告展示页面 `pages/report/report`，通过 `reportType` 参数区分报告类型。

页面 SHALL 复用以下能力：
- Markdown → HTML 渲染器
- 模块进度条
- 渐进式渲染（完成一个模块展示一个）
- 任务轮询机制（3 秒间隔）

"本我"页面 SHALL 在底部新增"本命深度解读"入口卡片，位于流年报告入口下方。

#### Scenario: 渐进式渲染
- **GIVEN** 用户进入本命报告页面
- **WHEN** overview 模块完成
- **THEN** 页面立即渲染 overview 内容
- **AND** 其他模块显示加载状态
- **AND** 进度条显示 1/8 完成

#### Scenario: 报告全部完成
- **GIVEN** 所有 8 个模块已完成
- **WHEN** 最后的 soul 模块返回
- **THEN** 进度条显示 100% 并淡出
- **AND** 用户可滚动查看完整报告

#### Scenario: 从本我页面进入
- **GIVEN** 用户已购买本命深度解读
- **AND** 报告已生成完成
- **WHEN** 用户点击"本命深度解读"卡片
- **THEN** 跳转到 `/pages/report/report?reportType=natal-report`
- **AND** 直接展示完整报告内容

---

### Requirement: API 端点

系统 SHALL 提供以下通用报告 API 端点：

**POST /api/report/create**
- 请求体：`{ reportType, birth: { date, time, city, lat, lon, timezone } }`
- 响应：`{ task: ReportTask, isNew: boolean }`

**GET /api/report/status**
- 请求参数：`reportType`, `date`, `time`, `city`, `lat`, `lon`, `timezone`
- 响应：`{ task: ReportTask | null }`

**GET /api/report/content**
- 请求参数：同上
- 响应：`{ modules: Record<string, unknown>, meta, completedModules }`

**POST /api/report/retry**
- 请求体：同 create
- 响应：`{ success, task?, error? }`

**DELETE /api/report**
- 请求参数：同 status
- 响应：`{ success: boolean }`

#### Scenario: 创建本命报告任务
- **GIVEN** 用户已完成付费
- **WHEN** 前端调用 `POST /api/report/create` 并传入 `reportType: 'natal-report'`
- **THEN** 系统创建异步任务并立即返回
- **AND** 后台启动分批并行生成

#### Scenario: 查询任务状态
- **GIVEN** 用户已创建本命报告任务
- **WHEN** 前端轮询 `GET /api/report/status?reportType=natal-report`
- **THEN** 返回当前任务状态（progress、completedModules、failedModules）
