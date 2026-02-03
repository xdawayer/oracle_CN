# 任务清单

## Task 1: 修改推荐问题交互——填入输入栏而非直接发送

**文件**: `miniprogram/pages/ask/ask.js`

**变更**:
- 修改 `onSuggestionClick()` 方法：将问题文本设置到 `inputValue`，不调用 `sendMessage()`
- 推荐问题点击后，输入栏获得焦点（`focus: true`）

**验证**:
- [x] 点击推荐问题后，文本出现在输入栏
- [x] 用户可以编辑输入栏中的文本
- [x] 用户手动点击发送按钮后才发起请求

**依赖**: 无
**可并行**: 可与 Task 4 并行

---

## Task 2: 重构 ask.wxml——从聊天界面改为问题输入 + 全屏报告

**文件**: `miniprogram/pages/ask/ask.wxml`

**变更**:
1. **保留**：顶部 header（标题 + 目标选择器）、底部输入栏、推荐问题列表
2. **移除**：聊天消息列表（`.message-row`、`.bubble-*` 等）
3. **新增**：全屏报告覆盖层（参考 synastry 的 `deep-overlay`）：
   - 顶部导航：返回按钮 + "星象问答报告"标题
   - 星盘区域：`<astro-chart>` 组件，使用 `wx:if="{{!showReport}}"` 隐藏/显示
   - 问题回顾卡片
   - 星象解读卡片（`sections[type=astro_insight]`）
   - 深度分析卡片组（`sections[type=deep_analysis]`）
   - 行动建议卡片（`sections[type=action_plan]`）
   - 温暖寄语卡片（`sections[type=closing]`）
4. **新增**：全屏 loading 遮罩（参考 synastry 的 `loading-overlay`）

**Canvas 层级处理**:
- 报告覆盖层显示时，底部输入栏隐藏（`wx:if="{{!showReport}}"`)
- 如果页面有 Canvas 元素（star chart），使用 `wx:if` 控制显隐

**验证**:
- [x] 问题输入界面正常显示（header + 推荐问题 + 输入栏）
- [x] 发送问题后显示全屏 loading
- [x] loading 结束后显示全屏报告
- [x] 报告中星盘图正确渲染
- [x] 报告中各层级卡片正确显示
- [x] 点击返回按钮关闭报告，回到问题输入界面
- [x] 关闭报告后可继续提问

**依赖**: Task 1, Task 3
**可并行**: 可与 Task 4 并行

---

## Task 3: 重构 ask.js——报告状态管理 + API 响应解析

**文件**: `miniprogram/pages/ask/ask.js`

**变更**:
1. **新增 data 字段**:
   ```javascript
   showReport: false,          // 是否显示全屏报告
   reportLoading: false,       // 报告加载中
   reportData: null,           // 报告结构化数据 { astroContext, sections }
   reportChartData: null,      // 报告星盘数据 { natal, transit }
   reportQuestion: '',         // 当前报告的问题文本
   reportCategory: '',         // 当前报告的目标类型
   ```
2. **修改 sendMessage()**:
   - 发送前：`setData({ showReport: true, reportLoading: true })`
   - 成功后：解析 JSON 响应，`setData({ reportData, reportChartData, reportLoading: false })`
   - 失败后：`setData({ showReport: false, reportLoading: false })` + 提示
3. **新增 closeReport()**:
   - `setData({ showReport: false, reportData: null })`
4. **移除**：消息列表相关逻辑（`messages` 数组、`scrollToBottom` 等）

**验证**:
- [x] 发送消息后进入 loading 状态
- [x] API 返回后正确解析结构化数据
- [x] 错误情况下正确回退到输入界面并提示
- [x] 关闭报告后状态正确重置

**依赖**: Task 1
**可并行**: 可与 Task 4 并行

---

## Task 4: 重构 ask-answer Prompt——输出结构化 JSON

**文件**: `backend/src/prompts/templates/ask/answer.ts`

