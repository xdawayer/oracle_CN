# add-career-topic-report

## Motivation

当前本命深度解读中的事业模块仅 700-900 字，无法满足用户对职业方向、职场人际、人生使命的深度解读需求。中国年轻用户对"考公""考研""跳槽""副业""创业"等职业话题有极强关注度。

独立的事业专题报告将：
- 从职业天赋、职场人际、人生使命、未来运势四个维度进行深度解读
- 总计 2600-3500 字
- 深入中国用户关注的"体制内/体制外""考公考编""副业"等维度
- 为学生群体提供备考/考试运势解读
- 包含未来12个月事业行运预测

## Goals

1. 复用通用报告框架，注册 `career-topic` 报告类型
2. 新增 4 个 Prompt 模板模块（talent, workplace, mission, forecast）
3. 后端提取事业相关星盘数据（MC/10宫/6宫/2宫/土星/木星/太阳/火星/水星/北交 + 行运）
4. "本我"页面专题入口卡片（蓝紫色调）
5. 前端复用通用 report 页面

## Scope

### In Scope
- 后端：`career-topic-task.ts` 配置 + 4 个 Prompt 模板
- 后端：事业相关星盘数据提取逻辑
- 前端：专题入口卡片（事业部分）
- 前端：report 页面支持 `career-topic` 类型

### Out of Scope
- AI 问答功能变更
- 支付流程变更
- 其他专题报告

## Key Deliverables

| 交付物 | 说明 |
|--------|------|
| `career-topic-task.ts` | ReportConfig 配置 |
| Prompt 模板 × 4 | talent/workplace/mission/forecast |
| 前端入口 | 专题卡片中的事业入口 |
| report 页面适配 | 蓝紫色模块色条 |

## Dependencies
- 通用报告框架（已存在）
- 星历计算服务（已存在）
