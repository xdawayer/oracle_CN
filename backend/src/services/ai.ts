// INPUT: AI 内容生成服务（DeepSeek chat/reasoning，单语言输出与合盘综述/成长焦点分区 mock）。
// OUTPUT: 导出 AI 调用服务（snake_case 输出、合盘成长焦点字段，含缓存与 JSON 修复）。
// POS: AI 生成服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import { getPrompt, buildCacheKey } from '../prompts/manager.js';
import { hashInput, CACHE_TTL } from '../cache/strategy.js';
import { cacheService } from '../cache/redis.js';
import type { AIContentMeta, LocalizedContent, Language } from '../types/api.js';

const getDeepSeekApiKey = () => process.env.DEEPSEEK_API_KEY;
const getDeepSeekBaseUrl = () =>
  process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const AI_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.AI_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
})();
const AI_TEMPERATURE_DEFAULT = (() => {
  const parsed = Number(process.env.AI_TEMPERATURE);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.min(Math.max(parsed, 0), 1);
})();
const DEFAULT_LANG: Language = 'zh';

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
  'cycle-naming': 0.5,
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

  // T4 (0.6): 时效性/建议性内容
  'daily-forecast': 0.6,
  'daily-detail': 0.6,
  'synastry-practice-tools': 0.6,
  'synastry-relationship-timing': 0.6,
  'synastry-vibe-tags': 0.6,
  'synastry-weather-forecast': 0.6,
  'synastry-action-plan': 0.6,

  // T5 (0.7): 创意性/深度洞察
  'ask-answer': 0.7,
  'oracle-answer': 0.7,
};

function getTemperatureForPrompt(promptId: string): number {
  return TEMPERATURE_MAP[promptId] ?? AI_TEMPERATURE_DEFAULT;
}

// 使用 reasoning 模型的 promptId
const REASONING_PROMPTS = ['ask-answer', 'oracle-answer'];
const RAW_TEXT_PROMPTS = new Set<string>(['ask-answer']);
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

