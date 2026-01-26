#!/usr/bin/env tsx

import { writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { Language, WikiItem, WikiItemType } from '../src/types/api.js';
import { WIKI_CONTENT } from '../src/data/wiki.ts';
import { WIKI_GENERATED_CONTENT } from '../src/data/wiki-generated.ts';
import {
  buildAspectPrompt,
  buildElementPrompt,
  buildHousePrompt,
  buildModePrompt,
  buildPlanetPrompt,
  buildSignPrompt,
} from '../src/data/wiki-prompts.ts';

type GeneratedContent = Record<Language, Record<string, Partial<WikiItem>>>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATHS = [
  resolve(__dirname, '../.env'),
  resolve(__dirname, '../.env.local'),
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../.env.local'),
];
ENV_PATHS.forEach((envPath) => dotenv.config({ path: envPath }));

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const TEMPERATURE = Number(process.env.DEEPSEEK_TEMPERATURE || 0.7);
const MAX_TOKENS = Number(process.env.DEEPSEEK_MAX_TOKENS || 4096);

const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((arg) => arg.startsWith('--')).map((arg) => arg.slice(2)));
const positional = rawArgs.filter((arg) => !arg.startsWith('--'));
const categoryInput = positional[0] || 'planets';
const langInput = (positional[1] || 'both') as Language | 'both';
const itemIdInput = positional[2];

const targetLangs: Language[] = langInput === 'both' ? ['zh', 'en'] : [langInput];
const force = flags.has('force');
const dryRun = flags.has('dry-run');

const OUTPUT_PATH = resolve(__dirname, '../src/data/wiki-generated.ts');

const PLACEHOLDER_PATTERNS = [
  /完整内容生成中/,
  /full entry in progress/i,
  /编撰中/,
  /^\.\.\.$/,
];

const SIGN_META: Record<string, {
  element: { zh: string; en: string };
  mode: { zh: string; en: string };
  ruler: string;
  opposite: string;
  body: { zh: string; en: string };
}> = {
  aries: { element: { zh: '火', en: 'Fire' }, mode: { zh: '基本', en: 'Cardinal' }, ruler: 'mars', opposite: 'libra', body: { zh: '头部', en: 'Head' } },
  taurus: { element: { zh: '土', en: 'Earth' }, mode: { zh: '固定', en: 'Fixed' }, ruler: 'venus', opposite: 'scorpio', body: { zh: '颈部', en: 'Neck' } },
  gemini: { element: { zh: '风', en: 'Air' }, mode: { zh: '变动', en: 'Mutable' }, ruler: 'mercury', opposite: 'sagittarius', body: { zh: '手臂/肩部', en: 'Arms/Shoulders' } },
  cancer: { element: { zh: '水', en: 'Water' }, mode: { zh: '基本', en: 'Cardinal' }, ruler: 'moon', opposite: 'capricorn', body: { zh: '胸腹', en: 'Chest/Stomach' } },
  leo: { element: { zh: '火', en: 'Fire' }, mode: { zh: '固定', en: 'Fixed' }, ruler: 'sun', opposite: 'aquarius', body: { zh: '心脏/脊柱', en: 'Heart/Spine' } },
  virgo: { element: { zh: '土', en: 'Earth' }, mode: { zh: '变动', en: 'Mutable' }, ruler: 'mercury', opposite: 'pisces', body: { zh: '消化系统', en: 'Digestive System' } },
  libra: { element: { zh: '风', en: 'Air' }, mode: { zh: '基本', en: 'Cardinal' }, ruler: 'venus', opposite: 'aries', body: { zh: '肾脏/腰部', en: 'Kidneys/Lower Back' } },
  scorpio: { element: { zh: '水', en: 'Water' }, mode: { zh: '固定', en: 'Fixed' }, ruler: 'pluto', opposite: 'taurus', body: { zh: '生殖系统', en: 'Reproductive Organs' } },
  sagittarius: { element: { zh: '火', en: 'Fire' }, mode: { zh: '变动', en: 'Mutable' }, ruler: 'jupiter', opposite: 'gemini', body: { zh: '臀部/大腿', en: 'Hips/Thighs' } },
  capricorn: { element: { zh: '土', en: 'Earth' }, mode: { zh: '基本', en: 'Cardinal' }, ruler: 'saturn', opposite: 'cancer', body: { zh: '膝盖/骨骼', en: 'Knees/Bones' } },
  aquarius: { element: { zh: '风', en: 'Air' }, mode: { zh: '固定', en: 'Fixed' }, ruler: 'uranus', opposite: 'leo', body: { zh: '脚踝/循环系统', en: 'Ankles/Circulatory System' } },
  pisces: { element: { zh: '水', en: 'Water' }, mode: { zh: '变动', en: 'Mutable' }, ruler: 'neptune', opposite: 'virgo', body: { zh: '脚部', en: 'Feet' } },
};

