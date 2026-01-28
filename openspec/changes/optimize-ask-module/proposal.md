# Change: 优化星象问答模块

## Why

当前"发现-星象问答"模块存在两个核心问题：
1. **UI 布局问题**：底部输入栏和发送按钮在滑动时会跟随滚动，而非固定在底部；预留问题列表显示在底部而非中间区域
2. **内容不完整**：需要更新为 5 大目标类型和每个目标下的 10 个专业问题，并集成现代心理占星学 AI 咨询师的 prompt 逻辑

## What Changes

### 前端（小程序）
- **MODIFIED** 修复 `ask.wxss` 布局，确保输入栏固定在底部
- **MODIFIED** 调整 `ask.wxml` 结构，使问题列表在中间可滚动区域显示
- **MODIFIED** 更新 `ask.js` 中的目标类型和问题数据为新的 5 大类型 × 10 个问题

### 后端
- **MODIFIED** 更新 `backend/src/prompts/manager.ts` 中的 ask-answer prompt，集成现代心理占星学咨询师的完整分析流程

## Impact

- Affected specs: `ask-guidance`（新建）
- Affected code:
  - `miniprogram/pages/ask/ask.wxss`
  - `miniprogram/pages/ask/ask.wxml`
  - `miniprogram/pages/ask/ask.js`
  - `backend/src/prompts/manager.ts`
