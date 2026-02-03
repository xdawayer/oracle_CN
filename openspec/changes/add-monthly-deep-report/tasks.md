# Tasks: 月度运势深度解读

## Phase 1: 行运数据计算层 ✅

### Task 1.1: 扩展星历计算 — 月度行运数据 ✅
- ~~在 `backend/src/services/ephemeris.ts` 中新增 `calculateMonthlyTransits(birthInfo, year, month)` 方法~~
- **实际实现**：在 `backend/src/services/monthly-task.ts` 中实现 `buildMonthlyTransitData()`，复用现有 `ephemerisService.calculateTransits()` 计算 5 个时间点的行运快照（月初/8日/月中/22日/月末）
- 计算内容：
  - 当月公共天象（太阳/月亮/水金火木土天海冥位置与换座日期）
  - 新月/满月日期、星座、度数
  - 行运行星过境用户宫位
  - 行运与本命行星的主要相位（含精确日期、容许度、强度分级）
  - 新月/满月落入用户宫位
  - 各维度强度总评
- 输出类型：`MonthlyTransitData`（定义在 `types/api.ts`）
- **校验**：使用已知星历数据（如 2026 年 7 月）验证计算结果的日期准确性
- **依赖**：无
- **可并行**：可与 Phase 2 并行

### Task 1.2: 行运数据序列化 ✅
- ~~在 `backend/src/prompts/core/compact.ts` 中新增月度行运数据的紧凑序列化方法~~
- **实际实现**：序列化逻辑内置在 `buildMonthlyTransitData()` 中，直接输出紧凑文本格式
- 目标：将 `MonthlyTransitData` 压缩为 token 高效的文本格式
- 确保关键信息（行运强度、日期、相位）不丢失
- **校验**：对比原始数据和序列化结果，确认信息完整性
- **依赖**：Task 1.1

## Phase 2: Prompt 模板（可与 Phase 1 并行） ✅

### Task 2.1: 创建月度报告 Prompt 目录结构 ✅
- 创建 `backend/src/prompts/templates/monthly/` 目录
- 创建以下文件：
  - `index.ts`（导出 + 注册到 Prompt 注册表）
  - `system.ts`（系统提示词）
  - `tone.ts`（模块A）
  - `dimensions.ts`（模块B）
  - `rhythm.ts`（模块C）
  - `lunar.ts`（模块D）
  - `dates.ts`（模块E）
  - `actions.ts`（模块F）
- 所有模板实现 `PromptTemplate` 接口
- **校验**：`buildPrompt('monthly-tone', testContext)` 能正确返回 system + user
- **依赖**：无
- **可并行**：可与 Phase 1 并行

### Task 2.2: 实现系统提示词 ✅
- 在 `system.ts` 中实现全局系统提示词
- 内容包含：角色定义、核心原则、禁止事项、语言风格
- 复用 `cultural/persona.ts` 和 `cultural/tone.ts` 中的通用组件
- 针对中国大陆用户优化语言风格
- **校验**：系统提示词不超过 800 tokens
- **依赖**：Task 2.1

### Task 2.3: 实现 6 个模块的 User Prompt ✅
- 按 design.md 中的详细设计实现每个模块的 user prompt
- 每个 prompt 的上下文变量：
  - `transit_data`：序列化后的行运数据包
  - `previous_summaries`：前序模块摘要（如有）
- 确保 Prompt 指令中包含字数控制、格式规范、免责声明要求
- **校验**：每个 prompt 单独测试，确认输出格式和字数符合目标
- **依赖**：Task 2.1, Task 2.2

## Phase 3: 后端服务集成 ✅

### Task 3.1: 创建月度报告任务配置 ✅
- 创建 `backend/src/services/monthly-task.ts`
- 实现 `MONTHLY_REPORT_CONFIG`（参见 design.md D1）
- 实现 `buildMonthlyContext()`：调用行运计算 → 序列化 → 返回 Prompt 上下文
- 实现 `injectMonthlySummaries()`：批次间摘要提取与注入
- 实现质量校验配置 `MONTHLY_QUALITY_CHECKS`
- **校验**：配置能通过 `ReportConfig` 类型检查
- **依赖**：Task 1.1, Task 1.2, Task 2.3

