// INPUT: AI 内容生成服务（DeepSeek chat/reasoning，含 token 预算、流式输出与缓存）。
// OUTPUT: 导出 AI 调用服务（snake_case 输出、缓存/JSON 修复、流式生成与调用日志）。
// POS: AI 生成服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import { getPrompt, buildCacheKey } from '../prompts/index.js';
import { replaceSensitiveWords } from './content-security.js';
import { hashInput, CACHE_TTL } from '../cache/strategy.js';
import { cacheService } from '../cache/redis.js';
import type { AIContentMeta, LocalizedContent, Language } from '../types/api.js';

const getDeepSeekApiKey = () => process.env.DEEPSEEK_API_KEY;
const getDeepSeekBaseUrl = () =>
  process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const AI_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.AI_TIMEOUT_MS);
  // 默认 2 分钟超时
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120000;
})();
const AI_TEMPERATURE_DEFAULT = (() => {
  const parsed = Number(process.env.AI_TEMPERATURE);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.min(Math.max(parsed, 0), 1);
})();
const DEFAULT_LANG: Language = 'zh';
const DEFAULT_MAX_TOKENS = 4096;

const MAX_TOKENS_MAP: Record<string, number> = {
  // 高频文本与结构化输出：控制长尾时长
  'ask-answer': 3072,
  'daily-forecast': 1600,
  'daily-detail': 1600,
  'natal-overview': 1400,
  'natal-core-themes': 1400,
  'natal-dimension': 1400,
  'cbt-analysis': 1600,
  'cbt-aggregate-analysis': 1600,
  'cbt-somatic-analysis': 1400,
  'cbt-root-analysis': 1400,
  'cbt-mood-analysis': 1400,
  'cbt-competence-analysis': 1400,
  'wiki-home': 1800,
  'wiki-classics-master': 2000,
  'pairing-analysis': 1600,
  'synthetica-analysis': 1400,
  'cycle-naming': 800,
  'daily-home-card': 400,
  // K线年度报告
  'kline-year-core': 2000,
  'kline-year-dimensions': 4000,
  'kline-year-tactical': 3000,
  'kline-life-scroll': 5000,
};

function resolveMaxTokens(promptId: string, override?: number): number {
  if (Number.isFinite(override) && (override as number) > 0) return override as number;
  if (promptId.startsWith('detail-')) return 1200;
  return MAX_TOKENS_MAP[promptId] ?? DEFAULT_MAX_TOKENS;
}

// ============================================================
// 温度分层配置
// ============================================================
// T1 (0.1): 事实性数据 - 天文计算不走 AI，无需配置
// T2 (0.3): 百科/详情解读 - 准确性优先，允许少量表达变化
// T3 (0.5): 分析性内容 - 需要洞察力但保持一致性
// T4 (0.6): 时效性/建议性 - 需要新鲜感和实用性
// T5 (0.7): 创意性/深度洞察 - 需要共情和创意表达
// ============================================================

const TEMPERATURE_MAP: Record<string, number> = {
  // T2 (0.3): 百科/详情解读
  'wiki-home': 0.3,
  'wiki-classics-master': 0.3,
  // 详情 - 行星
  'detail-planets-natal': 0.3,
  'detail-planets-transit': 0.3,
  'detail-planets-synastry': 0.3,
  'detail-planets-composite': 0.3,
  // 详情 - 相位
  'detail-aspects-natal': 0.3,
  'detail-aspects-transit': 0.3,
  'detail-aspects-synastry': 0.3,
  'detail-aspects-composite': 0.3,
  // 详情 - 元素/宫位
  'detail-elements-natal': 0.3,
  'detail-elements-composite': 0.3,
  // 详情 - 小行星
  'detail-asteroids-natal': 0.3,
  'detail-asteroids-transit': 0.3,
  'detail-asteroids-synastry': 0.3,
  'detail-asteroids-composite': 0.3,
  // 详情 - 定位星
  'detail-rulers-natal': 0.3,
  'detail-rulers-transit': 0.3,
  'detail-rulers-synastry': 0.3,
  'detail-rulers-composite': 0.3,
  // 详情 - 综合
  'detail-synthesis-synastry': 0.3,

  // T3 (0.5): 分析性内容
  // 本命盘
  'natal-overview': 0.5,
  'natal-core-themes': 0.5,
  'natal-dimension': 0.5,
  'detail-big3-natal': 0.5,
  'detail-dimension-natal': 0.5,
  'detail-deep-natal': 0.5,
  'cycle-naming': 0.5,
  'kline-year-core': 0.5,
  'kline-year-dimensions': 0.5,
  'kline-year-tactical': 0.5,
  'kline-life-scroll': 0.7,
  // 合盘 - 综述/核心分析
  'synastry-overview': 0.5,
  'synastry-highlights': 0.5,
  'synastry-core-dynamics': 0.5,
  'synastry-growth-task': 0.5,
  'synastry-conflict-loop': 0.5,
  'synastry-dynamic': 0.5,
  // 合盘 - 本命盘/对比盘/组合盘
  'synastry-natal-a': 0.5,
  'synastry-natal-b': 0.5,
  'synastry-compare-ab': 0.5,
  'synastry-compare-ba': 0.5,
  'synastry-composite': 0.5,
  // CBT 分析
  'cbt-analysis': 0.5,
  'cbt-aggregate-analysis': 0.5,
  // 工具分析
  'synthetica-analysis': 0.5,
  // 配对分析
  'pairing-analysis': 0.5,

  // T4 (0.6): 时效性/建议性内容
  'daily-forecast': 0.6,
  'daily-detail': 0.6,
  'synastry-practice-tools': 0.6,
  'synastry-relationship-timing': 0.6,
  'synastry-vibe-tags': 0.6,
  'synastry-weather-forecast': 0.6,
  'synastry-action-plan': 0.6,
  // 流年报告 - 季度/建议性内容
  'annual-q1': 0.6,
  'annual-q2': 0.6,
  'annual-q3': 0.6,
  'annual-q4': 0.6,
  'annual-lucky': 0.6,

  // T5 (0.7): 创意性/深度洞察
  'ask-answer': 0.7,
  'oracle-answer': 0.7,
  // 流年报告 - 核心模块（需要个性化洞察）
  'annual-overview': 0.7,
  'annual-career': 0.7,
  'annual-love': 0.7,
  'annual-health': 0.7,
  'annual-social': 0.7,
  'annual-growth': 0.7,
  // 本命深度解读 - 核心模块（需要个性化洞察）
  'natal-report-overview': 0.7,
  'natal-report-love': 0.7,
  'natal-report-career': 0.7,
  'natal-report-emotion': 0.7,
  'natal-report-soul': 0.7,
  // 本命深度解读 - 次要模块（分析性内容）
  'natal-report-mind': 0.5,
  'natal-report-wealth': 0.5,
  'natal-report-health': 0.5,

  // 月度报告 - 核心模块（需要个性化洞察）
  'monthly-tone': 0.7,
  'monthly-dimensions': 0.7,
  // 月度报告 - 时效性/建议性内容
  'monthly-rhythm': 0.6,
  'monthly-lunar': 0.6,
  'monthly-actions': 0.6,
  // 月度报告 - 事实性内容（日期表）
  'monthly-dates': 0.5,
};

function getTemperatureForPrompt(promptId: string): number {
  return TEMPERATURE_MAP[promptId] ?? AI_TEMPERATURE_DEFAULT;
}

// 使用 reasoning 模型的 promptId
const REASONING_PROMPTS = [
  'oracle-answer',
  // 流年报告使用 reasoning 模型
  'annual-overview',
  'annual-career',
  'annual-love',
  'annual-health',
  'annual-social',
  'annual-growth',
  'annual-q1',
  'annual-q2',
  'annual-q3',
  'annual-q4',
  'annual-lucky',
  // 本命深度解读使用 reasoning 模型
  'natal-report-overview',
  'natal-report-mind',
  'natal-report-emotion',
  'natal-report-love',
  'natal-report-career',
  'natal-report-wealth',
  'natal-report-health',
  'natal-report-soul',
  // 月度报告使用 reasoning 模型
  'monthly-tone',
  'monthly-dimensions',
  'monthly-rhythm',
  'monthly-lunar',
  'monthly-dates',
  'monthly-actions',
];

