<!-- INPUT: Prompt 管理目录结构与三层架构说明。 -->
<!-- OUTPUT: prompts 目录结构与文件清单。 -->
<!-- POS: Prompt 目录索引文档；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。 -->

# 文件夹：backend/src/prompts

## 架构概要

三层架构设计：
- **core/**: 核心基础设施（类型定义、注册表、构建器、缓存）
- **cultural/**: 文化适配层（角色设定、语气指南、比喻库、场景、心理学）
- **templates/**: Prompt 模板（按功能模块组织）
- **instructions/**: 通用指令（输出格式、安全边界）

## 目录结构

```
prompts/
├── core/                     # 核心基础设施
│   ├── types.ts              # 类型定义
│   ├── registry.ts           # Prompt 注册表（单例）
│   ├── builder.ts            # Prompt 构建器 + BASE_SYSTEM
│   ├── cache.ts              # 缓存 key 生成
│   ├── compact.ts            # 紧凑序列化工具（优化 user prompt）
│   └── index.ts              # 统一导出
│
├── cultural/                 # 文化适配层
│   ├── persona.ts            # 角色设定（DEFAULT/HEALING/ANALYTICAL）
│   ├── synastry-persona.ts   # 合盘专属角色设定（关系占星师）
│   ├── tone.ts               # 语气指南
│   ├── scenarios.ts          # 中国本土化场景库
│   ├── psychology.ts         # 心理学概念本土化
│   ├── metaphors/            # 比喻库
│   │   ├── planets.ts        # 行星比喻
│   │   ├── aspects.ts        # 相位比喻
│   │   ├── houses.ts         # 宫位比喻
│   │   ├── synastry-aspects.ts # 合盘相位解读知识库
│   │   └── index.ts
│   └── index.ts
│
├── instructions/             # 通用指令
│   ├── output-format.ts      # JSON 输出格式规范
│   ├── safety.ts             # 安全边界指令
│   ├── share-guide.ts        # 分享文案生成规范
│   ├── followup-guide.ts     # 追问引导规范
│   ├── synastry-output.ts    # 合盘专属输出格式规范
│   └── index.ts
│
├── templates/                # Prompt 模板
│   ├── natal/                # 本命盘模块 (9 prompts)
│   │   ├── overview.ts       # P0: 本命总览
│   │   ├── core-themes.ts    # P0: 核心主题
│   │   ├── dimension.ts      # P0: 维度分析
│   │   ├── detail/           # 详情解读
│   │   │   ├── big3.ts       # P0: Big3 解读
│   │   │   ├── elements.ts   # P1: 元素分布
│   │   │   ├── aspects.ts    # P1: 相位分析
│   │   │   ├── planets.ts    # P1: 行星详情
│   │   │   ├── asteroids.ts  # P2: 小行星
│   │   │   └── rulers.ts     # P2: 宫主星
│   │   └── index.ts
│   │
│   ├── daily/                # 日运模块 (10 prompts)
│   │   ├── forecast.ts       # P0: 日运预报
│   │   ├── detail.ts         # P0: 日运详情
│   │   ├── transit/          # 行运详情
│   │   │   ├── advice.ts     # P1: 行动建议
│   │   │   ├── time-windows.ts # P1: 时间窗口
│   │   │   ├── aspect-matrix.ts # P1: 相位矩阵
│   │   │   ├── planets.ts    # P1: 行星状态
│   │   │   ├── weekly-trend.ts # P1: 周趋势
│   │   │   ├── asteroids.ts  # P2: 行运小行星
│   │   │   ├── rulers.ts     # P2: 宫主星激活
│   │   │   ├── astro-report.ts # P2: 完整报告
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── synastry/             # 合盘模块 (16 prompts)
│   │   ├── overview.ts       # P0: 合盘总览
│   │   ├── highlights.ts     # P0: 合盘亮点
│   │   ├── core-dynamics.ts  # P1: 核心动力
│   │   ├── vibe-tags.ts      # P1: 氛围标签
│   │   ├── growth-task.ts    # P1: 成长任务
│   │   ├── conflict-loop.ts  # P1: 冲突循环
│   │   ├── natal-a.ts        # P1: A 的本命（6 维度框架）
│   │   ├── natal-b.ts        # P1: B 的本命（6 维度框架）
│   │   ├── weather-forecast.ts # P2: 关系天气
│   │   ├── action-plan.ts    # P2: 行动计划
│   │   ├── practice-tools.ts # P2: 实践工具
│   │   ├── relationship-timing.ts # P2: 时机分析
│   │   ├── compare-ab.ts     # P2: 比较盘（8 维度框架）
│   │   ├── compare-ba.ts     # P2: 比较盘 B 视角
│   │   ├── composite.ts      # P2: 组合盘（6 维度框架）
│   │   ├── comprehensive-report.ts # P1: 综合报告（新增）
│   │   └── index.ts
│   │
│   ├── cbt/                  # CBT 模块 (6 prompts)
│   │   ├── analysis.ts       # P0: 情绪分析
│   │   ├── aggregate-analysis.ts # P1: 聚合分析
│   │   ├── somatic-analysis.ts # P2: 身体觉察
│   │   ├── root-analysis.ts  # P2: 根源分析
│   │   ├── mood-analysis.ts  # P2: 情绪光谱
│   │   ├── competence-analysis.ts # P2: 胜任力
│   │   └── index.ts
│   │
│   ├── ask/                  # Ask 模块 (1 prompt)
│   │   ├── answer.ts         # P0: 问答
│   │   └── index.ts
│   │
│   ├── synthetica/           # Synthetica 模块 (1 prompt)
│   │   ├── analysis.ts       # P0: 实验分析
│   │   └── index.ts
│   │
│   ├── wiki/                 # Wiki 模块 (1 prompt)
│   │   ├── home.ts           # P0: 首页内容
│   │   └── index.ts
│   │
│   ├── kline/                # K线模块 (1 prompt)
│   │   ├── cycle-naming.ts   # P1: 周期命名
│   │   └── index.ts
│   │
│   └── annual/               # 流年模块 (由用户并行维护)
│       ├── system.ts         # 系统指令
│       ├── overview.ts       # 年度总览
│       ├── career.ts         # 事业运势
│       ├── love.ts           # 感情运势
│       ├── health.ts         # 健康运势
│       ├── social.ts         # 社交运势
│       ├── growth.ts         # 成长运势
│       ├── quarter.ts        # 季度运势
│       ├── lucky.ts          # 幸运指南
│       └── index.ts
│
├── index.ts                  # 主入口（导出所有模块）
├── manager.ts.bak            # 旧版 manager 备份
├── manager.ts                # 旧版 Prompt 管理器（待迁移）
├── common.ts                 # 旧版共享模块（待移除）
├── self-page/                # 旧版本我页面（待整合）
└── FOLDER.md                 # 本文档
```

## 优先级说明

- **P0 (12 prompts)**: 核心功能，必须保证质量
- **P1 (17 prompts)**: 重要功能，增强用户体验（含新增 comprehensive-report）
- **P2 (15 prompts)**: 增强功能，提供深度分析

## 使用方式

```typescript
import {
  // 获取特定 Prompt
  getPrompt,
  buildPrompt,

  // 导入特定模块
  natalPrompts,
  dailyPrompts,
  synastryPrompts,

  // 导入特定 Prompt
  natalOverviewPrompt,
  dailyForecastPrompt,

  // 文化配置
  getCulturalConfig,
  PLANET_METAPHORS,
} from './prompts';

// 构建 Prompt
const result = buildPrompt('natal-overview', {
  chart_summary: chartData,
  locale: 'zh-CN',
});

// 使用 result.system 和 result.user 调用 AI
```

## 缓存策略

按模块类型设置不同的 TTL：
- natal: 7 天（本命盘稳定）
- daily: 6 小时（每日更新）
- synastry: 1 天（合盘相对稳定）
- cbt: 30 分钟（情绪记录即时性）
- ask: 1 小时（问答场景）
- synthetica: 1 小时
- kline: 1 天
- wiki: 24 小时
- annual: 30 天（年度报告）

## 近期更新

- 2026-01-29: **合盘 Prompt 中国本土化改造**
  - **问题背景**：原版 Prompt 过于面向欧美和心理学导向，与中国大陆年轻用户关注点有很大差异
  - **改造原则**：
    - 用大白话，不用"依恋风格"、"投射"、"阴影面"等心理学术语
    - 场景接地气：过年回谁家、婆媳、彩礼、消费观、家务分工
    - 用中国年轻人熟悉的表达
  - **模板层重写（v3.1）**：
    - `natal-a.ts` / `natal-b.ts`：6 维度改为「恋爱人设、想要的和能给的、吵架模式、过日子风格、家庭观念、雷区提醒」
    - `compare-ab.ts`：8 维度改为「来电指数、聊得来指数、消费观匹配、过日子合拍度、吵架和好模式、家庭融合难度、长久指数、踩坑预警」
    - `compare-ba.ts`：从 B 视角分析「对 ta 的感觉、ta 懂不懂你、聊天体验、消费观差异、过日子舒适度、吵架后你的感受、ta 的家庭好不好处、跟 ta 能长久吗」
    - `composite.ts`：6 维度改为「CP 人设、在一起的感觉、撒狗粮方式、一起搞事业、熬过难关的能力、这段关系的考验」
    - `comprehensive-report.ts`：输出结构改为「一句话总结、优势、注意点、相处建议、最后想说的话」
  - **版本更新**：
    - natal-a/b: v3.0 → v3.1
    - compare-ab/ba: v3.0 → v3.1
    - composite: v3.0 → v3.1
    - comprehensive-report: v1.0 → v1.1

- 2026-01-29: **合盘 Prompt 系统优化**
  - **文化层扩展**
    - 新增 `synastry-persona.ts`：关系占星师专属角色设定
    - 新增 `synastry-aspects.ts`：合盘相位解读知识库（日月、金火、土星、冥王、北交点）
  - **模板层重写**
    - 重写 `natal-a.ts` / `natal-b.ts`：对齐本命盘 6 维度框架
    - 重写 `compare-ab.ts` / `compare-ba.ts`：对齐比较盘 8 维度框架
    - 重写 `composite.ts`：对齐组合盘 6 维度框架
    - 新增 `comprehensive-report.ts`：综合报告生成
  - **指令层扩展**
    - 新增 `synastry-output.ts`：合盘专属输出格式规范
  - **版本更新**
    - natal-a/b: v2.0 → v3.0
    - compare-ab/ba: v2.0 → v3.0
    - composite: v2.0 → v3.0
    - comprehensive-report: v1.0（新增）

- 2026-01-29: **Prompt 系统性能与质量优化**
  - **Phase 1: 核心层精简**
    - persona.ts: 角色设定从 ~50 行精简至 ~15 行
    - tone.ts: 语气指南从表格式改为规则式，减少 60%
    - output-format.ts: JSON 输出指令从 16 行精简至 2 行
  - **Phase 2: 构建器优化**
    - builder.ts: 新增 BASE_SYSTEM 常量，所有 prompt 共享基础设定
    - compact.ts: 新建紧凑序列化工具，user prompt 减少 70%+
  - **Phase 3: P0 模板重写**
    - 重写 natal/overview, core-themes, dimension
    - 重写 daily/forecast, detail
    - 重写 synastry/overview, highlights
    - 重写 cbt/analysis
    - 重写 ask/answer
    - 所有模板改用 compactChartSummary 等压缩函数
  - **Phase 4: 文化层动态注入**
    - scenarios.ts: 新增 matchScenarios() 场景匹配函数
    - scenarios.ts: 新增 getScenarioExamples() 场景示例函数
  - **Phase 5: 用户体验增强**
    - share-guide.ts: 新建分享文案生成规范
    - followup-guide.ts: 新建追问引导规范

  **预期效果**：
  - P0 平均 system tokens: ~800 → ~350（-56%）
  - P0 平均 user tokens: ~400 → ~150（-62%）
  - 首次响应延迟预计降低 20%+

- 2026-01-29: 完成三层架构重构
  - 新增 core/ 核心层（types, registry, builder, cache）
  - 新增 cultural/ 文化适配层（persona, tone, metaphors, scenarios, psychology）
  - 新增 instructions/ 通用指令（output-format, safety）
  - 迁移所有 Prompt 至 templates/ 目录
  - 实现 P0/P1/P2 共 43 个 Prompt 模板
  - 全面本土化，移除所有英文内容
