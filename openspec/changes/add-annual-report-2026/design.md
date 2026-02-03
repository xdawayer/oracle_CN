# Design: 2026 流年运势报告

## Context

### 背景
- 产品定位：面向中国大陆 18-35 岁年轻人的中西方结合占星应用
- 流年运势是占星 App 的核心付费功能，需要提供约 10000 字的深度报告
- 现有 `refactor-prompt-architecture` 提案正在重构 Prompt 架构，本设计需与之保持一致

### 约束
- 前端为微信小程序，无法使用 React/Vue 等框架
- 后端已有 Express + TypeScript 架构
- 已有 `generateAIContent` 服务支持流式响应
- 需遵循 `cultural/` 层的本土化规范

### 利益相关方
- 用户：期望获得个性化、深度的年度运势指引
- 运营：期望通过付费报告实现商业变现
- 开发：期望架构清晰、易于扩展

## Goals / Non-Goals

### Goals
- 提供完整的 2026 年流年运势报告生成能力
- 实现模块化并行生成，优化用户等待体验
- 报告内容符合产品定位：现代、心理学导向、中国文化融合
- 与现有 Prompt 架构保持一致

### Non-Goals
- 不在本次实现月度订阅功能
- 不在本次实现 PDF 导出功能
- 不在本次实现社交分享图片生成
- 不实现其他报告类型（本命解读、人生 K 线等）

## Decisions

### D1: 报告模块拆分策略

**决策**：将完整报告拆分为 11 个独立模块

| 模块 ID | 名称 | 字数 | 优先级 |
|---------|------|------|--------|
| overview | 年度总览 | 800-1000 | P0 |
| career | 事业财运 | 1200-1500 | P0 |
| love | 感情关系 | 1200-1500 | P0 |
| health | 健康能量 | 800-1000 | P1 |
| social | 人际社交 | 800-1000 | P1 |
| growth | 学习成长 | 800-1000 | P1 |
| q1 | 第一季度详解 | 500-600 | P1 |
| q2 | 第二季度详解 | 500-600 | P1 |
| q3 | 第三季度详解 | 500-600 | P2 |
| q4 | 第四季度详解 | 500-600 | P2 |
| lucky | 开运指南 | 600-800 | P2 |

**理由**：
- 单次 AI 调用 10000+ 字容易超时或质量下降
- 并行生成可缩短总等待时间
- 按优先级分批启动，避免 API 限流

### D2: 生成优先级与批次

**决策**：分 3 批次启动，优先展示用户最关心的内容

```
批次 1（立即启动）: overview
批次 2（批次 1 完成后）: career, love
批次 3（并行启动）: health, social, growth, q1, q2, q3, q4, lucky
```

**理由**：
- `overview` 作为开篇，让用户立即看到内容
- `career`、`love` 是用户最关心的领域
- 其余模块可并行生成，按完成顺序展示

### D3: API 设计

**决策**：采用 SSE (Server-Sent Events) 流式响应

```
POST /api/annual-report/generate
Content-Type: application/json

Request:
{
  "year": 2026,
  "birth": { date, time, city, lat, lon, timezone }
}

Response: text/event-stream
event: module
data: {"moduleId": "overview", "status": "streaming", "content": "..."}

event: module
data: {"moduleId": "overview", "status": "complete", "content": "..."}

event: done
data: {"totalModules": 11}
```

**备选方案**：
- 方案 B：WebSocket - 过于复杂，小程序支持有限
- 方案 C：轮询 - 用户体验差，服务器压力大

### D4: Prompt 架构集成

**决策**：在 `templates/annual/` 下创建模块化 Prompt，复用 `cultural/` 层

目录结构：
```
backend/src/prompts/templates/annual/
├── index.ts           # 统一导出
├── overview.ts        # 年度总览
├── career.ts          # 事业财运
├── love.ts            # 感情关系
├── health.ts          # 健康能量
├── social.ts          # 人际社交
├── growth.ts          # 学习成长
├── quarter.ts         # 季度详解（通用模板，参数化季度）
└── lucky.ts           # 开运指南
```

**理由**：
- 与 `refactor-prompt-architecture` 保持一致
- 复用 `cultural/persona.ts`、`cultural/metaphors/` 等本土化配置
- 便于后续扩展其他年度报告

### D5: 缓存策略

**决策**：使用 Redis 缓存已生成的报告模块

缓存 key 格式：`annual:{userId}:{year}:{moduleId}:{chartHash}`
- `chartHash`：基于出生信息计算的哈希值
- TTL：365 天（年度报告全年有效）

**理由**：
- 避免重复生成，节省 AI 成本
- 用户重复查看时即时响应
- 出生信息变更后自动失效

### D6: 2026 年星象数据

**决策**：在 Prompt 中硬编码 2026 年主要星象事件

2026 年关键星象：
- 木星：巨蟹座（至 2026.6）→ 狮子座（2026.6 起）
- 土星：白羊座全年
- 天王星：金牛座后期 → 双子座初期（2025.7-2026.11 逆行后重入金牛）
- 海王星：双鱼座 → 白羊座（2026.3 进入白羊）
- 冥王星：水瓶座全年
- 北交点：双鱼座 → 水瓶座（2026.1 进入水瓶）

**理由**：
- 星象数据相对固定，无需实时计算
- 减少 API 调用，提升响应速度

## Risks / Trade-offs

### R1: 并行请求可能触发 API 限流
- **风险**：同时启动 11 个 AI 请求可能超过 Anthropic API 限制
- **缓解**：分批启动，控制并发数不超过 5；使用队列机制

### R2: 单模块生成失败影响整体体验
- **风险**：某个模块 AI 调用失败，用户看到不完整报告
- **缓解**：实现重试机制（最多 2 次）；失败模块显示占位符，提供"重新生成"按钮

### R3: 报告内容一致性
- **风险**：各模块独立生成，可能出现内容矛盾
- **缓解**：在 Prompt 中注入统一的用户信息和年度主题；后处理检查关键词一致性

## Migration Plan

### Phase 1: 后端基础
1. 创建 `templates/annual/` Prompt 模板
2. 实现 `annual-report.ts` API 路由
3. 实现缓存机制

### Phase 2: 前端集成
1. 创建 `annual-report` 页面
2. 实现 SSE 流式接收
3. 更新 `self` 页面支付流程

### Phase 3: 测试上线
1. 内部测试报告质量
2. 灰度发布
3. 收集用户反馈并迭代

## Open Questions

1. **Q: 是否需要支持查看历史报告？**
   - 建议：首期通过缓存支持重复查看，历史记录功能后续迭代

2. **Q: 报告内容是否需要支持编辑/定制？**
   - 建议：首期不支持，后续根据用户反馈决定

3. **Q: 是否需要生成封面图或分享图？**
   - 建议：首期不实现，可作为后续增强功能