// 输出原始文本（非 JSON）的 promptId
const RAW_TEXT_PROMPTS = new Set<string>([
  // ask 问答输出纯 Markdown 文本
  'ask-answer',
  // 流年报告输出纯 Markdown 文本
  'annual-overview',
  'annual-career',
  'annual-love',
  'annual-health',
  'annual-social',
  'annual-growth',
  'annual-q1',
  'annual-q2',
  'annual-q3',
  'annual-q4',
  'annual-lucky',
  // 本命深度解读输出纯 Markdown 文本
  'natal-report-overview',
  'natal-report-mind',
  'natal-report-emotion',
  'natal-report-love',
  'natal-report-career',
  'natal-report-wealth',
  'natal-report-health',
  'natal-report-soul',
  // 月度报告输出纯 Markdown 文本
  'monthly-tone',
  'monthly-dimensions',
  'monthly-rhythm',
  'monthly-lunar',
  'monthly-dates',
  'monthly-actions',
  // CBT 聚合分析输出纯 Markdown 文本
  'cbt-aggregate-analysis',
]);

// 支持 SSE 流式输出的 promptId（仅文本型，非 JSON 结构化输出）
const STREAMABLE_PROMPTS = new Set<string>([
  'ask-answer',
]);
const NO_CACHE_PROMPTS = new Set<string>();

export interface AIGenerateOptions {
  promptId: string;
  context: Record<string, unknown>;
  allowMock?: boolean;
  timeoutMs?: number;
  maxTokens?: number;
  lang?: Language;
}

export interface AIGenerateResult<T> {
  content: LocalizedContent<T>;
  meta: AIContentMeta;
}

export class AIUnavailableError extends Error {
  reason: AIContentMeta['reason'];
  constructor(reason: AIContentMeta['reason'], message?: string) {
    super(message || reason);
    this.reason = reason;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildMockMeta(reason: AIContentMeta['reason']): AIContentMeta {
  return { source: 'mock', reason };
}

function buildAIResult<T>(content: LocalizedContent<T>, cached = false): AIGenerateResult<T> {
  return { content, meta: { source: 'ai', cached } };
}

function normalizeLocalizedContent<T>(value: unknown, fallbackLang: Language): LocalizedContent<T> {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid JSON response from DeepSeek');
  }
  const record = value as Record<string, unknown>;
  if ('content' in record) {
    const langValue = typeof record.lang === 'string' ? record.lang : fallbackLang;
    const lang = (langValue === 'zh' || langValue === 'en') ? (langValue as Language) : fallbackLang;
    return { lang, content: record.content as T };
  }
  if ('zh' in record || 'en' in record) {
    const bilingual = record as Record<string, unknown>;
    const content = (bilingual[fallbackLang] ?? bilingual.zh ?? bilingual.en) as T;
    return { lang: fallbackLang, content };
  }
  return { lang: fallbackLang, content: record as T };
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/);
  return (fenced ? fenced[1] : trimmed).trim();
}

function repairJsonLocal(jsonText: string): string | null {
  try {
    let text = jsonText.trim();

    // 0. 将字符串值内的中文引号 \u201c \u201d 替换为转义引号
    // AI 常返回 "小步破圈"实验" 这样的内容，中文引号会破坏 JSON
    {
      let out = '';
      let inString = false;
      let escaped = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inString) {
          if (escaped) { out += c; escaped = false; continue; }
          if (c === '\\') { out += c; escaped = true; continue; }
          if (c === '"') { out += c; inString = false; continue; }
          if (c === '\u201c' || c === '\u201d') { out += '\\"'; continue; }
          out += c;
        } else {
          if (c === '"') { out += c; inString = true; continue; }
          out += c;
        }
      }
      text = out;
    }

    // 1. 去除尾部多余逗号（对象/数组末尾的 ,} 或 ,]）
    text = text.replace(/,\s*([}\]])/g, '$1');

    // 2. 修复缺失的闭合括号
    let braces = 0;
    let brackets = 0;
    let inStr = false;
    let esc = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === '{') braces++;
      else if (ch === '}') braces--;
      else if (ch === '[') brackets++;
      else if (ch === ']') brackets--;
    }
    // 如果字符串未闭合，尝试闭合
    if (inStr) text += '"';
    while (brackets > 0) { text += ']'; brackets--; }
    while (braces > 0) { text += '}'; braces--; }

    // 3. 修复单引号为双引号（简单启发式：仅处理 key 的情况）
    text = text.replace(/(?<=[\{,]\s*)'([^']+)'(?=\s*:)/g, '"$1"');

    // 4. 尝试解析
    JSON.parse(text);
    return text;
  } catch {
    return null;
  }
}

function resolveMockReason(error?: unknown): AIContentMeta['reason'] {
  if (!error || !(error instanceof Error)) return 'error';
  if (error.name === 'AbortError') return 'timeout';
  if (error.message.includes('Invalid JSON') || error.message.includes('Unexpected token')) return 'invalid_json';
  if (error.message.includes('Prompt not found')) return 'prompt_missing';
  return 'error';
}

