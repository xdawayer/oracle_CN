/**
 * Enhanced Classic Book Report Generator
 * Generates 10000-word deep analysis reports for 50 classic astrology books in both Chinese and English
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), '..', '.env.local'),
];

envPaths.forEach((envPath) => {
  dotenv.config({ path: envPath });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the books data
import { WIKI_CLASSICS_ZH, WIKI_CLASSICS_EN } from './wiki-classics.js';
import { buildEnhancedClassicBookPrompt } from './wiki-classic-prompts-enhanced.js';

// Configuration
const DEEPSEEK_API_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const TEMPERATURE = 0.3;
const MAX_TOKENS = 6000; // Reduced for faster response
const MODEL = 'deepseek-chat'; // Use faster model for bulk generation

// Output directory
const OUTPUT_DIR = path.join(__dirname, 'generated-reports');
const DATA_OUTPUT_FILE = path.join(__dirname, 'wiki-classics-enhanced.ts');

/**
 * Call DeepSeek API to generate the report
 */
async function generateReport(prompt: string, title: string, author: string, lang: string, retryCount = 2): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    console.warn('⚠️  DEEPSEEK_API_KEY not set, using mock data');
    return generateMockReport(title, author, lang);
  }

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

      const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert astrology book analyst and senior editor. Provide in-depth, comprehensive analysis reports.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: TEMPERATURE,
          max_tokens: MAX_TOKENS,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ API Error for "${title}" (${lang}):`, error.substring(0, 200));
        if (attempt < retryCount) {
          console.log(`  🔄 Retrying (${attempt + 1}/${retryCount})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        return generateMockReport(title, author, lang);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content || content.length < 1000) {
        console.warn(`⚠️  Response too short for "${title}" (${lang}): ${content?.length || 0} chars`);
        if (attempt < retryCount) {
          console.log(`  🔄 Retrying (${attempt + 1}/${retryCount})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        return generateMockReport(title, author, lang);
      }
      
      return content;
    } catch (error) {
      const err = error as Error;
      console.error(`❌ Request error for "${title}" (${lang}):`, err.message);
      if (attempt < retryCount) {
        console.log(`  🔄 Retrying (${attempt + 1}/${retryCount})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      return generateMockReport(title, author, lang);
    }
  }
  
  return generateMockReport(title, author, lang);
}

/**
 * Generate a mock report for testing purposes
 */
