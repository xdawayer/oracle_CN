# Tasks: 本命盘深度解读报告

## Phase 1: 通用报告框架抽象

### 1.1 创建通用报告任务服务
- [ ] 1.1.1 创建 `backend/src/services/report-task.ts`，从 `annual-task.ts` 抽象通用逻辑
  - 通用任务状态管理（create/status/content/retry/delete）
  - 通用分批并行生成策略
  - 通用模块重试机制（最大 3 次，递增延迟）
  - 通用质量校验框架
  - **验证**：新文件编译通过，类型定义完整
- [ ] 1.1.2 定义 `ReportConfig` 接口（reportType, moduleIds, moduleMeta, batchConfig, promptPrefix, TTL 等）
  - **验证**：接口涵盖 annual 和 natal-report 的所有差异点
- [ ] 1.1.3 实现通用缓存 key 格式：`report_task:{reportType}:{userId}:{chartHash}` 和 `report:{reportType}:{userId}:{moduleId}:{chartHash}`
  - **验证**：与现有 annual 缓存 key 格式向后兼容

### 1.2 迁移 annual-task
- [ ] 1.2.1 将 `annual-task.ts` 改为薄封装层，创建 `AnnualReportConfig` 调用 `report-task.ts`
  - **验证**：现有 annual-task API 行为不变，`/api/annual-task/*` 端点正常工作
- [ ] 1.2.2 更新 `annual-task.ts` 的所有导出类型，确保向后兼容
  - **验证**：`import { createTask, getTaskStatus, ... } from './annual-task'` 仍可用

### 1.3 创建通用报告 API
- [ ] 1.3.1 创建 `backend/src/api/report.ts`，实现通用报告端点
  - `POST /api/report/create` - 创建任务（参数含 reportType）
  - `GET /api/report/status` - 查询状态
  - `GET /api/report/content` - 获取内容
  - `POST /api/report/retry` - 重试失败模块
  - `DELETE /api/report` - 删除任务
  - **验证**：API 能正确路由到不同报告类型

---

## Phase 2: 本命解读 Prompt 模板（可与 Phase 1 并行）

### 2.1 创建目录与全局规则
- [ ] 2.1.1 创建 `backend/src/prompts/templates/natal-report/` 目录
- [ ] 2.1.2 实现 `natal-report/system.ts`（全局规则层 system prompt）
  - 角色设定：15 年经验占星师
  - 核心原则：自我认知工具、双面解读、自由意志
  - 禁止事项：不预测事件、不做医学/投资建议、不用宿命论
  - 数据严谨性：只解读实际数据、区分紧密/松散相位、空宫处理
  - 语言风格：面向中国年轻用户、现代亲和
  - **验证**：system prompt 编译通过，内容覆盖用户提供的全局规则

### 2.2 实现 8 个模块 Prompt
- [ ] 2.2.1 实现 `natal-report/overview.ts` — 星盘总览与人格画像（600-800 字）
  - 聚焦：太阳/月亮/上升（星座+宫位+三者相位关系）
  - 用户提供的完整提示词直接写入 user prompt
  - **验证**：prompt 包含太阳、月亮、上升三要素的解读指令
- [ ] 2.2.2 实现 `natal-report/mind.ts` — 思维与沟通方式（500-700 字）
  - 聚焦：水星星座/宫位/相位、3宫、水星逆行
  - **验证**：prompt 包含思维模式、表达风格、沟通建议的指令
- [ ] 2.2.3 实现 `natal-report/emotion.ts` — 情感世界与内在需求（600-800 字）
  - 聚焦：月亮星座/宫位/相位、4宫
  - **验证**：prompt 包含安全感、情绪模式、原生家庭、内在小孩的指令
- [ ] 2.2.4 实现 `natal-report/love.ts` — 爱情与亲密关系（800-1100 字）
  - 聚焦：金星、火星、5宫、7宫、7宫宫主星
  - **验证**：prompt 包含吸引力、欲望模式、伴侣画像、关系课题、时间线参考
- [ ] 2.2.5 实现 `natal-report/career.ts` — 事业与人生方向（700-900 字）
  - 聚焦：MC、10宫、6宫、土星、北交点
  - **验证**：prompt 包含职业方向、工作风格、权威关系、人生使命
- [ ] 2.2.6 实现 `natal-report/wealth.ts` — 财富与金钱关系（500-700 字）
  - 聚焦：2宫、8宫、金星、木星
  - 必须包含免责声明
  - **验证**：prompt 包含金钱关系、财富来源、深层模式、免责声明
- [ ] 2.2.7 实现 `natal-report/health.ts` — 健康与能量管理（400-600 字）
  - 聚焦：上升星座、6宫、火星、困难相位
  - 必须包含免责声明
  - **验证**：prompt 包含能量特征、压力模式、能量管理、免责声明
