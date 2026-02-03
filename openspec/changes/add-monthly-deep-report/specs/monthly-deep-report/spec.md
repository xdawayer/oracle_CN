# monthly-deep-report Specification

## Purpose

月度运势深度解读是付费报告体系中的月度级产品，基于用户本命盘数据与当月行运数据，生成个性化的月度运势分析报告。报告包含 6 个模块，总字数 2800-3900 字，通过通用报告框架异步生成。

## Requirements

### Requirement: 月度报告生成

系统 SHALL 支持基于用户本命盘数据和当月行运数据生成月度运势深度解读报告。

报告 SHALL 包含以下 6 个模块：
- 月度总基调（tone）：300-400 字
- 分维度运势（dimensions）：1000-1500 字
- 上中下旬节奏指南（rhythm）：600-800 字
- 新月/满月指南（lunar）：600-800 字
- 关键日期速查表（dates）：表格为主
- 月度行动清单（actions）：300-400 字

报告总字数 SHALL 在 2800-3900 字范围。

#### Scenario: 用户请求生成月度运势报告
- **GIVEN** 用户已完成付费
- **AND** 用户本命盘数据已存在（出生日期、时间、地点）
- **WHEN** 用户请求生成 2026 年 7 月运势报告
- **THEN** 系统按 3 个批次启动 6 个模块生成
- **AND** 各模块完成后可逐个查看
- **AND** 总字数在 2800-3900 字范围

#### Scenario: 缺少出生时间
- **GIVEN** 用户未设置出生时间（accuracy = 'time_unknown'）
- **WHEN** 用户请求生成月度运势报告
- **THEN** 系统使用默认中午 12:00 计算
- **AND** 报告中标注"由于未提供精确出生时间，宫位相关解读仅供参考"

---

### Requirement: 分批并行生成策略

系统 SHALL 按以下 3 个批次生成月度报告模块：

- 批次 1（立即）：tone
- 批次 2（批次 1 完成后并行）：dimensions, rhythm, lunar, dates
- 批次 3（批次 2 完成后）：actions

actions 模块 SHALL 在所有其他模块完成后最后生成，因为它需要综合前序模块的核心结论。

#### Scenario: 分批生成顺序
- **GIVEN** 用户请求生成月度报告
- **WHEN** tone 模块完成
- **THEN** 立即启动 dimensions、rhythm、lunar、dates 的并行生成
- **AND** 不等待用户查看即启动下一批次

#### Scenario: actions 模块等待前序完成
- **GIVEN** 批次 1-2 的 5 个模块均已完成
- **WHEN** 系统启动 actions 模块生成
- **THEN** actions 的 prompt 上下文中 SHALL 包含前序模块的核心摘要

---

### Requirement: 行运数据计算

系统 SHALL 提供月度行运数据计算能力，输出 `MonthlyTransitData` 数据包。

数据包 SHALL 包含：
- 当月公共天象（太阳/行星位置、换座日期、新月/满月信息）
- 用户个人行运（行运过境宫位、行运与本命相位、强度分级）
- 新月/满月与用户个人盘的关系（落入宫位）
- 各维度行运强度总评

行运相位 SHALL 包含精确日期（如木星合MC的精确日期）和容许度。

行运强度 SHALL 分为三级：high（★★★）、medium（★★）、low（★）。

#### Scenario: 计算月度行运数据
- **GIVEN** 用户出生信息为 1995-03-15 14:30 北京
- **WHEN** 系统计算 2026 年 7 月的行运数据
- **THEN** 数据包包含公共天象（新月 7/8、满月 7/22 等）
- **AND** 数据包包含个人行运相位（含精确日期和容许度）
- **AND** 数据包包含各维度强度评分

#### Scenario: 行运日期精确性
- **GIVEN** 木星在 2026 年 7 月 28 日精确合相用户 MC
- **WHEN** 系统计算行运数据
- **THEN** 该相位的 `exactDate` 字段为 "2026-07-28"
- **AND** 容许度字段准确反映当前偏差

---

### Requirement: 模块间摘要注入

系统 SHALL 在后续模块的 prompt 上下文中注入前序模块的核心摘要。

tone 模块完成后，SHALL 提取月度主题命名、能量概述和六维评分，注入到批次 2 所有模块。

批次 2 各模块完成后，SHALL 分别提取 2-3 句核心结论，合并注入到 actions 模块。