async function generateAIContentInternal<T>(options: AIGenerateOptions): Promise<AIGenerateResult<T>> {
  const startTime = Date.now();
  console.log(`[AI] >>> Starting generation for promptId: ${options.promptId}`);

  const allowMock = options.allowMock === true;
  const lang = options.lang ?? DEFAULT_LANG;
  const prompt = getPrompt(options.promptId);
  if (!prompt) {
    if (!allowMock) {
      console.error(`[AI] Prompt not found: ${options.promptId}`);
      throw new AIUnavailableError('prompt_missing', `Prompt not found: ${options.promptId}`);
    }
    console.warn(`[AI] Prompt not found: ${options.promptId}. Using mock response.`);
    return { content: getMockResponse<T>(options.promptId, lang), meta: buildMockMeta('prompt_missing') };
  }
  console.log(`[AI] Prompt found: ${options.promptId}, version: ${prompt.meta.version}`);

  const useReasoning = REASONING_PROMPTS.includes(options.promptId);
  const model = useReasoning ? 'deepseek-reasoner' : 'deepseek-chat';
  const maxTokens = resolveMaxTokens(options.promptId, options.maxTokens);

  const context = { ...options.context, lang };
  const systemMessage = typeof prompt.system === 'function'
    ? prompt.system(context)
    : prompt.system;
  const userMessage = prompt.user(context);
  const inputChars = (systemMessage?.length || 0) + (userMessage?.length || 0);
  const cacheKey = buildCacheKey(options.promptId, prompt.meta.version, hashInput(context));

  const shouldUseCache = !NO_CACHE_PROMPTS.has(options.promptId);

  // 检查缓存
  if (shouldUseCache) {
    const cached = await cacheService.get<LocalizedContent<T>>(cacheKey);
    if (cached) {
      console.log(`[AI] Cache hit for ${options.promptId} in ${Date.now() - startTime}ms (model=${model}, maxTokens=${maxTokens})`);
      return buildAIResult(cached, true);
    }
  }

  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    if (!allowMock) {
      throw new AIUnavailableError('missing_api_key', 'DeepSeek API key missing');
    }
    return { content: getMockResponse<T>(options.promptId, lang), meta: buildMockMeta('missing_api_key') };
  }

  const baseUrl = getDeepSeekBaseUrl();

  try {
    const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;
    console.log(`[AI] Calling DeepSeek API: model=${model}, timeoutMs=${timeoutMs || 'none'}, maxTokens=${maxTokens}, inputChars=${inputChars}`);
    const apiStartTime = Date.now();

    const response = await fetchWithTimeout(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: getTemperatureForPrompt(options.promptId),
        max_tokens: maxTokens,
      }),
    }, timeoutMs);

    const apiEndTime = Date.now();
    console.log(`[AI] DeepSeek API responded in ${apiEndTime - apiStartTime}ms, status: ${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const usage = data.usage;
    const text = data.choices?.[0]?.message?.content;
    console.log(`[AI] Response text length: ${text?.length || 0} chars`);
    if (usage) {
      console.log(`[AI] Usage prompt=${usage.prompt_tokens ?? 'n/a'} completion=${usage.completion_tokens ?? 'n/a'} total=${usage.total_tokens ?? 'n/a'}`);
    }

    if (!text) {
      throw new Error('No response from DeepSeek');
    }

    console.log(`[AI] <<< Completed ${options.promptId} in ${Date.now() - startTime}ms`);

    if (RAW_TEXT_PROMPTS.has(options.promptId)) {
      const cleaned = replaceSensitiveWords(stripCodeFence(text));
      const result: LocalizedContent<T> = { lang, content: cleaned as T };
      if (shouldUseCache) {
        await cacheService.set(cacheKey, result, CACHE_TTL.AI_OUTPUT);
      }
      console.log(`[AI] Result ${options.promptId} cached=false model=${model} maxTokens=${maxTokens} ms=${Date.now() - startTime}`);
      return buildAIResult(result);
    }

    // 解析 JSON 响应（优先提取首个完整 JSON 对象）
    const extracted = extractJsonObject(text);
    const jsonMatch = extracted ? [extracted] : (text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/));
    const jsonStr = Array.isArray(jsonMatch) ? (jsonMatch[1] || jsonMatch[0]) : jsonMatch?.[1] || jsonMatch?.[0];
    if (!jsonStr) {
      throw new Error('Invalid JSON response from DeepSeek');
    }

    // 对 JSON 字符串做敏感词替换（在解析前处理，避免破坏 JSON 结构键名）
    const sanitizedJsonStr = replaceSensitiveWords(jsonStr);

    let parsed: unknown;
    try {
      parsed = JSON.parse(sanitizedJsonStr) as unknown;
    } catch (parseError) {
      console.warn(`[AI] JSON parse failed for ${options.promptId}, attempting local repair`);
      const repaired = repairJsonLocal(sanitizedJsonStr);
      if (!repaired) throw parseError;
      console.log(`[AI] JSON repaired locally for ${options.promptId}`);
      parsed = JSON.parse(repaired) as unknown;
    }
    const result = normalizeLocalizedContent<T>(parsed, lang);

    // 写入缓存
    if (shouldUseCache) {
      await cacheService.set(cacheKey, result, CACHE_TTL.AI_OUTPUT);
    }

    console.log(`[AI] Result ${options.promptId} cached=false model=${model} maxTokens=${maxTokens} ms=${Date.now() - startTime}`);
    return buildAIResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    const reason = resolveMockReason(error);
    const elapsed = Date.now() - startTime;
    console.error(`[AI] !!! ${options.promptId} FAILED after ${elapsed}ms: ${message}`);
    if (stack) console.error(`[AI] Stack: ${stack}`);
    if (!allowMock) {
      throw new AIUnavailableError(reason, message);
    }
    console.warn(`[AI] Using mock response for ${options.promptId}: ${message}`);
    return { content: getMockResponse<T>(options.promptId, lang), meta: buildMockMeta(reason) };
  }
}

export async function generateAIContent<T>(options: AIGenerateOptions): Promise<LocalizedContent<T>> {
  const result = await generateAIContentInternal<T>(options);
  return result.content;
}

export async function generateAIContentWithMeta<T>(options: AIGenerateOptions): Promise<AIGenerateResult<T>> {
  return generateAIContentInternal<T>(options);
}

// ============================================================
// SSE 流式输出
// ============================================================

export interface StreamGenerateOptions {
  promptId: string;
  context: Record<string, unknown>;
  timeoutMs?: number;
  maxTokens?: number;
  lang?: Language;
}

export function isStreamablePrompt(promptId: string): boolean {
  return STREAMABLE_PROMPTS.has(promptId);
}

/**
 * 流式生成 AI 内容，返回 AsyncIterable<string>。
 * 仅适用于 STREAMABLE_PROMPTS 中的文本型 prompt。
 */
export async function* generateAIContentStream(
  options: StreamGenerateOptions
): AsyncGenerator<string, void, undefined> {
  const startTime = Date.now();
  const lang = options.lang ?? DEFAULT_LANG;
  console.log(`[AI-Stream] >>> Starting stream for promptId: ${options.promptId}`);

  if (!STREAMABLE_PROMPTS.has(options.promptId)) {
    throw new AIUnavailableError('error', `Prompt ${options.promptId} does not support streaming`);
  }

  const prompt = getPrompt(options.promptId);
  if (!prompt) {
    throw new AIUnavailableError('prompt_missing', `Prompt not found: ${options.promptId}`);
  }

  const context = { ...options.context, lang };
  const systemMessage = typeof prompt.system === 'function'
    ? prompt.system(context)
    : prompt.system;
  const userMessage = prompt.user(context);
  const inputChars = (systemMessage?.length || 0) + (userMessage?.length || 0);

  // 检查缓存 —— 如果命中直接一次性返回
  const shouldUseCache = !NO_CACHE_PROMPTS.has(options.promptId);
  const cacheKey = shouldUseCache
    ? buildCacheKey(options.promptId, prompt.meta.version, hashInput(context))
    : '';
  if (shouldUseCache) {
    const cached = await cacheService.get<LocalizedContent<string>>(cacheKey);
    if (cached) {
      console.log(`[AI-Stream] Cache hit for ${options.promptId}`);
      yield cached.content;
      return;
    }
  }

  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    throw new AIUnavailableError('missing_api_key', 'DeepSeek API key missing');
  }

  const useReasoning = REASONING_PROMPTS.includes(options.promptId);
  const model = useReasoning ? 'deepseek-reasoner' : 'deepseek-chat';
  const baseUrl = getDeepSeekBaseUrl();
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;
  const maxTokens = resolveMaxTokens(options.promptId, options.maxTokens);

  console.log(`[AI-Stream] Calling DeepSeek API: model=${model}, stream=true, timeoutMs=${timeoutMs}, maxTokens=${maxTokens}, inputChars=${inputChars}`);

  const response = await fetchWithTimeout(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      temperature: getTemperatureForPrompt(options.promptId),
      max_tokens: maxTokens,
      stream: true,
    }),
  }, timeoutMs);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errText}`);
  }

  if (!response.body) {
    throw new Error('No response body from DeepSeek streaming');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // 保留最后一行（可能不完整）
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            yield delta;
          }
        } catch {
          // 忽略无法解析的 SSE 行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const elapsed = Date.now() - startTime;
  console.log(`[AI-Stream] <<< Completed ${options.promptId} in ${elapsed}ms, ${fullText.length} chars (model=${model}, maxTokens=${maxTokens})`);

  // 写入缓存（复用上方计算的 cacheKey）
  if (shouldUseCache && fullText) {
    const cleaned = stripCodeFence(fullText);
    const result: LocalizedContent<string> = { lang, content: cleaned };
    await cacheService.set(cacheKey, result, CACHE_TTL.AI_OUTPUT);
  }
}

