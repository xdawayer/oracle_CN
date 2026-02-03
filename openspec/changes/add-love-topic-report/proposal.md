# add-love-topic-report

## Motivation

当前"本命深度解读"中的爱情模块仅 800-1100 字，无法满足用户对感情关系深度解读的需求。中国年轻用户对爱情/婚恋话题有极高的付费意愿和内容消费需求。

独立的爱情专题报告将：
- 从爱情人格画像、理想伴侣、关系课题、未来运势四个维度进行深度解读
- 总计 2700-3500 字，远超本命报告的爱情章节
- 融入中国用户特有关注点（暧昧期、见家长、考虑结婚等）
- 包含未来12个月桃花/感情行运预测
- 与合盘报告形成产品联动（转化钩子）

## Goals

1. 复用通用报告框架，注册 `love-topic` 报告类型
2. 新增 4 个 Prompt 模板模块（personality, partner, growth, forecast）
3. 后端提取爱情相关星盘数据（金星/火星/月亮/5宫/7宫/8宫/Juno/北交南交 + 行运）
4. "本我"页面新增专题入口卡片（爱情/事业/财富三并列，爱情为粉红色调）
5. 前端复用通用 report 页面

## Scope

### In Scope
- 后端：`love-topic-task.ts` 配置 + 4 个 Prompt 模板
- 后端：爱情相关星盘数据提取逻辑
- 前端："本我"页面新增专题报告入口区域
- 前端：report 页面支持 `love-topic` 类型

### Out of Scope
- 合盘（synastry）功能变更
- 支付流程变更（复用现有机制）
- 其他专题报告（事业/财富由独立提案负责）

## Key Deliverables

| 交付物 | 说明 |
|--------|------|
| `love-topic-task.ts` | ReportConfig 配置（4模块、3批次、质量校验） |
| Prompt 模板 × 4 | personality/partner/growth/forecast |
| "本我"页面入口 | 3个专题卡片中的爱情入口 |
| 通用 report 页面适配 | 模块色条、标题等 |

## Dependencies
- 通用报告框架（`report-task.ts`）—— 已存在
- 通用报告API（`api/report.ts`）—— 已存在
- 星历计算服务（`ephemeris.ts`）—— 已存在，需扩展行运数据