#### Scenario: tone 摘要注入到批次 2
- **GIVEN** tone 模块已完成，主题为"聚光灯下的蜕变月"
- **WHEN** 系统生成 dimensions 模块
- **THEN** dimensions 模块的 prompt 上下文中包含 tone 的主题和评分
- **AND** dimensions 的内容与 tone 的基调一致

#### Scenario: 全部摘要注入到 actions
- **GIVEN** 前 5 个模块均已完成
- **WHEN** 系统生成 actions 模块
- **THEN** actions 模块的 prompt 上下文中包含所有前序模块摘要
- **AND** actions 的行动清单是前序模块的精华浓缩

---

### Requirement: Prompt 全局规则

所有月度报告 Prompt 的 system prompt SHALL 包含以下全局规则：

**角色**：温暖务实的占星师，风格如同每月见一次的占星师朋友。

**核心原则**：
- 实用优先：每个信息点翻译为"这个月我该怎么做"
- 节奏感清晰：让用户知道月度快慢节奏
- 轻量但不浅薄：基于真实行运数据
- 情绪基调：开朗务实有陪伴感

**禁止事项**：
- 不预测具体事件
- 不做绝对化断言
- 不使用恐吓性语言
- 不编造数据中不存在的相位
- 健康/财务相关必须附免责声明
- 禁止词："注定""劫数""一定会""绝对不能""很凶""危险""可怕"

**语言风格**：
- 面向中国大陆 18-35 岁年轻用户
- 句子短、段落短、阅读门槛低
- 可用 emoji 辅助（每模块最多 3-4 个）
- 引用中国生活化场景

#### Scenario: 系统规则生效
- **GIVEN** 系统生成 dimensions 模块中的事业维度
- **WHEN** 当月有木星合MC（扩张型能量）
- **THEN** 输出 SHALL 用具体行动建议表述，如"7月25-30日适合推进升职/跳槽/合作"
- **AND** 输出 SHALL NOT 包含"你一定会升职"等绝对化表述

#### Scenario: 困难行运的正面表述
- **GIVEN** 当月有土星刑金星（压力型能量）
- **WHEN** 系统生成感情维度
- **THEN** 输出 SHALL 指出挑战并给出应对方案
- **AND** 输出 SHALL NOT 使用"感情会很糟糕""注定分手"等消极表述
- **AND** 输出 SHALL 用类似"关系升级的必经之路"的建设性框架

---

### Requirement: 质量校验

系统 SHALL 对每个模块的生成结果进行自动质量校验。

校验项 SHALL 包含：
- 字数在目标范围内（±20% 容差）
- 包含该模块必须提及的关键词（如 rhythm 须包含"上旬""中旬""下旬"）
- 不包含禁止词汇
- 不包含不存在于行运数据中的相位或日期

校验不通过时，系统 SHALL 重新生成该模块（最多 1 次额外重试）。

dates 模块以表格为主，字数校验策略为 `flag`（标记但接受）。

#### Scenario: 字数超范围触发重试
- **GIVEN** dimensions 模块目标字数为 1000-1500 字
- **WHEN** AI 生成了 2200 字的内容
- **THEN** 系统标记质量不合格
- **AND** 重新生成该模块

#### Scenario: 关键词缺失触发重试
- **GIVEN** rhythm 模块须包含"上旬""中旬""下旬"
- **WHEN** AI 生成的内容未包含"下旬"
- **THEN** 系统标记质量不合格
- **AND** 重新生成该模块

#### Scenario: 禁止词触发重试
- **GIVEN** 禁止词列表包含"注定"
- **WHEN** actions 模块输出包含"你注定要抓住这个机会"
- **THEN** 系统检测到禁止词
- **AND** 重新生成该模块

---

### Requirement: 报告缓存

月度报告 SHALL 使用以下缓存策略：

- 任务记录 TTL：3 天
- 报告内容 TTL：30 天
- 缓存 key 须包含年月参数：`report:monthly:{userId}:{moduleId}:{yearMonth}:{chartHash}`

同一用户不同月的报告 SHALL 独立缓存。

chartHash 基于用户出生信息计算，出生信息变更后缓存自动失效。

#### Scenario: 缓存命中
- **GIVEN** 用户之前已生成 2026 年 7 月月度报告
- **AND** 出生信息未变更
- **WHEN** 用户再次查看 7 月报告
- **THEN** 系统从缓存返回内容
- **AND** 不调用 AI 生成

#### Scenario: 不同月请求独立
- **GIVEN** 用户已生成 7 月报告
- **WHEN** 用户请求 8 月报告
- **THEN** 缓存不命中（yearMonth 不同）
- **AND** 系统生成新的 8 月报告

