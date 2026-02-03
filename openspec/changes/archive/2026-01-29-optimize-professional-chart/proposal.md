# 专业排盘工具优化提案

## 变更 ID
`optimize-professional-chart`

## 背景

当前「发现 - 专业排盘」页面功能较为基础，仅展示行星位置表格。用户在排盘后需要更丰富的数据展示，包括：
- 星盘可视化（根据盘型自动选择单人盘/双人盘显示）
- 相位矩阵
- 行星信息
- 小行星信息
- 宫主星信息
- 元素矩阵（仅单人盘）

本次优化旨在让专业排盘成为一个**纯数据展示工具**，只调用 Swiss Ephemeris 计算引擎，不依赖 AI 解读。

## 目标

1. **星盘可视化**：根据用户选择的盘型动态显示
   - 单人盘（natal/transit/推运盘）：显示单轮盘
   - 双人盘（synastry/composite/davison）：显示双轮盘

2. **数据模块化展示**：参考「本我」（单人盘）和「今日运势」（双人盘）的折叠面板设计
   - 相位矩阵（所有盘型）
   - 行星信息（所有盘型）
   - 小行星信息（所有盘型）
   - 宫主星信息（所有盘型）
   - 元素矩阵（仅单人盘）

3. **纯数据展示**：不需要「查看详情」按钮，不依赖 AI，直接显示计算数据

## 现状分析

### 现有页面结构 (`miniprogram/pages/chart/`)

- **chart.js**: 支持 8 种盘型选择，调用 `NATAL_CHART` 和 `SYNASTRY_TECHNICAL` API
- **chart.wxml**: 显示行星位置表格，区分 natal/synastry 结果视图
- **chart.wxss**: 基础样式

### 参考实现

1. **本我页面** (`miniprogram/pages/self/`)
   - 使用 `<astro-chart>` 组件展示本命盘
   - 折叠面板展示：元素矩阵、相位矩阵、行星信息、小行星信息、宫主星信息
   - 数据处理函数：`buildElementMatrix`, `buildAspectMatrix`, `buildPlanetList`, `buildAsteroidList`, `buildHouseRulers`

2. **今日运势页面** (`miniprogram/pages/daily/`)
   - 使用 `<astro-chart type="transit">` 展示双轮盘
   - 展示：相位矩阵、行运行星、行运小行星、宫主星
   - 数据处理函数：`prepareTechnicalData`, `buildAspectMatrix`

### 星盘组件 (`miniprogram/components/astro-chart/`)

支持的 `type` 属性：
- `natal`：单人本命盘
- `transit`：行运盘（双轮）
- `synastry`：合盘比较盘（双轮）
- `composite`：组合盘

## 设计方案

### 盘型分类

| 盘型 ID | 名称 | 星盘组件 type | 是否双人输入 | 显示形式 | 显示元素矩阵 | API 状态 |
|---------|------|--------------|------------|---------|-------------|---------|
| natal | 本命盘 | natal | 否 | 单轮盘 | 是 | ✅ 已支持 |
| transit | 行运盘 | transit | 否 | 双轮盘* | 是 | ⚠️ 需组合 |
| solar_return | 太阳返照 | natal | 否 | 单轮盘 | 是 | ❌ 待开发 |
| pro_secondary | 次限盘 | natal | 否 | 单轮盘 | 是 | ❌ 待开发 |
| pro_tertiary | 三限盘 | natal | 否 | 单轮盘 | 是 | ❌ 待开发 |
| synastry | 合盘-比较盘 | synastry | 是 | 双轮盘 | 否 | ✅ 已支持 |
| composite | 合盘-组合盘 | natal | 是 | 单轮盘** | 否 | ❌ 待开发 |
| davison | 合盘-时空盘 | natal | 是 | 单轮盘** | 否 | ❌ 待开发 |

> *行运盘：内环显示本命盘，外环显示当日行运位置
> **组合盘/时空盘：虽需双人输入，但计算出中点后输出单一盘面，用单轮盘显示

### API 调用策略

| 盘型 | API 端点 | 说明 |
|------|----------|------|
| natal | `/api/natal/chart` | 单人本命盘 |
| transit | `/api/natal/chart` + `/api/daily` | 本命盘 + 当日行运 |
| solar_return | 新增 `/api/progression/solar-return` | 太阳返照盘 |
| pro_secondary | 新增 `/api/progression/secondary` | 次限推运 |
| pro_tertiary | 新增 `/api/progression/tertiary` | 三限推运 |
| synastry | `/api/synastry/technical` | 合盘技术数据 |
| composite | 新增 `/api/composite/chart` | 组合盘 |
| davison | 新增 `/api/davison/chart` | 时空盘 |

### 数据展示模块

参考 `self.wxml` 的折叠面板设计，每个模块为可折叠的 accordion：

#### 1. 星盘可视化（固定显示）
```
<astro-chart
  type="{{chartType}}"
  positions="{{chartPositions}}"
  outerPositions="{{outerPositions}}"  <!-- 双轮盘用 -->
  aspects="{{chartAspects}}"
  houseCusps="{{chartHouseCusps}}"
/>
```

#### 2. 元素矩阵（仅单人盘）
- 复用 `self.wxml` 的 `element-table` 结构
- 显示火/土/风/水 × 开创/固定/变动 的行星分布

#### 3. 相位矩阵
- 单人盘：复用 `self.wxml` 的 `aspect-matrix` 结构
- 双人盘：复用 `daily.wxml` 的跨盘相位矩阵结构

#### 4. 行星信息
- 复用 `planet-info-table` 结构
- 显示：星体、星座、宫位、逆行状态

#### 5. 小行星信息
- 同行星信息结构
- 显示：凯龙、谷神、智神、婚神、灶神、北交、南交、莉莉丝、福点等

#### 6. 宫主星信息
- 复用 `self.wxml` 的 `pi-hr-*` 表格结构
- 显示：宫位、星座、宫主星、飞入宫位

### 用户选择项

在排盘前增加勾选框，让用户选择要显示的模块：
- [x] 星盘（默认勾选，不可取消）
- [x] 相位矩阵
- [x] 行星信息
- [ ] 小行星信息
- [ ] 宫主星信息
- [x] 元素信息（仅单人盘可见）

## 约束

1. **不依赖 AI**：所有数据均来自 Swiss Ephemeris 计算
2. **不显示「查看详情」按钮**：纯数据展示，无需进一步解读
3. **复用现有组件和样式**：最大化复用 `self` 和 `daily` 页面的代码
4. **保持 UI 一致性**：遵循 `COLOR_SYSTEM_GUIDE.md` 规范

## 影响范围

- **前端**：
  - `miniprogram/pages/chart/chart.js`
  - `miniprogram/pages/chart/chart.wxml`
  - `miniprogram/pages/chart/chart.wxss`

- **后端**（如需新增推运盘 API）：
  - 新增 `/api/progression/*` 端点
  - 新增 `/api/composite/chart` 端点
  - 新增 `/api/davison/chart` 端点

## 验收标准

1. 选择任意盘型后，能正确显示对应的星盘可视化
2. 折叠面板能正确展开/收起，且样式与「本我」页面一致
3. 双人盘不显示元素矩阵，单人盘显示
4. 所有数据来自计算引擎，无 AI 调用
5. 用户勾选的模块能正确显示/隐藏
