# 设计文档：Ask 全屏报告模式

## 架构决策

### AD-1：报告展示采用全屏覆盖层（而非新页面）

**决策**：使用与 synastry 模块相同的 `showReportOverlay` 模式，在当前页面内覆盖全屏报告，而非 `navigateTo` 新页面。

**理由**：
- 与 synastry 的 `showDeepOverlay` 保持一致，用户体验统一
- 避免页面栈管理复杂度
- 关闭报告后可直接返回问题列表继续提问
- 无需新建页面文件

**权衡**：
- 需处理 Canvas 层级问题（报告展示时通过 `wx:if` 隐藏星盘）
- 页面状态管理略增复杂

### AD-2：推荐问题交互改为"填入输入栏"

**决策**：点击推荐问题后，将问题文本填入底部输入栏的 `inputValue`，不自动发送。用户可编辑后手动发送。

**理由**：
- 用户反馈：当前直接发送导致无法修改问题
- 给用户修改和补充的机会，提高问题的个性化程度
- 降低误触成本

**实现**：
```javascript
onSuggestionClick(e) {
  const text = e.currentTarget.dataset.text;
  this.setData({ inputValue: text });
  // 不调用 sendMessage()，等待用户确认
}
```

### AD-3：Prompt 输出从纯文本改为结构化 JSON

**决策**：ask-answer Prompt 的输出从 Markdown 纯文本改为结构化 JSON，便于前端卡片化渲染。

**理由**：
- 全屏报告需要分区展示（星象解读、深度分析、行动建议）
- JSON 结构便于前端逐卡片渲染，与 synastry 模块的 `currentSectionCards` 模式一致
- 星象依据（astroBasis）需要独立字段，便于样式化展示

**影响**：
- 需从 `RAW_TEXT_PROMPTS` Set 中移除 `'ask-answer'`
- ai.ts 的 JSON 修复逻辑将自动生效
- 缓存 key 不变，但旧缓存将失效（版本号升级自动处理）

### AD-4：星盘图展示策略

**决策**：报告顶部展示本命盘（使用行运盘双环模式），内环为本命行星，外环为当前行运行星。

**理由**：
- 行运盘能同时展示用户本命配置和当前运势影响
- 与问题类型相关的行星在星盘中可视化，增强可信度
- 复用现有 `astro-chart` 组件的 `synastry` 类型（内外双环）

**实现**：
- 前端已有本命盘数据（`birth` 参数计算）
- 后端 API 已返回行运数据（`transit_summary`）
- 需要后端额外返回行运行星的 positions 数据用于星盘渲染

### AD-5：报告内容的分层递进结构

**决策**：Prompt 指导 AI 按以下四层递进结构输出：

| 层级 | 名称 | 内容 | 字数 |
|------|------|------|------|
| 1 | 星象解读 | 与问题最相关的核心星象配置 | 100-150字 |
| 2 | 深度分析 | 2-3个维度逐层展开 | 300-500字 |
| 3 | 行动建议 | 3-5条具体可执行的建议 | 100-150字 |
| 4 | 温暖寄语 | 鼓励性收束语 | 30-50字 |

**理由**：
- 从客观（星象）→ 分析 → 实践 → 情感，逻辑自然递进
- 符合中国用户阅读习惯：先看结论再看分析
- 每层字数有限，保持手机端阅读体验

## 数据流设计

### 请求流程

```
用户填写/编辑问题 → 点击发送
  ↓
setData({ showReport: true, reportLoading: true })
  → 显示全屏 loading 遮罩
  ↓
POST /api/ask (请求体不变)
  ↓
后端 Prompt 模板生成结构化 JSON
  ↓
前端解析 JSON → setData({ reportData, reportLoading: false })
  → 渲染星盘图 + 分层卡片
```

### 响应数据结构

后端返回：
```json
{
  "content": {  // 不再是字符串，而是结构化对象
    "astroContext": { ... },
    "sections": [ ... ]
  },
  "chartData": {  // 新增：用于星盘渲染
    "natal": { "positions": [], "aspects": [], "houseCusps": [] },
    "transit": { "positions": [] }
  }
}
```

注意：`chartData` 可能已在现有 API 中返回（需确认 detail.ts 的响应结构）。如果未返回，需在后端增加星历计算并附加到响应中。

## 样式复用

复用 synastry 模块的以下样式模式：

| 样式类 | 来源 | 用途 |
|--------|------|------|
| `.deep-overlay` | synastry.wxss | 全屏覆盖层容器 |
| `.deep-overlay-header` | synastry.wxss | 顶部导航（返回按钮 + 标题） |
| `.detail-card` | synastry.wxss | 内容卡片 |
| `.loading-overlay` | synastry.wxss | 全屏 loading |
| `.card.ink-border` | 公共样式 | 卡片边框 |

可直接复制或提取为公共组件。当前阶段建议直接复制样式到 ask.wxss，避免引入不必要的组件抽象。
