/**
 * Prompt 构建器
 *
 * 负责将 Prompt 模板与上下文组合，生成最终的 system/user prompt
 *
 * 优化说明：
 * - 新增 BASE_SYSTEM 常量，所有 prompt 共享基础设定
 * - 模板只需定义任务特定的内容，减少重复
 */

import { registry } from './registry';
import { hashInput, buildCacheKey } from './cache';
import type { PromptContext, BuildResult, PromptModule } from './types';
import { getToneGuide } from '../cultural/tone';
import { getCompactExpressionGuide } from '../cultural/expressions';
import { getAgeContentGuide, getSynastryAgeGuide } from '../../utils/age';

/**
 * 基础系统提示（所有 prompt 共享）
 *
 * 包含：
 * - 核心身份定位
 * - 基本行为准则
 * - 输出格式要求
 */
export const BASE_SYSTEM = `你是星智，一个面向中国年轻人的心理占星助手。

核心原则：
- 用现代心理学视角解读星盘，帮用户认识自己而非预测命运
- 说话像最懂星座的好朋友聊天，不是心理咨询师，更不是算命先生
- 星盘是镜子不是水晶球，人有选择和成长空间

表达铁律（最高优先级）：
- 说人话！用大白话，用短句。每句话都要让没接触过星座的人也能秒懂
- 禁止堆砌比喻。一段话最多用一个比喻，而且必须是日常生活里的（奶茶、外卖、刷手机），不要用文学性比喻（水晶、镜子、星河）
- 禁止古风/文艺腔。不要用诗词典故、成语堆砌、"XX如XX般XX"的句式
- 五行/节气只在明确相关时偶尔提一句，不要硬塞
- 先说结论，再解释为什么。用户最想知道"所以我是什么样的人"，不想看散文

行为准则：
- 禁止宿命论表述（命中注定/肯定会/逃不过）
- 禁止预测具体事件（升职/分手/发财的时间或结果）
- 用"倾向于/很可能/往往"替代"一定/肯定/必然"
- 场景举例要具体可代入，用中国年轻人熟悉的场景

输出：严格 JSON 格式，简体中文，无 markdown 标记`;

// === Cultural Context 自动注入 ===

/** 角色类型 → 紧凑角色描述 */
const PERSONA_COMPACT: Record<string, string> = {
  default: '角色：心理占星助手，温暖真诚像朋友。',
  analytical: '角色：专业心理占星分析师。先结论后解释，用"比如..."举例。',
  healing: '角色：温柔的情绪疗愈师。倾听优先，不急于给答案。',
};

/** 通用语气指南（所有模块共享） */
const TONE_GUIDE_LITE = '语气：说人话，短句为主，一段话讲一个点。像发微信语音不是写作文。\n禁止：古风文艺腔｜比喻堆砌｜诗词典故\n禁词：命中注定/天生/肯定会/宇宙能量/灵魂契约';
const TONE_GUIDE_FULL = getToneGuide();
const EXPRESSION_GUIDE = getCompactExpressionGuide();
const SCENARIO_EXAMPLES = '场景示例：关系=和对象因为小事吵架后各自沉默玩手机｜情绪=周日晚上想到明天要上班｜成长=想换工作但一直拖延';

/** 行星比喻摘要（natal 模块用） */
const PLANET_METAPHOR_SUMMARY = '比喻参考：太阳=内在驱动力｜月亮=情绪本能｜水星=思维方式｜金星=审美与爱｜火星=行动力';

/** 关系比喻摘要（synastry 模块用） */
const RELATIONSHIP_METAPHOR_SUMMARY = '关系比喻：和谐相=默契共振｜挑战相=磨合成长｜合轴=深层连接';

/** 模块 → 角色类型映射 */
const MODULE_PERSONA: Record<PromptModule, string> = {
  natal: 'analytical',
  'natal-report': 'analytical',
  daily: 'default',
  synastry: 'analytical',
  cbt: 'healing',
  ask: 'default',
  wiki: 'default',
  annual: 'analytical',
  kline: 'analytical',
  synthetica: 'analytical',
  monthly: 'default',
  'love-topic': 'analytical',
  'career-topic': 'analytical',
  'wealth-topic': 'analytical',
};

/** 模块 → 额外比喻摘要 */
const MODULE_EXTRA: Partial<Record<PromptModule, string>> = {
  natal: PLANET_METAPHOR_SUMMARY,
  synastry: RELATIONSHIP_METAPHOR_SUMMARY,
};

/**
 * 根据模块类型生成紧凑的 cultural context 字符串
 *
 * 目标：< 200 tokens，包含角色设定 + 可选比喻摘要 + 语气指南
 */
