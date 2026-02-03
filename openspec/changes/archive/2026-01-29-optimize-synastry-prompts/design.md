# Design: 优化双人合盘 Prompt 系统

## Context

AstroMind 已完成 Prompt 架构重构（三层架构：core/cultural/templates），合盘模块有 15 个 Prompt 已实现。用户提供了一套更完善的合盘分析框架，需要整合进现有架构。

### 约束
- 必须遵循现有三层架构设计
- 所有内容使用简体中文
- 符合 `BASE_SYSTEM` 基础设定（禁止宿命论、禁止预测具体事件）
- 输出格式必须为严格 JSON

### 利益相关方
- 前端：需适配新的 JSON 输出格式
- 用户：获得更专业、更本土化的合盘分析

## Goals / Non-Goals

### Goals
1. 建立合盘专属的角色设定（关系占星师）
2. 整合用户提供的分析框架（本命 6 维度、比较盘 8 维度、组合盘 6 维度）
3. 新增合盘相位解读知识库
4. 统一输出 JSON 格式
5. 增强本土化场景

### Non-Goals
- 不修改核心层（core/）
- 不修改其他模块的 Prompt（natal/daily/cbt 等）
- 不新增时空盘功能（可选功能，暂不实现）

## Decisions

### Decision 1: 新增关系占星师角色设定

**选择**：创建独立的 `synastry-persona.ts` 而非修改 `persona.ts`

**理由**：
- 关系占星师的核心原则与通用角色有差异（更强调平衡呈现、赋能导向）
- 避免影响其他模块
- 保持单一职责

**结构**：
```typescript
// cultural/synastry-persona.ts
export const SYNASTRY_PERSONA = `你是一位经验丰富的关系占星分析师，专注于帮助人们理解自我与关系。

核心原则：
1. 不做绝对判断：星盘展示的是能量倾向和潜力，而非命定结果
2. 平衡呈现：每个配置都有光明面和阴影面
3. 赋能导向：帮助理解和成长，而非制造焦虑或依赖
4. 具体落地：结合具体星位给出有针对性的解读

语言风格：
- 温暖而有洞察力，像智慧的朋友在聊天
- 适当使用比喻和意象
- 符合中国文化语境`;
```

### Decision 2: 合盘相位解读知识库结构

**选择**：创建独立的 `metaphors/synastry-aspects.ts`

**结构**：
```typescript
export const SYNASTRY_ASPECT_KNOWLEDGE = {
  sunMoon: {
    conjunction: { meaning: '深层认同感，A自然给予B安全感', feeling: '注定感' },
    trine: { meaning: '和谐流动，相互支持', feeling: '轻松自在' },
    square: { meaning: '需求与表达的摩擦', feeling: '需要学习理解差异' },
    opposition: { meaning: '强烈吸引与张力并存', feeling: '平衡自我与照顾对方' },
  },
  venusMars: { ... },
  saturn: { ... },
  pluto: { ... },
  northNode: { ... },
};
```

### Decision 3: 分析维度与现有 Prompt 映射

| 用户框架 | 现有 Prompt | 行动 |
|----------|-------------|------|
| 本命盘分析（6 维度） | synastry-natal-a/b | 重写对齐 |
| 比较盘分析（8 维度） | synastry-compare-ab/ba | 重写对齐 |
| 组合盘分析（6 维度） | synastry-composite | 重写对齐 |
| 综合报告 | 无 | 新增 synastry-comprehensive |

### Decision 4: 本命盘 6 维度输出格式

```typescript
interface NatalAnalysisOutput {
  core_self: { title: string; icon: 'sun'; content: string; keywords: string[] };
  emotional_core: { title: string; icon: 'moon'; content: string; keywords: string[] };
  love_language: { title: string; icon: 'venus'; content: string; keywords: string[] };
  desire_action: { title: string; icon: 'mars'; content: string; keywords: string[] };
  relationship_pattern: { title: string; icon: 'partnership'; content: string; keywords: string[] };
  growth_theme: { title: string; icon: 'growth'; content: string; keywords: string[] };
  summary_sentence: string;
}
```

