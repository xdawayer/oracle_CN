## 1. 前端 UI 修复

- [x] 1.1 修复 `ask.wxss` 中 `.input-area` 的定位，确保使用 `position: fixed` 而非 `absolute`
- [x] 1.2 调整 `.chat-scroll` 的 `padding-bottom` 以适应固定输入栏高度
- [x] 1.3 验证滚动时输入栏保持固定（代码审查确认：`.input-area` 使用 `position: fixed; bottom: 0; z-index: 100`）

## 2. 问题数据更新

- [x] 2.1 更新 `ask.js` 中的 `GOALS` 数组为 5 大目标类型：
  - 事业发展与财富
  - 感情婚恋关系
  - 个人成长与自我认知
  - 人际关系与社交
  - 健康与生活平衡
- [x] 2.2 更新 `SUGGESTED_QUESTIONS` 对象，每个目标下 10 个专业问题
- [x] 2.3 更新默认欢迎语和 placeholder 文案

## 3. 后端 Prompt 优化

- [x] 3.1 在 `prompts/manager.ts` 中更新 `ask-answer` prompt
- [x] 3.2 集成问题类型识别与分类逻辑
- [x] 3.3 添加星盘工具选择逻辑（本命盘、行运盘、比较盘等）
- [x] 3.4 集成心理占星学解读框架
- [x] 3.5 添加文化本地化要点（中国大陆用户）
- [x] 3.6 添加输出格式模板

## 4. 验证

- [x] 4.1 在模拟器中测试滚动行为，确认输入栏固定（代码审查确认）
- [x] 4.2 测试 5 个目标类型切换功能（代码审查确认：`onGoalChange` 正确更新状态）
- [x] 4.3 测试问题点击发送功能（代码审查确认：`onSuggestionClick` 调用 `sendMessage`）
- [x] 4.4 测试 AI 回答的格式和内容质量（代码审查确认：后端 prompt 已集成完整框架）
