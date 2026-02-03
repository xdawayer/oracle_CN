# Change: 优化 AI 内容生成性能

## Why

AI 内容生成是用户感知延迟的最大来源。对全项目梳理后发现：只有 ask 使用流式，其余页面（本命/日运/合盘/百科/CBT/详情等）仍需等待完整返回；AI 默认 `max_tokens=4096` 导致不必要的生成时长；部分端点缺少统一性能观测与前端超时策略；高频场景输入 token 偏大（文化层 + 全量上下文）。因此需要“全页面”系统性优化，减少首屏等待并降低平均 AI 时长。

## What Changes

### 已完成（Phase 1 & Phase 2 部分）

- ✅ `backend/src/api/ask.ts`: 串行星盘计算改为 `Promise.all` 并行
- ✅ `backend/src/api/cbt.ts`: 6 个分析端点全部改为 `Promise.all` 并行
- ✅ `backend/src/index.ts`: 添加 `compression` gzip 中间件
- ✅ `miniprogram/pages/synastry/synastry.js`: 去掉预加载 500ms 人工延迟
- ✅ `backend/src/services/ai.ts`: `repairJsonWithAI` 替换为 `repairJsonLocal`（本地正则修复）
- ✅ `backend/src/api/synastry.ts`: `buildSynastryCore` 添加 5 分钟内存缓存
- ✅ Ask 流式链路：`generateAIContentStream` + `/api/ask/stream` + 小程序 `requestStream`

### 待实施（Phase 3 全页面感知加速）

- **模块级 SSE 流式输出**：为 `natal/full`、`daily/full`、`synastry/full` 增加 stream 端点（按模块逐条推送），实现“先看到一部分内容”
- **前端增量渲染**：在 `self.js`、`daily.js`、`synastry.js` 接入 `requestStream`，分模块更新 UI，并保留非流式降级路径
- **统一性能观测**：AI 端点统一输出 `Server-Timing(core/ai/total)`；在 `ai.ts` 记录 promptId/model/cached/maxTokens/耗时；小程序记录首屏/AI 完成耗时
- **Token 预算控制**：按 promptId 配置 `max_tokens` 上限（短 JSON 场景显著降低），减少生成时长与波动
- **上下文精简**：高频场景优先使用紧凑摘要（chart/transit summary），减少输入 token
- **文化层 Prompt 分级**：继续实施 `lite/full` 文化层（百科/详情使用 lite）
- **前端统一超时**：所有 AI 请求统一 `timeout: 120000`，减少重试造成的额外等待
- **缓存与预热**：确认 Redis 可用并记录降级；继续扩展页面级预取与本地缓存

### 不变更

- Reasoner 模型用于 annual 模块（异步生成，不影响用户感知）
- AI 超时保持 120s（用户宁愿等待而非报错）

## Impact

- Affected specs: `ai-content-delivery`（新增能力规范）
- Affected code:
  - `backend/src/services/ai.ts` — 核心 AI 调用层
  - `backend/src/index.ts` — Express 中间件
  - `backend/src/api/ask.ts`, `cbt.ts`, `daily.ts`, `natal.ts`, `synastry.ts` — API 路由
  - `backend/src/prompts/cultural/` — 文化层 prompt
  - `miniprogram/utils/request.js` — 前端请求层
  - `miniprogram/pages/ask/ask.js`, `self/self.js`, `daily/daily.js`, `synastry/synastry.js` — 前端页面增量渲染
