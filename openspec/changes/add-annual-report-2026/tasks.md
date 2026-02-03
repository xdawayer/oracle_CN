# Tasks: 2026 流年运势报告

## Phase 1: Prompt 模板

### 1.1 创建目录结构
- [x] 1.1.1 创建 `backend/src/prompts/templates/annual/` 目录

### 1.2 实现 Prompt 模板
- [x] 1.2.1 实现 `templates/annual/system.ts`（流年报告通用系统提示词）
- [x] 1.2.2 实现 `templates/annual/overview.ts`（年度总览，800-1000 字）
- [x] 1.2.3 实现 `templates/annual/career.ts`（事业财运，1200-1500 字）
- [x] 1.2.4 实现 `templates/annual/love.ts`（感情关系，1200-1500 字）
- [x] 1.2.5 实现 `templates/annual/health.ts`（健康能量，800-1000 字）
- [x] 1.2.6 实现 `templates/annual/social.ts`（人际社交，800-1000 字）
- [x] 1.2.7 实现 `templates/annual/growth.ts`（学习成长，800-1000 字）
- [x] 1.2.8 实现 `templates/annual/quarter.ts`（季度详解通用模板，500-600 字/季）
- [x] 1.2.9 实现 `templates/annual/lucky.ts`（开运指南，600-800 字）
- [x] 1.2.10 实现 `templates/annual/index.ts`（统一导出）

### 1.3 验证 Prompt 模板
- [ ] 1.3.1 手动测试各模块输出质量
- [ ] 1.3.2 确保输出符合字数要求
- [ ] 1.3.3 验证本土化内容（比喻、场景、节日）

---

## Phase 2: 后端 API

### 2.1 实现 API 路由
- [x] 2.1.1 创建 `backend/src/api/annual-report.ts`
- [x] 2.1.2 实现 `POST /api/annual-report/generate` SSE 流式端点
- [x] 2.1.3 实现模块并行生成调度逻辑（分批次启动）
- [x] 2.1.4 实现错误处理和重试机制

### 2.2 实现缓存机制
- [x] 2.2.1 定义缓存 key 格式：`annual:2026:{userId}:{moduleId}:{chartHash}`
- [x] 2.2.2 实现缓存读取逻辑（命中时跳过 AI 生成）
- [x] 2.2.3 实现缓存写入逻辑（模块完成后存储）
- [x] 2.2.4 实现缓存查询端点 `GET /api/annual-report/cached`

### 2.3 集成测试
- [ ] 2.3.1 测试 SSE 流式响应
- [ ] 2.3.2 测试并行生成性能（5 并发限制）
- [ ] 2.3.3 测试缓存命中场景
- [ ] 2.3.4 测试单模块失败重试

---

## Phase 3: 前端页面

### 3.1 创建报告页面
- [x] 3.1.1 创建 `miniprogram/pages/annual-report/` 目录
- [x] 3.1.2 实现 `annual-report.wxml` 页面结构
- [x] 3.1.3 实现 `annual-report.wxss` 样式（遵循水墨风格）
- [x] 3.1.4 实现 `annual-report.js` 逻辑
- [x] 3.1.5 实现 `annual-report.json` 配置

### 3.2 实现流式接收
- [x] 3.2.1 实现 SSE 连接和事件监听（使用 wx.request enableChunked）
- [x] 3.2.2 实现进度条组件
- [x] 3.2.3 实现模块渐进式渲染（完成一个显示一个）
- [x] 3.2.4 实现加载状态动画

### 3.3 更新"本我"页面
- [x] 3.3.1 更新 `self.js` 中的 `handlePay` 方法，跳转至报告页
- [x] 3.3.2 实现支付成功后的导航逻辑
- [x] 3.3.3 添加"查看历史报告"入口（如已购买）

### 3.4 注册页面路由
- [x] 3.4.1 更新 `app.json` 添加 `pages/annual-report/annual-report`
- [x] 3.4.2 更新 `services/api.js` 添加流年报告 API 端点

---

## Phase 4: 测试与优化

### 4.1 功能测试
- [ ] 4.1.1 测试完整购买→生成→查看流程
- [ ] 4.1.2 测试重复查看（缓存命中）
- [ ] 4.1.3 测试网络中断恢复
- [ ] 4.1.4 测试不同星座用户报告差异

### 4.2 性能优化
- [ ] 4.2.1 测量首屏时间（overview 模块完成时间）
- [ ] 4.2.2 优化并发数以平衡速度和 API 限流
- [ ] 4.2.3 添加 Server-Timing 头监控各模块耗时

### 4.3 内容质量
- [ ] 4.3.1 审核各星座报告样本（至少 3 个星座）
- [ ] 4.3.2 检查内容一致性（模块间无矛盾）
- [ ] 4.3.3 验证本土化内容贴合度

---

## 验收标准

1. 用户购买后可在 30 秒内看到第一个模块内容
2. 完整报告生成时间不超过 3 分钟
3. 报告总字数达到 8000-10000 字
4. 各模块内容无明显矛盾
5. 已购买用户可重复查看，无需重新生成
6. 页面样式符合水墨风格规范

---

## 依赖关系

```
1.1 → 1.2 → 1.3
         ↓
       2.1 → 2.2 → 2.3
              ↓
            3.1 → 3.2 → 3.3 → 3.4
                          ↓
                        4.1 → 4.2 → 4.3
```

- Phase 1 与 Phase 2 可部分并行（API 结构可先搭建）
- Phase 3 依赖 Phase 2 完成（需要后端接口）
- Phase 4 在功能完成后进行
