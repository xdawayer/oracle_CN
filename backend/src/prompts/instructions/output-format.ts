/**
 * 输出格式指令（精简版）
 *
 * AI 已知如何输出 JSON，只需简单提醒
 */

/** JSON 输出基础指令 - 精简版 */
export const JSON_OUTPUT_INSTRUCTION = `输出：纯 JSON，无 markdown 标记，简体中文`;

/** 详情解读格式（用于 detail-* 类型的 Prompt） */
export const DETAIL_INTERPRETATION_FORMAT = `## interpretation 字段格式要求

使用 Markdown，且只允许 3 个以 ### 开头的分区标题，顺序固定：

### 核心观点
- 观点：[要点1]
- 观点：[要点2]
（2-4 条）

### 机制拆解
- 机制：[要点1]
- 机制：[要点2]
（2-3 条）

### 可执行建议
- 建议：[要点1]
- 建议：[要点2]
（3-5 条）

规则：
- 每个分区只使用 "-" 项列表，不要写成连续段落
- 每条 1 句话
- 每条要点必须以固定前缀开头
- 分区之间空行
- 不要使用粗体、编号或表格
- 仅 interpretation 字段允许 Markdown，其他字段保持纯文本`;

/** 详情输出结构指令 */
export const DETAIL_OUTPUT_INSTRUCTION = `## 输出结构

{
  "title": "模块标题（简短有力，纯文本）",
  "summary": "简要总结，2-3 句，纯文本",
  "highlights": [
    "关键要点1",
    "关键要点2",
    "关键要点3"
  ],
  "interpretation": "详见 interpretation 格式要求"
}

要求：
- title：模块标题，必须先陈述占星术语的定义或基本信息
- summary：2-3 句，先解释该占星术语是什么，再说明其核心意义
- highlights：3-5 条，每条 1 句，第一条必须是对该占星术语的通俗解释
- interpretation：Markdown 格式，详见格式要求

${DETAIL_INTERPRETATION_FORMAT}
${JSON_OUTPUT_INSTRUCTION}`;

/** 评分字段规范 */
export const SCORE_FIELD_RULES = `## 评分规范

score 字段使用 0-100 整数：
- 90-100：非常积极/高度和谐
- 70-89：整体良好，小有挑战
- 50-69：中性，有成长机会
- 30-49：挑战较多，需要关注
- 0-29：需要特别留意

注意：分数不代表"好坏"，而是表示"倾向"或"强度"。`;

/** 通用字段命名规范 */
export const FIELD_NAMING_RULES = `## 字段命名规范

| 用途 | 字段名 | 说明 |
|------|--------|------|
| 标题 | title | 简短标题 |
| 摘要 | summary | 1-3 句总结 |
| 描述 | description | 详细描述 |
| 评分 | score | 0-100 整数 |
| 关键词 | keywords | 字符串数组 |
| 建议 | advice / tips | 单条/多条建议 |
| 场景 | scenarios / examples | 具体场景或例子 |
| 亮点 | highlights | 重点条目数组 |`;

/** 获取 JSON 输出指令 */
export function getJsonOutputInstruction(): string {
  return JSON_OUTPUT_INSTRUCTION;
}

/** 获取详情输出指令 */
export function getDetailOutputInstruction(): string {
  return DETAIL_OUTPUT_INSTRUCTION;
}
