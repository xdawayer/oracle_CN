## 1. 已完成 — Phase 1 快速见效

- [x] 1.1 `ask.ts` 串行星盘计算改为 `Promise.all` 并行
- [x] 1.2 `cbt.ts` 6 个分析端点串行计算改为 `Promise.all` 并行
- [x] 1.3 添加 `compression` gzip 中间件到 `index.ts`
- [x] 1.4 去掉 `synastry.js` 预加载 500ms 人工延迟（成功→立即，失败→200ms）

## 2. 已完成 — Phase 2 部分

- [x] 2.1 `repairJsonWithAI` 替换为 `repairJsonLocal` 本地正则修复
  - 校验: 确认 `ai.ts` 中无 `repairJsonWithAI` 引用，TypeScript 编译通过
- [x] 2.2 `buildSynastryCore` 添加 5 分钟内存缓存（`synastry.ts`）
  - 校验: 确认同一用户对浏览多个 tab 时，第 2-5 次请求从缓存返回

## 3. 已完成 — Phase 2 核心改造：SSE 流式输出

- [x] 3.1 后端: 在 `ai.ts` 新增 `generateAIContentStream` 函数
  - 使用 DeepSeek `/v1/chat/completions` 的 `stream: true` 参数
  - 返回 `AsyncGenerator<string>` 逐块输出
  - 仅对 `STREAMABLE_PROMPTS`（当前为 `ask-answer`）启用
  - 同时将 `ask-answer` 加入 `RAW_TEXT_PROMPTS`（输出为 Markdown 文本）
- [x] 3.2 后端: 在 `ask.ts` 新增 SSE 端点 `POST /api/ask/stream`
  - 设置 `Content-Type: text/event-stream`，逐步 `res.write` SSE 事件
  - 先发送 `meta` 事件（含星盘数据），再逐步发送 `chunk` 事件
  - 保留原 `POST /api/ask` 非流式端点作为降级
  - 生成完成后扣费，结束发送 `[DONE]`
- [x] 3.3 后端: `compression` 中间件过滤 SSE 响应（避免缓冲延迟）
  - 在 `index.ts` 添加 filter 函数排除 `text/event-stream`
- [x] 3.4 前端: 在 `request.js` 新增 `requestStream` 函数
  - 使用 `wx.request` 的 `enableChunked: true`
  - 解析 SSE 格式，通过 `onMeta/onChunk/onDone/onError` 回调逐步传递
  - 低版本基础库自动降级为普通非流式请求
- [x] 3.5 前端: `ask.js` 改用 `requestStream` 调用 `/api/ask/stream`
  - 逐步更新 `reportData`，用户可在 1-2 秒内看到首批内容
  - 流式失败时自动降级为非流式请求（`_fallbackNonStream`）
  - 关闭报告时取消进行中的流式请求
- [x] 3.6 前端: `self.js` / `daily.js` / `synastry.js` 评估并接入“模块级 SSE”
  - JSON 不做逐字流式，改为“模块事件级”增量渲染
  - 保持原 `/full` 端点为降级路径
  - 校验: 不破坏现有 JSON 解析逻辑

## 4. 已完成/待实施 — Phase 3 精细优化

- [x] 4.2 前端请求去重机制
  - 在 `request.js` 中添加请求指纹 Map（URL + method + body）
  - 相同指纹的并发 POST 请求共享同一 Promise
  - 请求完成后立即移除指纹
- [x] 4.3 全局请求超时中间件
  - 在 `index.ts` 添加 120s 超时中间件
  - 超时后返回 504 状态码
- [x] 4.1 文化层 prompt 分级: 新增 `lite` 级别
  - 在 `prompts/cultural/` 中为百科/详情场景创建精简版文化层
  - 在 prompt 构建器中按 promptId 选择 `lite` 或 `full`
  - 校验: 对比 lite 与 full 模式输出质量，确认可接受
  - 校验: 验证 lite 模式减少 30%+ 输入 token

## 5. 验收标准

- [x] 5.1 TypeScript 编译通过（`npx tsc --noEmit`）
- [x] 5.2 所有现有 API 端点功能不受影响（非流式路径保持不变）
- [ ] 5.3 流式端点在微信开发者工具和真机中正常工作
- [ ] 5.4 ask 页面首屏内容出现时间 < 3 秒（流式模式下）

## 6. 待实施 — 全页面加速（模块级 SSE + 观测 + Token 预算）

- [x] 6.1 后端: 新增 `/api/natal/full/stream`（meta + module + done 事件）
- [x] 6.2 后端: 新增 `/api/daily/full/stream`（meta + module + done 事件）
- [x] 6.3 后端: 新增 `/api/synastry/full/stream`（meta + module + done 事件）
- [x] 6.4 前端: `self.js` 接入 `requestStream`（模块级渲染）
- [x] 6.5 前端: `daily.js` 接入 `requestStream`（模块级渲染）
- [x] 6.6 前端: `synastry.js` 接入 `requestStream`（模块级渲染）
- [x] 6.7 后端: AI 端点统一输出 `Server-Timing(core/ai/total)`（ask/synastry/detail/wiki/cbt 等补齐）
- [x] 6.8 后端: 在 `ai.ts` 记录 promptId/model/cached/maxTokens/耗时日志
- [x] 6.9 后端: 为高频 prompt 配置 `max_tokens` 上限（新增映射表）
- [x] 6.10 前端: 所有 AI 请求统一 `timeout: 120000`

## 7. 待实施 — Token 与上下文压缩

- [x] 7.1 文化层 `lite`/`full` 分级（承接 4.1）
- [x] 7.2 ask/synastry/cbt/wiki 等场景优先使用紧凑摘要上下文
- [x] 7.3 对比输出质量并记录 token 减少比例（目标 ≥ 30%）
  - 通过 usage + inputChars 日志记录，供压测/对比使用

## 8. 扩展验收标准（全页面）

- [ ] 8.1 natal/daily/synastry 页面首屏可见内容 < 3s（SSE 模块级）
- [ ] 8.2 AI 端点 `Server-Timing` 覆盖率 100%
- [ ] 8.3 平均 AI 时长下降 ≥ 30%（对比基线日志）
