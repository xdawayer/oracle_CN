# add-love-topic-report Tasks

## Phase 1: 后端配置与数据层

- [ ] **Task 1.1**: 创建 `love-topic-task.ts`
  - 定义 `LOVE_TOPIC_CONFIG: ReportConfig`
  - 4 个模块 ID：personality, partner, growth, forecast
  - 3 个批次配置
  - 质量校验规则
  - 在 `api/report.ts` 的 `REPORT_CONFIGS` 中注册
  - **校验**：启动服务不报错，`/api/report/meta?reportType=love-topic` 返回 4 个模块

- [ ] **Task 1.2**: 实现爱情相关数据提取
  - 在 `love-topic-task.ts` 的 `buildContext` 中提取金星/火星/月亮/5宫/7宫/8宫等数据
  - 复用 `ephemeris.ts` 的星盘计算
  - 行运数据：复用或扩展 `buildMonthlyTransitData` 的模式
  - Juno/Chiron 可选提取（若星历服务不支持则标记不可用）
  - **校验**：单元测试验证数据提取正确性

## Phase 2: Prompt 模板（可与 Phase 1 并行）

- [ ] **Task 2.1**: 创建 `prompts/templates/love-topic/` 目录
  - `index.ts`：模块定义和导出
  - `system.ts`：系统提示词（复用全局规则 + 爱情专属补充）
  - 包含数据严谨性规则、差异化规则、表达转换规则
  - 在 `prompts/index.ts` 中注册

- [ ] **Task 2.2**: 编写 personality 模块 Prompt
  - 聚焦金星、火星、月亮、上升、元素平衡
  - 4个章节：爱的方式、吸引力法则、爱里的不安全感、恋爱语言总结
  - 中国用户特化：暧昧期表现、见家长场景
  - 字数：700-900

- [ ] **Task 2.3**: 编写 partner 模块 Prompt
  - 聚焦7宫、Juno、金火互动
  - 4个章节：潜意识寻找的人、婚姻指针、关系互动模式、理想伴侣特质清单
  - 字数：800-1000

- [ ] **Task 2.4**: 编写 growth 模块 Prompt
  - 聚焦困难相位、8宫、凯龙、北交/南交
  - 4个章节：关系模式盲区、亲密恐惧、灵魂关系功课、成长建议
  - 温度控制：每指出课题必须给出"礼物"
  - 字数：600-800

- [ ] **Task 2.5**: 编写 forecast 模块 Prompt
  - 聚焦行运数据
  - 5个章节：感情总基调、桃花窗口期、感情考验期、金星逆行、关键日期
  - 分单身/有伴两版
  - 结尾引导合盘报告（转化钩子）
  - 字数：600-800

## Phase 3: 后端集成

- [ ] **Task 3.1**: 实现摘要注入逻辑
  - `onBatchComplete`: personality 摘要 → partner/growth
  - `getModuleContext`: forecast 获取全部前序摘要
  - **校验**：日志确认摘要正确注入

- [ ] **Task 3.2**: API 注册与端到端测试
  - 确认 `POST /api/report/create { reportType: 'love-topic' }` 正常工作
  - 确认 4 个模块按批次顺序生成
  - 确认内容质量校验正常触发
  - **校验**：curl 测试完整流程

## Phase 4: 前端页面

- [ ] **Task 4.1**: "本我"页面新增专题入口区域
  - 在本命深度解读入口下方新增「专题深度报告」section
  - 3个并列卡片：爱情（粉红）、事业（蓝紫）、财富（金色）
  - 卡片显示状态：未购买/生成中/已完成
  - 点击跳转 `/pages/report/report?reportType=love-topic`
  - **校验**：UI 与设计稿一致，点击跳转正确

- [ ] **Task 4.2**: report 页面支持 love-topic 类型
  - 模块色条颜色：粉红→玫瑰色渐变系列
  - 模块标题色匹配
  - 模块 meta 显示正确
  - **校验**：报告内容正确渲染，样式协调

## Phase 5: 测试与优化

- [ ] **Task 5.1**: 端到端测试
  - 从"本我"页面入口 → 支付 → 生成 → 查看完整报告
  - 验证 4 个模块内容质量
  - 验证行运数据准确性

- [ ] **Task 5.2**: Prompt 调优
  - 多组测试盘面验证差异化
  - 检查是否存在模板化输出
  - 调整温度参数和字数约束
