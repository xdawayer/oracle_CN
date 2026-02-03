# Change: 新增本命盘深度解读报告

## Why

当前"本我"页面提供了 Big3 解读、心理维度、人生维度等轻量分析，但缺少一份完整的、系统性的本命盘深度解读报告。用户对"全面了解自己"有强烈需求，这是占星应用的核心付费功能之一。

2026 流年运势报告已验证了"异步任务 + 分模块并行生成"的技术模式。本命解读报告应复用该基础设施，避免重复造轮子，同时为后续其他类型报告（如太阳回归、推运报告等）建立通用的报告生成框架。

## What Changes

### 1. 通用报告任务框架（从 annual-task 抽象）

将现有 `annual-task.ts` 的核心逻辑抽象为通用的报告生成框架：
- 通用的任务状态管理（pending → processing → completed/failed）
- 通用的分批并行生成策略
- 通用的模块重试机制
- 通用的缓存 key 格式：`report:{reportType}:{userId}:{moduleId}:{chartHash}`

### 2. 本命深度解读报告（8 个模块）

新增 `natal-report` 类型报告，包含 8 个模块：

| 模块 ID | 名称 | 字数 | 优先级 |
|---------|------|------|--------|
| `overview` | 星盘总览与人格画像 | 600-800 字 | P0 |
| `mind` | 思维与沟通方式 | 500-700 字 | P1 |
| `emotion` | 情感世界与内在需求 | 600-800 字 | P0 |
| `love` | 爱情与亲密关系 | 800-1100 字 | P0 |
| `career` | 事业与人生方向 | 700-900 字 | P0 |
| `wealth` | 财富与金钱关系 | 500-700 字 | P1 |
| `health` | 健康与能量管理 | 400-600 字 | P2 |
| `soul` | 人生课题与灵魂成长 | 700-900 字 | P1 |

总计约 5000-6500 字。

### 3. 前端集成

- 在"本我"页面底部新增入口卡片（位于流年报告下方）
- 复用 `annual-report` 页面的渲染逻辑，创建通用的报告展示页面
- 支持渐进式渲染、进度条、Markdown 转 HTML

### 4. Prompt 设计特点

- **全局规则层**：贯穿所有模块的角色设定、核心原则、禁止事项
- **模块间衔接**：后续模块注入前序模块摘要，保证叙事连贯
- **质量校验**：字数范围、关键词检测、禁止词过滤、情绪倾向检查

## Impact

### 受影响的代码
- `backend/src/services/annual-task.ts` → 抽象为 `report-task.ts` 通用框架
- `backend/src/api/annual-task.ts` → 抽象为通用报告 API
- `backend/src/prompts/templates/` → 新增 `natal-report/` 目录（8 个模块 Prompt）
- `backend/src/prompts/core/types.ts` → 新增 `natal-report` 模块类型
- `miniprogram/pages/self/` → 新增报告入口
- `miniprogram/pages/` → 新增或复用报告展示页面

### 受影响的规范
- natal-deep-report（新建）

### 兼容性
- 现有 annual-task 功能不受影响（抽象后 annual 作为 reportType 之一）
- 现有 natal API（Big3/维度/深度分析）不受影响
- 不涉及数据库 schema 变更

### 风险
- 低风险：主要是新增功能 + 抽象重构
- 需确保抽象后 annual-task 的行为完全向后兼容
- 8 模块并行生成的 API 限流控制
