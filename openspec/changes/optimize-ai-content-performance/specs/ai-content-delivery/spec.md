## ADDED Requirements

### Requirement: SSE 流式 AI 内容输出
后端 SHALL 提供 SSE（Server-Sent Events）流式端点，在 AI 生成内容时逐步推送文本到前端，减少用户感知等待。

#### Scenario: ask 模块流式输出
- **WHEN** 前端调用 `POST /api/ask/stream`
- **THEN** 后端使用 `Content-Type: text/event-stream` 响应
- **AND** 每收到一段 AI 生成文本，发送 `data: <text>\n\n` 格式的 SSE 事件
- **AND** 生成完毕后发送 `data: [DONE]\n\n`

#### Scenario: 非流式端点保持兼容
- **WHEN** 前端调用原 `POST /api/ask`（无 stream 参数）
- **THEN** 后端行为与修改前完全一致，返回完整 JSON 响应

#### Scenario: 流式输出仅限文本型 prompt
- **WHEN** promptId 属于结构化 JSON 输出类型（如 natal-overview、synastry-overview）
- **THEN** 系统 SHALL NOT 提供流式端点，继续使用全量返回

### Requirement: 前端流式接收与渐进渲染
微信小程序前端 SHALL 支持接收 SSE 流式响应并逐步渲染 AI 内容。

#### Scenario: chunked request 接收
- **WHEN** 前端使用 `requestStream` 调用流式端点
- **THEN** 使用 `wx.request` 的 `enableChunked: true` 接收分块数据
- **AND** 解析 SSE 格式后通过回调逐步更新页面内容

#### Scenario: 低版本基础库降级
- **WHEN** 用户微信基础库版本不支持 `enableChunked`
- **THEN** 自动降级为普通非流式请求
- **AND** 功能不受影响，仅失去逐步渲染效果

### Requirement: 本地 JSON 修复
AI 返回的 JSON 解析失败时，系统 SHALL 使用本地正则修复而非二次 AI 调用。

#### Scenario: JSON 尾部逗号修复
- **WHEN** AI 返回的 JSON 包含尾部多余逗号（如 `{"a":1,}`）
- **THEN** `repairJsonLocal` 移除多余逗号并成功解析

#### Scenario: JSON 缺少闭合括号修复
- **WHEN** AI 返回的 JSON 缺少 `}` 或 `]`
- **THEN** `repairJsonLocal` 补全缺失的闭合括号并成功解析

#### Scenario: 本地修复失败
- **WHEN** JSON 错误超出本地修复能力
- **THEN** 抛出原始 JSON 解析错误
- **AND** SHALL NOT 发起额外 AI 调用

### Requirement: 星盘计算并行化
多个独立的星盘计算 SHALL 使用 `Promise.all` 并行执行。

#### Scenario: ask 端点并行计算
- **WHEN** 调用 `POST /api/ask`
- **THEN** `calculateNatalChart` 和 `calculateTransits` SHALL 并行执行

#### Scenario: cbt 端点并行计算
- **WHEN** 调用 cbt 任意分析端点
- **THEN** `calculateNatalChart` 和 `calculateTransits` SHALL 并行执行

### Requirement: synastry 星盘数据缓存
系统 SHALL 缓存 `buildSynastryCore` 的计算结果，避免同一用户对浏览多个 tab 时重复计算。

#### Scenario: 缓存命中
- **WHEN** 用户在 5 分钟内对同一对出生数据请求不同 tab
- **THEN** 第 2-N 次请求 SHALL 从内存缓存返回，不重新计算

#### Scenario: 缓存过期
- **WHEN** 缓存条目超过 5 分钟 TTL
- **THEN** 下次请求 SHALL 重新计算并更新缓存

### Requirement: HTTP 响应压缩
后端 SHALL 对所有 HTTP 响应启用 gzip 压缩。

#### Scenario: 文本响应压缩
- **WHEN** 客户端发送 `Accept-Encoding: gzip` 请求头
- **THEN** AI 生成的文本内容 SHALL 以 gzip 压缩传输

### Requirement: 文化层 Prompt 分级（Phase 3）
Prompt 文化层 SHALL 支持 `lite` 和 `full` 两个级别，按场景复杂度选择。

#### Scenario: 百科/详情场景使用 lite 文化层
- **WHEN** promptId 属于 wiki 或 detail 类型
- **THEN** 系统 SHALL 使用 lite 级别文化层（仅角色设定 + 安全边界）

#### Scenario: 分析/问答场景使用 full 文化层
- **WHEN** promptId 属于 ask、cbt、synastry、natal 等分析类型
- **THEN** 系统 SHALL 使用 full 级别文化层（完整角色 + 语气 + 比喻库 + 心理学映射）

### Requirement: 前端请求去重（Phase 3）
前端请求层 SHALL 对相同请求进行去重，防止重复 AI 调用。

#### Scenario: 并发相同请求去重
- **WHEN** 同一请求（URL + body 相同）被并发触发多次
- **THEN** 仅发送 1 次网络请求，多个调用方共享同一响应

### Requirement: 多模块 AI 内容分段交付（Module SSE）
对于包含多个 AI 模块的端点，系统 SHALL 支持以 SSE 方式分段推送模块结果。

#### Scenario: natal/full/stream 分段输出
- **WHEN** 前端调用 `GET /api/natal/full/stream`
- **THEN** 后端先发送 `meta` 事件（含 chart）
- **AND** 逐模块发送 `module` 事件（overview/coreThemes/dimension）
- **AND** 完成后发送 `done` 事件

#### Scenario: daily/full/stream 分段输出
- **WHEN** 前端调用 `GET /api/daily/full/stream`
- **THEN** 后端先发送 `meta` 事件（含 chart/transits/technical）
- **AND** 逐模块发送 `module` 事件（forecast/detail）
- **AND** 完成后发送 `done` 事件

#### Scenario: synastry/full/stream 分段输出
- **WHEN** 前端调用 `GET /api/synastry/full/stream`
- **THEN** 后端先发送 `meta` 事件（含 chartA/chartB/synastryCore）
- **AND** 逐模块发送 `module` 事件（overview/coreDynamics/highlights）
- **AND** 完成后发送 `done` 事件

#### Scenario: 非流式端点保持兼容
- **WHEN** 前端调用原 `/api/*/full` 端点
- **THEN** 后端行为与修改前一致，返回完整 JSON

### Requirement: AI 端点性能时间头
AI 相关端点 SHALL 输出 `Server-Timing` 头，包含 core/ai/total 的耗时信息。

#### Scenario: 非流式 AI 端点返回耗时
- **WHEN** 调用任意非流式 AI 端点
- **THEN** 响应头包含 `Server-Timing: core;dur=... , ai;dur=... , total;dur=...`

### Requirement: Prompt 输出 token 预算
系统 SHALL 为高频 prompt 配置输出 token 上限，用于控制生成时长与稳定性。

#### Scenario: 使用配置的 max_tokens
- **WHEN** promptId 有对应的 `max_tokens` 配置
- **THEN** 调用模型时 SHALL 使用该上限

#### Scenario: 缺省上限
- **WHEN** promptId 未配置 `max_tokens`
- **THEN** 使用全局默认上限
