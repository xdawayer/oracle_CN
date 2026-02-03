# add-wealth-topic-report

## Motivation

当前本命深度解读中的财富模块仅 500-700 字，无法深入分析用户与金钱的心理动态和财富增长路径。年轻用户对"怎么赚钱""理财方向""财运"话题有持续关注。

独立的财富专题报告将：
- 从金钱关系、财富路径、财务盲区、未来运势四个维度进行深度解读
- 总计 2500-3300 字
- 结合占星与财务心理学视角
- 严格遵守免责声明规范（不构成投资建议）
- 包含未来12个月财运预测

## Goals

1. 复用通用报告框架，注册 `wealth-topic` 报告类型
2. 新增 4 个 Prompt 模板模块（money-relation, potential, blindspot, forecast）
3. 后端提取财富相关星盘数据（2宫/8宫/11宫/金星/木星/土星/冥王星/北交 + 行运）
4. "本我"页面专题入口卡片（金色调）
5. 前端复用通用 report 页面

## Scope

### In Scope
- 后端：`wealth-topic-task.ts` 配置 + 4 个 Prompt 模板
- 后端：财富相关星盘数据提取逻辑
- 前端：专题入口卡片（财富部分）
- 前端：report 页面支持 `wealth-topic` 类型

### Out of Scope
- 投资建议或理财功能
- 支付流程变更
- 其他专题报告

## Key Deliverables

| 交付物 | 说明 |
|--------|------|
| `wealth-topic-task.ts` | ReportConfig 配置 |
| Prompt 模板 × 4 | money-relation/potential/blindspot/forecast |
| 前端入口 | 专题卡片中的财富入口 |
| report 页面适配 | 金色模块色条 |

## Dependencies
- 通用报告框架（已存在）
- 星历计算服务（已存在）
