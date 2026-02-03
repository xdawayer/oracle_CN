# 专业排盘优化设计文档

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     专业排盘页面 (chart)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ 盘型选择器   │  │ 人员信息表单 │  │ 显示模块勾选        │  │
│  │ (8种盘型)   │  │ (甲方/乙方) │  │ (相位/行星/小行星...) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                        生成排盘按钮                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   星盘可视化                           │  │
│  │        <astro-chart type="{{chartType}}" />           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ▼ 元素矩阵 (仅单人盘)                                  │  │
│  │   火 | 土 | 风 | 水  ×  开创 | 固定 | 变动             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ▼ 相位矩阵                                             │  │
│  │   三角矩阵显示所有主要相位                               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ▼ 行星信息                                             │  │
│  │   星体 | 星座 | 宫位 | 逆行                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ▼ 小行星信息                                           │  │
│  │   星体 | 星座 | 宫位 | 逆行                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ▼ 宫主星信息                                           │  │
│  │   宫位 | 星座 | 宫主星 | 飞入宫位                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 数据流设计

### 输入数据

```javascript
// 表单数据
{
  selectedType: 'natal' | 'synastry' | 'transit' | 'composite' | 'davison' | 'solar_return' | 'pro_secondary' | 'pro_tertiary',
  personA: {
    name: string,
    date: string,   // YYYY-MM-DD
    time: string,   // HH:mm
    city: string
  },
  personB: {        // 仅双人盘
    name: string,
    date: string,
    time: string,
    city: string
  },
  displayOptions: {
    chart: true,          // 星盘（必选）
    aspectMatrix: boolean,
    planets: boolean,
    asteroids: boolean,
    houseRulers: boolean,
    elements: boolean     // 仅单人盘有效
  }
}
```

### API 响应数据

#### 本命盘 API (`/api/natal/chart`)

```javascript
{
  chart: {
    positions: [
      {
        name: 'Sun',
        sign: 'Scorpio',
        degree: 7,
        minute: 23,
        house: 4,
        isRetrograde: false
      },
      // ... 其他行星
    ],
    aspects: [
      {
        planet1: 'Sun',
        planet2: 'Moon',
        type: 'trine',
        orb: 2.5
      },
      // ... 其他相位
    ],
    houseCusps: [/* 12个宫头的黄道经度 */]
  }
}
```

#### 合盘 API (`/api/synastry/technical`)

```javascript
{
  technical: {
    natal_a: {
      planets: [/* 甲方行星位置 */],
      houseCusps: [/* 甲方宫位 */]
    },
    natal_b: {
      planets: [/* 乙方行星位置 */],
      houseCusps: [/* 乙方宫位 */]
    },
    syn_ab: {
      aspects: [/* 跨盘相位 */]
    }
  }
}
```

### 处理后的展示数据

```javascript
{
  // 星盘组件数据
  chartType: 'natal' | 'transit' | 'synastry' | 'composite',
  chartPositions: [],      // 内环行星位置
  outerPositions: [],      // 外环行星位置（双轮盘）
  chartAspects: [],        // 相位数据
  chartHouseCusps: [],     // 宫位数据

  // 元素矩阵（仅单人盘）
  elementMatrix: {
    fire: { cardinal: [], fixed: [], mutable: [] },
    earth: { cardinal: [], fixed: [], mutable: [] },
    air: { cardinal: [], fixed: [], mutable: [] },
    water: { cardinal: [], fixed: [], mutable: [] }
  },

  // 相位矩阵
  aspectMatrix: [[/* 二维数组 */]],

  // 行星信息
  planets: [
    {
      id: 'sun',
      name: '太阳',
      symbol: '☉',
      sign: '天蝎座',
      signIcon: '/images/astro-symbols/scorpio.png',
      house: 4,
      degree: "7°23'",
      color: '#8B0000',
      isRetrograde: false
    },
    // ...
  ],

  // 小行星信息
  asteroids: [/* 同 planets 结构 */],

  // 宫主星信息
  houseRulers: [
    {
      house: 1,
      signName: '白羊座',
      signIcon: '/images/astro-symbols/aries.png',
      signColor: '#E74C3C',
      rulerName: '火星',
      rulerColor: '#8B0000',
      fliesToHouse: 7,
      fliesToSignName: '天秤座',
      fliesToSignIcon: '/images/astro-symbols/libra.png',
      fliesToSignColor: '#3498DB'
    },
    // ...
  ]
}
```

## 组件复用策略

### 从 self.js 复用

