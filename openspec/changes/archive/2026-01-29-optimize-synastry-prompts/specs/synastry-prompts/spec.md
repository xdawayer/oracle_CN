# Spec: synastry-prompts

合盘模块 Prompt 系统规范。

---

## ADDED Requirements

### Requirement: 关系占星师角色设定
系统 SHALL 提供专属于合盘模块的角色设定 `SYNASTRY_PERSONA`，包含：
- 角色定位：经验丰富的关系占星分析师
- 核心原则：不做绝对判断、平衡呈现、赋能导向、具体落地
- 语言风格：温暖有洞察力、使用比喻、符合中国文化语境

#### Scenario: 角色设定导入成功
- **WHEN** 开发者 import `SYNASTRY_PERSONA` from cultural 模块
- **THEN** 返回包含角色定位和核心原则的字符串

#### Scenario: 与 BASE_SYSTEM 组合使用
- **WHEN** 合盘 Prompt 构建时
- **THEN** SYNASTRY_PERSONA 与 BASE_SYSTEM 组合生成完整 system prompt

---

### Requirement: 合盘相位解读知识库
系统 SHALL 提供合盘专属相位解读知识库 `SYNASTRY_ASPECT_KNOWLEDGE`，包含：
- 日月相位（合/拱/刑/冲）的含义和感受描述
- 金火相位的含义和感受描述
- 土星相位的含义和感受描述
- 冥王星相位的含义和感受描述
- 北交点相位的含义和感受描述

#### Scenario: 查询日月合相含义
- **WHEN** 调用 `getSynastryAspectMeaning('sun', 'moon', 'conjunction')`
- **THEN** 返回 `{ meaning: '深层认同感...', feeling: '注定感' }`

#### Scenario: 查询不存在的相位
- **WHEN** 调用 `getSynastryAspectMeaning('sun', 'unknown', 'conjunction')`
- **THEN** 返回 undefined 或默认描述

---

### Requirement: 本命盘 6 维度分析框架
合盘中的本命盘分析（natal-a、natal-b）SHALL 使用 6 维度分析框架：
1. 核心自我（基于太阳，80-120 字）
2. 情感内核（基于月亮，80-120 字）
3. 爱的语言（基于金星，80-120 字）
4. 欲望与行动（基于火星，60-100 字）
5. 关系模式（基于 7 宫，100-150 字）
6. 成长课题（基于土星/凯龙/北交点，80-120 字）

输出 JSON 格式：
```json
{
  "core_self": { "title": "...", "icon": "sun", "content": "...", "keywords": [...] },
  "emotional_core": { "title": "...", "icon": "moon", "content": "...", "keywords": [...] },
  "love_language": { "title": "...", "icon": "venus", "content": "...", "keywords": [...] },
  "desire_action": { "title": "...", "icon": "mars", "content": "...", "keywords": [...] },
  "relationship_pattern": { "title": "...", "icon": "partnership", "content": "...", "keywords": [...] },
  "growth_theme": { "title": "...", "icon": "growth", "content": "...", "keywords": [...] },
  "summary_sentence": "..."
}
```

#### Scenario: A 的本命盘分析输出
- **WHEN** 调用 `buildPrompt('synastry-natal-a', { chartA: ..., chartB: ... })`
- **THEN** 返回的 system prompt 包含 6 维度分析要求
- **AND** AI 输出 JSON 包含所有 6 个维度字段

#### Scenario: 无出生时间降级
- **WHEN** 用户无准确出生时间
- **THEN** 关系模式维度改为基于金星、月亮、土星综合分析
- **AND** 输出 JSON 包含 `"no_birth_time": true`

---

### Requirement: 比较盘 8 维度分析框架
比较盘分析（compare-ab、compare-ba）SHALL 使用 8 维度分析框架：
1. 第一印象与吸引力（100-150 字）
2. 情感共鸣（100-150 字）
3. 爱情与浪漫（100-150 字）
4. 激情与欲望（80-120 字）
5. 沟通与理解（100-150 字）
6. 价值观与生活方式（80-120 字）
7. 长期稳定性（100-150 字）
8. 挑战与成长（100-150 字）

每个维度 SHALL 包含：
- title: 维度名称
- score: 评分（0-100）
- content: 分析内容
- key_aspects: 关键相位数组

评分标准：
- 90-100：极度契合，罕见的能量共振
- 80-89：非常契合，有强烈的自然连接
- 70-79：良好契合，有实质性的连接基础
- 60-69：中等契合，需要更多磨合
- 50-59：有挑战，需要双方努力
- <50：较大挑战，需要特别的意识和努力

