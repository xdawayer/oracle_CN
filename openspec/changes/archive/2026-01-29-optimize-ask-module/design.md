## Context

星象问答模块是 AstroMind 小程序的核心功能之一，允许用户基于星盘数据向 AI 咨询师提问。当前实现存在 UI 布局问题和内容不完整的问题。

### 约束
- 微信小程序环境
- 需要兼容 iOS 和 Android
- 需要处理 safe-area-inset-bottom

### 相关方
- 前端：微信小程序
- 后端：Express API + AI 服务

## Goals / Non-Goals

### Goals
- 修复输入栏固定定位问题
- 更新为 5 大目标类型 × 10 个问题的完整内容
- 集成现代心理占星学 AI 咨询师的专业 prompt

### Non-Goals
- 不改变现有 API 接口结构
- 不添加新的付费功能
- 不修改星盘计算逻辑

## Decisions

### Decision 1: 使用 `position: fixed` 替代 `position: absolute`

**原因**：`position: absolute` 相对于最近的定位祖先元素定位，在 scroll-view 内部会随滚动移动。`position: fixed` 相对于视口定位，可确保输入栏始终固定在屏幕底部。

**备选方案**：
- 使用 `position: sticky`：在微信小程序中支持有限，且需要特定的父容器结构
- 将输入栏移出 scroll-view：需要重构页面结构

### Decision 2: 问题类型与星盘工具映射

根据用户提供的 prompt 逻辑，不同问题类型需要使用不同的星盘工具组合：

| 问题类型 | 主要星盘 | 辅助星盘 |
|---------|---------|---------|
| 事业发展/财富 | 本命盘 | 太阳返照盘、行运盘 |
| 感情婚恋 | 本命盘、比较盘 | 行运盘、推运盘 |
| 个人成长 | 本命盘 | 推运盘 |
| 人际关系 | 本命盘 | 比较盘 |
| 健康生活 | 本命盘 | 太阳返照盘、行运盘 |

当前 API 已支持 natal 和 transit 类型，暂不扩展其他类型。

### Decision 3: Prompt 结构

采用用户提供的现代心理占星学 AI 咨询师 prompt 框架，包含：
- 角色定位
- 核心原则（赋能而非宿命、心理整合、温暖专业等）
- 分析流程（问题识别、信息收集、星盘解读）
- 输出格式模板
- 文化本地化要点

## Risks / Trade-offs

### Risk 1: Prompt 长度
完整的心理占星学 prompt 较长，可能影响 API 响应速度和 token 消耗。

**缓解**：将 prompt 模块化，根据问题类型动态组装相关部分。

### Risk 2: 输入栏遮挡内容
固定定位的输入栏可能遮挡底部内容。

**缓解**：在 scroll-view 底部添加足够的 padding 或 spacer。

## Open Questions

- 是否需要支持比较盘（需要对方出生信息）？当前暂不实现。
- 是否需要支持太阳返照盘？当前暂不实现。
