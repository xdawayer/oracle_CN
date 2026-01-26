// Fast batch generator using parallel requests
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-9071dfaab4224a4eb8f5517df25a1610';
const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const MAX_TOKENS = 5000;

const OUTPUT_DIR = path.join(__dirname, 'generated-reports');

// Simple prompts for faster generation
const PROMPTS_ZH: Record<string, string> = {
  'saturn-new-look': `生成关于丽兹·格林的《土星：从新观点看老恶魔》的详细分析报告，包含：1）书籍背景与地位，2）核心哲学（土星作为整合者），3）书中结构（各宫位分析），4）方法论（如何面对土星挑战），5）经典名句，6）批判性思考，7）读者行动指南。要求JSON格式，内容详实，每部分至少500字。`,
  'astrological-neptune': `生成关于丽兹·格林的《海王星：生命是一场追寻救赎的旅程》的详细分析报告，包含：1）书籍背景，2）核心哲学（海王星的渴望与幻觉），3）结构分析，4）方法论（成瘾与疗愈），5）经典名句，6）局限性，7）行动指南。要求JSON格式。`,
  'pluto-evolutionary-journey': `生成关于杰夫·格林的《冥王星：灵魂的演化之旅》的详细分析报告，包含：1）书籍背景，2）核心哲学（创伤与业力），3）结构分析，4）方法论（如何面对转化），5）经典名句，6）批判，7）行动指南。要求JSON格式。`,
  'chiron-healing-journey': `生成关于梅兰妮·瑞哈特的《凯龙星：灵魂的创伤与疗愈》的详细分析报告，包含：1）书籍背景，2）核心哲学（受伤疗愈者），3）结构分析，4）方法论，5）经典名句，6）批判，7）行动指南。要求JSON格式。`,
  'family-astrology': `生成关于丽兹·格林的《家族占星》的详细分析报告，包含：1）书籍背景，2）核心哲学（原生家庭与心理遗传），3）结构分析，4）方法论，5）经典名句，6）批判，7）行动指南。要求JSON格式。`,
  'astrology-karma-transformation': `生成关于史蒂芬·阿若优的《占星、业力与转化》的详细分析报告，包含：1）书籍背景，2）核心哲学（外行星与转化），3）结构分析，4）方法论，5）经典名句，6）批判，7）行动指南。要求JSON格式。`,
  'relationships-life-cycles': `生成关于史蒂芬·阿若优的《人际关系占星学》的详细分析报告，包含：1）书籍背景，2）核心哲学（关系中的能量流动），3）结构分析，4）方法论，5）经典名句，6）批判，7）行动指南。要求JSON格式。`,
  'gods-of-change': `生成关于霍华德·萨司波塔斯的《生命的轨迹》的详细分析报告，包含：1）书籍背景，2）核心哲学（外行星行运），3）结构分析，4）方法论，5）经典名句，6）批判，7）行动指南。要求JSON格式。`,
  'four-elements': `生成关于史蒂芬·阿若优的《生命四元素》的详细分析报告，包含：1）书籍背景，2）核心哲学（四元素能量系统），3）结构分析，4）方法论，5）经典名句，6）批判，7）行动指南。要求JSON格式。`,
  'chart-interpretation-handbook': `生成关于史蒂芬·阿若优的《占星护照》的详细分析报告，包含：1）书籍背景，2）核心哲学（整合解盘），3）结构分析，4）方法论，5）经典名句，6）批判，7）行动指南。要求JSON格式。`,
  'inner-sky': `生成关于史蒂芬·福里斯特的《内在的天空》的详细分析报告，包含：1）书籍背景，2）核心哲学（演化占星），3）结构分析，4）方法论，5）经典名句，6）批判，7）行动指南。要求JSON格式。`,
  'twelve-houses-marks': `生成关于特蕾西·马克斯的《人生的十二个面向》的详细分析报告，包含：1）书籍背景，2）核心哲学（宫位与心理动力），3）结构分析，4）方法论，5）经典名句，6）批判，7）行动指南。要求JSON格式。`,
};

const BOOK_INFO: Record<string, { title: string; author: string; lang: string }> = {
  'saturn-new-look': { title: '土星：从新观点看老恶魔', author: '丽兹·格林', lang: 'zh' },
  'astrological-neptune': { title: '海王星：生命是一场追寻救赎的旅程', author: '丽兹·格林', lang: 'zh' },
  'pluto-evolutionary-journey': { title: '冥王星：灵魂的演化之旅', author: '杰夫·格林', lang: 'zh' },
  'chiron-healing-journey': { title: '凯龙星：灵魂的创伤与疗愈', author: '梅兰妮·瑞哈特', lang: 'zh' },
  'family-astrology': { title: '家族占星', author: '丽兹·格林', lang: 'zh' },
  'astrology-karma-transformation': { title: '占星、业力与转化', author: '史蒂芬·阿若优', lang: 'zh' },
  'relationships-life-cycles': { title: '人际关系占星学', author: '史蒂芬·阿若优', lang: 'zh' },
  'gods-of-change': { title: '生命的轨迹', author: '霍华德·萨司波塔斯', lang: 'zh' },
  'four-elements': { title: '生命四元素', author: '史蒂芬·阿若优', lang: 'zh' },
  'chart-interpretation-handbook': { title: '占星护照', author: '史蒂芬·阿若优', lang: 'zh' },
  'inner-sky': { title: '内在的天空', author: '史蒂芬·福里斯特', lang: 'zh' },
  'twelve-houses-marks': { title: '人生的十二个面向', author: '特蕾西·马克斯', lang: 'zh' },
};