const PLANET_META: Record<string, { ruling_signs: string[]; houses: number[] }> = {
  sun: { ruling_signs: ['leo'], houses: [5] },
  moon: { ruling_signs: ['cancer'], houses: [4] },
  mercury: { ruling_signs: ['gemini', 'virgo'], houses: [3, 6] },
  venus: { ruling_signs: ['taurus', 'libra'], houses: [2, 7] },
  mars: { ruling_signs: ['aries', 'scorpio'], houses: [1, 8] },
  jupiter: { ruling_signs: ['sagittarius', 'pisces'], houses: [9, 12] },
  saturn: { ruling_signs: ['capricorn', 'aquarius'], houses: [10, 11] },
  uranus: { ruling_signs: ['aquarius'], houses: [11] },
  neptune: { ruling_signs: ['pisces'], houses: [12] },
  pluto: { ruling_signs: ['scorpio'], houses: [8] },
};

const HOUSE_META: Record<string, { natural_sign: string; natural_ruler: string; opposite_house: number; life_areas: { zh: string; en: string } }> = {
  'house-1': { natural_sign: 'aries', natural_ruler: 'mars', opposite_house: 7, life_areas: { zh: '自我形象、身体、第一印象', en: 'Self-image, body, first impressions' } },
  'house-2': { natural_sign: 'taurus', natural_ruler: 'venus', opposite_house: 8, life_areas: { zh: '金钱、价值观、资源', en: 'Money, values, resources' } },
  'house-3': { natural_sign: 'gemini', natural_ruler: 'mercury', opposite_house: 9, life_areas: { zh: '沟通、学习、手足', en: 'Communication, learning, siblings' } },
  'house-4': { natural_sign: 'cancer', natural_ruler: 'moon', opposite_house: 10, life_areas: { zh: '家庭、根基、私生活', en: 'Home, roots, private life' } },
  'house-5': { natural_sign: 'leo', natural_ruler: 'sun', opposite_house: 11, life_areas: { zh: '创造力、恋爱、子女', en: 'Creativity, romance, children' } },
  'house-6': { natural_sign: 'virgo', natural_ruler: 'mercury', opposite_house: 12, life_areas: { zh: '工作、健康、日常秩序', en: 'Work, health, routines' } },
  'house-7': { natural_sign: 'libra', natural_ruler: 'venus', opposite_house: 1, life_areas: { zh: '伴侣、合作、关系', en: 'Partnerships, cooperation, relationships' } },
  'house-8': { natural_sign: 'scorpio', natural_ruler: 'pluto', opposite_house: 2, life_areas: { zh: '共享资源、亲密、转化', en: 'Shared resources, intimacy, transformation' } },
  'house-9': { natural_sign: 'sagittarius', natural_ruler: 'jupiter', opposite_house: 3, life_areas: { zh: '信念、远行、教育', en: 'Beliefs, travel, education' } },
  'house-10': { natural_sign: 'capricorn', natural_ruler: 'saturn', opposite_house: 4, life_areas: { zh: '事业、成就、社会角色', en: 'Career, achievement, public role' } },
  'house-11': { natural_sign: 'aquarius', natural_ruler: 'uranus', opposite_house: 5, life_areas: { zh: '社群、理想、未来', en: 'Community, ideals, future' } },
  'house-12': { natural_sign: 'pisces', natural_ruler: 'neptune', opposite_house: 6, life_areas: { zh: '潜意识、疗愈、隐秘', en: 'Subconscious, healing, retreat' } },
};

