// INPUT: Prompt 共享类型、常量与工具函数。
// OUTPUT: 导出 Prompt 类型定义与共享工具函数。
// POS: Prompt 公共模块；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

/**
 * Prompt 共享模块
 * - 类型定义
 * - 共享常量（语言指令、格式要求）
 * - 工具函数（语言解析、上下文格式化）
 */

// === 类型定义 ===

export interface PromptMeta {
  id: string;
  version: string;
  scenario: 'natal' | 'daily' | 'ask' | 'synastry' | 'wiki';
}

export type PromptSystem = string | ((context: Record<string, unknown>) => string);

export interface PromptTemplate {
  meta: PromptMeta;
  system: PromptSystem;
  user: (context: Record<string, unknown>) => string;
}

// === 共享常量 ===

export const SINGLE_LANGUAGE_INSTRUCTION = `必须使用指定语言输出 JSON，格式为：
{ "lang": "<lang>", "content": {...} }
其中 lang 必须与输入语言一致，只能为 "zh" 或 "en"。
确保 JSON 格式正确，不要添加额外的 markdown 标记或解释文本。`;

export const SINGLE_LANGUAGE_INSTRUCTION_EN = `Return JSON only in the specified language:
{ "lang": "<lang>", "content": {...} }
The lang field must exactly match the input language and be either "zh" or "en".
Do not add markdown fences or extra commentary.`;

// === 工具函数 ===

export const formatLang = (ctx: Record<string, unknown>) => `语言：${String(ctx.lang || 'zh')}`;

// === 合盘专用工具函数 ===

export const resolveSynastryLang = (ctx: Record<string, unknown>) => (ctx.lang === 'en' ? 'en' : 'zh');

export const resolveSynastryName = (ctx: Record<string, unknown>, key: 'nameA' | 'nameB') => {
  const raw = String(ctx[key] || '').trim();
  if (raw) return raw;
  if (resolveSynastryLang(ctx) === 'en') return key === 'nameA' ? 'Person A' : 'Person B';
  return key === 'nameA' ? 'A' : 'B';
};

export const resolveRelationshipType = (ctx: Record<string, unknown>) =>
  String(ctx.relationship_type || ctx.relationshipType || '').trim();

export const formatSynastryContextBlock = (ctx: Record<string, unknown>) => {
  const nameA = resolveSynastryName(ctx, 'nameA');
  const nameB = resolveSynastryName(ctx, 'nameB');
  const relationshipType = resolveRelationshipType(ctx);
  const accuracy = ctx.birth_accuracy as { nameA?: string; nameB?: string } | undefined;
  const accuracyLine = accuracy
    ? resolveSynastryLang(ctx) === 'en'
      ? `Birth time accuracy: ${nameA}: ${accuracy.nameA || 'unknown'}, ${nameB}: ${accuracy.nameB || 'unknown'}`
      : `出生时间准确度：${nameA}：${accuracy.nameA || '未知'}，${nameB}：${accuracy.nameB || '未知'}`
    : null;
  const comparisonLine = ctx.comparison
    ? resolveSynastryLang(ctx) === 'en'
      ? `Comparison cues: ${JSON.stringify(ctx.comparison)}`
      : `对比盘线索：${JSON.stringify(ctx.comparison)}`
    : null;
  const compositeLine = ctx.composite
    ? resolveSynastryLang(ctx) === 'en'
      ? `Composite cues: ${JSON.stringify(ctx.composite)}`
      : `组合盘线索：${JSON.stringify(ctx.composite)}`
    : null;
  if (resolveSynastryLang(ctx) === 'en') {
    return [
      `Language: en`,
      `Natal chart of ${nameA}: ${JSON.stringify(ctx.chartA)}`,
      `Natal chart of ${nameB}: ${JSON.stringify(ctx.chartB)}`,
      `Synastry: ${JSON.stringify(ctx.synastry)}`,
      `Relationship type: ${relationshipType || 'unspecified'}`,
      ...(accuracyLine ? [accuracyLine] : []),
      ...(comparisonLine ? [comparisonLine] : []),
      ...(compositeLine ? [compositeLine] : []),
    ].join('\n');
  }
  return [
    `语言：zh`,
    `${nameA} 的本命盘：${JSON.stringify(ctx.chartA)}`,
    `${nameB} 的本命盘：${JSON.stringify(ctx.chartB)}`,
    `合盘：${JSON.stringify(ctx.synastry)}`,
    `关系类型：${relationshipType || '未指定'}`,
    ...(accuracyLine ? [accuracyLine] : []),
    ...(comparisonLine ? [comparisonLine] : []),
    ...(compositeLine ? [compositeLine] : []),
  ].join('\n');
};

// === 详情解读格式常量 ===

export const DETAIL_INTERPRETATION_FORMAT_ZH = `interpretation 格式要求：
- 必须使用 Markdown，且只允许 3 个以 ### 开头的分区标题，顺序固定：### 核心观点、### 机制拆解、### 可执行建议。
- 每个分区只使用 "-" 项列表，不要写成连续段落；每条 1 句。
- 每条要点必须以固定前缀开头：核心观点用"观点："，机制拆解用"机制："，可执行建议用"建议："。
- 条数要求：核心观点 2-4 条，机制拆解 2-3 条，可执行建议 3-5 条。
- 分区之间空行；不要使用粗体、编号或表格。
- 仅 interpretation 字段允许 Markdown，title/summary/highlights 保持纯文本。`;

export const DETAIL_INTERPRETATION_FORMAT_EN = `Interpretation format:
- Use Markdown with exactly 3 ### headings in this order: ### Key Takeaways, ### Mechanism Breakdown, ### Action Steps.
- Use "-" bullet lists only (no paragraphs); 1 sentence per bullet.
- Each bullet must start with a fixed prefix: "Key:", "Mechanism:", "Action:".
- Bullet counts: Key Takeaways 2-4, Mechanism Breakdown 2-3, Action Steps 3-5.
- Keep a blank line between sections; no bold, numbering, or tables.
- Only the interpretation field may include Markdown; keep title/summary/highlights plain text.`;

export const DETAIL_INTERPRETATION_FORMAT = `${DETAIL_INTERPRETATION_FORMAT_ZH}
${DETAIL_INTERPRETATION_FORMAT_EN}`;

export const DETAIL_OUTPUT_INSTRUCTION = `输出结构：
- title: 模块标题（简短有力，纯文本，必须先陈述占星术语的定义或基本信息）
- summary: 简要总结（2-3 句，纯文本，先解释该占星术语是什么，再说明其核心意义）
- highlights: 关键要点数组（3-5 条，每条 1 句，纯文本，第一条必须是对该占星术语的通俗解释，后续条目才是要点分析）
- interpretation: 详见格式要求（仅此字段允许 Markdown）
${DETAIL_INTERPRETATION_FORMAT}
${SINGLE_LANGUAGE_INSTRUCTION}`;

