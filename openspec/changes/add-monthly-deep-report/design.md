# Design: 月度运势深度解读

## D1: 月度报告配置（ReportConfig）

复用 `report-task.ts` 通用框架，新增 `MONTHLY_REPORT_CONFIG`：

```typescript
const MONTHLY_REPORT_CONFIG: ReportConfig = {
  reportType: 'monthly',
  moduleIds: ['tone', 'dimensions', 'rhythm', 'lunar', 'dates', 'actions'],
  moduleMeta: {
    tone:       { name: '月度总基调',       icon: '🎯' },
    dimensions: { name: '分维度运势',       icon: '📊' },
    rhythm:     { name: '上中下旬节奏指南', icon: '📅' },
    lunar:      { name: '新月满月指南',     icon: '🌙' },
    dates:      { name: '关键日期速查表',   icon: '📌' },
    actions:    { name: '月度行动清单',     icon: '✅' },
  },
  batches: [
    { ids: ['tone'], waitFor: [] },
    { ids: ['dimensions', 'rhythm', 'lunar', 'dates'], waitFor: ['tone'] },
    { ids: ['actions'], waitFor: ['dimensions', 'rhythm', 'lunar', 'dates'] },
  ],
  promptPrefix: 'monthly-',
  taskTTL: 3 * 24 * 3600,     // 3 天
  contentTTL: 30 * 24 * 3600,  // 30 天
  maxTokens: {
    tone: 2000,
    dimensions: 4000,
    rhythm: 3000,
    lunar: 3000,
    dates: 2000,
    actions: 2000,
  },
  estimatedMinutes: 2,
  buildContext: buildMonthlyContext,
  onBatchComplete: injectMonthlySummaries,
  getModuleContext: getMonthlyModuleContext,
  qualityChecks: MONTHLY_QUALITY_CHECKS,
};
```

## D2: 数据包构建

### 行运数据包结构

```typescript
interface MonthlyTransitData {
  // 基础信息
  year: number;
  month: number;
  userName: string;

  // 用户本命盘数据（复用现有类型）
  natalChart: NatalChartData;

  // 公共天象
  publicTransits: {
    sunSign: string;          // "巨蟹座 → 7月22日进入狮子座"
    newMoon: LunarEvent;      // { date, sign, degree }
    fullMoon: LunarEvent;
    mercuryStatus: string;    // 水星状态（含水逆信息）
    venusStatus: string;
    marsStatus: string;
    outerPlanets: PlanetStatus[];
    specialEvents: string[];  // 特殊天象（日食/月食等）
  };

  // 用户个人行运
  personalTransits: {
    houseTransits: HouseTransit[];        // 行运过境宫位
    aspectTransits: AspectTransit[];      // 行运与本命相位（含强度分级）
    lunarPersonal: {                      // 新月/满月与个人盘关系
      newMoonHouse: number;
      fullMoonHouse: number;
    };
    ongoingTransits: string[];            // 上月延续的长期行运
    intensitySummary: DimensionRating[];  // 各维度强度总评
  };
}

interface AspectTransit {
  transitPlanet: string;
  transitSign: string;
  transitDegree: number;
  natalPlanet: string;
  natalSign: string;
  natalDegree: number;
  aspectType: string;          // "合相""三合""刑"等
  orb: number;
  exactDate?: string;          // 精确合相日期
  intensity: 'high' | 'medium' | 'low';
  domain: string;              // 影响领域
  nature: string;              // 能量性质
  description: string;         // 说明
}
```

### 构建流程

```
用户出生信息 → 计算本命盘 → 计算当月行运 → 组装数据包 → 序列化为 Prompt 上下文
```

行运计算扩展现有 `ephemeris.ts`，新增 `calculateMonthlyTransits(birthInfo, year, month)` 方法。

## D3: Prompt 架构

### 系统提示词（全局共享）

所有 6 个模块共享同一个系统提示词，在 `backend/src/prompts/templates/monthly/` 目录下实现。

```
prompts/templates/monthly/
├── index.ts              # 导出所有模块 Prompt
├── system.ts             # 系统提示词（全局共享）
├── tone.ts               # 模块A：月度总基调
├── dimensions.ts         # 模块B：分维度运势
├── rhythm.ts             # 模块C：上中下旬节奏指南
├── lunar.ts              # 模块D：新月/满月指南
├── dates.ts              # 模块E：关键日期速查表
└── actions.ts            # 模块F：月度行动清单
```