const ASPECT_META: Record<string, { angle: number; orb: number; nature: { zh: string; en: string } }> = {
  conjunction: { angle: 0, orb: 8, nature: { zh: '合并/放大', en: 'Fusion/Intensifying' } },
  opposition: { angle: 180, orb: 6, nature: { zh: '对立/张力', en: 'Polarizing/Tension' } },
  square: { angle: 90, orb: 6, nature: { zh: '挑战/摩擦', en: 'Challenging/Friction' } },
  trine: { angle: 120, orb: 6, nature: { zh: '顺流/和谐', en: 'Harmonious/Flowing' } },
  sextile: { angle: 60, orb: 4, nature: { zh: '机会/协作', en: 'Opportunity/Cooperative' } },
};

const ELEMENT_META: Record<string, { representing_signs: string[]; jungian_function: { zh: string; en: string }; energy_manifestation: { zh: string; en: string } }> = {
  elements: {
    representing_signs: ['aries', 'leo', 'sagittarius', 'taurus', 'virgo', 'capricorn', 'gemini', 'libra', 'aquarius', 'cancer', 'scorpio', 'pisces'],
    jungian_function: { zh: '四大心理功能概览', en: 'Overview of four psychological functions' },
    energy_manifestation: { zh: '能量如何在图表中分布与互补', en: 'How energy distributes and complements in the chart' },
  },
  'fire-element': {
    representing_signs: ['aries', 'leo', 'sagittarius'],
    jungian_function: { zh: '直觉', en: 'Intuition' },
    energy_manifestation: { zh: '热情、创造、行动力', en: 'Passion, creativity, action' },
  },
  'earth-element': {
    representing_signs: ['taurus', 'virgo', 'capricorn'],
    jungian_function: { zh: '感觉', en: 'Sensation' },
    energy_manifestation: { zh: '务实、稳定、执行力', en: 'Practicality, stability, execution' },
  },
  'air-element': {
    representing_signs: ['gemini', 'libra', 'aquarius'],
    jungian_function: { zh: '思维', en: 'Thinking' },
    energy_manifestation: { zh: '理性、连接、理念', en: 'Reasoning, connection, ideas' },
  },
  'water-element': {
    representing_signs: ['cancer', 'scorpio', 'pisces'],
    jungian_function: { zh: '情感', en: 'Feeling' },
    energy_manifestation: { zh: '共情、直觉、融合', en: 'Empathy, intuition, merging' },
  },
};

const MODE_META: Record<string, { representing_signs: string[]; seasonal_position: { zh: string; en: string }; energy_traits: { zh: string; en: string } }> = {
  modes: {
    representing_signs: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'],
    seasonal_position: { zh: '四季运作的节奏', en: 'Seasonal rhythm of energy' },
    energy_traits: { zh: '启动、固定、转化的综合', en: 'Initiation, stabilization, adaptation combined' },
  },
  'cardinal-mode': {
    representing_signs: ['aries', 'cancer', 'libra', 'capricorn'],
    seasonal_position: { zh: '季节开始', en: 'Season starters' },
    energy_traits: { zh: '启动、开创、领导', en: 'Initiating, pioneering, leading' },
  },
  'fixed-mode': {
    representing_signs: ['taurus', 'leo', 'scorpio', 'aquarius'],
    seasonal_position: { zh: '季节中段', en: 'Mid-season' },
    energy_traits: { zh: '稳定、坚持、深化', en: 'Stability, persistence, deepening' },
  },
  'mutable-mode': {
    representing_signs: ['gemini', 'virgo', 'sagittarius', 'pisces'],
    seasonal_position: { zh: '季节尾声', en: 'Season endings' },
    energy_traits: { zh: '适应、整合、过渡', en: 'Adaptation, integration, transition' },
  },
};

