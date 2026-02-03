# Tasks: 优化双人合盘 Prompt 系统

## Phase 1: 文化层扩展

### 1.1 关系占星师角色设定
- [x] 1.1.1 创建 `backend/src/prompts/cultural/synastry-persona.ts`
  - 实现 `SYNASTRY_PERSONA` 常量（关系占星师角色设定）
  - 实现 `getSynastryPersona()` 导出函数
  - 包含核心原则（不做绝对判断、平衡呈现、赋能导向、具体落地）
  - 包含语言风格指南
- [x] 1.1.2 更新 `backend/src/prompts/cultural/index.ts` 导出

**验证**：`import { SYNASTRY_PERSONA } from '../cultural'` 正常工作 ✅

### 1.2 合盘相位解读知识库
- [x] 1.2.1 创建 `backend/src/prompts/cultural/metaphors/synastry-aspects.ts`
  - 实现 `SYNASTRY_ASPECT_KNOWLEDGE` 对象
  - 包含日月相位（合/拱/刑/冲）解读
  - 包含金火相位解读
  - 包含土星相位解读
  - 包含冥王星相位解读
  - 包含北交点相位解读
  - 实现 `getSynastryAspectMeaning(planet1, planet2, aspect)` 函数
- [x] 1.2.2 更新 `backend/src/prompts/cultural/metaphors/index.ts` 导出

**验证**：`getSynastryAspectMeaning('sun', 'moon', 'conjunction')` 返回正确解读 ✅

---

## Phase 2: 模板层重写

### 2.1 本命盘分析（关系视角）
- [x] 2.1.1 重写 `backend/src/prompts/templates/synastry/natal-a.ts`
  - 更新 system prompt 对齐 6 维度框架
  - 维度：核心自我、情感内核、爱的语言、欲望与行动、关系模式、成长课题
  - 字数范围：核心自我 80-120 字、情感内核 80-120 字、爱的语言 80-120 字、欲望与行动 60-100 字、关系模式 100-150 字、成长课题 80-120 字
  - 输出 JSON 包含 `keywords` 数组和 `summary_sentence`
  - 版本号递增至 3.0
- [x] 2.1.2 重写 `backend/src/prompts/templates/synastry/natal-b.ts`
  - 同 natal-a.ts 结构
  - 版本号递增至 3.0

**验证**：输出 JSON 包含 6 个维度字段和 summary_sentence ✅

### 2.2 比较盘分析
- [x] 2.2.1 重写 `backend/src/prompts/templates/synastry/compare-ab.ts`
  - 更新 system prompt 对齐 8 维度框架
  - 维度：吸引力、情感共鸣、爱情浪漫、激情欲望、沟通理解、价值观契合、长期稳定、挑战成长
  - 每维度包含 score（评分）、content、key_aspects
  - 评分参考标准（90-100 极度契合 ... <50 较大挑战）
  - 输出 JSON 包含 `overall_chemistry` 汇总
  - 版本号递增至 3.0
- [x] 2.2.2 重写 `backend/src/prompts/templates/synastry/compare-ba.ts`
  - 同 compare-ab.ts 结构，视角反转（B 对 A）
  - 版本号递增至 3.0

**验证**：输出 JSON 包含 8 个维度字段和 overall_chemistry ✅

### 2.3 组合盘分析
- [x] 2.3.1 重写 `backend/src/prompts/templates/synastry/composite.ts`
  - 更新 system prompt 对齐 6 维度框架
  - 维度：关系核心身份、情感基调、表达方式、动力方向、深层主题、挑战礼物
  - 输出 JSON 包含 `relationship_essence`（比喻 + 一句话总结）
  - 版本号递增至 3.0

**验证**：输出 JSON 包含 6 个维度字段和 relationship_essence ✅

### 2.4 综合报告
- [x] 2.4.1 创建 `backend/src/prompts/templates/synastry/comprehensive-report.ts`
  - 实现 `synastryComprehensiveReportPrompt` 模板
  - system prompt 包含 5 个部分：开篇总述、契合之处、需要经营的地方、相处小贴士、祝福
  - user prompt 接收本命盘、比较盘、组合盘分析摘要
  - 输出 JSON 包含 `compatibility_overview`
  - 版本号 1.0
- [x] 2.4.2 更新 `backend/src/prompts/templates/synastry/index.ts`
  - 导出 `synastryComprehensiveReportPrompt`
  - 添加到 `synastryPrompts` 数组

**验证**：`buildPrompt('synastry-comprehensive-report', ctx)` 正常工作 ✅

---

## Phase 3: 指令层扩展

### 3.1 合盘输出格式规范
- [x] 3.1.1 创建 `backend/src/prompts/instructions/synastry-output.ts`
  - 实现 `SYNASTRY_OUTPUT_INSTRUCTION` 常量
  - 定义评分标准（90-100/80-89/70-79/60-69/50-59/<50）
  - 定义字数范围规范
  - 定义语言风格提醒（避免转折词开头、避免绝对化表达、使用"你们"称呼）
- [x] 3.1.2 更新 `backend/src/prompts/instructions/index.ts` 导出

**验证**：`import { SYNASTRY_OUTPUT_INSTRUCTION } from '../instructions'` 正常工作 ✅

---

## Phase 4: 整合与验证

### 4.1 更新主入口
- [x] 4.1.1 更新 `backend/src/prompts/index.ts`
  - 导出新增的 cultural 模块（SYNASTRY_PERSONA）
  - 导出新增的 metaphors 模块（SYNASTRY_ASPECT_KNOWLEDGE）
  - 导出新增的 instructions 模块（SYNASTRY_OUTPUT_INSTRUCTION）

### 4.2 FOLDER.md 文档更新
- [x] 4.2.1 更新 `backend/src/prompts/FOLDER.md`
  - 添加 `synastry-persona.ts` 说明
  - 添加 `synastry-aspects.ts` 说明
  - 添加 `synastry-output.ts` 说明
  - 添加 `comprehensive-report.ts` 说明
  - 更新合盘模块 Prompt 数量（15 → 16）

### 4.3 本地验证
- [x] 4.3.1 编译验证：`cd backend && npm run build` ✅
- [x] 4.3.2 输出格式验证：Prompt 结构符合预期 JSON 结构
- [x] 4.3.3 Token 优化验证：system prompt 使用精简格式

---

## 完成进度

- **Phase 1**: 4/4 完成 ✅
- **Phase 2**: 7/7 完成 ✅
- **Phase 3**: 2/2 完成 ✅
- **Phase 4**: 5/5 完成 ✅

**总计**: 18/18 任务完成 ✅

---

## 验收标准

1. [x] 所有新增文件通过 TypeScript 编译
2. [x] 6 个重写的 Prompt 输出 JSON 格式符合设计文档
3. [x] 1 个新增的 Prompt（comprehensive-report）正常工作
4. [x] 相位解读知识库覆盖日月、金火、土星、冥王、北交点相位
5. [x] FOLDER.md 文档完整更新
6. [x] 无 lint 错误