**变更**:
1. **修改 meta.version**: 从 `'9.0'` 升级到 `'10.0'`（使旧缓存自动失效）
2. **修改 system prompt**:
   - 输出格式从纯文本 Markdown 改为结构化 JSON
   - 添加四层递进结构的详细指导
   - 添加星象依据（astroBasis）字段要求
   - 针对中国大陆用户的文化适配指导（使用中国传统比喻、节气节令、生肖关联等）
   - 分层递进说明：先星象客观事实 → 深度心理分析 → 实践建议 → 情感收束
3. **JSON 输出模板**:
   ```
   {
     "astroContext": {
       "keyPlanets": ["关键行星落座落宫"],
       "keyAspects": ["关键相位"],
       "currentTransits": ["当前重要行运"]
     },
     "sections": [
       { "type": "astro_insight", "title": "星象解读", "cards": [...] },
       { "type": "deep_analysis", "title": "深度分析", "cards": [...] },
       { "type": "action_plan", "title": "行动建议", "tips": [...] },
       { "type": "closing", "content": "..." }
     ]
   }
   ```

**后端配置变更**:
- [x] 从 `RAW_TEXT_PROMPTS` Set 中移除 `'ask-answer'`（使其走 JSON 解析流程）

**验证**:
- [x] Prompt 输出为合法 JSON
- [x] 各 section 内容符合字数要求
- [x] 星象依据字段完整
- [x] 中国文化元素自然融入
- [x] 五种 category 都能正确映射到对应星象内容

**依赖**: 无
**可并行**: 可与 Task 1-3 并行

---

## Task 5: 更新 ask.wxss——报告页样式

**文件**: `miniprogram/pages/ask/ask.wxss`

**变更**:
1. **移除**：聊天气泡相关样式（`.message-row`、`.bubble-*`、`.avatar` 等）
2. **新增**：全屏报告样式（参考 synastry.wxss 的 `deep-overlay` 系列）
   - `.report-overlay`：全屏覆盖容器
   - `.report-header`：顶部导航栏
   - `.report-scroll`：可滚动内容区域
   - `.report-chart-card`：星盘展示区域
   - `.report-question-card`：问题回顾区域
   - `.report-card`：各层级内容卡片
   - `.tips-list`：行动建议列表
   - `.report-closing`：温暖寄语区域
3. **新增**：全屏 loading 样式（参考 synastry.wxss 的 `loading-overlay`）

**验证**:
- [x] 报告页面在不同屏幕尺寸下正常显示
- [x] 卡片间距和排版与 synastry 报告风格一致
- [x] loading 动画流畅
- [x] 返回按钮区域可点击

**依赖**: Task 2
**可并行**: 可与 Task 4 并行

---

## Task 6: 后端 API 补充星盘渲染数据

**文件**: `backend/src/api/ask.ts`

**变更**:
- 移除仅 `time_cycles` 类型计算行运的限制，所有 category 都计算行运
- API 响应已包含 `chart` 和 `transits` 字段（NatalChart 和 TransitData），前端直接使用

**验证**:
- [x] API 响应包含 `chart` 和 `transits`
- [x] 数据格式与 `astro-chart` 组件兼容
- [x] 行运行星 positions 数据正确

**依赖**: 无
**可并行**: 可与 Task 1-5 并行

---

## Task 7: 集成测试与调优

**验证清单**:
- [x] 完整流程：选择目标 → 点击推荐问题 → 编辑 → 发送 → loading → 报告展示 → 返回
- [x] 五种 category 各测一次，确认星盘和内容正确
- [x] 手动输入问题（不使用推荐）能正常工作
- [x] 从 pairing 页面跳转后的配对上下文正确注入
- [x] 网络错误情况下的降级处理
- [x] Canvas 层级问题：报告显示时无 Canvas 穿透（使用 wx:if 控制）

**依赖**: Task 1-6 全部完成

---

## 执行顺序

```
并行组 A（前端）:        并行组 B（后端）:
  Task 1 (交互修改) ✅     Task 4 (Prompt 重构) ✅
       ↓                   Task 6 (API 数据补充) ✅
  Task 3 (状态管理) ✅
       ↓
  Task 2 (WXML 重构) ✅
       ↓
  Task 5 (样式) ✅
       ↓
       └───────────────→ Task 7 (集成测试) ✅
```
