# Tasks: Prompt 架构重构

## Phase 1: 基础架构

### 1.1 创建目录结构
- [x] 1.1.1 创建 `backend/src/prompts/core/` 目录
- [x] 1.1.2 创建 `backend/src/prompts/templates/` 及子目录（natal/daily/synastry/cbt/ask/synthetica/kline/wiki）
- [x] 1.1.3 创建 `backend/src/prompts/cultural/` 及子目录（metaphors/）
- [x] 1.1.4 创建 `backend/src/prompts/instructions/` 目录

### 1.2 实现核心层
- [x] 1.2.1 实现 `core/types.ts`（PromptMeta、PromptContext、PromptTemplate 类型）
- [x] 1.2.2 实现 `core/registry.ts`（注册表单例）
- [x] 1.2.3 实现 `core/builder.ts`（Prompt 构建器）
- [x] 1.2.4 实现 `core/cache.ts`（缓存 key 生成逻辑）
- [x] 1.2.5 实现 `core/index.ts`（统一导出）

### 1.3 验证基础架构
- [ ] 1.3.1 编写 `core/` 层单元测试
- [ ] 1.3.2 确保与现有 `ai.ts` 调用兼容

---

## Phase 2: 文化适配层

### 2.1 角色与语气
- [x] 2.1.1 实现 `cultural/persona.ts`（DEFAULT_PERSONA、HEALING_PERSONA、ANALYTICAL_PERSONA）
- [x] 2.1.2 实现 `cultural/tone.ts`（TONE_GUIDE、OUTPUT_RULES）

### 2.2 比喻库
- [x] 2.2.1 实现 `cultural/metaphors/planets.ts`（10 颗行星本土化比喻）
- [x] 2.2.2 实现 `cultural/metaphors/aspects.ts`（5 种相位比喻）
- [x] 2.2.3 实现 `cultural/metaphors/houses.ts`（12 宫比喻）
- [x] 2.2.4 实现 `cultural/metaphors/index.ts`（统一导出）

### 2.3 场景与心理学
- [x] 2.3.1 实现 `cultural/scenarios.ts`（关系/情绪/成长场景库）
- [x] 2.3.2 实现 `cultural/psychology.ts`（荣格/依恋/CBT 概念映射）
- [x] 2.3.3 实现 `cultural/index.ts`（getCulturalConfig 函数）

### 2.4 通用指令
- [x] 2.4.1 实现 `instructions/output-format.ts`（JSON 输出格式规范）
- [x] 2.4.2 实现 `instructions/safety.ts`（安全边界指令）
- [x] 2.4.3 实现 `instructions/index.ts`（统一导出）

---

## Phase 3A: P0 核心 Prompts（12 个）

### 3A.1 日运模块
- [x] 3A.1.1 实现 `templates/daily/forecast.ts`（daily-forecast）
- [x] 3A.1.2 实现 `templates/daily/detail.ts`（daily-detail）

### 3A.2 本命盘模块
- [x] 3A.2.1 实现 `templates/natal/overview.ts`（natal-overview）
- [x] 3A.2.2 实现 `templates/natal/core-themes.ts`（natal-core-themes）
- [x] 3A.2.3 实现 `templates/natal/dimension.ts`（natal-dimension）
- [x] 3A.2.4 实现 `templates/natal/detail/big3.ts`（detail-big3-natal）

### 3A.3 合盘模块
- [x] 3A.3.1 实现 `templates/synastry/overview.ts`（synastry-overview）
- [x] 3A.3.2 实现 `templates/synastry/highlights.ts`（synastry-highlights）

### 3A.4 其他核心
- [x] 3A.4.1 实现 `templates/cbt/analysis.ts`（cbt-analysis）
- [x] 3A.4.2 实现 `templates/ask/answer.ts`（ask-answer）
- [x] 3A.4.3 实现 `templates/synthetica/analysis.ts`（synthetica-analysis）
- [x] 3A.4.4 实现 `templates/wiki/home.ts`（wiki-home）

### 3A.5 验证 P0
- [ ] 3A.5.1 P0 Prompt 输出质量 A/B 测试
- [ ] 3A.5.2 更新 `ai.ts` 切换至新 Prompt

---

## Phase 3B: P1 重要 Prompts（16 个）

### 3B.1 本命盘详情
- [x] 3B.1.1 实现 `templates/natal/detail/elements.ts`（detail-elements-natal）
- [x] 3B.1.2 实现 `templates/natal/detail/aspects.ts`（detail-aspects-natal）
- [x] 3B.1.3 实现 `templates/natal/detail/planets.ts`（detail-planets-natal）

### 3B.2 日运详情
- [x] 3B.2.1 实现 `templates/daily/transit/advice.ts`（detail-advice-transit）
- [x] 3B.2.2 实现 `templates/daily/transit/time-windows.ts`（detail-time-windows-transit）
- [x] 3B.2.3 实现 `templates/daily/transit/aspect-matrix.ts`（detail-aspect-matrix-transit）
- [x] 3B.2.4 实现 `templates/daily/transit/planets.ts`（detail-planets-transit）
- [x] 3B.2.5 实现 `templates/daily/transit/weekly-trend.ts`（detail-weekly-trend-transit）

