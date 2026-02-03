# add-love-topic-report Design

## Architecture Decisions

### D1: 报告结构——4模块3批次

| 模块 | ID | 字数 | 核心数据 |
|------|-----|------|---------|
| 爱情人格画像 | personality | 700-900 | 金星、火星、月亮、上升、元素平衡 |
| 理想伴侣与关系模式 | partner | 800-1000 | 7宫、Juno、金火互动 |
| 关系课题与成长 | growth | 600-800 | 困难相位、8宫、凯龙、北交/南交 |
| 未来12个月感情运势 | forecast | 600-800 | 行运金星/木星/土星过境5/7/8宫 |

**批次策略**：
```
Batch 1: personality（立即，快速反馈）
    ↓
Batch 2: partner, growth（并行，注入 personality 摘要）
    ↓
Batch 3: forecast（最后，注入全部摘要 + 需要行运数据）
```

**理由**：personality 作为核心画像先生成，partner 和 growth 可并行，forecast 需综合前序发现。

### D2: 数据包设计——LoveTopicData

```typescript
interface LoveTopicData {
  // 本命盘核心
  venus: PlanetData;       // 金星：星座、宫位、所有相位、逆行
  mars: PlanetData;        // 火星：星座、宫位、所有相位
  moon: PlanetData;        // 月亮：星座、宫位
  ascending: SignData;     // 上升星座

  // 宫位数据
  house5: HouseData;       // 5宫：宫头、落入行星、宫主星
  house7: HouseData;       // 7宫：宫头、落入行星、宫主星
  house8: HouseData;       // 8宫：宫头、落入行星

  // 小行星与交点
  juno?: AsteroidData;     // Juno：星座、宫位
  northNode: NodeData;     // 北交点
  southNode: NodeData;     // 南交点
  chiron?: AsteroidData;   // 凯龙星

  // 特殊相位标记
  specialAspects: string[]; // 金冥、月冥、金土、火冥等

  // 行运数据（未来12个月）
  transits: LoveTransitData;
}

interface LoveTransitData {
  jupiterTransit5or7: TransitWindow[];  // 木星过境5/7宫
  venusTransit5or7: TransitWindow[];    // 金星过境5/7宫
  saturnTransit7or8: TransitWindow[];   // 土星过境7/8宫
  plutoTransit7or8: TransitWindow[];    // 冥王星过境7/8宫
  venusRetrograde: TransitWindow[];     // 金星逆行时段
  eclipseOnAxis: TransitWindow[];       // 日月食落入关系轴线
}
```

**关键决策**：Juno 和 Chiron 为可选字段，因为当前星历服务可能不支持所有小行星。若不可用则在 Prompt 中标注"数据不可用，跳过该部分"。

### D3: Prompt 设计原则

**系统提示词**（复用 natal-report 全局规则 + 爱情专属补充）：
- 角色：专注情感关系的占星师，温暖有洞察力
- 中国用户特化：暧昧期、追求期、见家长、结婚考量
- 表达转换规则：困难配置用成长视角表述
- 数据严谨性：只解读实际存在的数据

**模块间衔接**：
- personality 摘要 → partner、growth
- 全部摘要 → forecast（用于综合运势建议）

**差异化规则**：
- 每份报告开头包含至少一个独特观察
- 行星解读必须结合相位增加独特性
- 罕见配置（互容、群星聚集等）特别指出

### D4: 缓存策略

| 项目 | TTL | 理由 |
|------|-----|------|
| 任务记录 | 7 天 | 与本命报告一致 |
| 内容缓存 | 60 天 | 含行运数据，比纯本命短，但不像月报那么短 |

缓存 key：`report:love-topic:{userId}:{moduleId}:{chartHash}`

### D5: 前端入口设计

在"本我"页面本命深度解读入口下方，新增「专题深度报告」区域：

```
┌─────────────────────────────────────┐
│  本命深度解读  [已生成/去解锁]        │
├─────────────────────────────────────┤
│  专题深度报告                        │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ 💕   │  │ 💼   │  │ 💰   │      │
│  │ 爱情 │  │ 事业 │  │ 财富 │      │
│  │婚恋  │  │学业  │  │金钱  │      │
│  └──────┘  └──────┘  └──────┘      │
└─────────────────────────────────────┘
```

- 爱情卡片：粉红/玫瑰色调（#E8A0BF → #F5D5E0）
- 事业卡片：蓝紫色调（由事业提案定义）
- 财富卡片：金色调（由财富提案定义）

### D6: 产品联动

- forecast 模块结尾：引导购买合盘报告（"想了解和某个具体对象的关系？"）
- growth 模块结尾：引导使用 CBT/AI 问答深入探索
