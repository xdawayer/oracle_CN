# Change: 新增 2026 流年运势报告功能

## Why

当前"本我"页面底部已有"2026 流年大运报告"的付费入口（`self.wxml:335-341`），但后端缺少对应的 Prompt 模板和 API 支持。用户点击后仅弹出支付弹窗，无法实际生成报告内容。

流年运势报告是占星应用的核心付费功能之一，可为用户提供个性化的年度运势指引，包含事业、感情、健康等多维度分析，以及季度详解和开运建议。

## What Changes

### 新增功能
- 新增 `annual-report` API 端点，支持流式响应
- 新增 8 个流年运势 Prompt 模板（模块化生成策略）：
  - `annual-overview`：年度总览（800-1000 字）
  - `annual-career`：事业财运（1200-1500 字）
  - `annual-love`：感情关系（1200-1500 字）
  - `annual-health`：健康能量（800-1000 字）
  - `annual-social`：人际社交（800-1000 字）
  - `annual-growth`：学习成长（800-1000 字）
  - `annual-quarter`：季度详解（每季 500-600 字，共 4 个）
  - `annual-lucky`：开运指南（600-800 字）
- 新增前端流年报告展示页面，支持渐进式呈现
- 新增报告缓存机制，已生成报告可重复查看

### 后端架构
- 采用并行生成策略：同时启动 8 个模块的 AI 请求
- 支持流式响应：模块完成即返回，用户边看边加载
- 缓存策略：`annual:{userId}:{year}:{moduleId}:{chartHash}`

### 前端交互
- 购买后进入报告生成页，显示进度条和加载动画
- 各模块按顺序展示，完成一个显示一个
- 全部完成后支持分享和重复查看

## Impact

### 受影响的代码
- `backend/src/api/` - 新增 `annual-report.ts` 路由
- `backend/src/prompts/` - 新增 `templates/annual/` 目录及 8 个 Prompt 模板
- `miniprogram/pages/self/` - 更新支付逻辑，跳转至报告页
- `miniprogram/pages/` - 新增 `annual-report/` 页面

### 受影响的规范
- annual-report（新建）

### 兼容性
- 现有 API 不受影响
- 不涉及数据库 schema 变更（使用现有缓存机制）

### 风险
- 低风险：新增功能，不影响现有模块
- 需确保并行 AI 请求不超过 API 限流