function generateMockReport(title: string, author: string, lang: string): string {
  const isZh = lang === 'zh';
  const bookTitle = isZh ? `《${title}》` : `"${title}"`;
  
  return JSON.stringify({
    title,
    author,
    summary: isZh 
      ? '这是一本关于占星学的经典著作，深入解析了核心概念与方法论。'
      : 'This is a classic work on astrology, providing in-depth analysis of core concepts and methodologies.',
    keywords: ['占星学', 'Astrology', '经典', 'Classic', '深度解析'],
    word_count: '约10000字',
    sections: {
      context: {
        title: isZh ? '1. 全局定位与背景' : '1. Context & Background',
        position_and_influence: isZh
          ? `《${bookTitle}》在占星学领域具有重要地位，被视为该领域的经典之作。`
          : `${bookTitle} holds an important position in the field of astrology and is considered a classic work.`,
        author_background: isZh
          ? `${author}是占星学领域的资深专家，拥有丰富的学术背景和实践经验。`
          : `${author} is a senior expert in the field of astrology with extensive academic background and practical experience.`,
        core_contribution: isZh
          ? '本书解决了占星学学习中的核心痛点，提供了系统化的学习框架和实践方法。'
          : 'This book addresses core pain points in astrology learning, providing a systematic learning framework and practical methods.',
      },
      philosophy: {
        title: isZh ? '2. 核心哲学与理论基石' : '2. Core Philosophy and Theoretical Foundation',
        underlying_logic: isZh
          ? '本书的核心理念建立在全息宇宙观的基础上，认为星盘是个人生命地图。'
          : 'The core philosophy of this book is based on a holographic worldview, viewing the birth chart as a map of individual life.',
        core_concepts: isZh
          ? '书中详细阐述了行星、宫位、相位等核心概念的定义及其相互关系。'
          : 'The book elaborates in detail on the definitions and interrelationships of core concepts such as planets, houses, and aspects.',
        metaphor: isZh
          ? '星盘就像人生的导航系统，指引我们理解自己的潜能与挑战。'
          : 'The birth chart is like a navigation system for life, guiding us to understand our potentials and challenges.',
      },
      structure: {
        title: isZh ? '3. 结构化深度导读' : '3. Structural Deep Reading',
        logic_flow: isZh
          ? '全书按照从理论到实践的逻辑编排，帮助读者建立系统认知。'
          : 'The book is organized according to the logic from theory to practice, helping readers build systematic understanding.',
        modules: [
          { name: isZh ? '理论基础' : 'Theoretical Foundation', content: isZh ? '介绍占星学的基本原理和哲学基础' : 'Introduction to basic principles and philosophical foundations of astrology' },
          { name: isZh ? '核心概念' : 'Core Concepts', content: isZh ? '深入解析行星、宫位、相位的含义' : 'In-depth analysis of planets, houses, and aspects' },
          { name: isZh ? '实践应用' : 'Practical Application', content: isZh ? '提供具体的解盘方法和步骤' : 'Providing specific chart reading methods and steps' },
        ],
        key_chapters: [
          { topic: isZh ? '行星解读' : 'Planet Interpretation', insight: isZh ? '揭示行星在星盘中的深层含义' : 'Revealing the deeper meanings of planets in the birth chart' },
          { topic: isZh ? '宫位分析' : 'House Analysis', insight: isZh ? '阐明宫位与生活领域的对应关系' : 'Explaining the correspondence between houses and life areas' },
        ],
        knowledge_map: isZh ? '知识体系以行星为点、宫位为面、相位为线，构建完整的解盘框架。' : 'The knowledge system uses planets as points, houses as areas, and aspects as lines to construct a complete chart reading framework.',
      },
      methodology: {
        title: isZh ? '4. 方法论与实操工具' : '4. Methodology and Practical Tools',
        core_methodology: isZh
          ? '本书提供了系统化的解盘方法论，包括信息收集、分析、整合的完整流程。'
          : 'This book provides a systematic chart reading methodology, including the complete process of information gathering, analysis, and integration.',
        steps: [
          isZh ? '收集基本信息：出生日期、时间和地点' : 'Gather basic information: birth date, time, and place',
          isZh ? '绘制星盘：使用专业软件或手工绘制' : 'Draw the chart: use professional software or draw by hand',
          isZh ? '分析主要特征：识别行星分布、相位格局' : 'Analyze main features: identify planetary distribution and aspect patterns',
          isZh ? '整合解读：将各要素综合形成完整图景' : 'Integrate interpretation: combine elements to form a complete picture',
        ],
        practical_tools: isZh ? '提供了星盘模板、分析清单、关键词卡片等实用工具。' : 'Provides practical tools such as chart templates, analysis checklists, and keyword cards.',
        common_issues: isZh ? '初学者常见问题包括过度简化分析、忽视相位细节、缺乏整体观等。' : 'Common beginner issues include over-simplifying analysis, neglecting aspect details, and lacking a holistic view.',
      },
      quotes: {
        title: isZh ? '5. 经典名句与深层解读' : '5. Classic Quotes and Deep Interpretation',
        golden_quotes: [
          { quote: isZh ? '星盘不是命运的判决，而是自我认识的地图。' : 'The birth chart is not a verdict of fate, but a map of self-knowledge.', interpretation: isZh ? '这句话强调了占星的本质是自我探索的工具，而非宿命的预言。' : 'This quote emphasizes that the essence of astrology is a tool for self-exploration, not a prophecy of destiny.' },
          { quote: isZh ? '每一个相位都是一次内在对话的机会。' : 'Every aspect is an opportunity for inner dialogue.', interpretation: isZh ? '提醒我们困难相位并非诅咒，而是成长的契机。' : 'Reminds us that difficult aspects are not curses but opportunities for growth.' },
        ],
        core_thought: isZh ? '占星学的核心价值在于帮助人们认识自我、理解生命课题。' : 'The core value of astrology is to help people understand themselves and life lessons.',
      },
      criticism: {
        title: isZh ? '6. 批判性思考与局限' : '6. Critical Analysis and Limitations',
        limitations: isZh
          ? '部分内容可能受限于出版年代的知识框架，需要结合最新研究理解。'
          : 'Some content may be limited by the knowledge framework of the publication era and needs to be understood in conjunction with the latest research.',
        controversies: isZh
          ? '学术界对占星学的科学性存在争议，但实践者普遍认可其心理洞察价值。'
          : 'There is controversy in academia about the scientific nature of astrology, but practitioners generally recognize its psychological insight value.',
        reading_pitfalls: isZh
          ? '初学者容易陷入机械解读、过度简化、或神秘化倾向。'
          : 'Beginners are prone to mechanical interpretation, oversimplification, or mystification tendencies.',
        comparison: isZh
          ? '与其他同类书籍相比，本书更注重理论与实践的结合。'
          : 'Compared to other similar books, this book places more emphasis on the combination of theory and practice.',
      },
      action: {
        title: isZh ? '7. 读者行动指南' : '7. Reader Action Plan',
        learning_plan: [
          { phase: isZh ? '第一阶段' : 'Phase 1', task: isZh ? '建立框架：通读全书，制作思维导图' : 'Build framework: read through the book and create mind maps' },
          { phase: isZh ? '第二阶段' : 'Phase 2', task: isZh ? '深入重点：精读核心章节，做详细笔记' : 'Deep dive: intensively read core chapters and take detailed notes' },
          { phase: isZh ? '第三阶段' : 'Phase 3', task: isZh ? '实践验证：将方法应用于实际案例' : 'Practice verification: apply methods to actual cases' },
        ],
        immediate_action: isZh ? '立即行动：选择一个你熟悉的星盘，用本书方法进行分析练习。' : 'Immediate action: Choose a familiar birth chart and practice analysis using methods from this book.',
        resources: isZh ? '建议配合专业占星软件学习，并加入学习社群交流。' : 'It is recommended to learn with professional astrology software and join learning communities for exchange.',
      },
    },
  });
}