const CATEGORY_ITEM_IDS: Record<string, string[]> = {
  planets: Object.keys(PLANET_META),
  signs: Object.keys(SIGN_META),
  houses: Object.keys(HOUSE_META),
  aspects: Object.keys(ASPECT_META),
  elements: Object.keys(ELEMENT_META),
  modes: Object.keys(MODE_META),
  angles: ['ascendant', 'descendant', 'midheaven', 'imum-coeli'],
  points: ['north-node', 'south-node'],
  asteroids: ['chiron', 'lilith', 'juno'],
  'chart-types': ['natal-chart', 'synastry-chart', 'composite-chart', 'transit-chart'],
};

const PROMPT_BUILDERS: Record<string, (vars: Record<string, any>, lang: Language) => string> = {
  planets: buildPlanetPrompt,
  signs: buildSignPrompt,
  houses: buildHousePrompt,
  aspects: buildAspectPrompt,
  elements: buildElementPrompt,
  modes: buildModePrompt,
};

const toString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((entry) => toString(entry)).filter(Boolean) : [];

const stripLatin = (value: string) =>
  value
    .replace(/\([^)]*[A-Za-z][^)]*\)/g, '')
    .replace(/[A-Za-z]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const stripCjk = (value: string) =>
  value
    .replace(/[\u4e00-\u9fff]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const joinList = (items: string[], lang: Language) => {
  const filtered = items.filter(Boolean);
  return lang === 'zh' ? filtered.join('、') : filtered.join(', ');
};

const buildNameMap = (type: WikiItemType, lang: Language) =>
  WIKI_CONTENT[lang].items
    .filter((item) => item.type === type)
    .reduce<Record<string, string>>((acc, item) => {
      const title = lang === 'zh' ? stripLatin(item.title) : stripCjk(item.title);
      acc[item.id] = title || item.title;
      return acc;
    }, {});

const SIGN_NAMES = {
  zh: buildNameMap('signs', 'zh'),
  en: buildNameMap('signs', 'en'),
};
const PLANET_NAMES = {
  zh: buildNameMap('planets', 'zh'),
  en: buildNameMap('planets', 'en'),
};

const getSignName = (lang: Language, id: string) => SIGN_NAMES[lang][id] || id;
const getPlanetName = (lang: Language, id: string) => PLANET_NAMES[lang][id] || id;
const getHouseName = (lang: Language, house: number) => (lang === 'zh' ? `第${house}宫` : `House ${house}`);

const buildFocusPoints = (item: WikiItem, lang: Language) => {
  const lines: string[] = [];
  if (item.subtitle) lines.push(item.subtitle);
  if (item.description) lines.push(item.description);
  if (!lines.length) {
    lines.push(lang === 'zh' ? '聚焦其心理动力、行为模式与现实影响。' : 'Focus on psychological dynamics, behavioral patterns, and real-life impact.');
  }
  return lines.map((line) => `- ${line}`).join('\n');
};

const buildShadowFocus = (item: WikiItem, lang: Language) => {
  const keywords = joinList(item.keywords || [], lang);
  return lang === 'zh'
    ? `- 当${keywords || '该能量'}过度或失衡时的阴影表现`
    : `- Shadow expressions when ${keywords || 'this energy'} becomes excessive or blocked`;
};

const buildIntegrationFocus = (item: WikiItem, lang: Language) =>
  lang === 'zh'
    ? '- 描述如何将该能量转化为成熟、可持续的力量'
    : '- Describe how to integrate this energy into mature and sustainable strength';

const buildGrowthLessons = (item: WikiItem, lang: Language) =>
  lang === 'zh'
    ? '- 给出可执行的成长与练习建议'
    : '- Provide actionable growth and practice guidance';

const resolveItemPair = (id: string) => ({
  zh: WIKI_CONTENT.zh.items.find((item) => item.id === id) || null,
  en: WIKI_CONTENT.en.items.find((item) => item.id === id) || null,
});

const buildPromptVars = (category: string, lang: Language, zhItem: WikiItem, enItem: WikiItem) => {
  const item = lang === 'zh' ? zhItem : enItem;
  const zhName = stripLatin(zhItem.title) || zhItem.title;
  const enName = stripCjk(enItem.title) || enItem.title;
  const baseVars = {
    zh_name: zhName,
    en_name: enName,
    symbol: item.symbol,
    keywords: joinList(item.keywords || [], lang),
    focus_points: buildFocusPoints(item, lang),
    shadow_focus: buildShadowFocus(item, lang),
    integration_focus: buildIntegrationFocus(item, lang),
    growth_lessons: buildGrowthLessons(item, lang),
  };

  switch (category) {
    case 'planets': {
      const meta = PLANET_META[item.id];
      const rulingSigns = meta ? meta.ruling_signs.map((sign) => getSignName(lang, sign)) : [];
      const houses = meta ? meta.houses.map((house) => getHouseName(lang, house)) : [];
      return {
        ...baseVars,
        planet_name: lang === 'zh' ? zhName : enName,
        ruling_signs: joinList(rulingSigns, lang),
        associated_houses: houses,
        archetype: item.prototype || (lang === 'zh' ? zhItem.prototype : enItem.prototype) || '',
      };
    }
    case 'signs': {
      const meta = SIGN_META[item.id];
      return {
        ...baseVars,
        element: meta ? meta.element[lang] : '',
        mode: meta ? meta.mode[lang] : '',
        ruler: meta ? getPlanetName(lang, meta.ruler) : '',
        opposite_sign: meta ? getSignName(lang, meta.opposite) : '',
        body_parts: meta ? meta.body[lang] : '',
      };
    }
    case 'houses': {
      const meta = HOUSE_META[item.id];
      return {
        ...baseVars,
        natural_sign: meta ? getSignName(lang, meta.natural_sign) : '',
        natural_ruler: meta ? getPlanetName(lang, meta.natural_ruler) : '',
        opposite_house: meta ? getHouseName(lang, meta.opposite_house) : '',
        life_areas: meta ? meta.life_areas[lang] : '',
      };
    }
    case 'aspects': {
      const meta = ASPECT_META[item.id];
      return {
        ...baseVars,
        angle: meta?.angle ?? '',
        orb: meta?.orb ?? '',
        nature: meta ? meta.nature[lang] : '',
      };
    }
    case 'elements': {
      const meta = ELEMENT_META[item.id];
      return {
        ...baseVars,
        representing_signs: meta ? joinList(meta.representing_signs.map((sign) => getSignName(lang, sign)), lang) : '',
        jungian_function: meta ? meta.jungian_function[lang] : '',
        energy_manifestation: meta ? meta.energy_manifestation[lang] : '',
      };
    }
    case 'modes': {
      const meta = MODE_META[item.id];
      return {
        ...baseVars,
        representing_signs: meta ? joinList(meta.representing_signs.map((sign) => getSignName(lang, sign)), lang) : '',
        seasonal_position: meta ? meta.seasonal_position[lang] : '',
        energy_traits: meta ? meta.energy_traits[lang] : '',
      };
    }
    default:
      return {
        ...baseVars,
        title: item.title,
      };
  }
};

const buildGenericPrompt = (vars: Record<string, any>, lang: Language) => {
  if (lang === 'zh') {
    return `你是一位专业的心理占星师，擅长将占星学与荣格心理学结合。
请针对【${vars.zh_name}】进行深入的 8 步骤分析。

**基础信息：**
- 名称：${vars.zh_name} (${vars.en_name})
- 符号：${vars.symbol}
- 核心关键词：${vars.keywords}

**特殊侧重点：**
${vars.focus_points}

**阴影表现：**
${vars.shadow_focus}

**整合方向：**
${vars.integration_focus}

**发展建议：**
${vars.growth_lessons}

请生成以下内容（JSON 格式）：
1. astronomy_myth：天文与神话背景（150-200 字）
2. psychology：荣格心理学视角解读（200-300 字）
3. shadow：阴影特质与表现（100-150 字）
4. integration：如何整合能量（150-200 字）
5. deep_dive：8 个深度解读步骤，每步包含：
   - step: 步骤序号（1-8）
   - title: 步骤标题
   - description: 详细说明（100-200 字，支持 Markdown）
6. life_areas：至少 2 条生活领域影响，数组元素包含：
   - area: career | love | health | finance | family | spiritual
   - description: 描述该领域的影响（50-80 字）
7. growth_path：成长路径建议（100-150 字）
8. practical_tips：3-5 条实用小贴士（字符串数组）
9. common_misconceptions：2-3 条常见误解澄清（字符串数组）
10. affirmation：1 条正向肯定语（30-60 字）

**格式要求：**
- 使用标准 JSON 格式输出，不要包含任何额外文字
- deep_dive 是对象数组（不是嵌套数组），结构如下：
  \`\`\`json
  "deep_dive": [{"step": 1, "title": "标题", "description": "描述"}, ...]
  \`\`\`
- deep_dive 数组必须包含恰好 8 个步骤对象
- life_areas 至少 2 条且 area 必须为指定枚举
- 不要在 JSON 中使用中文引号，只使用英文双引号 "
- 描述中可以包含 **粗体** 强调重点
- 每个步骤应循序渐进，从基础概念到实践整合`;
  }
  return `You are a professional psychological astrologer who specializes in combining astrology with Jungian psychology.
Please provide an in-depth 8-step analysis of 【${vars.en_name}】.

**Basic Info:**
- Name: ${vars.zh_name} (${vars.en_name})
- Symbol: ${vars.symbol}
- Core Keywords: ${vars.keywords}

**Special Focus Points:**
${vars.focus_points}

**Shadow Manifestations:**
${vars.shadow_focus}

**Integration Direction:**
${vars.integration_focus}

**Development Suggestions:**
${vars.growth_lessons}

Please generate the following content in JSON format:
1. astronomy_myth: Astronomical and mythological background (150-200 words)
2. psychology: Jungian psychology interpretation (200-300 words)
3. shadow: Shadow qualities and manifestations (100-150 words)
4. integration: How to integrate the energy (150-200 words)
5. deep_dive: 8 in-depth interpretation steps, each containing:
   - step: Step number (1-8)
   - title: Step title
   - description: Detailed explanation (100-200 words, supports Markdown)
6. life_areas: At least 2 life domains, each containing:
   - area: career | love | health | finance | family | spiritual
   - description: Impact description (40-60 words)
7. growth_path: Growth path guidance (80-120 words)
8. practical_tips: 3-5 practical tips (string array)
9. common_misconceptions: 2-3 common misconceptions (string array)
10. affirmation: 1 positive affirmation (15-30 words)

**Format Requirements:**
- Output in JSON format only, without any extra text
- deep_dive array must contain exactly 8 steps
- life_areas must include at least 2 entries with allowed area values
- Descriptions can use **bold** for emphasis
- Each step should be progressive, from basic concepts to practical integration`;
};

async function callDeepSeekAPI(prompt: string): Promise<any> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('Missing DEEPSEEK_API_KEY');
  }
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a JSON expert. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content returned');
  }

  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found');
  }

  let jsonStr = jsonMatch[1] || jsonMatch[0];

  // Pre-process to fix common JSON issues from LLM output
  // 1. Remove control characters that break JSON (except valid whitespace)
  jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  // 2. Fix unescaped newlines within strings (between quotes)
  jsonStr = jsonStr.replace(/"([^"]*(?:\\"[^"]*)*)"/g, (match) => {
    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  });
  // 3. Remove trailing commas before ] or }
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
  // 4. Insert missing commas between object/array endings and next property
  jsonStr = jsonStr.replace(/([}\]])\s*(")/g, '$1,$2');
  // 5. Insert missing commas between adjacent objects/strings in arrays
  jsonStr = jsonStr.replace(/}\s*{/g, '},{');
  jsonStr = jsonStr.replace(/"\s*"/g, '","');
  // 6. Collapse accidental double-closing brackets before commas
  jsonStr = jsonStr.replace(/\]\s*\],/g, '],');

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    // Try more aggressive cleanup
    try {
      // Fix escaped quotes that are double-escaped
      let cleanedJson = jsonStr.replace(/\\\\"/g, '\\"');
      // Also try fixing Chinese quotes that might break JSON
      cleanedJson = cleanedJson.replace(/"/g, '"').replace(/"/g, '"');
      cleanedJson = cleanedJson.replace(/'/g, "'").replace(/'/g, "'");
      return JSON.parse(cleanedJson);
    } catch {
      // Last resort: try to extract position and show context
      const match = (error as Error).message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1], 10);
        const context = jsonStr.slice(Math.max(0, pos - 50), pos + 50);
        throw new Error(`JSON parse error: ${(error as Error).message}\nContext around error: ...${context}...`);
      }
      throw new Error(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const isPlaceholder = (value?: string) => {
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
};

const hasSufficientArray = (value: unknown, minLength: number) =>
  Array.isArray(value) && value.filter(Boolean).length >= minLength;

const isContentComplete = (item: WikiItem) =>
  !isPlaceholder(item.astronomy_myth)
  && !isPlaceholder(item.psychology)
  && !isPlaceholder(item.shadow)
  && !isPlaceholder(item.integration || '')
  && hasSufficientArray(item.deep_dive, 4)
  && hasSufficientArray(item.life_areas, 2)
  && !isPlaceholder(item.growth_path || '')
  && hasSufficientArray(item.practical_tips, 3)
  && hasSufficientArray(item.common_misconceptions, 2)
  && !isPlaceholder(item.affirmation || '');

const normalizeLifeAreas = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(['career', 'love', 'health', 'finance', 'family', 'spiritual']);
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as { area?: string; description?: string };
      const area = toString(record.area);
      const description = toString(record.description);
      if (!area || !allowed.has(area) || !description) return null;
      return { area, description };
    })
    .filter(Boolean) as Array<{ area: string; description: string }>;
};