### Task 3.2: 注册月度报告到 API ✅
- 在 `backend/src/api/report.ts` 的 `REPORT_CONFIGS` 中注册 `'monthly': MONTHLY_REPORT_CONFIG`
- 验证所有通用端点对 `monthly` 类型正常工作：
  - `POST /api/report/create { reportType: 'monthly', birth: {...}, year: 2026, month: 7 }`
  - `GET /api/report/status?reportType=monthly`
  - `GET /api/report/content?reportType=monthly`
  - `POST /api/report/retry { reportType: 'monthly' }`
- 注意缓存 key 需包含 `yearMonth` 参数
- **校验**：用 curl 或 Postman 验证所有端点正常响应
- **依赖**：Task 3.1

### Task 3.3: 扩展缓存 Key 支持年月参数 ✅
- ~~在 `report-task.ts` 中扩展缓存 key 生成逻辑~~
- **实际实现**：通过 `enrichedBirthData` 将 `_year` 和 `_month` 注入 birthData，通用 `hashInput` 自动纳入 hash 计算，不同月份自然生成不同缓存 key
- 月度报告的 key 格式：`report_task:monthly:{userId}:{yearMonth}:{chartHash}`
- 确保现有报告类型（annual, natal-report）的缓存不受影响
- **校验**：同一用户不同月的请求生成不同缓存 key
- **依赖**：Task 3.1

## Phase 4: 前端页面 ✅

### Task 4.1: 日运页面新增月度报告入口 ✅
- 在 `miniprogram/pages/daily/daily.wxml` 的本周趋势区域之后新增入口卡片
- 卡片显示当月月份 + 描述文案
- 点击跳转到 `/pages/report/report?reportType=monthly&year=YYYY&month=MM`
- 在 `daily.js` 中新增 `onMonthlyReport()` 处理函数
- 样式与页面整体 ink-border 风格一致
- **校验**：卡片正确显示、点击跳转正常
- **依赖**：无（可与 Phase 1-3 并行）

### Task 4.2: 报告页面支持月度类型 ✅
- 在 `miniprogram/pages/report/report.js` 的 `REPORT_TYPE_CONFIG` 中新增 `'monthly'` 配置
- 标题动态显示月份："X月运势深度解读"
- 副标题："专属于你的月度能量日历"
- 报告创建请求中传入 `year` 和 `month` 参数
- **校验**：报告页面正确展示 6 个模块、渐进式渲染正常
- **依赖**：Task 3.2

### Task 4.3: API 服务层新增月度报告方法 ✅
- ~~在 `miniprogram/services/api.js` 中新增月度报告相关 API 调用方法~~
- **实际实现**：复用现有通用报告 API 端点（`REPORT_CREATE/STATUS/CONTENT`），直接在 daily.js 的 `onOpenMonthlyReport()` 中调用，无需新增独立 API 方法
- 复用现有 report API 封装，传入 `reportType: 'monthly'` 和年月参数
- **校验**：前端调用后端接口正常
- **依赖**：Task 3.2

## Phase 5: 测试与优化

### Task 5.1: 端到端测试
- 使用测试用户数据（含不同星盘配置），生成 3-5 份月度报告
- 验证：
  - [ ] 6 个模块全部生成成功
  - [ ] 总字数在 2800-3900 字范围
  - [ ] 质量校验通过
  - [ ] 不同用户报告内容差异度足够
  - [ ] 日期准确性（AI 生成日期与行运数据一致）
  - [ ] 禁止词未出现
  - [ ] 免责声明正确附加
- **依赖**：Task 3.2, Task 4.2

### Task 5.2: 性能优化
- 验证首模块 30s 内返回
- 验证全部 6 模块 2 分钟内完成
- 如超时，调整 maxTokens 或批次策略
- **依赖**：Task 5.1

### Task 5.3: Prompt 调优
- 基于端到端测试结果，调优各模块 Prompt
- 重点关注：
  - 模块间内容不重复（特别是 B 和 C 的关注角度区分）
  - actions 模块确实是前序模块的精华浓缩
  - 关键日期表的日期与正文一致
- **依赖**：Task 5.1

## 依赖关系总览

```
Phase 1 (行运计算) ──┐
                     ├──→ Phase 3 (后端集成) → Phase 5 (测试)
Phase 2 (Prompt)  ───┘                  ↑
                                         │
Phase 4 (前端) ──────────────────────────┘
```

Phase 1 和 Phase 2 可并行。Phase 4 可与 Phase 1-3 并行（前端不依赖后端完成）。Phase 5 依赖 Phase 3 和 Phase 4。