### 系统提示词内容

```
【角色定义】
你是一位温暖务实的占星师，正在为用户撰写月度运势报告。

你的月度报告风格不同于年度报告或本命盘报告——
月度报告是用户每个月的「能量日历」和「行动指南」，
它应该像一个靠谱的朋友在月初帮你规划接下来30天，
告诉你什么时候冲、什么时候缓、什么时候注意、什么时候享受。

【月度报告核心原则】
1. 实用优先——每个信息点翻译为「这个月我该怎么做」
2. 节奏感清晰——让用户清楚知道这个月的「快慢节奏」
3. 轻量但不浅薄——基于真实行运数据，不是泛泛的鸡汤
4. 情绪基调——开朗、务实、有陪伴感

【禁止事项】
- 不预测具体事件
- 不做绝对化断言
- 不使用恐吓性语言
- 不编造数据中不存在的相位
- 健康/财务相关必须附免责声明
- 不说「你一定会……」「你绝对不能……」
- 禁止词：注定、劫数、很凶、危险、可怕

【语言风格】
- 面向中国大陆 18-35 岁年轻用户
- 句子短、段落短、阅读门槛低
- 可用 emoji 辅助（每模块最多 3-4 个）
- 可用口语化表达（"说白了就是……""划重点：……"）
- 引用中国生活化场景（工作日/周末节奏、节假日安排等）
```

### 各模块 Prompt 详细设计

#### 模块A：月度总基调（tone）

**目标**：用户打开报告后 30 秒内获得「这个月大概什么感觉」的直观印象。

**输出结构**：
1. 月度主题命名（4-8 字，有画面感）
2. 月度能量概述（3-5 句话）
3. 六维能量评分（事业/感情/财务/社交/健康精力/内在成长，1-5 ★）
4. 月度关键词（3 个）

**字数**：300-400 字

#### 模块B：分维度运势（dimensions）

**目标**：用户按关心的维度快速定位阅读。

6 个维度：事业/学业、爱情/关系、财务、社交/人际、健康/精力、内在成长/灵性。

**核心规则**：
- 篇幅根据当月该维度行运重要程度动态调整
- 高亮维度（★★★+）：250-350 字
- 普通维度（★★）：150-200 字
- 平静维度（★）：80-120 字

**特殊处理**：
- 爱情维度分「单身」「有伴」两种情境
- 财务/健康维度末尾附免责声明
- 学生群体补充：考试季（6-7 月/12-1 月）额外加学业建议

**字数**：1000-1500 字

#### 模块C：上中下旬节奏指南（rhythm）

**目标**：给用户按时间线安排行动的「能量日历感」。

按上旬（1-10 日）、中旬（11-20 日）、下旬（21-月末）分段，每段包含：
1. 时段小标题（4-6 字）
2. 能量描述（3-4 句话）
3. 行动建议（✓ 适合做 / ✗ 不建议做）
4. 关键日期提醒

**字数**：600-800 字

#### 模块D：新月/满月指南（lunar）

**目标**：仪式性内容，月度报告的特色卖点。

新月指南：
1. 新月基础信息
2. 个人意义解读（4-5 句话）
3. 许愿指南（3-5 条具体许愿方向 + 许愿时间窗口）
4. 新月仪式建议（轻量化）

满月指南：
1. 满月基础信息
2. 个人意义解读
3. 需要释放什么
4. 满月复盘提示（2-3 个反思问题）
5. 满月实践建议

**特殊情况**：日食/月食篇幅增加 50%，强调半年影响周期。

**字数**：600-800 字

#### 模块E：关键日期速查表（dates）

**目标**：方便用户快速查阅、存入手机日历。

筛选 8-12 个关键日期，每日期包含：
- 日期
- 天象事件（极简描述）
- 对用户的影响（一句话）
- 建议标签（🟢 适合行动 / 🔴 需要谨慎 / 🟡 适合反思 / 🔵 社交活跃 / 💰 财务关注 / 💗 感情关键 / ⭐ 特别重要）

**规则**：⭐ 标记不超过 3 个。

#### 模块F：月度行动清单（actions）

**目标**：整份报告的行动总结，用户截图保存页。

1. 本月最重要的 3 件事
2. 本月「适合做」清单（4-6 条）
3. 本月「暂缓/谨慎」清单（2-4 条）
4. 月度一句话（值得设为手机壁纸的提醒）

**字数**：300-400 字