- [ ] 2.2.8 实现 `natal-report/soul.ts` — 人生课题与灵魂成长（700-900 字）
  - 聚焦：北交/南交、凯龙星、12宫、冥王星、特殊格局
  - 需要注入前序所有模块摘要
  - **验证**：prompt 包含灵魂功课、凯龙伤痛、潜意识、整合祝福

### 2.3 模块索引与注册
- [ ] 2.3.1 实现 `natal-report/index.ts`（统一导出、模块 ID、元数据、分批配置）
  - **验证**：所有 8 个模块正确导出，模块元数据完整
- [ ] 2.3.2 在 `backend/src/prompts/index.ts` 中注册 natal-report 模块
  - **验证**：`buildPrompt('natal-report-overview', ctx)` 可正常调用
- [ ] 2.3.3 更新 `backend/src/prompts/core/types.ts`，`PromptModule` 新增 `'natal-report'`
  - **验证**：类型编译通过

---

## Phase 3: 后端集成

### 3.1 创建本命报告任务配置
- [ ] 3.1.1 创建 `backend/src/services/natal-report-task.ts`，定义 `NatalReportConfig`
  - 8 个模块 ID、元数据、4 批次策略、90 天内容 TTL
  - `buildContext`: 注入完整星盘数据（含宫主星、凯龙星等扩展数据）
  - **验证**：配置完整，调用 report-task.ts 创建任务成功
- [ ] 3.1.2 实现模块间摘要提取与注入逻辑
  - overview 完成后提取摘要，注入到 Batch 2/3
  - Batch 2 完成后提取摘要，注入到 soul 模块
  - **验证**：摘要正确注入到后续模块的 context 中

### 3.2 注册路由
- [ ] 3.2.1 在 `backend/src/index.ts` 注册 `/api/report` 路由
  - **验证**：服务启动无报错，API 可访问
- [ ] 3.2.2 更新 `miniprogram/services/api.js` 添加报告 API 端点
  - **验证**：前端 API 调用路径正确

### 3.3 质量校验
- [ ] 3.3.1 实现质量校验中间件（字数、关键词、禁止词、情绪倾向）
  - 不通过时自动重试（最多 1 次额外重试）
  - **验证**：禁止词检测准确，字数超范围触发重试

---

## Phase 4: 前端页面

### 4.1 通用报告展示页
- [ ] 4.1.1 创建 `miniprogram/pages/report/` 通用报告页面
  - 通过 `reportType` 参数区分报告类型
  - 复用 annual-report 的 Markdown 渲染器、进度条、轮询机制
  - **验证**：页面可正确渲染 natal-report 和 annual 两种报告
- [ ] 4.1.2 在 `app.json` 注册 `pages/report/report` 页面
  - **验证**：页面路由可访问

### 4.2 本我页面入口
- [ ] 4.2.1 在 `self.wxml` 底部（流年报告入口下方）新增"本命深度解读"卡片
  - 状态展示：none / processing / completed / failed
  - **验证**：卡片正确显示，点击触发对应操作
- [ ] 4.2.2 在 `self.js` 中实现本命报告的状态检查、轮询、支付、跳转逻辑
  - 复用流年报告的交互模式
  - **验证**：完整流程（购买→生成→查看→重看）可走通

---

## Phase 5: 测试与优化

### 5.1 功能测试
- [ ] 5.1.1 测试通用框架：annual 报告通过新框架生成，行为与原来一致
- [ ] 5.1.2 测试本命报告：完整的创建→生成→查看流程
- [ ] 5.1.3 测试重试机制：手动让某个模块失败，验证重试逻辑
- [ ] 5.1.4 测试缓存命中：出生信息不变时直接返回

### 5.2 内容质量
- [ ] 5.2.1 审核至少 3 个不同星盘的报告样本
- [ ] 5.2.2 检查模块间衔接是否自然（有无明显割裂感）
- [ ] 5.2.3 检查禁止词过滤是否生效
- [ ] 5.2.4 验证各模块字数在目标范围内

---

## 验收标准

1. 用户点击后 30 秒内看到第一个模块（overview）
2. 完整报告生成不超过 3 分钟
3. 报告总字数达到 5000-6500 字
4. 各模块间叙事连贯，无明显矛盾
5. 不出现禁止词列表中的任何词汇
6. 现有 annual 报告功能完全向后兼容
7. 通用框架支持未来新增报告类型（仅需提供 ReportConfig + Prompt 模板）

---

## 依赖关系

```
Phase 1（通用框架）  ←→  Phase 2（Prompt 模板）  可并行
         ↓                        ↓
         Phase 3（后端集成）
                ↓
         Phase 4（前端页面）
                ↓
         Phase 5（测试优化）
```

- Phase 1 和 Phase 2 可完全并行
- Phase 3 依赖 Phase 1 + Phase 2 完成
- Phase 4 依赖 Phase 3 完成
- Phase 5 在功能完成后进行