### 3B.3 合盘详情
- [x] 3B.3.1 实现 `templates/synastry/core-dynamics.ts`（synastry-core-dynamics）
- [x] 3B.3.2 实现 `templates/synastry/vibe-tags.ts`（synastry-vibe-tags）
- [x] 3B.3.3 实现 `templates/synastry/growth-task.ts`（synastry-growth-task）
- [x] 3B.3.4 实现 `templates/synastry/conflict-loop.ts`（synastry-conflict-loop）
- [x] 3B.3.5 实现 `templates/synastry/natal-a.ts`（synastry-natal-a）
- [x] 3B.3.6 实现 `templates/synastry/natal-b.ts`（synastry-natal-b）

### 3B.4 其他 P1
- [x] 3B.4.1 实现 `templates/cbt/aggregate-analysis.ts`（cbt-aggregate-analysis）
- [x] 3B.4.2 实现 `templates/kline/cycle-naming.ts`（cycle-naming）

---

## Phase 3C: P2 增强 Prompts（10 个）

### 3C.1 本命盘增强
- [x] 3C.1.1 实现 `templates/natal/detail/asteroids.ts`（detail-asteroids-natal）
- [x] 3C.1.2 实现 `templates/natal/detail/rulers.ts`（detail-rulers-natal）

### 3C.2 日运增强
- [x] 3C.2.1 实现 `templates/daily/transit/asteroids.ts`（detail-asteroids-transit）
- [x] 3C.2.2 实现 `templates/daily/transit/rulers.ts`（detail-rulers-transit）
- [x] 3C.2.3 实现 `templates/daily/transit/astro-report.ts`（detail-astro-report-transit）

### 3C.3 合盘增强
- [x] 3C.3.1 实现 `templates/synastry/weather-forecast.ts`（synastry-weather-forecast）
- [x] 3C.3.2 实现 `templates/synastry/action-plan.ts`（synastry-action-plan）
- [x] 3C.3.3 实现 `templates/synastry/practice-tools.ts`（synastry-practice-tools）
- [x] 3C.3.4 实现 `templates/synastry/relationship-timing.ts`（synastry-relationship-timing）
- [x] 3C.3.5 实现 `templates/synastry/compare-ab.ts`（synastry-compare-ab）
- [x] 3C.3.6 实现 `templates/synastry/compare-ba.ts`（synastry-compare-ba）
- [x] 3C.3.7 实现 `templates/synastry/composite.ts`（synastry-composite）

### 3C.4 CBT 增强
- [x] 3C.4.1 实现 `templates/cbt/somatic-analysis.ts`（cbt-somatic-analysis）
- [x] 3C.4.2 实现 `templates/cbt/root-analysis.ts`（cbt-root-analysis）
- [x] 3C.4.3 实现 `templates/cbt/mood-analysis.ts`（cbt-mood-analysis）
- [x] 3C.4.4 实现 `templates/cbt/competence-analysis.ts`（cbt-competence-analysis）

---

## Phase 4: 测试与清理

### 4.1 集成测试
- [ ] 4.1.1 编写所有 Prompt 的输出格式验证测试
- [ ] 4.1.2 与 `ai.ts` 服务层集成测试
- [ ] 4.1.3 端到端功能测试

### 4.2 清理旧代码
- [x] 4.2.1 备份 `manager.ts` 至 `manager.ts.bak`
- [x] 4.2.2 更新 `prompts/index.ts` 导出新模块
- [ ] 4.2.3 移除 `manager.ts` 中已迁移的 Prompt（保留备份，待集成验证后移除）
- [ ] 4.2.4 移除 `common.ts`（保留备份，待集成验证后移除）
- [x] 4.2.5 整合 `self-page/` 内容至 `templates/natal/detail/`（功能已覆盖，保留旧文件备用）
- [ ] 4.2.6 删除空目录和废弃文件（待集成验证后执行）

### 4.3 文档更新
- [x] 4.3.1 更新 `prompts/FOLDER.md` 文档
- [x] 4.3.2 编写新架构使用说明（包含在 FOLDER.md 中）
- [x] 4.3.3 更新 CLAUDE.md 中的 Prompt 相关说明

---

## 完成进度

- **Phase 1**: 5/7 完成（待单元测试和集成验证）
- **Phase 2**: 10/10 完成 ✅
- **Phase 3A**: 13/14 完成（待 A/B 测试）
- **Phase 3B**: 16/16 完成 ✅
- **Phase 3C**: 15/15 完成 ✅
- **Phase 4**: 7/12 完成（ai.ts 集成完成，待测试验证后删除旧文件）

**总计已实现 Prompt**: 43 个（不含 annual 模块，由用户并行处理）

---

## 待办事项（需要后续处理）

1. **集成测试**: 需要在实际环境中测试新 Prompt 的输出质量
2. ✅ **ai.ts 集成**: 已更新服务层调用新的 Prompt 系统（import 路径和 buildCacheKey 参数）
3. **旧代码清理**: 已添加 @deprecated 注释，集成验证通过后删除 manager.ts 和 common.ts
4. ✅ **CLAUDE.md 更新**: 已添加 Prompt 架构相关说明

---

## 验收标准

1. ✅ 所有 38+ 个 Prompt 迁移完成
2. [ ] 新旧架构输出质量无明显差异（待 A/B 测试）
3. ✅ 无英文版本残留（全部中文本土化）
4. ✅ 目录结构符合设计文档
5. [ ] 缓存机制正常工作（待集成测试）
6. ✅ 文档完整更新（FOLDER.md 已更新）
