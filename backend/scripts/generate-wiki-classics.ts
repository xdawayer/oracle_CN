#!/usr/bin/env tsx
// INPUT: 使用 DeepSeek Reason 模型生成经典书籍深度拆解内容。
// OUTPUT: 更新 wiki-classics-generated.ts 文件，包含结构化的书籍拆解内容。
// POS: Wiki Classics 内容生成脚本；若更新此文件，务必更新本头注释。

import { writeFile, readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { Language, WikiClassicSections } from '../src/types/api.js';
import { buildClassicBookPrompt } from '../src/data/wiki-classic-prompts.js';

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
// 使用 DeepSeek Reasoner 模型进行深度推理
const MODEL = process.env.DEEPSEEK_REASONER_MODEL || 'deepseek-reasoner';
const TEMPERATURE = 0.3; // 较低温度保证输出质量
const MAX_TOKENS = 8192; // 书籍拆解需要更多 tokens

const OUTPUT_PATH = resolve(__dirname, '../src/data/wiki-classics-generated.ts');

// 11 本经典书籍的基础信息
const CLASSIC_BOOKS = [
  { id: 'saturn-new-look', title_zh: '土星：从新观点看老恶魔', title_en: 'Saturn: A New Look at an Old Devil', author_zh: '丽兹·格林', author_en: 'Liz Greene' },
  { id: 'four-elements', title_zh: '占星、心理学与四元素', title_en: 'Astrology, Psychology, and the Four Elements', author_zh: '史蒂芬·阿若优', author_en: 'Stephen Arroyo' },
  { id: 'aspects-in-astrology', title_zh: '占星相位研究', title_en: 'Aspects in Astrology', author_zh: '苏·汤普金斯', author_en: 'Sue Tompkins' },
  { id: 'twelve-houses', title_zh: '人生的十二个面向', title_en: 'The Twelve Houses', author_zh: '霍华德·萨司波塔斯', author_en: 'Howard Sasportas' },
  { id: 'inner-sky', title_zh: '内在的天空', title_en: 'The Inner Sky', author_zh: '史蒂芬·福里斯特', author_en: 'Steven Forrest' },
  { id: 'pluto-evolutionary-journey', title_zh: '冥王星：灵魂的演化之旅', title_en: 'Pluto: The Evolutionary Journey of the Soul', author_zh: '杰夫·格林', author_en: 'Jeff Green' },
  { id: 'chiron-healing-journey', title_zh: '凯龙星：灵魂的创伤与疗愈', title_en: 'Chiron and the Healing Journey', author_zh: '梅兰妮·瑞哈特', author_en: 'Melanie Reinhart' },
  { id: 'astrology-of-fate', title_zh: '生命的轨迹', title_en: 'The Astrology of Fate', author_zh: '丽兹·格林', author_en: 'Liz Greene' },
  { id: 'astrology-of-personality', title_zh: '人格的占星学', title_en: 'The Astrology of Personality', author_zh: '丹恩·鲁伊尔', author_en: 'Dane Rudhyar' },
  { id: 'astrology-for-the-soul', title_zh: '灵魂占星', title_en: 'Astrology for the Soul', author_zh: '简·斯皮勒', author_en: 'Jan Spiller' },
  { id: 'contemporary-astrologers-handbook', title_zh: '当代占星研究', title_en: "The Contemporary Astrologer's Handbook", author_zh: '苏·汤普金斯', author_en: 'Sue Tompkins' },
];

const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((arg) => arg.startsWith('--')).map((arg) => arg.slice(2)));
const positional = rawArgs.filter((arg) => !arg.startsWith('--'));
const bookIdInput = positional[0];
const langInput = (positional[1] || 'both') as Language | 'both';

const targetLangs: Language[] = langInput === 'both' ? ['zh', 'en'] : [langInput];
const force = flags.has('force');
const dryRun = flags.has('dry-run');

type GeneratedContent = Record<Language, Record<string, {
  summary: string;
  keywords: string[];
  sections: WikiClassicSections;
}>>;