const normalizeDeepDive = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as { step?: number | string; title?: string; description?: string };
      const title = toString(record.title);
      const description = toString(record.description);
      if (!title || !description) return null;
      const stepNumber = Number(record.step);
      return {
        step: Number.isFinite(stepNumber) && stepNumber > 0 ? stepNumber : undefined,
        title,
        description,
      };
    })
    .filter(Boolean) as Array<{ step?: number; title: string; description: string }>;
};

const normalizeResult = (result: any) => ({
  astronomy_myth: toString(result?.astronomy_myth),
  psychology: toString(result?.psychology),
  shadow: toString(result?.shadow),
  integration: toString(result?.integration),
  deep_dive: normalizeDeepDive(result?.deep_dive),
  life_areas: normalizeLifeAreas(result?.life_areas),
  growth_path: toString(result?.growth_path),
  practical_tips: toStringArray(result?.practical_tips),
  common_misconceptions: toStringArray(result?.common_misconceptions),
  affirmation: toString(result?.affirmation),
});

const shouldReplaceText = (value?: string) => !value || isPlaceholder(value);
const shouldReplaceArray = (value: unknown, minLength: number) => !hasSufficientArray(value, minLength);

const mergeGeneratedFields = (existing: WikiItem, generated: ReturnType<typeof normalizeResult>): Partial<WikiItem> => ({
  astronomy_myth: shouldReplaceText(existing.astronomy_myth) ? generated.astronomy_myth : existing.astronomy_myth,
  psychology: shouldReplaceText(existing.psychology) ? generated.psychology : existing.psychology,
  shadow: shouldReplaceText(existing.shadow) ? generated.shadow : existing.shadow,
  integration: shouldReplaceText(existing.integration || '') ? generated.integration : existing.integration,
  deep_dive: shouldReplaceArray(existing.deep_dive, 4) ? generated.deep_dive : existing.deep_dive,
  life_areas: shouldReplaceArray(existing.life_areas, 2) ? generated.life_areas : existing.life_areas,
  growth_path: shouldReplaceText(existing.growth_path || '') ? generated.growth_path : existing.growth_path,
  practical_tips: shouldReplaceArray(existing.practical_tips, 3) ? generated.practical_tips : existing.practical_tips,
  common_misconceptions: shouldReplaceArray(existing.common_misconceptions, 2)
    ? generated.common_misconceptions
    : existing.common_misconceptions,
  affirmation: shouldReplaceText(existing.affirmation || '') ? generated.affirmation : existing.affirmation,
});