### Decision 5: 比较盘 8 维度输出格式

```typescript
interface SynastryAnalysisOutput {
  attraction: { title: string; score: number; icon: string; content: string; key_aspects: string[] };
  emotional_bond: { ... };
  romance: { ... };
  passion: { ... };
  communication: { ... };
  values: { ... };
  stability: { ... };
  challenges: { title: string; icon: string; content: string; growth_tips: string[] };
  overall_chemistry: { score: number; description: string };
}
```

评分标准：
- 90-100：极度契合
- 80-89：非常契合
- 70-79：良好契合
- 60-69：中等契合
- 50-59：有挑战
- <50：较大挑战

### Decision 6: 组合盘 6 维度输出格式

```typescript
interface CompositeAnalysisOutput {
  relationship_identity: { title: string; subtitle: string; content: string; theme_words: string[] };
  emotional_tone: { title: string; subtitle: string; content: string; atmosphere: string };
  expression_style: { title: string; subtitle: string; content: string };
  momentum: { title: string; content: string; shared_goals: string[] };
  deep_themes: { title: string; content: string; transformation_area: string };
  challenges_gifts: { title: string; content: string; key_lesson: string; potential_gift: string };
  relationship_essence: { metaphor: string; one_sentence: string };
}
```

### Decision 7: 综合报告输出格式

```typescript
interface ComprehensiveReportOutput {
  opening: { title: string; content: string };
  strengths: Array<{ title: string; content: string; based_on: string }>;
  growth_areas: Array<{ title: string; content: string; suggestion: string; based_on: string }>;
  tips: Array<{ icon: string; tip: string }>;
  blessing: { title: string; content: string };
  compatibility_overview: {
    overall_score: number;
    dimension_scores: { emotional: number; romantic: number; communication: number; values: number; growth: number };
    relationship_type: string;
    one_line_summary: string;
  };
}
```

## Risks / Trade-offs

### Risk 1: 前端适配成本
- **风险**：JSON 输出格式变更需要前端修改
- **缓解**：版本号递增，前端可按版本号兼容

### Risk 2: Prompt Token 增加
- **风险**：更详细的分析框架可能增加 system prompt 长度
- **缓解**：沿用 compact 压缩策略，保持 user prompt 精简

### Risk 3: 输出质量一致性
- **风险**：详细的格式要求可能导致 AI 输出不完全符合预期
- **缓解**：提供明确的字数范围和示例

## Migration Plan

### Phase 1: 文化层扩展
1. 创建 `cultural/synastry-persona.ts`
2. 创建 `cultural/metaphors/synastry-aspects.ts`
3. 更新 `cultural/index.ts` 导出

### Phase 2: 模板层重写
1. 重写 `synastry/natal-a.ts` 和 `natal-b.ts`
2. 重写 `synastry/compare-ab.ts` 和 `compare-ba.ts`
3. 重写 `synastry/composite.ts`
4. 新增 `synastry/comprehensive-report.ts`
5. 更新 `synastry/index.ts` 导出

### Phase 3: 指令层扩展
1. 创建 `instructions/synastry-output.ts`
2. 更新 `instructions/index.ts` 导出

### Phase 4: 集成验证
1. 本地测试各 Prompt 输出
2. 与前端协调 JSON 格式适配
3. 上线验证

### Rollback
- 保留旧版本 Prompt（通过 .bak 备份）
- 版本号回退可恢复

## Open Questions

1. 是否需要实现时空盘分析（用户标注为可选功能）？
2. 综合报告是否需要前置调用本命盘、比较盘、组合盘分析？
3. 评分算法是否需要在 Prompt 中明确定义，还是由 AI 自行判断？
