# 任务清单：精炼水墨禅意 UI 设计体系

## Phase 1：设计基础层（Design Token）

### Task 1.1：扩展 app.wxss CSS 变量
- [x] 在 `miniprogram/app.wxss` 的 `page {}` 块中新增水墨层级变量（`--ink-wash-1/2/3`）
- [x] 新增文化色彩变量（`--seal-red`, `--bamboo-green`, `--mountain-blue`, `--amber-glow` 及对应 light 变体）
- [x] 新增呼吸间距变量（`--breath-xs` 到 `--breath-xxl`）
- [x] 新增墨晕阴影变量（`--shadow-ink-sm/md/lg`）
- [x] 更新语义色映射（success→bamboo, info→mountain, warning→amber）
- [x] 新增 `--paper-warm: #FAF7F2`
- **验证**：编译无报错；在任意页面引用新变量渲染正确

### Task 1.2：新增全局工具类
- [x] 添加 `.font-body` 无衬线字体类（PingFang SC 系列）
- [x] 添加 `.font-data` 数据字体类（用于分数/数字）
- [x] 修改 `.subtitle`, `.tag`, `.input-label` 使用无衬线字体
- [x] 添加 `.ink-divider` 水墨渐变分隔线组件类
- [x] 添加 `.ink-divider-double` 双线分隔组件类
- [x] 添加 `.seal-stamp` 印章标签基础类
- [x] 添加 `.seal-stamp-sm`, `.seal-stamp-lg` 印章尺寸变体
- [x] 新增 `@keyframes inkSpread`（墨迹扩散）动画
- [x] 新增 `@keyframes sealPress`（印章盖印）动画
- [x] 新增 `@keyframes breathe`（水墨呼吸）动画
- **验证**：工具类在多个页面中引用可正常渲染

### Task 1.3：更新 TabBar 配色
- [x] 将 `miniprogram/app.json` 中 TabBar `selectedColor` 从 `#000000` 改为印章红 `#C53929`
- [x] 确认 TabBar 图标与新颜色视觉协调
- **验证**：真机预览 TabBar 选中态为印章红

### Task 1.4：创建/更新 COLOR_SYSTEM_GUIDE.md
- [ ] 记录完整的色彩变量表（含新旧变量）
- [ ] 记录字体层级规范
- [ ] 记录间距/留白规范
- [ ] 记录印章红使用规则（场景+密度限制）
- [ ] 记录装饰元素密度规则
- [ ] 记录动画规范（缓动函数、时长范围、禁止规则）
- **验证**：文档完整、无遗漏、与 app.wxss 变量一致

---

## Phase 2：核心页面 P0

### Task 2.1：Home 首页 UI 重构
**依赖**：Task 1.1, 1.2
- [x] 问候区域：字号增大至 56rpx，增加留白至 `breath-xl`
- [x] 问候区域：日期改为「农历+阳历」双行展示（wxml + js 适配）
- [x] 每日卡片：移除 box-shadow，改用 `ink-wash-1` 背景做区分
- [x] 每日卡片：分数字号增大，使用 `.font-data` 类
- [x] 每日卡片：增加内部留白至 `breath-lg`
- [x] 快速入口：调整为 2 列大卡片 + 底部滚动小入口布局
- [x] 推荐列表：用 `.ink-divider` 替代现有分隔方式
- [x] 页面底部：增加 `breath-xxl` 底部留白
- [x] 页面入场动画：调整 easing 为 `cubic-bezier(0.25, 0.1, 0.25, 1.0)`
- [x] 所有辅助文字改用 `.font-body` 类
- **验证**：与设计稿/proposal 视觉对齐；各元素间距符合呼吸间距规范；无溢出/截断

### Task 2.2：Daily 今日页面 UI 重构
**依赖**：Task 1.1, 1.2
- [x] 日期导航：选中态下方改为印章红短横线
- [x] 日期导航：今天标记改为小印章红点（保持位置不变）
- [x] 总览卡片：移除 shadow，增加留白
- [x] 总览卡片：分数使用 `.font-data` 大字号
- [x] 维度区域：从 2 列网格改为纵向列表（每行一个维度）
- [x] 维度区域：左侧色块 + 水平进度条 + 右侧数字
- [x] DO/DON'T 卡片：去掉左右分列，改为上下排列
- [x] DO 卡片使用 `bamboo-light` 底色，DON'T 使用 `ink-wash-1` 底色
- [x] 时间线：连线改为虚线，圆点改为小方块（印章感）
- [x] 周趋势柱状图：今天柱子使用 `seal-red`，其他使用 `ink-light`
- [x] 辅助文字改用 `.font-body`
- [x] 全屏报告弹窗：背景改为 `paper-warm`
- **验证**：日期切换交互正常；维度数据正确渲染；DO/DON'T 内容完整显示

