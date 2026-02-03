## 1. 命运山河 - 年度详情弹窗内容丰富

- [x] 1.1 扩充四维分析文案（`kline.js:getDimensionAnalysis`）
  - 每个维度（career/wealth/love/health）的 high/medium/low 各3条文案
  - 每条从1句话扩展为4-5句话（含运势概述、具体表现、时间节奏、实用建议）
- [x] 1.2 扩充占星视角文案（`kline.js:generateYearlyReport` 中 astroSummary 部分）
  - 从1句话扩展为3-4句话
  - 增加12宫位能量解读和具体建议
- [x] 1.3 扩充八字视角文案（`kline.js:generateYearlyReport` 中 baziSummary 部分）
  - 从1句话扩展为3-4句话
  - 增加五行互动和实用指引，按分数区间差异化
- [x] 1.4 丰富个性化寄语（`kline.js:generateYearlyReport` 中 personalMessage 部分）
  - 增加更细的分数区间（70+/55-69/40-54/40以下）
  - 每段寄语增加与年度主题相关的内容
- [x] 1.5 优化行动建议（`kline.js:getActionAdvice`）
  - 每条"宜/忌"从短语扩展为带说明的完整句子

## 2. 人生长卷 - 六章报告内容翻倍

- [x] 2.1 扩充"人生运势总览"（overview）
  - 增加日/月/升三大星体的详细解读
  - 增加元素能量（火/土/风/水）分析
  - 目标：约400-500字 ✓
- [x] 2.2 扩充"往昔回溯"（past）
  - 每个人生阶段（0-12/12-18/18-25/25至今）增加2-3句具体描述
  - 补充生活场景和成长主题
  - 目标：约500-700字 ✓
- [x] 2.3 扩充"当下定位"（present）
  - 增加更详细的星象周期解读
  - 扩展机遇与挑战的维度和描述
  - 目标：约400-500字 ✓
- [x] 2.4 扩充"未来三十载"（future）
  - 每个时期增加具体领域预测
  - 增加可操作的行动指引
  - 目标：约500-700字 ✓
- [x] 2.5 扩充"人生里程碑"（milestone）
  - 每个节点增加"如何应对"建议
  - 增加更贴近生活的描述
  - 目标：约500-700字 ✓
- [x] 2.6 扩充"予未来之我"（letter）
  - 增加与本命盘星座元素相关的个性化内容
  - 增加不同年龄段的差异化表述
  - 目标：约400-600字 ✓

## 3. 后端文案同步

- [x] 3.1 同步更新 `backend/src/services/kline.ts` 中的文案生成函数
  - `generateMajorEvent` - 保持不变（前端也未修改此处）
  - `generateActionAdvice` - 已同步扩充
  - `generateAstroSummary` - 已同步扩充（12宫位 + 建议）
  - `generateBaziSummary` - 已同步扩充（增加 score 参数）
  - `generatePersonalMessage` - 已同步扩充（4档分数区间）

## 4. 验证

- [x] 4.1 TypeScript 编译验证通过
- [x] 4.2 检查所有分数区间的文案覆盖完整性
- [x] 4.3 确认前后端文案一致性
