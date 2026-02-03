# 架构设计：精炼水墨禅意 UI 设计体系

## 架构决策

### AD-1：CSS 变量分层策略

**决策**：在现有 `app.wxss` 变量基础上新增变量，不删除/重命名现有变量，保持向后兼容。

**权衡**：
- ✅ 渐进式迁移，不会破坏现有页面
- ✅ 新旧变量可并存，逐页替换
- ❌ 短期内变量数量增多
- ❌ 需要维护新旧映射文档

**方案**：
```
阶段1：在 app.wxss 新增变量（ink-wash-*, seal-red, bamboo-*, mountain-*, breath-*）
阶段2：逐页替换旧变量引用（paper-*, spacing-* → 新变量）
阶段3：清理未使用的旧变量（待所有页面迁移完成后）
```

### AD-2：辅助文字字体切换策略

**决策**：辅助/标签文字从宋体切换为系统无衬线字体。

**权衡**：
- ✅ 宋体标题 + 无衬线正文的对比是现代中式设计的标准手法
- ✅ 系统字体在小字号下可读性远优于宋体
- ✅ 无需加载额外字体，性能更好
- ❌ 需要为每个页面调整字体 class

**实现**：
```css
/* 新增全局工具类 */
.font-body {
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* 辅助文字自动使用无衬线 */
.subtitle, .tag, .label, .caption, .input-label {
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
}
```

### AD-3：阴影替代策略

**决策**：用"层次留白 + 背景色差 + 墨晕渐变分隔线"替代 box-shadow。

**理由**：
- 水墨风美学中"阴影"是不自然的概念
- 传统中国绘画用"浓淡远近"表达层次，而非投影
- 去掉阴影后通过 `--ink-wash-*` 层级做视觉区分更符合水墨意境

**渐进策略**：
```
1. 新组件不使用 box-shadow
2. 重构页面时逐步移除 shadow
3. 保留 CSS 变量定义供过渡期使用
```

### AD-4：印章红（Seal Red）设计规范

**决策**：印章红作为品牌强调色，使用需克制。

**使用场景（允许）**：
- TabBar 选中态图标
- 核心 CTA 按钮
- 重要标签/徽章
- 当日标记
- 付费/升级入口

**禁止场景**：
- 普通文字链接
- 表格/列表中的批量标记
- 背景大面积填充
- 装饰性分隔线

**密度规则**：单屏可见区域内印章红元素不超过 3 个。

### AD-5：装饰元素密度控制

**决策**：装饰性中国元素（云纹、山水、水墨晕染）的使用需严格控制密度。

**原则**："三分装饰，七分留白"

| 页面区域 | 装饰数量上限 | 说明 |
|----------|-------------|------|
| 首屏（fold 以上） | 1-2 处 | 如一个水墨底纹 + 一个印章标记 |
| 卡片内 | 0-1 处 | 如一条渐变分隔线 |
| 弹窗/浮层 | 0-1 处 | 如底纹或标题装饰 |
| 空状态页 | 1 处 | 山水/水墨插图 |

**反例**：
- ❌ 卡片边框用云纹 + 内部有水墨底纹 + 标题旁有印章 = 过度装饰
- ✅ 纯净卡片 + 标题旁小印章 = 适度

### AD-6：动画性能策略

**决策**：所有动画只使用 `transform` 和 `opacity`（GPU 加速属性），避免 `height`、`width`、`margin` 等触发重排的属性动画。

**微信小程序限制**：
- 小程序 CSS 动画支持有限，优先使用 `wx.createAnimation` API
- 复杂动画考虑使用 Canvas 而非 CSS
- `@keyframes` 在部分低端机上表现不一致，关键动画需真机测试

### AD-7：配色与现有模块的兼容

**决策**：配对/爱情模块保留独立的 love 色彩体系，不受水墨禅意改造影响。

| 模块 | 色彩体系 | 说明 |
|------|----------|------|
| 通用页面 | 水墨禅意（ink/paper/seal） | 本次改造主体 |
| 配对/Synastry | love-pink + love-light | 保持浪漫暖色 |
| CBT 情绪追踪 | 现有功能色（success/warning/danger） | 情绪色需保留辨识度 |
| 星盘 Canvas | 现有配色 + 微调 | 仅调整背景色适配 |

## 文件影响清单

### 全局文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `miniprogram/app.wxss` | MODIFIED | 新增 CSS 变量、工具类、动画关键帧 |
| `miniprogram/app.json` | MODIFIED | 可能调整 TabBar 选中色 |
| `COLOR_SYSTEM_GUIDE.md` | MODIFIED/CREATE | 更新设计规范文档 |

### 页面级文件（按优先级排序）

| 页面 | wxss | wxml | js | 优先级 |
|------|------|------|-----|--------|
| home | MODIFIED | MODIFIED | MINOR | P0 |
| daily | MODIFIED | MODIFIED | MINOR | P0 |
| self | MODIFIED | MODIFIED | MINOR | P1 |
| discovery | MODIFIED | MODIFIED | MINOR | P1 |
| ask | MODIFIED | MODIFIED | MINOR | P2 |
| me | MODIFIED | MINOR | - | P2 |
| wiki | MODIFIED | MINOR | - | P3 |
| cbt | MODIFIED | MINOR | - | P3 |
| pairing | MINOR | MINOR | - | P3（保留 love 体系） |
| synastry | MINOR | MINOR | - | P3（保留 love 体系） |

### 组件文件

| 组件 | 变更 | 说明 |
|------|------|------|
| `components/astro-chart/` | MINOR | Canvas 背景色适配 |

## 实现分期

### Phase 1：设计基础层（Design Token）
- app.wxss 变量扩展
- 全局工具类新增
- TabBar 配色调整
- COLOR_SYSTEM_GUIDE.md 更新

### Phase 2：核心页面 P0
- Home 页面重构
- Daily 页面重构

### Phase 3：核心页面 P1
- Self 页面重构
- Discovery 页面重构

### Phase 4：辅助页面 P2-P3
- Ask、Me、Wiki、CBT 页面优化
- 细节收尾和一致性检查