#### Scenario: 出生信息变更
- **GIVEN** 用户修改了出生时间
- **WHEN** 用户查看月度报告
- **THEN** chartHash 变更导致缓存不命中
- **AND** 系统重新生成报告

---

### Requirement: 月度报告内容规范

#### 模块A（tone）内容规范

tone 模块 SHALL 输出：
- 月度主题命名（4-8 字，有画面感，对应实际行运）
- 月度能量概述（3-5 句话：定调 → 关键行运 → 心法）
- 六维评分（事业/感情/财务/社交/健康精力/内在成长，1-5 ★，每项附 10 字以内说明）
- 月度关键词（3 个）

#### Scenario: tone 模块输出格式
- **GIVEN** 当月事业运 ★★★★★，感情运 ★★
- **WHEN** 系统生成 tone 模块
- **THEN** 月度主题命名 4-8 字，非泛泛之词
- **AND** 能量概述准确反映事业高光+感情考验的双主线
- **AND** 六维评分与行运强度总评一致

#### 模块B（dimensions）内容规范

dimensions 模块 SHALL 输出 6 个维度的运势分析：
- 事业/学业、爱情/关系、财务、社交/人际、健康/精力、内在成长/灵性
- 各维度篇幅根据当月行运重要程度动态调整
- 爱情维度 SHALL 分「单身」和「有伴」两种情境
- 财务和健康维度 SHALL 在末尾包含免责声明

#### Scenario: 篇幅动态分配
- **GIVEN** 事业维度行运强度 ★★★★★，社交维度 ★★★
- **WHEN** 系统生成 dimensions 模块
- **THEN** 事业维度篇幅 SHALL 在 250-350 字
- **AND** 社交维度篇幅 SHALL 在 150-200 字

#### Scenario: 财务免责声明
- **GIVEN** 系统生成 dimensions 模块的财务维度
- **WHEN** 内容生成完成
- **THEN** 财务维度末尾 SHALL 包含"以上内容不构成投资、理财或财务决策建议"的声明

#### Scenario: 健康免责声明
- **GIVEN** 系统生成 dimensions 模块的健康维度
- **WHEN** 内容生成完成
- **THEN** 健康维度末尾 SHALL 包含"本内容不构成医学建议，如有健康问题请咨询专业医疗人员"的声明

#### 模块C（rhythm）内容规范

rhythm 模块 SHALL 将当月拆分为上旬/中旬/下旬三个时段。

每个时段 SHALL 包含：时段小标题、能量描述、行动建议（✓ 适合做 / ✗ 不建议做）、关键日期提醒。

rhythm 模块的视角 SHALL 与 dimensions 模块不同：dimensions 按主题分，rhythm 按时间线分。

#### Scenario: 上中下旬结构完整
- **GIVEN** 当月为 31 天的月份
- **WHEN** 系统生成 rhythm 模块
- **THEN** 输出包含上旬（1-10 日）、中旬（11-20 日）、下旬（21-31 日）三段
- **AND** 每段包含小标题、能量描述、行动建议

#### 模块D（lunar）内容规范

lunar 模块 SHALL 为当月新月和满月各提供一段能量指南。

新月指南 SHALL 包含：基础信息、个人意义、许愿指南（3-5 条具体方向 + 时间窗口）、仪式建议。

满月指南 SHALL 包含：基础信息、个人意义、需要释放什么、复盘提示（2-3 个反思问题）、实践建议。

如果当月有日食/月食，SHALL 篇幅增加 50% 并强调半年影响周期。

#### Scenario: 新月许愿指南
- **GIVEN** 新月落在用户第 10 宫
- **WHEN** 系统生成 lunar 模块的新月部分
- **THEN** 许愿方向 SHALL 与事业/社会成就相关
- **AND** 许愿方向 SHALL 具体（非"事业顺利"等泛泛之词）
- **AND** 包含许愿时间窗口提醒

#### Scenario: 日食特殊处理
- **GIVEN** 当月新月为日食
- **WHEN** 系统生成 lunar 模块
- **THEN** 新月部分篇幅 SHALL 比正常增加约 50%
- **AND** 内容 SHALL 强调"食相影响持续 6 个月"

#### 模块E（dates）内容规范

dates 模块 SHALL 生成 8-12 个关键日期的速查表。

每个日期 SHALL 包含：日期、天象事件、对用户的影响、建议标签。

⭐ 标记的日期 SHALL 不超过 3 个。