| 函数名 | 用途 | 修改说明 |
|--------|------|---------|
| `buildElementMatrix()` | 构建元素矩阵 | 直接复用 |
| `buildAspectMatrix()` | 构建相位矩阵 | 直接复用 |
| `buildPlanetList()` | 构建行星列表 | 直接复用 |
| `buildAsteroidList()` | 构建小行星列表 | 直接复用 |
| `buildHouseRulers()` | 构建宫主星数据 | 直接复用 |

### 从 daily.js 复用

| 函数名 | 用途 | 修改说明 |
|--------|------|---------|
| `buildAspectMatrix()` | 构建跨盘相位矩阵 | 用于双人盘 |
| `prepareTechnicalData()` | 处理技术数据 | 适配合盘数据 |

### 样式复用

从 `self.wxss` 和 `daily.wxss` 复制：

```css
/* 折叠面板 */
.accordion-item { }
.accordion-head { }
.accordion-body { }
.accordion-label { }
.accordion-icon { }

/* 元素矩阵 */
.element-table { }
.el-row { }
.el-cell { }
.el-label { }
.planet-capsule { }

/* 相位矩阵 */
.aspect-matrix-container { }
.aspect-matrix { }
.matrix-row { }
.matrix-cell { }
.cell-header { }
.p-symbol { }
.a-info { }
.a-symbol { }
.a-orb { }

/* 行星信息表格 */
.planet-info-table { }
.pi-row { }
.pi-head { }
.pi-cell { }
.pi-planet { }
.pi-sign { }
.pi-house { }
.pi-retro { }
.pi-icon-circle { }
.pi-name { }
.pi-sign-name { }
.pi-degree { }
.retro-tag { }
.retro-none { }
.glyph { }

/* 宫主星表格 */
.pi-hr-house { }
.pi-hr-sign { }
.pi-hr-ruler { }
.pi-hr-arrow { }
.pi-hr-fly { }
.fly-capsule { }
.fly-arrow { }
.fly-text { }
.fly-house { }
```

## 盘型映射表

**重要说明**：本映射表区分三个概念：
1. **输入要求** (`isDual`): 是否需要双人出生信息
2. **显示样式** (`chartType`): 星盘组件的视觉呈现形式（单轮/双轮）
3. **计算逻辑** (`calculation`): 每种盘型的独特计算方法

**样式参考**：
- 单人盘样式参考「本我」页面（折叠面板、元素矩阵等）
- 双人盘样式参考「今日运势」页面（跨盘相位矩阵等）
- 但每种盘型的计算逻辑和数据处理必须根据其占星学特性单独实现

```javascript
const CHART_TYPE_MAP = {
  // 单人盘
  natal: {
    chartType: 'natal',           // 显示：单轮盘
    isDual: false,                // 输入：单人
    showElements: true,
    api: 'NATAL_CHART',
    calculation: '基于出生时刻的行星位置直接计算'
  },
  transit: {
    chartType: 'transit',         // 显示：双轮盘（内环本命，外环行运）
    isDual: false,                // 输入：单人
    showElements: true,
    api: ['NATAL_CHART', 'DAILY_FORECAST'],
    calculation: '本命盘 + 当前时刻行星位置，计算跨时间相位'
  },
  solar_return: {
    chartType: 'natal',           // 显示：单轮盘
    isDual: false,                // 输入：单人
    showElements: true,
    api: 'SOLAR_RETURN',          // 待开发
    calculation: '太阳回归到本命位置的时刻重新排盘'
  },
  pro_secondary: {
    chartType: 'natal',           // 显示：单轮盘
    isDual: false,                // 输入：单人
    showElements: true,
    api: 'SECONDARY',             // 待开发
    calculation: '次限推运：一天等于一年的时间推进法'
  },
  pro_tertiary: {
    chartType: 'natal',           // 显示：单轮盘
    isDual: false,                // 输入：单人
    showElements: true,
    api: 'TERTIARY',              // 待开发
    calculation: '三限推运：一天等于一个月的时间推进法'
  },

  // 双人盘
  synastry: {
    chartType: 'synastry',        // 显示：双轮盘（内环甲方，外环乙方）
    isDual: true,                 // 输入：双人
    showElements: false,
    api: 'SYNASTRY_TECHNICAL',
    calculation: '两个独立本命盘的比较，计算跨盘相位'
  },
  composite: {
    chartType: 'natal',           // 显示：单轮盘（中点盘）
    isDual: true,                 // 输入：双人
    showElements: false,
    api: 'COMPOSITE',             // 待开发
    calculation: '计算两人行星的中点位置，生成新的合成盘'
  },
  davison: {
    chartType: 'natal',           // 显示：单轮盘（时空中点盘）
    isDual: true,                 // 输入：双人
    showElements: false,
    api: 'DAVISON',               // 待开发
    calculation: '计算两人出生时间和地点的中点，重新排盘'
  }
};
```