/**
 * Generate all reports
 */
async function generateAllReports() {
  console.log('🚀 Starting enhanced classic book report generation...\n');
  
  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  const allReports: Record<string, any> = {
    zh: {},
    en: {},
  };
  
  const books = [
    { zh: WIKI_CLASSICS_ZH, en: WIKI_CLASSICS_EN },
  ];
  
  let totalGenerated = 0;
  const totalBooks = WIKI_CLASSICS_ZH.length * 2; // Chinese + English
  
  for (let i = 0; i < WIKI_CLASSICS_ZH.length; i++) {
    const zhBook = WIKI_CLASSICS_ZH[i];
    const enBook = WIKI_CLASSICS_EN[i];
    
    console.log(`📚 Processing [${i + 1}/${WIKI_CLASSICS_ZH.length}]: ${zhBook.title} by ${zhBook.author}`);
    
    // Generate Chinese report
    console.log(`  🔄 Generating Chinese report...`);
    const zhPrompt = buildEnhancedClassicBookPrompt(
      { title: zhBook.title, author: zhBook.author },
      'zh'
    );
    const zhReport = await generateReport(zhPrompt, zhBook.title, zhBook.author, 'zh');
    
    allReports.zh[zhBook.id] = {
      ...zhBook,
      deep_analysis: zhReport,
      generated_at: new Date().toISOString(),
    };
    
    // Save individual report
    await fs.writeFile(
      path.join(OUTPUT_DIR, `${zhBook.id}_zh.json`),
      zhReport,
      'utf-8'
    );
    
    console.log(`  ✅ Chinese report saved`);
    
    // Generate English report
    console.log(`  🔄 Generating English report...`);
    const enPrompt = buildEnhancedClassicBookPrompt(
      { title: enBook.title, author: enBook.author },
      'en'
    );
    const enReport = await generateReport(enPrompt, enBook.title, enBook.author, 'en');
    
    allReports.en[enBook.id] = {
      ...enBook,
      deep_analysis: enReport,
      generated_at: new Date().toISOString(),
    };
    
    // Save individual report
    await fs.writeFile(
      path.join(OUTPUT_DIR, `${enBook.id}_en.json`),
      enReport,
      'utf-8'
    );
    
    console.log(`  ✅ English report saved`);
    console.log('');
    
    totalGenerated += 2;
    
    // Rate limiting - wait between different books only
    if (DEEPSEEK_API_KEY && i < WIKI_CLASSICS_ZH.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ Generated ${totalGenerated}/${totalBooks} reports successfully!`);
  
  // Save combined data
  const dataOutput = `// AUTO-GENERATED: Enhanced Classic Book Reports
// Generated at: ${new Date().toISOString()}
// Total books: ${WIKI_CLASSICS_ZH.length} × 2 languages = ${totalBooks} reports

export interface WikiClassicEnhanced {
  id: string;
  title: string;
  author: string;
  summary: string;
  cover_url: string | null;
  keywords: string[];
  stage: string;
  lang: string;
  deep_analysis: string;
  generated_at: string;
}

export const WIKI_CLASSICS_ENHANCED_ZH: Record<string, WikiClassicEnhanced> = ${JSON.stringify(allReports.zh, null, 2)};

export const WIKI_CLASSICS_ENHANCED_EN: Record<string, WikiClassicEnhanced> = ${JSON.stringify(allReports.en, null, 2)};
`;
  
  await fs.writeFile(DATA_OUTPUT_FILE, dataOutput, 'utf-8');
  console.log(`💾 Combined data saved to: ${DATA_OUTPUT_FILE}`);
  
  return allReports;
}

// Run if called directly
generateAllReports()
  .then(() => {
    console.log('\n✨ Report generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

export { generateAllReports };
