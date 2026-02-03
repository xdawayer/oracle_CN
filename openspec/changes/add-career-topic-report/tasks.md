# add-career-topic-report Tasks

## Phase 1: 后端配置与数据层

- [ ] **Task 1.1**: 创建 `career-topic-task.ts`
  - 定义 `CAREER_TOPIC_CONFIG: ReportConfig`
  - 4 个模块：talent, workplace, mission, forecast
  - 3 个批次
  - 质量校验规则
  - 注册到 `REPORT_CONFIGS`
  - **校验**：`/api/report/meta?reportType=career-topic` 返回正确

- [ ] **Task 1.2**: 实现事业相关数据提取
  - `buildContext` 中提取 MC/10宫/6宫/2宫/土星/木星/太阳/火星/水星/北交南交
  - 行运数据计算（过境10/6/2宫、土星与MC/太阳相位、水逆等）
  - **校验**：日志输出数据结构完整

## Phase 2: Prompt 模板（与 Phase 1 并行）

- [ ] **Task 2.1**: 创建 `prompts/templates/career-topic/`
  - `index.ts`、`system.ts`
  - 系统提示词含中国职场特化规则

- [ ] **Task 2.2**: talent 模块 Prompt（900-1200字，最核心）
  - 4章节：社会角色天赋、工作方式节奏、职业方向参考（3-4集群）、与体制的关系
  - 含考公/考研/副业等中国特色

- [ ] **Task 2.3**: workplace 模块 Prompt（500-700字）
  - 4章节：团队角色、与权威关系、领导力风格、合伙与竞争

- [ ] **Task 2.4**: mission 模块 Prompt（600-800字）
  - 4章节：舒适区vs成长方向、机遇方向、人生蜕变领域、长期总建议

- [ ] **Task 2.5**: forecast 模块 Prompt（600-800字）
  - 6章节：全年基调、机遇窗口、压力考验、水逆火逆、学生版、关键日期

## Phase 3: 后端集成

- [ ] **Task 3.1**: 摘要注入逻辑
- [ ] **Task 3.2**: API 端到端测试

## Phase 4: 前端

- [ ] **Task 4.1**: report 页面支持 career-topic 类型（蓝紫色条）
- [ ] **Task 4.2**: "本我"页面入口区域（与爱情/财富提案共建）

## Phase 5: 测试与优化

- [ ] **Task 5.1**: 端到端测试
- [ ] **Task 5.2**: Prompt 调优（多盘面验证差异化）
