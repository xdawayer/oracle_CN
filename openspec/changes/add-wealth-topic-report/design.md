# add-wealth-topic-report Design

## Architecture Decisions

### D1: 报告结构——4模块3批次

| 模块 | ID | 字数 | 核心数据 |
|------|-----|------|---------|
| 你和金钱的底层关系 | money-relation | 700-900 | 2宫、金星、月亮 |
| 财富潜力与增长路径 | potential | 700-900 | 木星、8宫、11宫、土星 |
| 财务盲区与金钱课题 | blindspot | 600-800 | 困难相位、海王星、冥王星、南交 |
| 未来12个月财运走势 | forecast | 500-700 | 财务行运数据 |

**批次策略**：
```
Batch 1: money-relation（底层关系先建立）
    ↓
Batch 2: potential, blindspot（并行，注入 money-relation 摘要）
    ↓
Batch 3: forecast（最后，注入全部摘要 + 行运数据）
```

### D2: 数据包设计——WealthTopicData

```typescript
interface WealthTopicData {
  // 财务宫位
  house2: HouseData;   // 主动收入、自我价值
  house8: HouseData;   // 被动收入、投资、共同财务
  house11: HouseData;  // 长期收益、人脉资源

  // 行星
  venus: PlanetData;   // 价值观、消费模式
  jupiter: PlanetData; // 丰盛、扩张方向
  saturn: PlanetData;  // 限制与建设
  pluto: PlanetData;   // 深层财务动态
  moon: PlanetData;    // 消费情绪
  neptune: PlanetData; // 幻想/逃避

  // 交点
  northNode: NodeData;
  southNode: NodeData;

  // 行运（未来12个月）
  transits: WealthTransitData;
}

interface WealthTransitData {
  jupiterOrVenusTransit2or10: TransitWindow[];
  saturnOrPlutoTransitFinancial: TransitWindow[];
  mercuryRetroIn2or8: TransitWindow[];
  house8Transits: TransitWindow[];
}
```

### D3: 免责声明设计

**强制规则**：
- blindspot 模块末尾 SHALL 包含免责声明
- forecast 模块中每提到"投资"SHALL 提醒用户自行评估风险
- 全报告末尾 SHALL 有醒目的总免责声明

**严格禁止**：
- 不得推荐任何具体投资标的（股票/基金/加密货币/房产等）
- 不得预测具体收入数字
- 不得暗示赌博或投机行为

### D4: 缓存策略

| 项目 | TTL | 理由 |
|------|-----|------|
| 任务记录 | 7 天 | 与其他报告一致 |
| 内容缓存 | 60 天 | 含行运数据 |

### D5: 前端配色

- 财富卡片主色：金色调（#D4A853 → #F0DCA0）
- report 页面模块色条：金色渐变系列