// Mock 响应用于开发
function getMockResponse<T>(promptId: string, lang: Language): LocalizedContent<T> {
  const mocks: Record<string, { zh: unknown; en: unknown }> = {
    'natal-overview': {
      zh: {
        sun: { title: '太阳白羊', keywords: ['开创', '直接', '热烈'], description: '你的核心动力来自主动推进与快速行动，倾向于用直接的方式影响局面。' },
        moon: { title: '月亮巨蟹', keywords: ['情感', '保护', '敏感'], description: '你需要稳定的情感港湾来恢复能量，对亲密关系和安全感非常在意。' },
        rising: { title: '上升天秤', keywords: ['和谐', '优雅', '合作'], description: '你给人的第一印象温和、体面，习惯在关系中寻找平衡与共识。' },
        core_melody: { keywords: ['火象动力', '水象敏感'], explanations: ['行动力强', '内心细腻'] },
        top_talent: { title: '带头推动', example: '在团队中自然承担启动角色', advice: '把冲劲转化为清晰的目标。' },
        top_pitfall: { title: '过度保护', triggers: ['被忽视', '不安全感'], protection: '给自己和他人留出空间。' },
        trigger_card: { auto_reactions: ['先防御', '先解释'], inner_need: '被理解与被接住', buffer_action: '先停三秒再回应。' },
        share_text: '我的星盘提示我有强烈的行动力与情感敏感。'
      },
      en: {
        sun: { title: 'Sun in Aries', keywords: ['Initiative', 'Direct', 'Bold'], description: 'Your core drive is to initiate and act fast, influencing situations head-on.' },
        moon: { title: 'Moon in Cancer', keywords: ['Sensitive', 'Protective', 'Nurturing'], description: 'You need a steady emotional home base and feel deeply attuned to safety and closeness.' },
        rising: { title: 'Rising in Libra', keywords: ['Harmony', 'Grace', 'Collaboration'], description: 'You come across as balanced and considerate, seeking harmony in first impressions.' },
        core_melody: { keywords: ['Fire drive', 'Water sensitivity'], explanations: ['Action-first', 'Emotionally nuanced'] },
        top_talent: { title: 'Momentum Builder', example: 'You naturally kick-start projects', advice: 'Turn momentum into clear focus.' },
        top_pitfall: { title: 'Over-protective', triggers: ['Feeling unseen', 'Insecurity'], protection: 'Give space and trust.' },
        trigger_card: { auto_reactions: ['Defend quickly', 'Over-explain'], inner_need: 'To be understood', buffer_action: 'Pause before responding.' },
        share_text: 'My chart shows strong drive with emotional sensitivity.'
      },
    },
    'natal-core-themes': {
      zh: {
        drive: {
          title: '核心驱动',
          summary: '你最深层的动力来自把个人意志落到现实中，渴望通过行动留下可见的成果。',
          key_points: ['更愿意主动启动事情', '在混乱中寻找可执行路径', '对“无意义的忙碌”更敏感']
        },
        fear: {
          title: '核心恐惧',
          summary: '你害怕失控与被否定，尤其在关系或节奏被打乱时更容易紧绷。',
          key_points: ['对突发变化更警觉', '倾向用理性压住情绪', '需要被清晰地看见与肯定']
        },
        growth: {
          title: '成长路径',
          summary: '你的成长来自把真实感受说出来，用更柔软的方式建立连接与影响力。',
          key_points: ['练习说出当下的感受', '允许自己慢下来再回应', '把“控制”转化为“协作”']
        },
        confidence: 'high'
      },
      en: {
        drive: {
          title: 'Core Drive',
          summary: 'Your deepest drive is to turn intent into tangible outcomes, leaving a clear mark through action.',
          key_points: ['Prefer to initiate and lead', 'Seek practical paths in chaos', 'Sensitive to meaningless busyness']
        },
        fear: {
          title: 'Core Fear',
          summary: 'You fear losing control or being dismissed, especially when the pace becomes unpredictable.',
          key_points: ['Alert to sudden shifts', 'Use logic to contain emotion', 'Need clear recognition and safety']
        },
        growth: {
          title: 'Growth Path',
          summary: 'Growth comes from naming your feelings and influencing with openness rather than control.',
          key_points: ['Practice naming what you feel', 'Slow down before responding', 'Turn control into collaboration']
        },
        confidence: 'high'
      },
    },
    'natal-dimension': {
      zh: {
        dimension_key: 'Emotions',
        title: '情绪模式',
        pattern: '情绪容易在安全感不足时被放大。',
        root: '对稳定关系的高度需求。',
        when_triggered: '当被忽视或节奏失控时。',
        what_helps: ['明确表达需求', '先停顿再回应'],
        shadow: '在压力下变得防御或讨好。',
        practice: { title: '回到身体', steps: ['放慢呼吸', '感受脚底'] },
        prompt_question: '我现在最需要被理解的是什么？',
        confidence: 'high'
      },
      en: {
        dimension_key: 'Emotions',
        title: 'Emotional Pattern',
        pattern: 'Emotions intensify when safety feels uncertain.',
        root: 'A strong need for secure attachment.',
        when_triggered: 'When you feel unseen or out of rhythm.',
        what_helps: ['State your needs clearly', 'Pause before reacting'],
        shadow: 'Defensiveness or people-pleasing under stress.',
        practice: { title: 'Return to the body', steps: ['Slow the breath', 'Feel your feet'] },
        prompt_question: 'What needs to be understood right now?',
        confidence: 'high'
      },
    },
    'daily-forecast': {
      zh: {
        overall_score: 78,
        summary: '今天节奏清晰，适合把重要任务分段推进。沟通更看重边界与表达的节制，稳住节奏就有进展。',
        theme_title: '稳步推进',
        theme_explanation: '行运带来专注与执行力，适合整理与落实。',
        tags: ['专注', '执行', '沟通', '稳态'],
        lucky_color: '深蓝',
        lucky_number: '7',
        lucky_direction: '北方',
        dimensions: { career: 82, wealth: 74, love: 68, health: 80 },
        advice: {
          do: {
            title: '把任务切块推进',
            details: ['先处理最关键的一步', '把沟通提前说明清楚', '留出缓冲时间']
          },
          dont: {
            title: '避免临时改方向',
            details: ['不做高强度的多线并行', '避免情绪化判断', '不在疲惫时做大决定']
          }
        },
        strategy: { best_use: '推进关键任务并做收尾', avoid: '临时改变计划或过度消耗精力' },
        time_windows: {
          morning: '适合处理复杂与需要专注的任务',
          midday: '适合沟通对齐与资源协调',
          evening: '适合复盘与整理节奏'
        },
        time_windows_enhanced: [
          {
            period: '上午',
            time: '06:00-12:00',
            energy_level: '积极',
            description: '思路清晰，适合推进重点任务。',
            best_for: ['计划拆分', '集中执行'],
            avoid_for: ['临时改方向']
          },
          {
            period: '午间',
            time: '12:00-18:00',
            energy_level: '平稳',
            description: '沟通效率更高，适合对齐共识。',
            best_for: ['会议沟通', '资源协调'],
            avoid_for: ['过度争辩']
          },
          {
            period: '晚上',
            time: '18:00-24:00',
            energy_level: '放松',
            description: '适合复盘与整理收尾。',
            best_for: ['复盘总结', '轻松社交'],
            avoid_for: ['高压决策']
          }
        ],
        weekly_trend: {
          week_range: '1/20-1/26',
          daily_scores: [
            { date: '2024-01-20', score: 72, label: '稳' },
            { date: '2024-01-21', score: 68, label: '缓' },
            { date: '2024-01-22', score: 75, label: '进' },
            { date: '2024-01-23', score: 80, label: '强' },
            { date: '2024-01-24', score: 70, label: '稳' },
            { date: '2024-01-25', score: 66, label: '缓' },
            { date: '2024-01-26', score: 78, label: '进' }
          ],
          key_dates: [
            { date: '2024-01-22', label: '效率日', description: '适合推进关键事项。' },
            { date: '2024-01-25', label: '放松日', description: '适合减少安排、恢复节奏。' }
          ]
        },
        weekly_events: [
          { date: '1/22 周一', description: '适合推进重点任务并完成阶段性收尾。' },
          { date: '1/24 周三', description: '沟通效率提升，适合对齐资源。' },
          { date: '1/26 周五', description: '注意节奏变化，留出缓冲。' }
        ],
        share_text: '今日节奏清晰，稳住重点就能推进。'
      },
      en: {
        overall_score: 78,
        summary: '今天节奏清晰，适合把重要任务分段推进。沟通更看重边界与表达的节制，稳住节奏就有进展。',
        theme_title: '稳步推进',
        theme_explanation: '行运带来专注与执行力，适合整理与落实。',
        tags: ['专注', '执行', '沟通', '稳态'],
        lucky_color: '深蓝',
        lucky_number: '7',
        lucky_direction: '北方',
        dimensions: { career: 82, wealth: 74, love: 68, health: 80 },
        advice: {
          do: {
            title: '把任务切块推进',
            details: ['先处理最关键的一步', '把沟通提前说明清楚', '留出缓冲时间']
          },
          dont: {
            title: '避免临时改方向',
            details: ['不做高强度的多线并行', '避免情绪化判断', '不在疲惫时做大决定']
          }
        },
        strategy: { best_use: '推进关键任务并做收尾', avoid: '临时改变计划或过度消耗精力' },
        time_windows: {
          morning: '适合处理复杂与需要专注的任务',
          midday: '适合沟通对齐与资源协调',
          evening: '适合复盘与整理节奏'
        },
        time_windows_enhanced: [
          {
            period: '上午',
            time: '06:00-12:00',
            energy_level: '积极',
            description: '思路清晰，适合推进重点任务。',
            best_for: ['计划拆分', '集中执行'],
            avoid_for: ['临时改方向']
          },
          {
            period: '午间',
            time: '12:00-18:00',
            energy_level: '平稳',
            description: '沟通效率更高，适合对齐共识。',
            best_for: ['会议沟通', '资源协调'],
            avoid_for: ['过度争辩']
          },
          {
            period: '晚上',
            time: '18:00-24:00',
            energy_level: '放松',
            description: '适合复盘与整理收尾。',
            best_for: ['复盘总结', '轻松社交'],
            avoid_for: ['高压决策']
          }
        ],
        weekly_trend: {
          week_range: '1/20-1/26',
          daily_scores: [
            { date: '2024-01-20', score: 72, label: '稳' },
            { date: '2024-01-21', score: 68, label: '缓' },
            { date: '2024-01-22', score: 75, label: '进' },
            { date: '2024-01-23', score: 80, label: '强' },
            { date: '2024-01-24', score: 70, label: '稳' },
            { date: '2024-01-25', score: 66, label: '缓' },
            { date: '2024-01-26', score: 78, label: '进' }
          ],
          key_dates: [
            { date: '2024-01-22', label: '效率日', description: '适合推进关键事项。' },
            { date: '2024-01-25', label: '放松日', description: '适合减少安排、恢复节奏。' }
          ]
        },
        weekly_events: [
          { date: '1/22 周一', description: '适合推进重点任务并完成阶段性收尾。' },
          { date: '1/24 周三', description: '沟通效率提升，适合对齐资源。' },
          { date: '1/26 周五', description: '注意节奏变化，留出缓冲。' }
        ],
        share_text: '今日节奏清晰，稳住重点就能推进。'
      },
    },
    'daily-detail': {
      zh: {
        theme_elaborated: '今日星象强调节奏与边界的平衡。',
        how_it_shows_up: { emotions: '更敏感、更需要安稳', relationships: '沟通更需要温柔', work: '适合稳步推进' },
        one_challenge: { pattern_name: '过度担忧', description: '担心失控会让你更紧绷。' },
        one_practice: { title: '定心呼吸', action: '用 4-6 呼吸节奏完成 3 轮。' },
        one_question: '我可以放下的担忧是什么？',
        under_the_hood: { moon_phase_sign: '盈凸月·处女', key_aspects: ['月亮拱金星', '太阳刑火星'] },
        confidence: 'high'
      },
      en: {
        theme_elaborated: '今日星象强调节奏与边界的平衡。',
        how_it_shows_up: { emotions: '更敏感、更需要安稳', relationships: '沟通更需要温柔', work: '适合稳步推进' },
        one_challenge: { pattern_name: '过度担忧', description: '担心失控会让你更紧绷。' },
        one_practice: { title: '定心呼吸', action: '用 4-6 呼吸节奏完成 3 轮。' },
        one_question: '我可以放下的担忧是什么？',
        under_the_hood: { moon_phase_sign: '盈凸月·处女', key_aspects: ['月亮拱金星', '太阳刑火星'] },
        confidence: 'high'
      },
    },
    'detail-dimension-transit': {
      zh: {
        dimension_key: 'career',
        title: '事业节奏',
        summary: '今天更适合稳住节奏，把精力放在关键事项上。',
        key_aspects: [{ aspect: '行运火星刑本命太阳', meaning: '推进力更强，但容易急躁' }],
        opportunities: ['推进关键任务', '明确优先级与边界'],
        challenges: ['节奏过快', '沟通偏强势'],
        actions: ['把任务拆成小步', '重要沟通先对齐目标'],
        reflection_question: '我今天最需要稳住的节奏是什么？',
        confidence: 'med'
      },
      en: {
        dimension_key: 'career',
        title: '事业节奏',
        summary: '今天更适合稳住节奏，把精力放在关键事项上。',
        key_aspects: [{ aspect: '行运火星刑本命太阳', meaning: '推进力更强，但容易急躁' }],
        opportunities: ['推进关键任务', '明确优先级与边界'],
        challenges: ['节奏过快', '沟通偏强势'],
        actions: ['把任务拆成小步', '重要沟通先对齐目标'],
        reflection_question: '我今天最需要稳住的节奏是什么？',
        confidence: 'med'
      },
    },
    'detail-advice-transit': {
      zh: {
        focus_title: '稳住节奏，先对齐再推进',
        do: { title: '宜做', items: ['先确定优先级', '把沟通说清楚', '留出缓冲时间'] },
        dont: { title: '忌做', items: ['临时改方向', '情绪化决策', '高强度并行'] },
        reasoning: '行运带来冲劲，但需要结构承接，先稳住再加速。',
        reminder: '先把最关键的一步完成。',
        confidence: 'high'
      },
      en: {
        focus_title: '稳住节奏，先对齐再推进',
        do: { title: '宜做', items: ['先确定优先级', '把沟通说清楚', '留出缓冲时间'] },
        dont: { title: '忌做', items: ['临时改方向', '情绪化决策', '高强度并行'] },
        reasoning: '行运带来冲劲，但需要结构承接，先稳住再加速。',
        reminder: '先把最关键的一步完成。',
        confidence: 'high'
      },
    },
    'detail-time-windows-transit': {
      zh: {
        day_focus: '上午推进、午间对齐、晚上收尾',
        windows: [
          { period: '上午', time: '06:00-12:00', energy_level: '积极', theme: '推进', best_for: ['处理重点任务', '集中执行'], avoid_for: ['临时改方向'], tip: '先做最关键的一步。' },
          { period: '午间', time: '12:00-18:00', energy_level: '平稳', theme: '对齐', best_for: ['沟通协调', '明确共识'], avoid_for: ['过度争辩'], tip: '用事实对齐节奏。' },
          { period: '晚上', time: '18:00-24:00', energy_level: '放松', theme: '收尾', best_for: ['复盘整理', '轻量社交'], avoid_for: ['高压决策'], tip: '给自己留出恢复空间。' }
        ],
        confidence: 'high'
      },
      en: {
        day_focus: '上午推进、午间对齐、晚上收尾',
        windows: [
          { period: '上午', time: '06:00-12:00', energy_level: '积极', theme: '推进', best_for: ['处理重点任务', '集中执行'], avoid_for: ['临时改方向'], tip: '先做最关键的一步。' },
          { period: '午间', time: '12:00-18:00', energy_level: '平稳', theme: '对齐', best_for: ['沟通协调', '明确共识'], avoid_for: ['过度争辩'], tip: '用事实对齐节奏。' },
          { period: '晚上', time: '18:00-24:00', energy_level: '放松', theme: '收尾', best_for: ['复盘整理', '轻量社交'], avoid_for: ['高压决策'], tip: '给自己留出恢复空间。' }
        ],
        confidence: 'high'
      },
    },
    'detail-weekly-trend-transit': {
      zh: {
        week_range: '1/20-1/26',
        daily_scores: [
          { date: '2024-01-20', score: 72, label: '稳' },
          { date: '2024-01-21', score: 68, label: '缓' },
          { date: '2024-01-22', score: 75, label: '进' },
          { date: '2024-01-23', score: 80, label: '强' },
          { date: '2024-01-24', score: 70, label: '稳' },
          { date: '2024-01-25', score: 66, label: '缓' },
          { date: '2024-01-26', score: 78, label: '进' }
        ],
        key_dates: [
          { date: '2024-01-22', label: '效率日', description: '适合推进重点事项。' },
          { date: '2024-01-25', label: '缓冲日', description: '适合减少安排、恢复节奏。' }
        ],
        weekly_focus: '稳住节奏、减少内耗',
        strategy: '先定优先级，再推进执行。',
        confidence: 'med'
      },
      en: {
        week_range: '1/20-1/26',
        daily_scores: [
          { date: '2024-01-20', score: 72, label: '稳' },
          { date: '2024-01-21', score: 68, label: '缓' },
          { date: '2024-01-22', score: 75, label: '进' },
          { date: '2024-01-23', score: 80, label: '强' },
          { date: '2024-01-24', score: 70, label: '稳' },
          { date: '2024-01-25', score: 66, label: '缓' },
          { date: '2024-01-26', score: 78, label: '进' }
        ],
        key_dates: [
          { date: '2024-01-22', label: '效率日', description: '适合推进重点事项。' },
          { date: '2024-01-25', label: '缓冲日', description: '适合减少安排、恢复节奏。' }
        ],
        weekly_focus: '稳住节奏、减少内耗',
        strategy: '先定优先级，再推进执行。',
        confidence: 'med'
      },
    },
    'detail-aspect-matrix-transit': {
      zh: {
        headline: '张力与推进并存',
        summary: '相位矩阵显示行动力增强，但需要用结构稳住节奏。',
        key_aspects: [
          { aspect: '行运火星刑本命太阳', impact: '冲劲更强，易急躁', advice: '先定优先级再推进' },
          { aspect: '行运月亮拱本命金星', impact: '关系更易柔和对齐', advice: '用温和沟通争取支持' }
        ],
        energy_flow: ['适合推进而非重启', '沟通要放慢语气'],
        do_dont: { do: ['拆分任务', '先对齐共识'], dont: ['情绪化决策', '临时改方向'] },
        confidence: 'med'
      },
      en: {
        headline: '张力与推进并存',
        summary: '相位矩阵显示行动力增强，但需要用结构稳住节奏。',
        key_aspects: [
          { aspect: '行运火星刑本命太阳', impact: '冲劲更强，易急躁', advice: '先定优先级再推进' },
          { aspect: '行运月亮拱本命金星', impact: '关系更易柔和对齐', advice: '用温和沟通争取支持' }
        ],
        energy_flow: ['适合推进而非重启', '沟通要放慢语气'],
        do_dont: { do: ['拆分任务', '先对齐共识'], dont: ['情绪化决策', '临时改方向'] },
        confidence: 'med'
      },
    },
    'detail-astro-report-transit': {
      zh: {
        title: '今日星象解读',
        summary: '今天更像在稳住节奏的状态下完成关键推进。',
        deep_dive: '行运激活了对效率与控制感的需求，急于求成会让能量外散。把重点放在一件最关键的事上，反而更稳更有效。',
        highlights: [
          { title: '行动力增强', description: '适合推进重点任务，但要避免冲动。' },
          { title: '沟通缓冲', description: '温和表达更容易获得支持。' }
        ],
        caution: '避免在疲惫时做重要决定。',
        action: '把今天最重要的一步写下来并完成。',
        reflection_question: '我今天想用什么方式稳住自己的节奏？',
        confidence: 'high'
      },
      en: {
        title: '今日星象解读',
        summary: '今天更像在稳住节奏的状态下完成关键推进。',
        deep_dive: '行运激活了对效率与控制感的需求，急于求成会让能量外散。把重点放在一件最关键的事上，反而更稳更有效。',
        highlights: [
          { title: '行动力增强', description: '适合推进重点任务，但要避免冲动。' },
          { title: '沟通缓冲', description: '温和表达更容易获得支持。' }
        ],
        caution: '避免在疲惫时做重要决定。',
        action: '把今天最重要的一步写下来并完成。',
        reflection_question: '我今天想用什么方式稳住自己的节奏？',
        confidence: 'high'
      },
    },
    'detail-planets-transit': {
      zh: {
        title: '行运行星解读',
        summary: '行运行星强调执行与边界，适合稳步推进。',
        interpretation: '快速行星带来节奏变化，适合把任务分段推进并在沟通时更清晰。',
        highlights: ['重点任务优先', '沟通先对齐目标', '避免临时改方向']
      },
      en: {
        title: '行运行星解读',
        summary: '行运行星强调执行与边界，适合稳步推进。',
        interpretation: '快速行星带来节奏变化，适合把任务分段推进并在沟通时更清晰。',
        highlights: ['重点任务优先', '沟通先对齐目标', '避免临时改方向']
      },
    },
    'detail-asteroids-transit': {
      zh: {
        headline: '小行星强调疗愈与边界',
        focus_asteroids: [
          { name: 'Chiron', sign: '白羊', house: 6, theme: '修复与疗愈', influence: '更关注身体与日常恢复。' },
          { name: 'Ceres', sign: '金牛', house: 7, theme: '照料与稳定', influence: '关系中更渴望踏实照料。' },
          { name: 'Juno', sign: '天秤', house: 1, theme: '承诺与契约', influence: '对合作关系的要求更明确。' },
          { name: 'Vesta', sign: '处女', house: 12, theme: '专注与内在', influence: '适合整理内在节奏。' }
        ],
        chiron_focus: { is_return: false, theme: '疗愈旧伤', healing_path: '用可执行的日常护理修复自己。', warning: '避免忽视身体信号。' },
        suggestions: ['安排恢复性的日常仪式', '把压力拆成小步骤处理'],
        confidence: 'med'
      },
      en: {
        headline: '小行星强调疗愈与边界',
        focus_asteroids: [
          { name: 'Chiron', sign: '白羊', house: 6, theme: '修复与疗愈', influence: '更关注身体与日常恢复。' },
          { name: 'Ceres', sign: '金牛', house: 7, theme: '照料与稳定', influence: '关系中更渴望踏实照料。' },
          { name: 'Juno', sign: '天秤', house: 1, theme: '承诺与契约', influence: '对合作关系的要求更明确。' },
          { name: 'Vesta', sign: '处女', house: 12, theme: '专注与内在', influence: '适合整理内在节奏。' }
        ],
        chiron_focus: { is_return: false, theme: '疗愈旧伤', healing_path: '用可执行的日常护理修复自己。', warning: '避免忽视身体信号。' },
        suggestions: ['安排恢复性的日常仪式', '把压力拆成小步骤处理'],
        confidence: 'med'
      },
    },
    'detail-rulers-transit': {
      zh: {
        overview: '宫主星链条提示今日更适合稳住节奏，先处理基础盘。',
        rulers: [
          { house: 1, sign: '天秤', ruler: 'Venus', flies_to_house: 7, flies_to_sign: '白羊', theme: '自我与关系', advice: '用清晰边界换来平衡。' },
          { house: 2, sign: '天蝎', ruler: 'Pluto', flies_to_house: 4, flies_to_sign: '巨蟹', theme: '资源与安全', advice: '优先保障稳定感。' },
          { house: 3, sign: '射手', ruler: 'Jupiter', flies_to_house: 10, flies_to_sign: '摩羯', theme: '沟通与目标', advice: '把沟通落到具体目标。' },
          { house: 4, sign: '摩羯', ruler: 'Saturn', flies_to_house: 6, flies_to_sign: '双鱼', theme: '家庭与日常', advice: '稳住作息与习惯。' },
          { house: 5, sign: '水瓶', ruler: 'Uranus', flies_to_house: 11, flies_to_sign: '狮子', theme: '创造与社群', advice: '把创意放到合作里。' },
          { house: 6, sign: '双鱼', ruler: 'Neptune', flies_to_house: 12, flies_to_sign: '处女', theme: '健康与修复', advice: '给自己可执行的恢复步骤。' }
        ],
        deep_focus: [
          { title: '关系与自我', description: '1宫主入7宫，关系议题更重要。' },
          { title: '资源与安全', description: '2宫主入4宫，安全感是关键。' }
        ],
        combinations: [
          { from_house: 1, to_house: 7, theme: '自我-关系联动', suggestion: '用清晰表达换取理解。' },
          { from_house: 2, to_house: 4, theme: '资源-家庭联动', suggestion: '优先照顾基本盘。' }
        ],
        confidence: 'med'
      },
      en: {
        overview: '宫主星链条提示今日更适合稳住节奏，先处理基础盘。',
        rulers: [
          { house: 1, sign: '天秤', ruler: 'Venus', flies_to_house: 7, flies_to_sign: '白羊', theme: '自我与关系', advice: '用清晰边界换来平衡。' },
          { house: 2, sign: '天蝎', ruler: 'Pluto', flies_to_house: 4, flies_to_sign: '巨蟹', theme: '资源与安全', advice: '优先保障稳定感。' },
          { house: 3, sign: '射手', ruler: 'Jupiter', flies_to_house: 10, flies_to_sign: '摩羯', theme: '沟通与目标', advice: '把沟通落到具体目标。' },
          { house: 4, sign: '摩羯', ruler: 'Saturn', flies_to_house: 6, flies_to_sign: '双鱼', theme: '家庭与日常', advice: '稳住作息与习惯。' },
          { house: 5, sign: '水瓶', ruler: 'Uranus', flies_to_house: 11, flies_to_sign: '狮子', theme: '创造与社群', advice: '把创意放到合作里。' },
          { house: 6, sign: '双鱼', ruler: 'Neptune', flies_to_house: 12, flies_to_sign: '处女', theme: '健康与修复', advice: '给自己可执行的恢复步骤。' }
        ],
        deep_focus: [
          { title: '关系与自我', description: '1宫主入7宫，关系议题更重要。' },
          { title: '资源与安全', description: '2宫主入4宫，安全感是关键。' }
        ],
        combinations: [
          { from_house: 1, to_house: 7, theme: '自我-关系联动', suggestion: '用清晰表达换取理解。' },
          { from_house: 2, to_house: 4, theme: '资源-家庭联动', suggestion: '优先照顾基本盘。' }
        ],
        confidence: 'med'
      },
    },
    'cycle-naming': {
      zh: {
        cycle_id: 'jupiter-return-2024-01-01',
        title: '木星回归',
        one_liner: '扩张与机遇的周期窗口',
        tags: ['成长', '机遇'],
        intensity: 'high',
        dates: { start: '2024-01-01', peak: '2024-02-01', end: '2024-03-01' },
        actions: ['设定宏大目标', '学习新技能'],
        prompt_question: '我想把生活拓展到什么新领域？'
      },
      en: {
        cycle_id: 'jupiter-return-2024-01-01',
        title: 'Jupiter Return',
        one_liner: 'A window for expansion and opportunity',
        tags: ['growth', 'opportunity'],
        intensity: 'high',
        dates: { start: '2024-01-01', peak: '2024-02-01', end: '2024-03-01' },
        actions: ['Set bold goals', 'Learn a new skill'],
        prompt_question: 'Where do I want to expand my life?'
      },
    },
    'synastry-overview': {
      zh: {
        overview: {
          keywords: [{ word: '磁性', evidence: '金星合冥王' }],
          growth_task: { task: '建立边界', evidence: '土星对冲' },
          compatibility_scores: [
            { dim: '情绪安全', score: 82, desc: '情感底盘较稳' },
            { dim: '沟通', score: 74, desc: '交流节奏可磨合' },
            { dim: '吸引力', score: 88, desc: '化学反应明显' },
            { dim: '价值观', score: 70, desc: '方向大体一致' },
            { dim: '节奏', score: 64, desc: '步调需要校准' },
            { dim: '长期潜力', score: 76, desc: '可持续经营' }
          ]
        },
        conclusion: {
          summary: '这段关系兼具吸引力与成长性。',
          disclaimer: '仅供参考，用于自我观察。'
        }
      },
      en: {
        overview: {
          keywords: [{ word: 'Magnetic', evidence: 'Venus conjunct Pluto' }],
          growth_task: { task: 'Build boundaries', evidence: 'Saturn opposition' },
          compatibility_scores: [
            { dim: 'Emotional Safety', score: 82, desc: 'Steady emotional base' },
            { dim: 'Communication', score: 74, desc: 'Talk flows with tuning' },
            { dim: 'Attraction', score: 88, desc: 'Strong chemistry' },
            { dim: 'Values', score: 70, desc: 'Mostly aligned priorities' },
            { dim: 'Pacing', score: 64, desc: 'Rhythm needs syncing' },
            { dim: 'Long-term Potential', score: 76, desc: 'Buildable over time' }
          ]
        },
        conclusion: {
          summary: 'A relationship with attraction and growth potential.',
          disclaimer: 'For reflection only.'
        }
      },
    },
    'synastry-growth-task': {
      zh: {
        growth_task: {
          task: '建立边界与节奏',
          evidence: '土星对冲带来承诺与压力并存，需要共识与节制。',
          action_steps: ['设定清晰的界限', '制定固定沟通节奏', '共同回顾边界是否有效'],
        },
        sweet_spots: [{ title: '情感共鸣', evidence: '月亮三分', experience: '彼此理解感强', usage: '多做情绪确认' }],
        friction_points: [{ title: '沟通摩擦', evidence: '水星刑火星', trigger: '急躁语气', cost: '误解升级' }],
      },
      en: {
        growth_task: {
          task: 'Build clear boundaries and pacing',
          evidence: 'Saturn oppositions bring commitment and pressure together, calling for shared structure.',
          action_steps: ['Name boundaries explicitly', 'Set a steady check-in rhythm', 'Review what is working weekly'],
        },
        sweet_spots: [{ title: 'Emotional Resonance', evidence: 'Moon trine', experience: 'Strong mutual understanding', usage: 'Name feelings often' }],
        friction_points: [{ title: 'Communication Friction', evidence: 'Mercury square Mars', trigger: 'Sharp tone', cost: 'Escalation' }],
      },
    },
    'synastry-highlights': {
      zh: {
        highlights: {
          harmony: [
            { aspect: '月亮拱金星', experience: '情绪容易被照顾与理解。', advice: '多表达欣赏。' },
            { aspect: '太阳六合木星', experience: '彼此鼓励与乐观。', advice: '一起设定小目标。' },
            { aspect: '水星合月亮', experience: '感受与表达更同步。', advice: '用“我感受”开场。' },
            { aspect: '金星拱火星', experience: '吸引力明显。', advice: '安排有仪式感的约会。' },
            { aspect: '上升合上升', experience: '日常相处自然。', advice: '保持小默契。' }
          ],
          challenges: [
            { aspect: '水星刑火星', conflict: '沟通容易被点燃。', mitigation: '先停一拍再回应。' },
            { aspect: '月亮冲土星', conflict: '容易感到被忽视。', mitigation: '主动做情绪确认。' },
            { aspect: '金星刑天王', conflict: '亲密忽冷忽热。', mitigation: '建立可预期仪式。' },
            { aspect: '火星冲冥王', conflict: '冲突升级快。', mitigation: '设置暂停机制。' },
            { aspect: '太阳刑海王', conflict: '容易投射或误解。', mitigation: '把事实说清楚。' }
          ],
          overlays: [
            { overlay: 'B 的月亮落入 A 的 4 宫', meaning: '带来家的感觉与安全感主题。' },
            { overlay: 'A 的金星落入 B 的 7 宫', meaning: '容易把对方当理想伴侣。' },
            { overlay: 'B 的火星落入 A 的 8 宫', meaning: '吸引力强且带来深层课题。' }
          ],
          accuracy_note: '若出生时间不确定，宫位相关解读需保留弹性。'
        }
      },
      en: {
        highlights: {
          harmony: [
            { aspect: 'Moon trine Venus', experience: 'Warm emotional ease shows up.', advice: 'Name appreciation often.' },
            { aspect: 'Sun sextile Jupiter', experience: 'Mutual support and optimism.', advice: 'Plan small wins together.' },
            { aspect: 'Mercury conjunct Moon', experience: 'Feelings and words connect fast.', advice: 'Lead with “I feel.”' },
            { aspect: 'Venus trine Mars', experience: 'Strong attraction and chemistry.', advice: 'Create intentional dates.' },
            { aspect: 'Ascendant conjunction', experience: 'Natural daily rhythm.', advice: 'Keep small rituals.' }
          ],
          challenges: [
            { aspect: 'Mercury square Mars', conflict: 'Talks ignite quickly.', mitigation: 'Pause before replying.' },
            { aspect: 'Moon opposite Saturn', conflict: 'Emotional distance can appear.', mitigation: 'Offer explicit reassurance.' },
            { aspect: 'Venus square Uranus', conflict: 'On/off closeness shows up.', mitigation: 'Build predictable rituals.' },
            { aspect: 'Mars opposite Pluto', conflict: 'Conflict escalates fast.', mitigation: 'Use a pause protocol.' },
            { aspect: 'Sun square Neptune', conflict: 'Projection or confusion creeps in.', mitigation: 'Clarify facts early.' }
          ],
          overlays: [
            { overlay: 'B Moon in A 4th house', meaning: 'Feels like home and activates safety themes.' },
            { overlay: 'A Venus in B 7th house', meaning: 'You naturally see each other as partners.' },
            { overlay: 'B Mars in A 8th house', meaning: 'Strong pull with deep themes.' }
          ],
          accuracy_note: 'If birth times are uncertain, house-based readings stay flexible.'
        }
      },
    },
    'synastry-core-dynamics': {
      zh: {
        core_dynamics: [
          {
            key: 'emotional_safety',
            title: '情绪与安全感',
            a_needs: 'A 需要持续的情绪确认与稳定回应。',
            b_needs: 'B 需要空间与被理解的安全感。',
            loop: { trigger: '情绪不确定', defense: '沉默回避', escalation: '猜测升温' },
            repair: { script: '我现在有点不安，可以先告诉我你在吗？', action: '设定冷静时长后回访一次' }
          },
          {
            key: 'communication',
            title: '沟通与冲突',
            a_needs: 'A 需要明确、快速的回应。',
            b_needs: 'B 需要更柔和的语气与节奏。',
            loop: { trigger: '语气过快', defense: '反驳或关机', escalation: '误解加深' },
            repair: { script: '我不是在指责你，我想先听听你的感受。', action: '先复述对方一句再表达' }
          },
          {
            key: 'intimacy',
            title: '亲密与吸引',
            a_needs: 'A 需要被主动回应与亲密确认。',
            b_needs: 'B 需要被尊重节奏与边界。',
            loop: { trigger: '推进过快', defense: '退后观望', escalation: '距离拉开' },
            repair: { script: '我很在意你，我们可以慢一点。', action: '设定一个小而确定的亲密仪式' }
          },
          {
            key: 'values',
            title: '价值观与承诺',
            a_needs: 'A 需要看到未来方向的共识。',
            b_needs: 'B 需要先确认现实可行性。',
            loop: { trigger: '目标分歧', defense: '各自坚持', escalation: '对立僵持' },
            repair: { script: '我们先找一个都能接受的最小共识。', action: '用 10 分钟列出共同优先级' }
          },
          {
            key: 'rhythm',
            title: '生活节奏与规划',
            a_needs: 'A 需要行动与变化的节奏感。',
            b_needs: 'B 需要稳定与可预期的安排。',
            loop: { trigger: '节奏错位', defense: '拖延或推进', escalation: '疲惫与抱怨' },
            repair: { script: '我们把这周的节奏对齐一下。', action: '每周同步 1 次时间表' }
          }
        ]
      },
      en: {
        core_dynamics: [
          {
            key: 'emotional_safety',
            title: 'Emotional Safety',
            a_needs: 'A needs steady reassurance to feel safe.',
            b_needs: 'B needs space and gentle validation.',
            loop: { trigger: 'uncertainty', defense: 'withdrawal', escalation: 'second-guessing' },
            repair: { script: 'I feel uneasy—can you confirm we are okay?', action: 'Set a clear check-in time' }
          },
          {
            key: 'communication',
            title: 'Communication & Repair',
            a_needs: 'A needs direct, quick responses.',
            b_needs: 'B needs softer tone and pacing.',
            loop: { trigger: 'fast tone', defense: 'pushback', escalation: 'misread intent' },
            repair: { script: 'I’m not blaming you—I want to understand.', action: 'Reflect one sentence before replying' }
          },
          {
            key: 'intimacy',
            title: 'Desire & Attraction',
            a_needs: 'A needs active signals of closeness.',
            b_needs: 'B needs respect for timing and boundaries.',
            loop: { trigger: 'move too fast', defense: 'pull back', escalation: 'distance grows' },
            repair: { script: 'I’m into you; let’s go at your pace.', action: 'Create a small shared ritual' }
          },
          {
            key: 'values',
            title: 'Values & Commitment',
            a_needs: 'A needs clarity on shared direction.',
            b_needs: 'B needs practical reassurance.',
            loop: { trigger: 'goal mismatch', defense: 'dig in', escalation: 'stalemate' },
            repair: { script: 'Let’s agree on the smallest common ground first.', action: 'List shared priorities for 10 minutes' }
          },
          {
            key: 'rhythm',
            title: 'Rhythm & Planning',
            a_needs: 'A needs movement and momentum.',
            b_needs: 'B needs stability and predictability.',
            loop: { trigger: 'tempo clash', defense: 'delay or push', escalation: 'fatigue' },
            repair: { script: 'Can we align this week’s rhythm?', action: 'Sync schedules once a week' }
          }
        ]
      },
    },
    'synastry-practice-tools': {
      zh: {
        practice_tools: {
          person_a: [
            { title: '表达感受', content: '用一句话说出真实需求。' },
            { title: '明确边界', content: '说清你能接受的节奏。' }
          ],
          person_b: [
            { title: '安全确认', content: '告诉对方你在意的点。' },
            { title: '放慢节奏', content: '先稳定情绪再回应。' }
          ],
          joint: [
            { title: '对话约定', content: '约定固定的沟通时间。' },
            { title: '每日小连接', content: '每天留 10 分钟聊当日心情。' }
          ]
        }
      },
      en: {
        practice_tools: {
          person_a: [
            { title: 'Name feelings', content: 'Say one real need.' },
            { title: 'State boundaries', content: 'Share your workable pace.' }
          ],
          person_b: [
            { title: 'Offer reassurance', content: 'Confirm what you value.' },
            { title: 'Soften pace', content: 'Stabilize emotions before replying.' }
          ],
          joint: [
            { title: 'Conversation pact', content: 'Set a weekly check-in.' },
            { title: 'Daily micro-ritual', content: 'Spend 10 minutes sharing the day.' }
          ]
        }
      },
    },
    'synastry-relationship-timing': {
      zh: {
        relationship_timing: {
          theme_7: '未来 7 天适合稳住情绪与对齐节奏。',
          theme_30: '前 30 天以节奏磨合与情绪确认为主。',
          theme_90: '90 天内会进入更稳定的协作阶段。',
          windows: {
            big_talk: '第 3-4 周适合讨论未来安排。',
            repair: '第 2 周适合做一次情绪修复。',
            cool_down: '第 1 周注意不要在疲惫时硬碰硬。'
          },
          dominant_theme: '亲密与节奏',
          reminder: '情绪波动时先稳定，再谈决定。'
        }
      },
      en: {
        relationship_timing: {
          theme_7: 'The next 7 days favor calming and syncing rhythm.',
          theme_30: 'First 30 days focus on pacing and reassurance.',
          theme_90: 'By 90 days the bond stabilizes through routines.',
          windows: {
            big_talk: 'Weeks 3-4 are best for bigger conversations.',
            repair: 'Week 2 is supportive for repair talks.',
            cool_down: 'Week 1 needs more cooling space if tired.'
          },
          dominant_theme: 'Intimacy & Rhythm',
          reminder: 'Stabilize emotions first, then decide.'
        }
      },
    },
    'synastry-dynamic': {
      zh: {
        communication: { style: '直觉型沟通', tips: ['先说感受', '再谈事实'] },
        conflict: { triggers: ['节奏不一致'], resolution: '建立共识与规则' },
        intimacy: { strengths: ['情感连接'], growth: ['表达真实需求'] },
        long_term: { potential: '可持续成长', advice: '保持节奏与边界' }
      },
      en: {
        communication: { style: 'Intuitive', tips: ['Name feelings first', 'Then facts'] },
        conflict: { triggers: ['Pace mismatch'], resolution: 'Agree on rules' },
        intimacy: { strengths: ['Emotional bond'], growth: ['Express real needs'] },
        long_term: { potential: 'Sustainable growth', advice: 'Keep rhythm and boundaries' }
      },
    },
    'ask-answer': {
      zh: `## 1. The Essence
Headline: 沉重的皇冠：被看见的恐惧
The Insight: 这种停滞感并非能力不足，而是你在保护自己不被评判。你按下的暂停键，是一种过度在乎而形成的心理防御。

## 2. The Astrological Signature
Saturn in 10th House (Pisces)：你渴望被看见，却又害怕公开的评判。
Mars square Saturn：行动力与自我审判拉扯，让你在关键时刻犹豫。
Chiron in 6th House (Scorpio)：对效率与完美的执念，源自对失控的担忧。

## 3. Deep Dive Analysis
The Mirror: 你像一脚踩油门、一脚踩刹车，明明机会近在眼前却总在关键时刻后撤。
The Root: 10宫土星带来严苛的内在法官，让你把“被看见”与“被否定”绑定在一起。
The Shadow: 你可能用策略性拖延来回避评价，避免触发“我不够好”的恐惧。
The Light: 土星的礼物是稳定而真实的权威，允许你在不完美中依然行动。

## 4. Soulwork
Journal Prompt: 如果我注定会犯一个公开的错误，但我仍会被接纳，我现在最想迈出的一步是什么？
Micro-Habit: 本周提交一个只做到 70% 的作品，观察世界并没有因此崩塌。

## 5. The Cosmic Takeaway (Conclusion)
Summary: 你的恐惧与野心同样巨大，正说明你的潜力。请记住，成熟的权威不是从不犯错，而是敢于承担。每一次行动，都是在为你的皇冠打磨底座。去行动吧，哪怕心仍在颤抖。
Affirmation: 我不追求完美，我追求真实。`,
      en: `## 1. The Essence
Headline: The Heavy Crown of Visibility
The Insight: This stuckness isn’t about lack of ability; it’s a protective strategy against judgment. The pause button is your way of guarding what matters most to you.

## 2. The Astrological Signature
Saturn in 10th House (Pisces): You crave recognition while fearing public scrutiny.
Mars square Saturn: Drive and self-judgment collide, slowing decisive action.
Chiron in 6th House (Scorpio): The push for perfection masks a fear of losing control.

## 3. Deep Dive Analysis
The Mirror: It feels like one foot on the gas, one on the brake—opportunity is close, yet you retreat at the final moment.
The Root: Saturn in the 10th places a severe inner judge on your public self, tying visibility to fear of failure.
The Shadow: You may use strategic procrastination to avoid being evaluated, protecting a tender fear of “not enough.”
The Light: Saturn’s gift is grounded authority—the power to act even when it isn’t perfect.

## 4. Soulwork
Journal Prompt: If I were guaranteed love even after a public mistake, what step would I take today?
Micro-Habit: Submit a piece of work at 70% completeness and notice the world doesn’t collapse.

## 5. The Cosmic Takeaway (Conclusion)
Summary: Your fear is as large as your ambition, which proves your potential. True authority isn’t perfection—it’s responsibility. Each brave step becomes the foundation of your crown. Move forward, even with trembling hands.
Affirmation: I choose truth over perfection.`,
    },
    'cbt-analysis': {
      zh: {
        cognitive_analysis: { distortions: ['过度概括'], summary: '你正在把单次事件扩大化。' },
        astro_context: { aspect: '水星刑土星', interpretation: '沟通压力增大，需要慢一点。' },
        jungian_insight: { archetype_active: '受难者', archetype_solution: '战士', insight: '从被动防御转向主动行动。' },
        actions: ['写下事实与解释的区别', '向可信的人求证']
      },
      en: {
        cognitive_analysis: { distortions: ['Overgeneralization'], summary: 'A single event is being generalized.' },
        astro_context: { aspect: 'Mercury square Saturn', interpretation: 'Communication feels heavy; slow down.' },
        jungian_insight: { archetype_active: 'Victim', archetype_solution: 'Warrior', insight: 'Move from defense to action.' },
        actions: ['Separate facts from interpretations', 'Reality-check with someone you trust']
      },
    },
  };

  const entry = mocks[promptId] || mocks['natal-overview'];
  const content = (entry[lang] ?? entry.zh) as T;
  return { lang, content };
}