const sortRecord = <T extends Record<string, any>>(record: T) =>
  Object.keys(record)
    .sort()
    .reduce<Record<string, any>>((acc, key) => {
      acc[key] = record[key];
      return acc;
    }, {});

const writeGeneratedFile = async (content: GeneratedContent) => {
  const sorted: GeneratedContent = {
    zh: sortRecord(content.zh || {}),
    en: sortRecord(content.en || {}),
  };
  const header = `// INPUT: Wiki 深度解读生成内容覆盖表（按语言与条目 ID 聚合）。
// OUTPUT: 导出可合并到静态数据源的覆盖内容。
// POS: Wiki 生成内容数据源；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。`;
  const body = `import type { Language, WikiItem } from '../types/api.js';

export const WIKI_GENERATED_CONTENT: Record<Language, Record<string, Partial<WikiItem>>> = ${JSON.stringify(sorted, null, 2)};
`;
  await writeFile(OUTPUT_PATH, `${header}\n\n${body}`, 'utf8');
};

const buildPrompt = (category: string, lang: Language, zhItem: WikiItem, enItem: WikiItem) => {
  const vars = buildPromptVars(category, lang, zhItem, enItem);
  const builder = PROMPT_BUILDERS[category];
  return builder ? builder(vars, lang) : buildGenericPrompt(vars, lang);
};