## D4: 质量校验配置

```typescript
const MONTHLY_QUALITY_CHECKS: Record<string, QualityCheck> = {
  tone: {
    wordCount: { min: 250, max: 500 },
    requiredKeywords: { list: ['★'], minMatch: 1 },
    forbiddenWords: GLOBAL_FORBIDDEN_WORDS,
    onFail: 'retry',
  },
  dimensions: {
    wordCount: { min: 800, max: 1800 },
    requiredKeywords: { list: ['事业', '感情', '财务'], minMatch: 3 },
    forbiddenWords: GLOBAL_FORBIDDEN_WORDS,
    onFail: 'retry',
  },
  rhythm: {
    wordCount: { min: 500, max: 1000 },
    requiredKeywords: { list: ['上旬', '中旬', '下旬'], minMatch: 3 },
    forbiddenWords: GLOBAL_FORBIDDEN_WORDS,
    onFail: 'retry',
  },
  lunar: {
    wordCount: { min: 500, max: 1000 },
    requiredKeywords: { list: ['新月', '满月'], minMatch: 2 },
    forbiddenWords: GLOBAL_FORBIDDEN_WORDS,
    onFail: 'retry',
  },
  dates: {
    wordCount: { min: 200, max: 800 },
    forbiddenWords: GLOBAL_FORBIDDEN_WORDS,
    onFail: 'flag',
  },
  actions: {
    wordCount: { min: 250, max: 500 },
    requiredKeywords: { list: ['✓', '✗'], minMatch: 2 },
    forbiddenWords: GLOBAL_FORBIDDEN_WORDS,
    onFail: 'retry',
  },
};
```

## D5: 摘要注入策略

```
tone 完成 → 提取主题命名 + 能量概述 + 六维评分 → 注入到批次 2 所有模块

批次 2 各模块完成 → 分别提取核心结论（每模块 2-3 句） → 合并注入到 actions 模块
```

`actions` 模块的上下文中包含所有前序模块的摘要，确保行动清单是全报告的精华浓缩。

## D6: 缓存 Key 设计

月度报告的缓存 key 与本命报告不同，需包含年月信息：

```
任务记录：report_task:monthly:{userId}:{yearMonth}:{chartHash}
模块内容：report:monthly:{userId}:{moduleId}:{yearMonth}:{chartHash}
```

其中 `yearMonth` 格式为 `YYYY-MM`（如 `2026-07`）。

这样确保：
- 同一用户不同月的报告独立缓存
- 出生信息变更后缓存失效（chartHash 变化）
- 同月重复请求命中缓存

## D7: 前端入口设计

### 日运页面底部入口卡片

在 `daily.wxml` 的本周趋势区域之后新增卡片：

```html
<view class="monthly-report-entry card ink-border" bindtap="onMonthlyReport">
  <view class="monthly-entry-header">
    <text class="monthly-entry-title font-ancient">{{currentMonth}}月运势深度解读</text>
    <view class="monthly-entry-badge" wx:if="{{!monthlyReportPurchased}}">付费</view>
    <view class="monthly-entry-badge unlocked" wx:else>已解锁</view>
  </view>
  <text class="monthly-entry-desc">{{monthlyPreview || '查看你的专属月度能量日历与行动指南'}}</text>
  <view class="monthly-entry-arrow">→</view>
</view>
```

### 报告页面配置扩展

在 `report.js` 的 `REPORT_TYPE_CONFIG` 中新增：

```javascript
'monthly': {
  title: 'X月运势深度解读',  // X 动态替换为当月
  desc: '专属于你的月度能量日历',
}
```

## D8: 产品联动钩子

在各模块 Prompt 中通过占位符嵌入联动引导：

| 模块位置 | 联动目标 | 引导文案示例 |
|----------|----------|-------------|
| dimensions 事业末尾 | 本命深度解读 | "想了解你的核心职业天赋？→ 本命深度解读" |
| dimensions 感情中段 | 合盘报告 | "想深入了解这段关系的课题？→ 合盘报告" |
| rhythm 关键日期 | AI 问答 | "对这个日期有疑问？→ AI 问答" |
| lunar 新月许愿 | 本命盘报告 | "想知道这个宫位的完整解读？→ 本命盘报告" |
| actions 清单末尾 | 流年运势 / 人生 K 线 | "想看全年节奏？→ 流年运势" |

联动文案由 Prompt 指令控制，前端渲染时转化为可点击链接。
