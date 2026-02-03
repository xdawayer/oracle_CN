# Change: 优化首页每日运势卡片内容与分享体验

## Why

当前首页运势卡片的内容由前端本地 MOON_THEME + ASPECT_HINT 字典生成，文案较为模板化，缺乏吸引力和传播性。分享功能仅显示简单弹窗，不支持真正的分享/复制操作。需要：
1. 引入 AI 生成的「金句 + 正文」，替代本地字典的固定文案，提升内容吸引力
2. 重构分享弹窗为全屏精美卡片，支持复制文案与分享到微信

## What Changes

### 1. 新增 Prompt 模板：`daily-home-card`
- 在 `backend/src/prompts/templates/daily/` 新增 `home-card.ts`
- 根据运势评分、评价语、星象信息生成：
  - **金句**（12-18字）：简短有力，适合朋友圈分享
  - **正文**（40-60字）：口语化描述今日整体能量
- 语言风格：年轻化、网络用语、适度 emoji

### 2. 优化首页运势卡片布局
- 卡片顶部显示大数字评分 + 金句（替代原"运势评分"标签+数字+summary 布局）
- 中间分隔线后显示正文描述（40-60字，替代原短描述）
- 底部保留幸运元素行（幸运色、幸运数、吉位）
- 底部新增「分享」和「详情→」两个操作按钮
- 右上角分享按钮保持不变

### 3. 重构分享弹窗为全屏分享卡片
- 全屏半透明遮罩 + 居中卡片
- 卡片内容：用户星座 → 日期 → 运势评分 → 金句 → 小程序码区域
- 支持「复制文案」按钮（复制金句+评分到剪贴板）
- 支持「分享给好友」按钮（通过微信分享 API）
- 关闭按钮在卡片底部

### 4. 后端 API 扩展
- `/api/daily/transit` 响应中新增 `homeCard` 字段
- 包含 AI 生成的 `quote`（金句）和 `body`（正文）
- 降级策略：AI 不可用时回退到本地字典文案

## Impact

- **Affected specs**: `home-daily-card`（新增）
- **Affected code**:
  - `backend/src/prompts/templates/daily/home-card.ts`（新增）
  - `backend/src/prompts/templates/daily/index.ts`（注册新模板）
  - `backend/src/api/daily.ts`（扩展 transit 端点）
  - `miniprogram/pages/home/home.wxml`（卡片布局 + 分享弹窗）
  - `miniprogram/pages/home/home.wxss`（样式更新）
  - `miniprogram/pages/home/home.js`（数据处理 + 分享逻辑）
- **Breaking changes**: 无，`/api/daily/transit` 新增可选字段，向后兼容