const resolveIdsForCategory = (category: string) => {
  const ids = CATEGORY_ITEM_IDS[category];
  if (!ids) return [];
  if (!itemIdInput) return ids;
  return ids.includes(itemIdInput) ? [itemIdInput] : [];
};

const sleep = (ms: number) => new Promise((resolveFn) => setTimeout(resolveFn, ms));

async function main() {
  if (!DEEPSEEK_API_KEY && !dryRun) {
    console.error('Missing DEEPSEEK_API_KEY');
    process.exit(1);
  }

  const categories = categoryInput === 'all' ? Object.keys(CATEGORY_ITEM_IDS) : [categoryInput];
  const generated: GeneratedContent = {
    zh: { ...(WIKI_GENERATED_CONTENT?.zh || {}) },
    en: { ...(WIKI_GENERATED_CONTENT?.en || {}) },
  };

  for (const category of categories) {
    const ids = resolveIdsForCategory(category);
    if (ids.length === 0) {
      console.warn(`No items resolved for category: ${category}`);
      continue;
    }

    for (const id of ids) {
      const pair = resolveItemPair(id);
      if (!pair.zh || !pair.en) {
        console.warn(`Missing item data for id: ${id}`);
        continue;
      }

      for (const lang of targetLangs) {
        const baseItem = lang === 'zh' ? pair.zh : pair.en;
        const existingOverride = generated[lang][id] || {};
        const existing = { ...baseItem, ...existingOverride } as WikiItem;
        if (!force && isContentComplete(existing)) {
          console.log(`[skip] ${id} ${lang}: content complete`);
          continue;
        }

        const prompt = buildPrompt(category, lang, pair.zh, pair.en);
        if (dryRun) {
          console.log(`[dry-run] ${id} ${lang}: ${prompt.length} chars`);
          continue;
        }

        try {
          console.log(`[gen] ${id} ${lang}...`);
          const result = await callDeepSeekAPI(prompt);
          const normalized = normalizeResult(result);
          const merged = mergeGeneratedFields(existing, normalized);
          generated[lang][id] = merged;
          await writeGeneratedFile(generated);
          console.log(`[done] ${id} ${lang}`);
        } catch (error) {
          console.error(`[fail] ${id} ${lang}:`, error instanceof Error ? error.message : String(error));
        }
        await sleep(600);
      }
    }
  }
}

main();
