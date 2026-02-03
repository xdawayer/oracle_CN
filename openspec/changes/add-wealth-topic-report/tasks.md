# add-wealth-topic-report Tasks

## Phase 1: 后端配置与数据层

- [ ] **Task 1.1**: 创建 `wealth-topic-task.ts`
  - 定义 `WEALTH_TOPIC_CONFIG: ReportConfig`
  - 4 个模块：money-relation, potential, blindspot, forecast
  - 3 个批次
  - 质量校验规则（含免责声明关键词检查）
  - 注册到 `REPORT_CONFIGS`
  - **校验**：`/api/report/meta?reportType=wealth-topic` 返回正确

- [ ] **Task 1.2**: 实现财富相关数据提取
  - `buildContext` 中提取 2/8/11宫、金星/木星/土星/冥王星/海王星/月亮
  - 行运数据：木星/金星过境2/10宫、土星/冥王星过境财务宫位、水逆在2/8宫
  - **校验**：日志输出数据结构完整

## Phase 2: Prompt 模板（与 Phase 1 并行）

- [ ] **Task 2.1**: 创建 `prompts/templates/wealth-topic/`
  - `index.ts`、`system.ts`
  - 角色：结合占星与财务心理学的分析师
  - 系统提示词含免责声明强制规则

- [ ] **Task 2.2**: money-relation 模块 Prompt（700-900字）
  - 3章节：金钱原型（2宫深度）、赚钱本能方式（2宫宫主星）、花钱模式（金星+月亮）

- [ ] **Task 2.3**: potential 模块 Prompt（700-900字）
  - 4章节：丰盛通道（木星）、被动收入（8宫）、长期积累（11宫+土星）、增长路径总结

- [ ] **Task 2.4**: blindspot 模块 Prompt（600-800字）
  - 3章节：金钱阴影（困难相位模式）、需疗愈的金钱信念（2宫+4宫交叉）、3条定制理财建议
  - 末尾必须含免责声明

- [ ] **Task 2.5**: forecast 模块 Prompt（500-700字）
  - 5章节：全年基调、收入窗口、谨慎时段、投资合作能量、财务节奏建议
  - 严格禁止推荐具体投资标的

## Phase 3: 后端集成

- [ ] **Task 3.1**: 摘要注入逻辑
- [ ] **Task 3.2**: API 端到端测试

## Phase 4: 前端

- [ ] **Task 4.1**: report 页面支持 wealth-topic 类型（金色色条）
- [ ] **Task 4.2**: "本我"页面入口区域（与爱情/事业提案共建）

## Phase 5: 测试与优化

- [ ] **Task 5.1**: 端到端测试
- [ ] **Task 5.2**: Prompt 调优
- [ ] **Task 5.3**: 免责声明完整性验证（确保每份报告都包含）