#### Scenario: 关键日期速查表
- **GIVEN** 当月有新月、满月、木星合MC、火星减速等事件
- **WHEN** 系统生成 dates 模块
- **THEN** 输出 8-12 个日期条目
- **AND** ⭐ 标记不超过 3 个
- **AND** 按日期升序排列

#### 模块F（actions）内容规范

actions 模块 SHALL 综合前序模块输出可执行的行动清单。

内容 SHALL 包含：
- 本月最重要的 3 件事（按重要性排序）
- 「适合做」清单（4-6 条）
- 「暂缓/谨慎」清单（2-4 条）
- 月度一句话（值得设为手机壁纸的提醒）

actions 的内容 SHALL 是前序模块的精华浓缩，不 SHALL 包含前序模块未提及的新建议。

#### Scenario: 行动清单一致性
- **GIVEN** dimensions 模块建议"7月25-30日推进事业"
- **AND** rhythm 模块在下旬建议"适合发起新计划"
- **WHEN** 系统生成 actions 模块
- **THEN** "最重要的 3 件事"中 SHALL 包含事业相关行动
- **AND** 行动窗口 SHALL 与前序模块一致

---

### Requirement: 前端入口

"今日运势"页面 SHALL 在底部（本周趋势区域之后）新增"月度运势深度解读"入口卡片。

卡片 SHALL 显示当月月份和简短描述。

点击卡片 SHALL 跳转到通用报告页面：`/pages/report/report?reportType=monthly&year=YYYY&month=MM`。

#### Scenario: 入口卡片展示
- **GIVEN** 当前为 2026 年 7 月
- **WHEN** 用户浏览今日运势页面底部
- **THEN** 显示"7月运势深度解读"入口卡片
- **AND** 卡片包含简短描述文案

#### Scenario: 点击入口跳转
- **GIVEN** 用户看到月度报告入口卡片
- **WHEN** 用户点击卡片
- **THEN** 跳转到 `/pages/report/report?reportType=monthly&year=2026&month=7`

---

### Requirement: 前端报告展示

通用报告展示页面 SHALL 支持 `monthly` 报告类型。

月度报告的标题 SHALL 动态显示月份："X月运势深度解读"。

页面 SHALL 复用以下能力：
- Markdown → HTML 渲染器
- 模块进度条（6 个模块）
- 渐进式渲染
- 任务轮询机制

#### Scenario: 渐进式渲染
- **GIVEN** 用户进入月度报告页面
- **WHEN** tone 模块完成
- **THEN** 页面立即渲染 tone 内容
- **AND** 其他模块显示加载状态
- **AND** 进度条显示 1/6 完成

#### Scenario: 报告全部完成
- **GIVEN** 所有 6 个模块已完成
- **WHEN** 最后的 actions 模块返回
- **THEN** 进度条显示 100% 并淡出
- **AND** 用户可滚动查看完整报告

---

### Requirement: API 端点

月度报告 SHALL 通过通用报告 API 提供服务。

创建端点 SHALL 接受额外参数 `year` 和 `month`。

注册表中 SHALL 包含 `'monthly': MONTHLY_REPORT_CONFIG`。

#### Scenario: 创建月度报告任务
- **GIVEN** 用户已完成付费
- **WHEN** 前端调用 `POST /api/report/create` 并传入 `reportType: 'monthly'`, `year: 2026`, `month: 7`
- **THEN** 系统创建异步任务并立即返回
- **AND** 后台启动分批并行生成

#### Scenario: 查询任务状态
- **GIVEN** 用户已创建月度报告任务
- **WHEN** 前端轮询 `GET /api/report/status?reportType=monthly&year=2026&month=7`
- **THEN** 返回当前任务状态（progress、completedModules、failedModules）

---

### Requirement: 产品联动

月度报告各模块中 SHALL 自然嵌入 3-5 个产品联动引导。

联动引导 SHALL 出现在用户最可能产生好奇心的位置。

联动引导 SHALL NOT 使用强硬推销语气。

#### Scenario: 事业运势联动本命报告
- **GIVEN** dimensions 模块的事业维度提到"核心职业天赋"
- **WHEN** 内容渲染完成
- **THEN** 事业维度末尾 SHALL 包含引导文案指向本命深度解读
- **AND** 文案语气为自然引导，非硬广

#### Scenario: 行动清单联动流年
- **GIVEN** actions 模块提到"全年能量节奏"
- **WHEN** 内容渲染完成
- **THEN** 清单末尾 SHALL 包含引导文案指向流年运势或人生 K 线