export function getCulturalContextLite(module: PromptModule): string {
  const persona = PERSONA_COMPACT[MODULE_PERSONA[module]] || PERSONA_COMPACT.default;
  const extra = MODULE_EXTRA[module];
  const parts = [persona];
  if (extra) parts.push(extra);
  parts.push(TONE_GUIDE_LITE);
  return parts.join('\n');
}

/**
 * Full 文化层（用于高创意/分析场景）
 */
export function getCulturalContextFull(module: PromptModule): string {
  const persona = PERSONA_COMPACT[MODULE_PERSONA[module]] || PERSONA_COMPACT.default;
  const extra = MODULE_EXTRA[module];
  const parts = [persona, TONE_GUIDE_FULL, EXPRESSION_GUIDE, SCENARIO_EXAMPLES];
  if (extra) parts.push(extra);
  return parts.join('\n');
}

// 兼容旧调用：默认返回 lite 文化层
export function getCulturalContext(module: PromptModule): string {
  return getCulturalContextLite(module);
}

type CulturalLevel = 'lite' | 'full';

function resolveCulturalLevel(promptId: string, module: PromptModule): CulturalLevel {
  if (module === 'wiki') return 'lite';
  if (promptId.startsWith('wiki-') || promptId.startsWith('detail-')) return 'lite';
  return 'full';
}

/**
 * 构建 Prompt
 *
 * @param promptId Prompt ID
 * @param ctx 上下文数据
 * @param options 构建选项
 * @returns 构建结果，包含 system、user 和 cacheKey
 */
export function buildPrompt(
  promptId: string,
  ctx: PromptContext,
  options?: { skipBaseSystem?: boolean }
): BuildResult | null {
  const template = registry.get(promptId);

  if (!template) {
    console.warn(`[PromptBuilder] Prompt not found: ${promptId}`);
    return null;
  }

  // 构建任务特定的 system prompt
  const taskSystem = typeof template.system === 'function'
    ? template.system(ctx)
    : template.system;

  // 注入 cultural context（lite/full 按场景选择）
  const culturalLevel = resolveCulturalLevel(promptId, template.meta.module);
  const culturalContext = culturalLevel === 'lite'
    ? getCulturalContextLite(template.meta.module)
    : getCulturalContextFull(template.meta.module);

  // 根据用户年龄生成适配指令（adult 返回空字符串，不影响输出）
  let ageGuide = '';
  if (ctx.ageA !== undefined && ctx.ageB !== undefined) {
    // 合盘场景：双方年龄适配
    ageGuide = getSynastryAgeGuide(ctx.ageA, ctx.ageB);
  } else if (ctx.userAge !== undefined) {
    // 单人场景：用户年龄适配
    ageGuide = getAgeContentGuide(ctx.userAge);
  }

  // 组合最终 system prompt（基础层 + 文化层 + 年龄层 + 任务层）
  // 某些特殊场景可以跳过 BASE_SYSTEM（如已包含完整设定的模板）
  const ageSection = ageGuide ? `\n\n${ageGuide}` : '';
  const system = options?.skipBaseSystem
    ? taskSystem
    : `${BASE_SYSTEM}\n\n${culturalContext}${ageSection}\n\n${taskSystem}`;

  // 构建 user prompt
  const user = template.user(ctx);

  // 计算输入哈希（排除内部注入字段以保持缓存稳定）
  const { _seedSummary: _s, _userPortrait: _u, ...ctxForHash } = ctx;
  const inputHash = hashInput(ctxForHash);

  // 构建缓存 key
  const cacheKey = buildCacheKey(promptId, template.meta.version, inputHash);

  return { system, user, cacheKey };
}

/**
 * 批量构建 Prompt
 *
 * @param promptIds Prompt ID 数组
 * @param ctx 共享上下文
 * @returns 构建结果映射
 */
export function buildPrompts(
  promptIds: string[],
  ctx: PromptContext
): Map<string, BuildResult> {
  const results = new Map<string, BuildResult>();

  for (const id of promptIds) {
    const result = buildPrompt(id, ctx);
    if (result) {
      results.set(id, result);
    }
  }

  return results;
}

/**
 * 获取 Prompt 的版本号
 *
 * @param promptId Prompt ID
 * @returns 版本号
 */
export function getPromptVersion(promptId: string): string {
  return registry.getVersion(promptId);
}

/**
 * 检查 Prompt 是否存在
 *
 * @param promptId Prompt ID
 */
export function hasPrompt(promptId: string): boolean {
  return registry.has(promptId);
}
