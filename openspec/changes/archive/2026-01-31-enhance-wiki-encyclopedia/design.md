## Context

星象百科是 AstroMind 的知识库模块，为用户提供占星学基础知识。当前实现中，后端数据已经相当丰富（WikiItem 接口定义了 psychology、shadow、integration、life_areas、deep_dive 等十余个字段），但前端仅展示了 description 和 psychology 两个字段。需要设计一套与"本我"页面 deep 解读一致的展示方案。

## Goals / Non-Goals

### Goals
- 充分展示已有的丰富百科数据，让用户获得深度阅读体验
- 参考 self 页面的 detail-card 分段卡片 UI 模式，保持产品视觉一致性
- 增强搜索能力，支持多字段、多关键词模糊匹配
- 所有内容为纯静态数据，无 AI 调用成本

### Non-Goals
- 不引入 AI 实时生成百科内容
- 不新增百科分类（保持现有 8 大分类 + concepts 等辅助类别）
- 不做后端搜索引擎（如 Elasticsearch）
- 不增加付费解锁功能

## Decisions

### 1. 详情页展示方案：全屏覆盖层（Overlay）

**决策**：采用与 self 页面相同的 `daily-report-overlay` 全屏覆盖层模式，而非当前的底部弹窗（modal）。

**理由**：
- 底部弹窗空间有限，无法容纳 7-10 个内容分段
- 全屏覆盖层提供更好的阅读体验，可自由滚动
- 与 self 页面保持一致的交互模式，降低用户学习成本
- 复用 self 页面已验证的 detail-card 组件样式

**实现方式**：
```wxml
<!-- 详情覆盖层 -->
<view class="wiki-detail-overlay" wx:if="{{selectedItem}}">
  <scroll-view scroll-y class="wiki-detail-scroll">
    <!-- 头部信息 -->
    <view class="wiki-detail-header">
      <view class="cat-tag {{selectedItem.type}}">{{selectedItem.categoryName}}</view>
      <text class="wiki-detail-title font-ancient">{{selectedItem.title}}</text>
      <text class="wiki-detail-subtitle">{{selectedItem.subtitle}}</text>
    </view>

    <!-- 核心要义卡片 -->
    <view class="detail-card detail-card--accent-red">
      <view class="detail-card__accent"></view>
      <view class="detail-card__body">
        <text class="detail-card__title">核心要义</text>
        <text class="detail-card__text">{{selectedItem.description}}</text>
      </view>
    </view>

    <!-- 分段卡片：按内容维度展开 -->
    ...
  </scroll-view>
</view>
```

### 2. 内容分段映射方案

将 WikiItem 的字段映射为展示卡片：

| 字段 | 卡片标题 | cardColor | 显示条件 |
|------|----------|-----------|----------|
| `description` | 核心要义 | accent-red | 始终显示 |
| `astronomy_myth` | 天文与神话 | info | 有内容时显示 |
| `psychology` | 心理学解读 | info | 有内容时显示 |
| `shadow` | 阴影面 | warning | 有内容时显示 |
| `integration` | 整合之道 | success | 有内容时显示 |
| `life_areas` | 生活领域 | default | 有内容时显示 |
| `practical_tips` | 实用建议 | success | 有内容时，list 形式 |
| `common_misconceptions` | 常见误区 | warning | 有内容时，list 形式 |
| `growth_path` | 成长路径 | success | 有内容时显示 |
| `deep_dive` | 深度探索 | info | 有内容时，步骤列表 |
| `affirmation` | 肯定语 | accent-red | 有内容时显示 |
| `combinations` | 组合解读 | default | 有内容时显示 |

### 3. 搜索增强方案

**决策**：纯前端搜索，扩展匹配字段 + 空格分词。

**实现逻辑**：
```javascript
filterItems() {
  const { items, selectedCat, searchQuery } = this.data;
  const query = searchQuery.trim().toLowerCase();

  // 空格分词，所有关键词都需匹配
  const tokens = query.split(/\s+/).filter(Boolean);

  const filtered = items.filter(item => {
    const matchCat = selectedCat === 'all' || item.type === selectedCat;
    if (!matchCat) return false;
    if (!tokens.length) return true;

    // 构建搜索文本池
    const searchPool = [
      item.title,
      item.subtitle,
      item.description,
      item.prototype,
      item.analogy,
      ...(item.keywords || [])
    ].filter(Boolean).join(' ').toLowerCase();

    // 所有关键词都必须在搜索池中匹配
    return tokens.every(token => searchPool.includes(token));
  });

  this.setData({ filteredItems: filtered });
}
```

### 4. 导航与页面配置

**决策**：使用微信原生导航栏，导航栏标题改为中文"星象百科"。

```json
// wiki.json
{
  "navigationBarTitleText": "星象百科"
}
```

遵循 CLAUDE.md 中"禁止自定义重复导航栏"规范，不在页面内添加带返回按钮的自定义导航。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 部分条目的深度字段为空，详情页卡片数量不一 | 所有卡片添加 `wx:if` 条件渲染，空字段不显示 |
| 前端搜索在条目数量增多时性能下降 | 当前条目总数 <200，前端过滤性能足够；未来超过 500 条时考虑后端搜索 |
| 全屏覆盖层可能遮挡原生导航栏 | 使用固定定位的自定义返回按钮，设置 z-index 确保可操作 |

## Open Questions

- 无