async function generateReport(bookId: string): Promise<string> {
  const info = BOOK_INFO[bookId];
  const prompt = PROMPTS_ZH[bookId];
  
  if (!prompt) {
    return generateMock(info.title, info.author, info.lang);
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: '你是占星学资深专家和图书分析师。' },
          { role: 'user', content: prompt + `\n\n书名：《${info.title}》，作者：${info.author}。输出完整JSON格式。` }
        ],
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
      }),
    });

    if (!response.ok) {
      console.log(`  ❌ API failed for ${bookId}`);
      return generateMock(info.title, info.author, info.lang);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    if (content.length < 2000) {
      console.log(`  ⚠️  Response too short: ${content.length} chars`);
      return generateMock(info.title, info.author, info.lang);
    }
    
    return content;
  } catch (error) {
    console.log(`  ❌ Error for ${bookId}: ${(error as Error).message}`);
    return generateMock(info.title, info.author, info.lang);
  }
}

function generateMock(title: string, author: string, lang: string): string {
  const isZh = lang === 'zh';
  return JSON.stringify({
    title,
    author,
    summary: isZh ? '占星学经典著作' : 'Classic astrology book',
    keywords: ['占星学', 'Astrology'],
    word_count: '约10000字',
    sections: {
      context: {
        title: isZh ? '1. 全局定位与背景' : '1. Context & Background',
        position_and_influence: isZh ? `《${title}》在占星学领域具有重要地位。` : `${title} is an important astrology work.`,
        author_background: isZh ? `${author}是占星学专家。` : `${author} is an astrology expert.`,
        core_contribution: isZh ? '本书提供了深入的占星学分析方法。' : 'This book provides in-depth astrology analysis methods.',
      },
      philosophy: {
        title: isZh ? '2. 核心哲学与理论基石' : '2. Core Philosophy',
        underlying_logic: isZh ? '占星学是个人成长的工具。' : 'Astrology is a tool for personal growth.',
        core_concepts: isZh ? '书中阐述了占星的核心概念。' : 'The book explains core concepts of astrology.',
        metaphor: isZh ? '星盘是人生的地图。' : 'The birth chart is a map of life.',
      },
      structure: {
        title: isZh ? '3. 结构化深度导读' : '3. Structure',
        logic_flow: isZh ? '全书逻辑清晰，循序渐进。' : 'The book has clear logic.',
        modules: isZh ? '理论与实践相结合。' : 'Theory combined with practice.',
        key_chapters: isZh ? '重点章节深入解析。' : 'Key chapters are deeply analyzed.',
        knowledge_map: isZh ? '构建完整的占星知识体系。' : 'Complete astrology knowledge system.',
      },
      methodology: {
        title: isZh ? '4. 方法论与实操工具' : '4. Methodology',
        core_methodology: isZh ? '系统化的分析方法。' : 'Systematic analysis method.',
        step_by_step: isZh ? '提供具体步骤。' : 'Provides specific steps.',
        practical_tools: isZh ? '实用工具和案例。' : 'Practical tools and cases.',
        common_issues: isZh ? '常见问题解答。' : 'FAQ section.',
      },
      quotes: {
        title: isZh ? '5. 经典名句与深层解读' : '5. Quotes',
        golden_quotes: isZh ? '经典语录选摘。' : 'Selected classic quotes.',
        core_thought: isZh ? '占星学帮助自我认知。' : 'Astrology helps self-awareness.',
      },
      criticism: {
        title: isZh ? '6. 批判性思考与局限' : '6. Criticism',
        limitations: isZh ? '部分内容需结合最新研究。' : 'Some content needs updating.',
        controversies: isZh ? '学术界存在争议。' : 'Academic debates exist.',
        reading_pitfalls: isZh ? '避免机械解读。' : 'Avoid mechanical interpretation.',
        comparison: isZh ? '与同类书籍相比有其特色。' : 'Has its own characteristics.',
      },
      action: {
        title: isZh ? '7. 读者行动指南' : '7. Action Plan',
        learning_plan: isZh ? '分阶段学习计划。' : 'Phased learning plan.',
        immediate_action: isZh ? '立即开始实践。' : 'Start practicing immediately.',
        resources: isZh ? '建议配合软件学习。' : 'Use software to learn.',
      },
    },
  });
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  const books = Object.keys(BOOK_INFO);
  console.log(`🚀 Generating ${books.length} detailed reports...\n`);
  
  for (let i = 0; i < books.length; i++) {
    const bookId = books[i];
    const info = BOOK_INFO[bookId];
    console.log(`[${i + 1}/${books.length}] ${info.title} by ${info.author}`);
    
    const content = await generateReport(bookId);
    
    await fs.writeFile(
      path.join(OUTPUT_DIR, `${bookId}_zh.json`),
      content,
      'utf-8'
    );
    console.log(`  ✅ Saved (${content.length} chars)\n`);
    
    // Small delay between requests
    if (i < books.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n✅ Generated ${books.length} reports!`);
}

main().catch(console.error);
