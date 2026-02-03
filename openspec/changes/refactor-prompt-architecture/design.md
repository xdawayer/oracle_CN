# Design: Prompt 架构重构

## Context

AstroMind 小程序面向中国大陆 18-35 岁年轻人，需要一套完全本土化的 AI Prompt 架构。当前单文件 `manager.ts` 已膨胀至 2865 行，包含 62 个 Prompt 和大量英文版本，急需模块化重构。

### 约束条件
- 仅支持简体中文
- 输出格式必须为结构化 JSON
- 需要兼容现有缓存策略
- 不改变对外 API 接口

## Goals / Non-Goals

### Goals
- 模块化目录结构，单文件不超过 200 行
- 完整移除英文版本和双语逻辑
- 建立系统化的文化适配层
- 支持 Prompt 版本独立管理
- 精简至 38 个核心 Prompt

### Non-Goals
- 不改变 AI 模型选择逻辑
- 不修改缓存 TTL 策略
- 不添加新功能模块
- 不支持多语言切换

## Decisions

### 1. 目录结构设计

采用三层架构：

```
backend/src/prompts/
├── core/           # 核心层：基础设施
│   ├── types.ts    # 类型定义
│   ├── registry.ts # Prompt 注册表
│   ├── builder.ts  # Prompt 构建器
│   ├── cache.ts    # 缓存逻辑
│   └── index.ts
├── templates/      # 模板层：按功能模块
│   ├── natal/
│   ├── daily/
│   ├── synastry/
│   ├── cbt/
│   ├── ask/
│   ├── synthetica/
│   ├── kline/
│   └── wiki/
├── cultural/       # 文化适配层
│   ├── persona.ts
│   ├── tone.ts
│   ├── metaphors/
│   ├── scenarios.ts
│   └── psychology.ts
└── index.ts        # 主入口
```

**理由**：
- 职责分离，便于维护
- 按功能模块组织，便于查找
- 文化适配独立管理，便于迭代

### 2. 类型系统设计

```typescript
// core/types.ts
interface PromptMeta {
  id: string;
  version: string;
  module: 'natal' | 'daily' | 'synastry' | 'cbt' | 'ask' | 'synthetica' | 'kline' | 'wiki';
  priority: 'P0' | 'P1' | 'P2';
  description: string;
  lastUpdated: string;
}

interface PromptTemplate {
  meta: PromptMeta;
  system: string | ((ctx: PromptContext) => string);
  user: (ctx: PromptContext) => string;
}
```

**变更点**：
- 移除 `scenario` 字段，改用 `module`（更直观）
- 新增 `priority` 字段（P0/P1/P2）
- 新增 `description` 和 `lastUpdated` 字段

### 3. 注册表模式

采用单例注册表，支持按模块和优先级查询：

```typescript
class PromptRegistry {
  register(template: PromptTemplate): void;
  get(id: string): PromptTemplate | undefined;
  getVersion(id: string): string;
  buildCacheKey(promptId: string, inputHash: string): string;
  listByModule(module: string): PromptTemplate[];
  listByPriority(priority: string): PromptTemplate[];
}
```

**理由**：
- 延续现有模式，降低迁移成本
- 新增按模块/优先级查询，便于管理

### 4. 文化适配层设计

#### 4.1 角色设定（3 种）
- `DEFAULT_PERSONA`：懂占星的朋友（默认）
- `HEALING_PERSONA`：温柔的倾听者（CBT/敏感话题）
- `ANALYTICAL_PERSONA`：专业分析师（详情解读）

#### 4.2 比喻库
- 行星比喻：10 颗行星的中文本土化描述
- 相位比喻：5 种主要相位的形象比喻
- 宫位比喻：12 宫的通俗化解释

#### 4.3 场景库
- 关系场景：恋爱、家庭、友谊、职场
- 情绪场景：焦虑、愤怒、悲伤、压力
- 成长场景：事业、自我

#### 4.4 心理学映射
- 荣格概念：阴影、人格面具、阿尼玛/阿尼姆斯、个体化
- 依恋理论：安全型、焦虑型、回避型、混乱型
- CBT 认知扭曲：灾难化、读心术、非黑即白等

### 5. Prompt ID 命名规范

格式：`{module}-{function}` 或 `detail-{function}-{module}`

示例：
- `natal-overview`
- `daily-forecast`
- `detail-big3-natal`
- `synastry-overview`

### 6. 缓存策略保持兼容

| 类型 | TTL | 说明 |
|------|-----|------|
| 日运类 | 24h | 按日期缓存 |
| 本命类 | 7d | 星盘不变则不变 |
| 合盘类 | 30d | 关系分析相对稳定 |
| CBT 类 | 不缓存 | 每次都是新记录 |
| 问答类 | 不缓存 | 对话实时性 |

缓存 key 格式不变：`ai:{promptId}:v{version}:{hash}`

## Alternatives Considered

### 方案 A：渐进式清理（不采用）
仅清理 `manager.ts` 中的英文内容，不做结构重构。

**否决理由**：
- 不解决根本问题，文件仍会继续膨胀
- 无法建立系统化的文化适配

### 方案 B：配置文件驱动（不采用）
将 Prompt 内容存入 JSON/YAML 配置文件。

**否决理由**：
- 丧失 TypeScript 类型检查
- 动态 system prompt 难以表达
- 编辑体验差

## Risks / Trade-offs

### 风险 1：迁移过程中断服务
**缓解**：采用渐进式迁移，保持旧模块可用，新旧并行

### 风险 2：输出质量回退
**缓解**：每个 Prompt 迁移后进行 A/B 测试对比

### 风险 3：缓存失效
**缓解**：保持缓存 key 格式兼容，仅通过版本号控制刷新

## Migration Plan

### Phase 1：基础架构（Week 1）
1. 创建目录结构
2. 实现 `core/` 层
3. 保持 `manager.ts` 可用

### Phase 2：文化适配层（Week 2）
1. 实现 `cultural/` 层
2. 编写比喻库、场景库
3. 单元测试验证

### Phase 3A：P0 核心 Prompts（Week 3）
1. 迁移 12 个 P0 Prompt
2. 逐一 A/B 测试
3. 更新 `ai.ts` 调用

### Phase 3B：P1 重要 Prompts（Week 4-5）
1. 迁移 16 个 P1 Prompt
2. 持续测试验证

### Phase 3C：P2 增强 Prompts（Week 5-6）
1. 迁移 10 个 P2 Prompt
2. 清理旧代码

### Phase 4：测试与优化（Week 6-7）
1. 集成测试
2. 性能验证
3. 文档更新

### 回滚方案
- 保留 `manager.ts.bak` 备份
- `index.ts` 支持切换新旧模块
- 任何阶段发现严重问题可立即回滚

## Open Questions (已解决)

1. **是否需要保留部分英文 Prompt 供内部调试？**
   ✅ 决定：不保留，完全删除

2. **self-page/ 目录的 Prompt 如何整合？**
   ✅ 决定：以 PRD 为准，整合入新结构

3. **现有 62 个 Prompt 中不在 PRD 清单的如何处理？**
   ✅ 决定：删除，精简至 PRD 定义的 38 个

4. **实施顺序？**
   ✅ 决定：先完善架构（Phase 1-2），再写 Prompts（Phase 3）