#### Scenario: 比较盘分析输出
- **WHEN** 调用 `buildPrompt('synastry-compare-ab', { chartA: ..., chartB: ..., synastry_aspects: ... })`
- **THEN** 返回的 system prompt 包含 8 维度分析要求和评分标准
- **AND** AI 输出 JSON 包含所有 8 个维度字段和 overall_chemistry

#### Scenario: 评分基于相位
- **WHEN** 存在多个金火柔和相位
- **THEN** "爱情与浪漫" 维度评分倾向于 80+

---

### Requirement: 组合盘 6 维度分析框架
组合盘分析（composite）SHALL 使用 6 维度分析框架：
1. 关系的核心身份（基于组合太阳，120-180 字）
2. 关系的情感基调（基于组合月亮，100-150 字）
3. 关系的表达方式（基于组合上升和金星，100-150 字）
4. 关系的动力与方向（基于组合火星和 10 宫，80-120 字）
5. 关系的深层主题（基于组合 8 宫和冥王星，100-150 字）
6. 关系的挑战与礼物（基于土星配置和硬相位，100-150 字）

输出 JSON 格式 SHALL 包含 `relationship_essence` 字段：
```json
{
  "relationship_essence": {
    "metaphor": "用一个比喻形容这段关系",
    "one_sentence": "一句话总结这段关系的本质（20-30字）"
  }
}
```

#### Scenario: 组合盘分析输出
- **WHEN** 调用 `buildPrompt('synastry-composite', { chartA: ..., chartB: ..., composite_chart: ... })`
- **THEN** 返回的 system prompt 包含 6 维度分析要求
- **AND** AI 输出 JSON 包含所有 6 个维度字段和 relationship_essence

---

### Requirement: 综合报告生成
系统 SHALL 提供综合报告 Prompt（synastry-comprehensive-report），整合本命盘、比较盘、组合盘分析结果，输出包含：
1. 开篇总述（150-200 字）
2. 契合之处（3-5 点，每点 50-80 字）
3. 需要用心经营的地方（3-5 点，每点 50-80 字）
4. 相处小贴士（5-7 条，每条 30-50 字）
5. 写给你们的话（80-120 字）
6. compatibility_overview（总评分、各维度评分、关系类型、一句话总结）

#### Scenario: 综合报告输出
- **WHEN** 调用 `buildPrompt('synastry-comprehensive-report', { natal_a_summary: ..., natal_b_summary: ..., synastry_summary: ..., composite_summary: ... })`
- **THEN** AI 输出 JSON 包含 opening、strengths、growth_areas、tips、blessing、compatibility_overview

#### Scenario: 语言风格符合要求
- **WHEN** 生成综合报告
- **THEN** 内容不以"但是"、"然而"开头描述挑战
- **AND** 不使用"一定会"、"必然"等绝对化表达
- **AND** 使用"你们"、"两人"等称呼

---

### Requirement: 合盘输出格式规范
系统 SHALL 提供合盘专属输出格式规范 `SYNASTRY_OUTPUT_INSTRUCTION`，包含：
- 评分标准说明
- 字数范围规范
- 语言风格提醒（避免转折词、避免绝对化、使用"你们"称呼）
- 场景举例要求（使用中国年轻人熟悉的场景）

#### Scenario: 输出格式规范导入
- **WHEN** 开发者 import `SYNASTRY_OUTPUT_INSTRUCTION` from instructions 模块
- **THEN** 返回包含评分标准和语言风格规范的字符串

---

## MODIFIED Requirements

### Requirement: 合盘总览分析
合盘总览（synastry-overview）SHALL 保持现有五维关系模型，但 SHALL 对齐语言风格规范：
- 使用"倾向于"、"可能"、"容易"替代绝对化表达
- 场景举例使用中国年轻人熟悉的场景（吵架谁道歉/过年回谁家/消费观）
- 禁止预测分手/结婚等具体事件

#### Scenario: 合盘总览输出
- **WHEN** 调用 `buildPrompt('synastry-overview', ctx)`
- **THEN** AI 输出不包含"命中注定"、"一定会"等禁用词
- **AND** 场景举例符合中国文化语境

---

### Requirement: 合盘亮点分析
合盘亮点（synastry-highlights）SHALL 保持现有结构，但 SHALL 增强场景化：
- harmony_signals 中的 scenario 字段使用中国年轻人熟悉的场景
- challenge_signals 中的 growth_tip 提供建设性的应对建议

#### Scenario: 合盘亮点场景化
- **WHEN** 调用 `buildPrompt('synastry-highlights', ctx)`
- **THEN** harmony_signals[].scenario 使用具体可代入的场景
- **AND** challenge_signals[].growth_tip 不制造焦虑