### 计算逻辑说明

| 盘型 | 计算方法 | 数据来源 | 特殊处理 |
|------|---------|---------|---------|
| natal | 直接计算出生时刻行星位置 | 单次 Swiss Ephemeris 调用 | 无 |
| transit | 本命盘 + 当前行运位置 | 两次计算：本命 + 当前 | 需计算跨时间相位 |
| solar_return | 太阳回归时刻重新排盘 | 计算太阳回归精确时刻 | 需迭代查找太阳回归点 |
| pro_secondary | 次限推运计算 | 出生后第 N 天的行星位置 | 一天 = 一年换算 |
| pro_tertiary | 三限推运计算 | 出生后第 N 天的行星位置 | 一天 = 一月换算 |
| synastry | 两个独立本命盘比较 | 两次独立计算 | 计算跨盘相位，不生成新盘 |
| composite | 中点法合成盘 | 两人数据 → 计算中点 | 每个行星取中点，生成新盘 |
| davison | 时空中点法 | 时间地点中点 → 重新排盘 | 先算中点时空，再排盘 |

## 相位矩阵设计

### 单人盘相位矩阵

三角矩阵，行列为主要星体（日月水金火木土天海冥 + 北交 + ASC + MC）。

```
         ☉  ☽  ☿  ♀  ♂  ♃  ♄  ♅  ♆  ♇  ☊  Asc MC
    ☉
    ☽    □
    ☿    △  ☌
    ♀    ☍  ✱  -
    ♂    -  □  △  ☌
    ♃    △  -  -  ☍  ✱
    ♄    -  △  -  -  -  □
    ♅    ☌  -  △  -  -  -  ☍
    ♆    -  -  -  △  -  -  -  ✱
    ♇    -  -  -  -  △  -  -  -  ☌
    ☊    -  -  -  -  -  △  -  -  -  -
   Asc   -  -  -  -  -  -  △  -  -  -  -
   MC    -  -  -  -  -  -  -  △  -  -  -  -
```

### 双人盘相位矩阵

显示甲方行星（行）与乙方行星（列）的跨盘相位。

```
      甲☉ 甲☽ 甲☿ 甲♀ 甲♂ 甲♃ 甲♄ ...
乙☉   □   △   -   ☍   ✱   -   -
乙☽   -   ☌   □   △   -   ☍   -
乙☿   △   -   -   ✱   -   -   □
乙♀   -   ☍   △   ☌   -   -   -
...
```

## 权衡与决策

### 决策 1：是否抽取公共组件

**选项 A**: 创建独立的 `data-display` 组件

优点：
- 代码复用性高
- 维护集中

缺点：
- 需要额外开发时间
- 增加组件间通信复杂度

**选项 B**: 在 chart 页面内复制代码

优点：
- 快速实现
- 不影响现有页面

缺点：
- 代码重复

**决策**: 选择 **选项 B**（复制代码）。

理由：
1. 本次优化范围明确，不会大规模扩展
2. 各页面的数据结构略有差异，抽象成本高
3. 后续可在 `utils/chart-data-builders.js` 中提取公共函数

### 决策 2：推运盘 API 不存在时的处理

**选项 A**: 前端显示「功能开发中」

优点：
- 不阻塞主流程
- 用户体验友好

**选项 B**: 隐藏未支持的盘型

优点：
- 界面简洁

缺点：
- 用户不知道有此功能

**决策**: 选择 **选项 A**（显示开发中提示）。

### 决策 3：行运盘的 API 调用策略

**选项 A**: 新增专用行运盘 API

优点：
- 数据结构优化
- 减少前端处理

缺点：
- 需要后端开发

**选项 B**: 前端组合 natal + daily API

优点：
- 无需后端修改
- 复用现有逻辑

缺点：
- 前端逻辑复杂

**决策**: 选择 **选项 B**（前端组合）。

理由：
1. daily 页面已有成熟实现
2. 减少后端工作量
3. 数据结构已验证可行

## 性能考量

1. **星盘组件尺寸**：根据屏幕宽度动态计算，避免过大导致渲染卡顿
2. **折叠面板懒加载**：只有展开时才渲染内容
3. **API 调用优化**：单人盘只调用一次 API，双人盘复用 synastry API

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| API 调用失败 | 显示「排盘失败，请重试」Toast |
| 数据格式异常 | 显示空状态，不崩溃 |
| 推运盘 API 不存在 | 显示「功能开发中」卡片 |
| 城市无法识别 | 显示「请输入有效城市」提示 |
