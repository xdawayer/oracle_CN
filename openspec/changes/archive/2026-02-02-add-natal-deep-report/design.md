# Design: 本命盘深度解读报告

## D1: 通用报告生成框架

### 决策

将 `annual-task.ts` 的核心逻辑抽象为通用的 `report-task.ts`，所有报告类型（annual、natal-report、未来的 solar-return 等）共享同一套任务管理机制。

### 架构

```
report-task.ts（通用框架）
├── createReportTask(reportType, userId, birthData, config)
├── getReportTaskStatus(reportType, userId, birthData)
├── getReportContent(reportType, userId, birthData)
├── retryReportTask(reportType, userId, birthData)
├── deleteReportTask(reportType, userId, birthData)
└── executeReportTask(内部，分批并行生成)

ReportConfig（每种报告类型需提供）
├── reportType: string          // 'annual' | 'natal-report' | ...
├── moduleIds: string[]         // 所有模块 ID
├── moduleMeta: Record<...>     // 模块元数据
├── batchConfig: BatchConfig[]  // 分批策略
├── promptPrefix: string        // prompt ID 前缀（如 'natal-report-'）
├── taskTTL: number             // 任务缓存时长
├── contentTTL: number          // 内容缓存时长
├── buildContext(chartSummary)   // 构建 prompt 上下文
└── maxTokens: number | Record  // 各模块 maxTokens
```

### 缓存 key 格式

```
任务：report_task:{reportType}:{userId}:{chartHash}
内容：report:{reportType}:{userId}:{moduleId}:{chartHash}
```

### 迁移策略

1. 新建 `report-task.ts` 实现通用逻辑
2. `annual-task.ts` 改为薄封装层，调用 `report-task.ts` 并传入 annual 配置
3. 新建 `natal-report-task.ts` 作为本命解读的薄封装
4. 确保现有 annual 相关 API 行为不变

### 备选方案（已否决）

- **复制 annual-task.ts 改名**：代码重复，后续维护成本高
- **只改 annual-task 加 if/else**：不够通用，后续每加一种报告都要改

---

## D2: 本命解读模块设计

### 8 模块配置

```typescript
const NATAL_REPORT_MODULE_IDS = [
  'overview',   // 星盘总览与人格画像
  'mind',       // 思维与沟通方式
  'emotion',    // 情感世界与内在需求
  'love',       // 爱情与亲密关系
  'career',     // 事业与人生方向
  'wealth',     // 财富与金钱关系
  'health',     // 健康与能量管理
  'soul',       // 人生课题与灵魂成长
] as const;
```

### 分批生成策略

```
Batch 1（立即）：overview
  → 让用户最快看到内容，建立"被看见"的感觉
Batch 2（Batch 1 完成后）：love, career, emotion
  → 用户最关心的三个模块
Batch 3（并行）：mind, wealth, health, soul
  → 其余模块全部并行
```

### 各模块聚焦的星盘数据

| 模块 | 核心数据 | 辅助数据 |
|------|----------|----------|
| overview | 太阳/月亮/上升（星座+宫位+相位） | 元素平衡 |
| mind | 水星（星座+宫位+相位）、3宫 | 水星逆行状态 |
| emotion | 月亮（星座+宫位+相位）、4宫 | 月亮与火/土/冥相位 |
| love | 金星、火星（星座+宫位+相位）、5宫、7宫 | 7宫宫主星位置 |
| career | MC、10宫、6宫、土星、北交点 | 水星（工作风格） |
| wealth | 2宫、8宫、金星、木星 | 海王星/土星与财务宫相位 |
| health | 上升星座、6宫、火星 | 困难相位行星 |
| soul | 北交/南交、凯龙星、12宫、冥王星 | 特殊格局（大三角/T三角） |

---

## D3: Prompt 架构

### 全局规则（system prompt）

所有 8 个模块共享同一个 system prompt，包含：
1. **角色设定**：15 年经验的专业占星师，温暖有洞察力
2. **核心原则**：占星是自我认知工具，双面解读，给用户自由意志空间
3. **禁止事项**：不预测具体事件、不做医学/投资建议、不使用宿命论
4. **数据严谨性**：只解读实际存在的数据、区分紧密/松散相位、空宫处理公式
5. **语言风格**：面向 20-35 岁中国年轻人、现代有亲和力、术语首现时解释

### 模块间衔接

采用"前序摘要注入"方式：
- 每个模块生成完成后，提取 2-3 句核心结论作为摘要
- 后续模块的 prompt 上下文中注入前序摘要
- 在 user prompt 中加入衔接指令：开头用 1 句话自然过渡

**实现方式**：由于采用分批生成，Batch 1 的 overview 完成后，其摘要可注入到 Batch 2/3 的模块中。Batch 2 内部的模块并行生成，彼此不互相引用。

```
Batch 1: overview → 提取摘要 A
Batch 2: love(+A), career(+A), emotion(+A)
         → 各自提取摘要 B1/B2/B3
Batch 3: mind(+A), wealth(+A), health(+A), soul(+A+B1+B2+B3)
```

**注意**：soul 模块（人生课题与灵魂成长）作为报告收尾，需要回顾所有模块的核心发现，因此需要等 Batch 2 完成后注入更多摘要。调整为：

```
Batch 1: overview → 摘要 A
Batch 2: love(+A), career(+A), emotion(+A) → 摘要 B
Batch 3: mind(+A), wealth(+A), health(+A) （并行）
Batch 4: soul(+A+B+Batch3 摘要) （最后生成）
```

### 质量校验

每个模块生成后执行自动化检查：

```typescript
interface QualityCheck {
  // 字数范围检查
  wordCount: { min: number; max: number };
  // 必须包含的关键词（至少命中 N 个）
  requiredKeywords: { words: string[]; minMatch: number };
  // 禁止词黑名单
  forbiddenWords: string[];
  // 不通过时的处理：retry（重新生成）| flag（标记但不阻塞）
  onFail: 'retry' | 'flag';
}
```

禁止词列表：`注定`、`命中注定`、`劫难`、`一定会`、`绝对不会`、`肯定会`、`你的盘很凶`、`这个相位很危险`

---

## D4: API 设计

### 报告 API 端点

```
POST   /api/report/create     - 创建报告任务
GET    /api/report/status      - 查询任务状态
GET    /api/report/content     - 获取报告内容
POST   /api/report/retry       - 重试失败模块
DELETE /api/report             - 删除报告任务

通用参数：reportType=natal-report|annual
```

### 向后兼容

现有 `/api/annual-task/*` 端点保留，内部转发到通用报告 API。

---

## D5: 前端设计

### 报告展示页

创建通用的 `report` 页面，通过 `reportType` 参数区分不同报告：

```
/pages/report/report?reportType=natal-report
/pages/report/report?reportType=annual
```

复用 annual-report 的核心能力：
- Markdown → HTML 渲染器
- 模块进度条
- 渐进式渲染
- 任务轮询机制

### Self 页面入口

在"本我"页面底部（流年报告入口下方）新增"本命深度解读"卡片：
- 状态：none（未购买）→ processing（生成中）→ completed（已完成）→ failed（失败）
- 交互逻辑与流年报告入口一致

---

## D6: 缓存策略

```
任务记录：7 天 TTL（与 annual 一致）
报告内容：90 天 TTL（本命盘数据稳定，不像流年需按年更新，但用户可能修改出生时间）
```

chartHash 机制保证出生信息变更后自动失效重新生成。