async function callDeepSeekReasonerAPI(prompt: string): Promise<any> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('Missing DEEPSEEK_API_KEY');
  }

  console.log(`  调用 DeepSeek Reasoner API (${MODEL})...`);

  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
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

  // DeepSeek Reasoner 返回格式可能包含 reasoning_content
  const reasoning = data.choices?.[0]?.message?.reasoning_content;
  const content = data.choices?.[0]?.message?.content;

  if (reasoning) {
    console.log(`  推理过程: ${reasoning.slice(0, 200)}...`);
  }

  if (!content) {
    throw new Error('No content returned');
  }

  // 提取 JSON
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('返回内容:', content.slice(0, 500));
    throw new Error('No JSON found in response');
  }

  let jsonStr = jsonMatch[1] || jsonMatch[0];

  // 清理 JSON
  jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
  jsonStr = jsonStr.replace(/([}\]])\s*(")/g, '$1,$2');

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    // 尝试修复中文引号
    let cleanedJson = jsonStr.replace(/"/g, '"').replace(/"/g, '"');
    cleanedJson = cleanedJson.replace(/'/g, "'").replace(/'/g, "'");
    try {
      return JSON.parse(cleanedJson);
    } catch {
      const match = (error as Error).message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1], 10);
        const context = jsonStr.slice(Math.max(0, pos - 100), pos + 100);
        throw new Error(`JSON parse error at position ${pos}:\n...${context}...`);
      }
      throw new Error(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function normalizeSection(result: any): { summary: string; keywords: string[]; sections: WikiClassicSections } {
  const sections = result.sections || result;

  return {
    summary: result.summary || '',
    keywords: Array.isArray(result.keywords) ? result.keywords : [],
    sections: {
      context: {
        title: sections.context?.title || '1. 全局定位与背景',
        position: sections.context?.position || '',
        author_background: sections.context?.author_background || '',
        contribution: sections.context?.contribution || '',
      },
      philosophy: {
        title: sections.philosophy?.title || '2. 核心哲学/理论基石',
        core_logic: sections.philosophy?.core_logic || '',
        metaphor: sections.philosophy?.metaphor || '',
      },
      structure: {
        title: sections.structure?.title || '3. 结构化深度导读',
        logic_flow: sections.structure?.logic_flow || '',
        modules: Array.isArray(sections.structure?.modules) ? sections.structure.modules : [],
        highlights: Array.isArray(sections.structure?.highlights) ? sections.structure.highlights : [],
      },
      methodology: {
        title: sections.methodology?.title || '4. 方法论与实操工具',
        steps: Array.isArray(sections.methodology?.steps) ? sections.methodology.steps : [],
      },
      quotes: {
        title: sections.quotes?.title || '5. 经典名句与深层解读',
        items: Array.isArray(sections.quotes?.items) ? sections.quotes.items : [],
      },
      criticism: {
        title: sections.criticism?.title || '6. 批判性思考与局限',
        limitations: sections.criticism?.limitations || '',
        misconceptions: sections.criticism?.misconceptions || '',
        debates: sections.criticism?.debates || '',
      },
      action: {
        title: sections.action?.title || '7. 读者行动指南',
        phases: Array.isArray(sections.action?.phases) ? sections.action.phases : [],
        immediate_action: sections.action?.immediate_action || '',
      },
    },
  };
}

async function loadExistingContent(): Promise<GeneratedContent> {
  try {
    const content = await readFile(OUTPUT_PATH, 'utf-8');
    const match = content.match(/export const WIKI_CLASSICS_GENERATED:\s*GeneratedContent\s*=\s*(\{[\s\S]*\});/);
    if (match) {
      // 简单提取，实际使用时应该用 eval 或者更安全的方式
      return { zh: {}, en: {} };
    }
  } catch {
    // 文件不存在
  }
  return { zh: {}, en: {} };
}

async function saveContent(content: GeneratedContent): Promise<void> {
  const fileContent = `// INPUT: DeepSeek Reason 生成的经典书籍结构化内容。
// OUTPUT: 导出生成的书籍拆解内容。
// POS: Wiki Classics 生成内容；此文件由脚本自动生成，请勿手动修改。
// 生成时间: ${new Date().toISOString()}

import type { Language, WikiClassicSections } from '../types/api.js';

type GeneratedContent = Record<Language, Record<string, {
  summary: string;
  keywords: string[];
  sections: WikiClassicSections;
}>>;

export const WIKI_CLASSICS_GENERATED: GeneratedContent = ${JSON.stringify(content, null, 2)};

export default WIKI_CLASSICS_GENERATED;
`;

  await writeFile(OUTPUT_PATH, fileContent, 'utf-8');
  console.log(`\n已保存到: ${OUTPUT_PATH}`);
}

async function generateForBook(
  book: typeof CLASSIC_BOOKS[0],
  lang: Language,
  existingContent: GeneratedContent
): Promise<{ summary: string; keywords: string[]; sections: WikiClassicSections } | null> {
  const title = lang === 'zh' ? book.title_zh : book.title_en;
  const author = lang === 'zh' ? book.author_zh : book.author_en;

  console.log(`\n📚 生成: ${title} (${author}) [${lang}]`);

  // 检查是否已存在
  if (!force && existingContent[lang][book.id]) {
    console.log('  ⏭️  已存在，跳过（使用 --force 强制重新生成）');
    return null;
  }

  if (dryRun) {
    console.log('  🔍 Dry run 模式，跳过 API 调用');
    const prompt = buildClassicBookPrompt({ title, author }, lang);
    console.log(`  Prompt 长度: ${prompt.length} 字符`);
    return null;
  }

  try {
    const prompt = buildClassicBookPrompt({ title, author }, lang);
    const result = await callDeepSeekReasonerAPI(prompt);
    const normalized = normalizeSection(result);

    console.log(`  ✅ 生成成功`);
    console.log(`     摘要: ${normalized.summary.slice(0, 50)}...`);
    console.log(`     关键词: ${normalized.keywords.join(', ')}`);
    console.log(`     模块数: ${normalized.sections.structure.modules.length}`);
    console.log(`     金句数: ${normalized.sections.quotes.items.length}`);

    return normalized;
  } catch (error) {
    console.error(`  ❌ 生成失败: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Wiki Classics 内容生成器');
  console.log('='.repeat(60));
  console.log(`模型: ${MODEL}`);
  console.log(`语言: ${targetLangs.join(', ')}`);
  console.log(`书籍: ${bookIdInput || '全部'}`);
  console.log(`强制重新生成: ${force}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('='.repeat(60));

  if (!DEEPSEEK_API_KEY && !dryRun) {
    console.error('❌ 错误: 未设置 DEEPSEEK_API_KEY');
    process.exit(1);
  }

  const existingContent = await loadExistingContent();
  const booksToProcess = bookIdInput
    ? CLASSIC_BOOKS.filter((b) => b.id === bookIdInput)
    : CLASSIC_BOOKS;

  if (booksToProcess.length === 0) {
    console.error(`❌ 错误: 未找到书籍 ${bookIdInput}`);
    console.log('可用的书籍 ID:');
    CLASSIC_BOOKS.forEach((b) => console.log(`  - ${b.id}`));
    process.exit(1);
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const book of booksToProcess) {
    for (const lang of targetLangs) {
      const result = await generateForBook(book, lang, existingContent);
      if (result) {
        existingContent[lang][book.id] = result;
        successCount++;

        // 每次成功生成后保存，避免中断丢失
        if (!dryRun) {
          await saveContent(existingContent);
        }
      } else if (existingContent[lang][book.id]) {
        skipCount++;
      } else if (!dryRun) {
        errorCount++;
      }

      // 添加延迟避免 API 限流
      if (!dryRun && booksToProcess.length > 1) {
        console.log('  ⏳ 等待 3 秒...');
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('生成完成!');
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ⏭️  跳过: ${skipCount}`);
  console.log(`  ❌ 失败: ${errorCount}`);
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('致命错误:', error);
  process.exit(1);
});