async function repairJsonWithAI(jsonText: string, apiKey: string, baseUrl: string, timeoutMs: number): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: [
              'You are a JSON repair assistant.',
              'Return ONLY valid JSON with the same content.',
              'Escape any double quotes inside string values.',
              'Do not add markdown fences or explanations.',
            ].join('\n'),
          },
          { role: 'user', content: jsonText },
        ],
        temperature: 0.0,
        max_tokens: 4096,
      }),
    }, timeoutMs);

    if (!response.ok) return null;
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;
    const extracted = extractJsonObject(text) || text;
    return extracted;
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
  const allowMock = options.allowMock === true;
  const lang = options.lang ?? DEFAULT_LANG;
  const prompt = getPrompt(options.promptId);
  if (!prompt) {
    if (!allowMock) {
      throw new AIUnavailableError('prompt_missing', `Prompt not found: ${options.promptId}`);
    }
    console.warn(`[AI] Prompt not found: ${options.promptId}. Using mock response.`);
    return { content: getMockResponse<T>(options.promptId, lang), meta: buildMockMeta('prompt_missing') };
  }

  const context = { ...options.context, lang };
  const systemMessage = typeof prompt.system === 'function'
    ? prompt.system(context)
    : prompt.system;
  const userMessage = prompt.user(context);
  const cacheKey = buildCacheKey(options.promptId, hashInput(context));

  const shouldUseCache = !NO_CACHE_PROMPTS.has(options.promptId);

  // 检查缓存
  if (shouldUseCache) {
    const cached = await cacheService.get<LocalizedContent<T>>(cacheKey);
    if (cached) return buildAIResult(cached, true);
  }

  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    if (!allowMock) {
      throw new AIUnavailableError('missing_api_key', 'DeepSeek API key missing');
    }
    return { content: getMockResponse<T>(options.promptId, lang), meta: buildMockMeta('missing_api_key') };
  }

  const useReasoning = REASONING_PROMPTS.includes(options.promptId);
  const model = useReasoning ? 'deepseek-reasoner' : 'deepseek-chat';
  const baseUrl = getDeepSeekBaseUrl();

  try {
    const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;
    const maxTokens = options.maxTokens ?? 4096;
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

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('No response from DeepSeek');
    }

    if (RAW_TEXT_PROMPTS.has(options.promptId)) {
      const cleaned = stripCodeFence(text);
      const result: LocalizedContent<T> = { lang, content: cleaned as T };
      if (shouldUseCache) {
        await cacheService.set(cacheKey, result, CACHE_TTL.AI_OUTPUT);
      }
      return buildAIResult(result);
    }

    // 解析 JSON 响应（优先提取首个完整 JSON 对象）
    const extracted = extractJsonObject(text);
    const jsonMatch = extracted ? [extracted] : (text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/));
    const jsonStr = Array.isArray(jsonMatch) ? (jsonMatch[1] || jsonMatch[0]) : jsonMatch?.[1] || jsonMatch?.[0];
    if (!jsonStr) {
      throw new Error('Invalid JSON response from DeepSeek');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr) as unknown;
    } catch (parseError) {
      const repaired = await repairJsonWithAI(jsonStr, apiKey, baseUrl, timeoutMs);
      if (!repaired) throw parseError;
      parsed = JSON.parse(repaired) as unknown;
    }
    const result = normalizeLocalizedContent<T>(parsed, lang);

    // 写入缓存
    if (shouldUseCache) {
      await cacheService.set(cacheKey, result, CACHE_TTL.AI_OUTPUT);
    }

    return buildAIResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reason = resolveMockReason(error);
    if (!allowMock) {
      console.error(`[AI] ${options.promptId} failed: ${message}`);
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
        date: '2024-01-01',
        theme_title: '今日主题：内在整合',
        anchor_quote: '静水流深，力量在沉淀中积蓄',
        energy_profile: {
          drive: { score: 70, feeling: '动力充沛', scenario: '适合推进重要项目', action: '抓住上午的高效时段' },
          pressure: { score: 40, feeling: '压力适中', scenario: '可能有小挑战', action: '保持冷静应对' },
          heat: { score: 30, feeling: '摩擦较少', scenario: '人际关系顺畅', action: '适合沟通协作' },
          nourishment: { score: 80, feeling: '滋养充足', scenario: '情感支持到位', action: '感恩身边的人' },
        },
        time_windows: { morning: '高效工作', midday: '社交互动', evening: '自我反思' },
        strategy: { best_use: '推进长期目标', avoid: '避免冲动决策' },
        share_text: '今日能量：内在整合，静水流深',
      },
      en: {
        date: '2024-01-01',
        theme_title: 'Today\'s Theme: Inner Integration',
        anchor_quote: 'Still waters run deep, power accumulates in stillness',
        energy_profile: {
          drive: { score: 70, feeling: 'Energized', scenario: 'Good for advancing projects', action: 'Seize the morning hours' },
          pressure: { score: 40, feeling: 'Moderate pressure', scenario: 'Minor challenges possible', action: 'Stay calm' },
          heat: { score: 30, feeling: 'Low friction', scenario: 'Smooth relationships', action: 'Good for collaboration' },
          nourishment: { score: 80, feeling: 'Well nourished', scenario: 'Emotional support available', action: 'Appreciate those around you' },
        },
        time_windows: { morning: 'Productive work', midday: 'Social interaction', evening: 'Self-reflection' },
        strategy: { best_use: 'Advance long-term goals', avoid: 'Avoid impulsive decisions' },
        share_text: 'Today\'s energy: Inner integration, still waters run deep',
      },
    },
    'daily-detail': {
      zh: {
        theme_elaborated: '今日星象强调节奏与边界的平衡。',
        how_it_shows_up: { emotions: '更敏感、更需要安稳', relationships: '沟通更需要温柔', work: '适合稳步推进' },
        one_challenge: { pattern_name: '过度担忧', description: '担心失控会让你更紧绷。' },
        one_practice: { title: '定心呼吸', action: '用 4-6 呼吸节奏完成 3 轮。' },
        one_question: '我可以放下的担忧是什么？',
        under_the_hood: { moon_phase_sign: '盈凸月·处女', key_aspects: ['Moon trine Venus', 'Sun square Mars'] },
        confidence: 'high'
      },
      en: {
        theme_elaborated: 'Today balances rhythm and boundaries.',
        how_it_shows_up: { emotions: 'More sensitive and craving stability', relationships: 'Soft communication helps', work: 'Steady progress wins' },
        one_challenge: { pattern_name: 'Over-worrying', description: 'Fear of losing control tightens the body.' },
        one_practice: { title: 'Grounding breath', action: 'Use a 4-6 breathing cadence for 3 rounds.' },
        one_question: 'What worry can I set down today?',
        under_the_hood: { moon_phase_sign: 'Waxing Gibbous · Virgo', key_aspects: ['Moon trine Venus', 'Sun square Mars'] },
        confidence: 'high'
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
