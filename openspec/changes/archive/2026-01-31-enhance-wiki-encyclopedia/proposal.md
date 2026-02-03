# Change: 深化星象百科内容与界面体验

## Why

当前星象百科（Wiki）模块虽已覆盖行星、星座、宫位、相位等 8 大分类，但详情页仅展示"核心要义"和"深度解析"两个简单文本段落，内容深度不足、排版单一。用户点击条目后看到的信息量有限，无法获得类似"本我"页面 deep 解读那样结构化、多维度、有层次感的阅读体验。同时搜索功能仅匹配标题和描述，缺少对关键词、原型、类比等字段的模糊搜索支持。

## What Changes

### 前端
- **详情页重构**：将弹窗式详情改为全屏滚动详情页，参考 self 页面的 detail-card 卡片系统，使用色彩编码（success/warning/info/accent-red）的分段卡片展示多维度内容
- **内容分段展示**：将已有的丰富字段（astronomy_myth、psychology、shadow、integration、life_areas、growth_path、practical_tips、common_misconceptions、affirmation、deep_dive）以结构化卡片形式呈现
- **搜索增强**：扩展前端模糊搜索范围至 title、subtitle、description、keywords、prototype、analogy 六个字段，并支持空格分词多关键词匹配
- **UI 水墨风格统一**：使用 COLOR_SYSTEM_GUIDE 中的 ink/paper 色系，font-ancient 标题字体

### 后端
- **补充缺失内容**：为现有 8 大分类中内容字段不完整的条目补充 psychology、shadow、integration、life_areas、practical_tips、common_misconceptions、affirmation 等字段
- **统一数据结构**：确保所有条目遵循完整的 WikiItem 接口，无缺失字段

### Prompt 系统
- **不涉及 AI 实时生成**：百科内容全部为预定义静态数据，不新增 AI prompt 模板
- **内容编写指南**：为后续维护者编写内容风格指南，确保所有条目符合"现代心理学导向 + 中国文化融合"的产品定位

## Impact

- Affected specs: `wiki-encyclopedia`（新建）
- Affected code:
  - `miniprogram/pages/wiki/wiki.js` — 搜索逻辑增强、详情展示重构
  - `miniprogram/pages/wiki/wiki.wxml` — 详情页 UI 重构
  - `miniprogram/pages/wiki/wiki.wxss` — 新增 detail-card 样式
  - `miniprogram/pages/wiki/wiki.json` — 导航栏配置
  - `backend/src/data/wiki.ts` — 补充条目内容
  - `backend/src/data/wiki-generated.ts` — 补充生成内容
  - `backend/src/types/api.ts` — 类型定义微调（如有需要）
