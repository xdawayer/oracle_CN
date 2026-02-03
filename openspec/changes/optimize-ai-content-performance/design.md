## Context

AstroMind 的 AI 内容生成是核心功能，用户每次操作（本命解读、每日运势、合盘分析、问答等）都需等待 DeepSeek API 返回完整响应。当前平均等待 5-20 秒，用户体验差。

约束条件：
- 微信小程序环境，网络 API 受限
- DeepSeek API 支持 streaming（SSE），但当前仅 ask 使用
- AI 超时必须保持 120s（用户明确要求宁愿等待）
- Reasoner 模型用于 annual 模块不变（异步任务）

## Goals / Non-Goals

- Goals:
  - 感知延迟减少 70%+（通过流式输出/分段交付让用户在 1-2 秒内看到首批内容）
  - 消除串行计算和重复计算浪费（已完成）
  - 减少网络传输量（gzip 压缩，已完成）
  - 减少 AI 输入 token（精简文化层 prompt）
  - 防止重复无效请求（前端去重）

- Non-Goals:
  - 不改变 AI 模型选择策略
  - 不改变缓存 TTL 策略
  - 不引入 WebSocket 长连接（微信小程序 SSE 已足够）
  - 不改变 120s 超时配置

## Decisions

### Decision 1: SSE 流式输出方案

选择 Express SSE + `wx.request` enableChunked 方案。

- **方案**: 后端新增 `generateAIContentStream` 函数，使用 DeepSeek streaming API，通过 `res.write` 逐步推送 SSE 事件；前端使用 `wx.request` 的 `enableChunked: true` 接收 chunked transfer。
- **替代方案**: WebSocket — 过于复杂，微信小程序的 chunked request 已能满足需求。
- **替代方案**: 轮询 — 延迟高，浪费请求。

### Decision 2: 流式输出适用范围

对 **文本型输出** 启用逐字流式；对 **多模块 JSON 输出** 启用“模块级分段流式”（每个模块以完整 JSON 事件发送）。

- **原因**: JSON 输出无法逐字渲染，但模块级事件可让用户先看到部分结构化内容。
- **替代方案**: 流式 JSON + 渐进式解析 — 实现复杂度高，收益不明确。

### Decision 3: 文化层 prompt 分级

引入 `lite` 和 `full` 两级文化层：
- `lite`: 仅包含角色设定和核心安全边界（~200 token）
- `full`: 完整文化层（角色 + 语气 + 比喻库 + 心理学映射，~800 token）

百科/详情等低创意场景使用 `lite`，分析/问答/合盘等高创意场景使用 `full`。

### Decision 4: 本地 JSON 修复策略（已实施）

用 `repairJsonLocal` 替代 `repairJsonWithAI`，通过正则修复常见 JSON 错误（尾部逗号、缺少闭合括号、单引号键名）。修复失败时抛出原始解析错误，不再发起二次 AI 调用。

### Decision 5: synastry 星盘缓存（已实施）

使用内存 Map 缓存 `buildSynastryCore` 结果，5 分钟 TTL，最大 200 条。单实例足够（当前部署为单实例），未来多实例可迁移到 Redis。

### Decision 6: Prompt Token 预算

为高频 prompt 设定 `max_tokens` 上限（按场景分类），减少长尾时长和波动；默认值仅用于未配置的 prompt。

### Decision 7: 性能可观测性

统一 AI 端点输出 `Server-Timing(core/ai/total)`；在服务层记录 promptId/model/cached/maxTokens/耗时，供排查与压测基线对比。

## Risks / Trade-offs

- **流式输出增加代码复杂度**: 需要维护两套调用路径（stream / non-stream）。通过清晰的函数签名和 promptId 配置管理。
- **文化层精简可能影响内容质量**: 通过 A/B 对比验证 lite 模式的输出质量。
- **本地 JSON 修复覆盖率有限**: 可能有极端情况无法修复。通过日志监控修复失败率，必要时回退到 AI 修复。
- **内存缓存在服务重启后丢失**: 可接受，星盘计算是确定性的，重新计算成本低。

## Open Questions

- 微信小程序 `enableChunked` 在低版本基础库是否兼容？需要确认最低支持版本。
- 流式输出场景下，如何处理中途 AI 错误？需要定义前端降级策略。