---

## Phase 3：核心页面 P1

### Task 3.1：Self 本我页面 UI 重构
**依赖**：Task 1.1, 1.2
- [x] 评估是否可移除自定义固定导航栏（与原生导航栏重复检查）
- [x] Big3 三宫卡片：增大尺寸和留白，各加独立水墨底纹
- [x] 领域网格：增大图标尺寸（80rpx→100rpx），增加留白
- [x] 行星信息表：表头改用 `ink-wash-1` 背景
- [x] 元素表格：优化样式，使用 `ink-wash-1` 做表头背景
- [x] 手风琴展开：使用 `paper-warm` 背景色区分展开区域
- [x] 付费横幅：改为 `seal-red` 底色 + 白色文字
- [x] 支付弹窗：背景改为 `paper-warm`
- [x] Detail Card 左侧色条：统一使用文化色系（seal-red/bamboo/mountain/amber）
- [x] 逆行标记改用 `seal-red`
- **验证**：星盘 Canvas 仍正常渲染；手风琴展开/收起交互正常；付费流程不受影响

### Task 3.2：Discovery 发现页面 UI 重构
**依赖**：Task 1.1, 1.2
- [x] Hero 卡片：从深墨底改为 `paper-warm` 底
- [x] Hero 文字色：改为 `ink-deep`（深墨）
- [x] Hero 按钮：改为 `ink-deep` 描边样式
- [x] Hero 图标盒：改用 `ink-wash-1` 背景
- [x] 话题标签：改为印章式（`seal-red` 底色 + 白色文字）
- [x] 网格卡片：移除 shadow，用 `ink-wash-1` 做背景区分
- [x] 整体增加区块间 `breath-lg`/`breath-xl` 留白
- **验证**：所有功能入口可正常跳转；Hero 区域在不同机型上布局正确

---

## Phase 4：辅助页面 P2-P3

### Task 4.1：Ask 提问页面 UI 优化
**依赖**：Task 1.1, 1.2
- [x] 建议项：改用 `ink-wash-1` 背景
- [x] 提交按钮激活态：改为 `seal-red` 底色
- [x] 报告覆盖层：背景改为 `paper-warm`
- [x] 报告内容卡片：左侧边条使用 `seal-red`，入场动画使用 zenFadeInUp
- [x] 问题回顾卡片：改用 `ink-wash-1` 背景
- [x] 温暖寄语：改用 `ink-wash-1` 背景
- [x] 行动建议圆点：改用 `ink-wash-2` 背景
- **验证**：提问和回复流程正常；回复内容完整显示

### Task 4.2：Me/Wiki/CBT 页面微调
**依赖**：Task 1.1, 1.2
- [x] Me 页面：统计分隔线改为墨渐变，数字使用 data 字体，登出色改用 seal-red
- [x] Wiki 页面：分类颜色改用文化色系，Detail Card 颜色变体改用文化色系，详情标题加 seal-red 下划线装饰，详情覆盖层改用 paper-warm
- [x] CBT 页面：保留功能色（情绪色），提示卡片改用 ink-wash-1，动画改用 zenFadeInUp
- **验证**：各页面功能不受影响；视觉风格与 P0/P1 页面一致

### Task 4.3：一致性审查与收尾
**依赖**：Task 4.1, 4.2
- [x] 全页面 shadow 使用审查（核心页面已清除，synastry/chart/annual-report/onboarding 属于后续优化范围）
- [x] 全页面字体一致性审查（标题=宋体，辅助=无衬线）
- [x] 全页面间距审查（核心页面已符合呼吸间距规范）
- [x] 全页面印章红使用密度审查（单屏不超过 3 处）
- [x] self.wxss 残留 `accent-red` 修复为 `seal-red`
- [ ] 真机测试：iOS + Android 多机型（需人工执行）
- **验证**：所有页面视觉风格统一；无功能回退；真机体验流畅

---

## 并行关系

```
Phase 1（Task 1.1-1.4）→ 串行，必须先完成
Phase 2（Task 2.1, 2.2）→ 可并行
Phase 3（Task 3.1, 3.2）→ 可并行
Phase 4（Task 4.1, 4.2 可并行）→ Task 4.3 需等前面完成
```
