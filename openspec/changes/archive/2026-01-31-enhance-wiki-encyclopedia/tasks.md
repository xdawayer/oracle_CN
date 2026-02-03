## 1. 前端详情页重构

- [x] 1.1 将 `wiki.json` 的 `navigationBarTitleText` 改为 `"星象百科"`
- [x] 1.2 在 `wiki.wxml` 中将底部弹窗（modal）改为全屏覆盖层（overlay），参考 self 页面的 `daily-report-overlay` 布局
- [x] 1.3 实现详情页内容分段卡片：将 WikiItem 的 12 个字段映射为 detail-card 组件（参见 design.md 分段映射表）
- [x] 1.4 在 `wiki.wxss` 中新增 detail-card 样式（复用 self 页面的 `detail-card--success/warning/info/accent-red` 色彩系统）
- [x] 1.5 实现覆盖层的返回按钮（固定定位），点击关闭覆盖层
- [x] 1.6 验证：点击任意百科条目 → 全屏覆盖层打开 → 分段卡片按条件渲染（空字段不显示）→ 点击返回关闭

## 2. 搜索功能增强

- [x] 2.1 修改 `wiki.js` 的 `filterItems()` 方法，搜索范围扩展至 title、subtitle、description、keywords、prototype、analogy 六个字段
- [x] 2.2 实现空格分词多关键词搜索（所有关键词必须同时匹配）
- [x] 2.3 修改 `WikiItemSummary` 类型和 `buildSummary` 函数，确保 API 返回的 keywords、prototype、analogy 字段被保留到前端
- [x] 2.4 验证：搜索"时间 责任" → 匹配土星条目；搜索"严师" → 通过 prototype 匹配土星

## 3. 后端数据完善

- [x] 3.1 审查 `backend/src/data/wiki.ts` 中所有条目，确认 `wiki-generated.ts`（1.4MB）已为大部分条目提供完整深度内容覆盖
- [x] 3.2 确认数据合并逻辑（`mergeGeneratedContent`）正确将 generated 数据覆盖到静态数据上
- [x] 3.3 确保 API 响应（`/api/wiki/items/:id`）返回完整的 WikiItem 字段给前端
- [x] 3.4 在 `WikiItemSummary` 类型中增加 `prototype` 和 `analogy` 字段，并更新 `buildSummary` 函数

## 4. UI/UX 细节打磨

- [x] 4.1 详情页头部区域：显示分类标签 + 标题（font-ancient）+ 副标题 + 符号 + 关键词标签
- [x] 4.2 卡片间距与排版：使用 `var(--spacing-lg)` / `var(--spacing-md)` 间距，卡片使用 `ink-border` 边框
- [x] 4.3 list 类型卡片（practical_tips、common_misconceptions）：使用编号列表样式，与 self 页面的 `detail-card__list` 一致
- [x] 4.4 deep_dive 步骤卡片：使用步骤序号 + 标题 + 描述的三层结构
- [x] 4.5 life_areas 卡片：按领域（career/love/spiritual 等）分条展示
- [x] 4.6 列表卡片的描述文字截断为 2 行，提升列表浏览体验
