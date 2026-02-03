# add-career-topic-report Design

## Architecture Decisions

### D1: 报告结构——4模块3批次

| 模块 | ID | 字数 | 核心数据 |
|------|-----|------|---------|
| 职业天赋地图 | talent | 900-1200 | MC、10宫、6宫、2宫、火星、水星 |
| 职场人际与领导力 | workplace | 500-700 | 太阳、火星、11宫、7宫、土星 |
| 人生使命与长期方向 | mission | 600-800 | 北交/南交、木星、冥王星 |
| 未来12个月事业运势 | forecast | 600-800 | 事业行运数据 |

**批次策略**：
```
Batch 1: talent（最核心模块，立即）
    ↓
Batch 2: workplace, mission（并行，注入 talent 摘要）
    ↓
Batch 3: forecast（最后，注入全部摘要 + 行运数据）
```

### D2: 数据包设计——CareerTopicData

```typescript
interface CareerTopicData {
  // MC与宫位
  mc: { sign: string; degree: number; aspects: Aspect[] };
  house10: HouseData;  // 宫头、落入行星、宫主星
  house6: HouseData;   // 工作与日常
  house2: HouseData;   // 赚钱方式

  // 行星
  saturn: PlanetData;  // 限制与建设
  jupiter: PlanetData; // 机遇方向
  sun: PlanetData;     // 核心身份
  mars: PlanetData;    // 行动力驱动
  mercury: PlanetData; // 思维技能

  // 交点
  northNode: NodeData;
  southNode: NodeData;
  pluto: PlanetData;   // 人生蜕变

  // 行运（未来12个月）
  transits: CareerTransitData;
}

interface CareerTransitData {
  outerPlanetTransit10or6or2: TransitWindow[];
  saturnToMCOrSun: TransitWindow[];
  jupiterToCareerHouses: TransitWindow[];
  mercuryRetrograde: TransitWindow[];
}
```

### D3: 中国用户特化设计

talent 模块 SHALL 包含以下中国特色维度：
- 「体制」适配度分析（体制内/体制外/自由职业）
- 考公/考研/考编场景解读
- 副业方向建议
- "稳中求进"路径（即使有创业潜力）

forecast 模块 SHALL 区分：
- 在职人群版本（跳槽/升职/创业时机）
- 学生/备考版本（学习效率、考试运势）

### D4: 缓存策略

| 项目 | TTL | 理由 |
|------|-----|------|
| 任务记录 | 7 天 | 与其他报告一致 |
| 内容缓存 | 60 天 | 含行运数据 |

### D5: 前端配色

- 事业卡片主色：蓝紫色调（#7B8CDE → #B8C4F0）
- report 页面模块色条：蓝紫渐变系列
