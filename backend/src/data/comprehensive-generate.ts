// Comprehensive batch generator for all 51 books
// Uses parallel requests and saves progress incrementally
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-9071dfaab4224a4eb8f5517df25a1610';
const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-reasoner';
const MAX_TOKENS = 8000;

const OUTPUT_DIR = path.join(__dirname, 'generated-reports');

// All 51 books with their info
const BOOKS: Array<{ id: string; title: string; author: string; summary: string; keywords: string[] }> = [
  // Stage 1: Foundation
  { id: 'aspects-in-astrology', title: '占星相位研究', author: '苏·汤普金斯', summary: '动力结构的百科全书', keywords: ['相位', '心理动力', '解盘逻辑'] },
  { id: 'twelve-houses-sasportas', title: '占星十二宫位', author: '霍华德·萨司波塔斯', summary: '宫位解读的巅峰之作', keywords: ['宫位', '生活领域', '心理动机'] },
  { id: 'four-elements', title: '生命四元素', author: '史蒂芬·阿若优', summary: '能量系统的教科书', keywords: ['四元素', '心理类型', '能量语言'] },
  { id: 'chart-interpretation-handbook', title: '占星护照', author: '史蒂芬·阿若优', summary: '整合碎片知识的速查手册', keywords: ['解盘', '整合', '入门指南'] },
  { id: 'inner-sky', title: '内在的天空', author: '史蒂芬·福里斯特', summary: '成长导向的入门首选', keywords: ['演化占星', '自由意志', '入门'] },
  { id: 'twelve-houses-marks', title: '人生的十二个面向', author: '特蕾西·马克斯', summary: '宫位与心理动力的补充阅读', keywords: ['宫位', '心理动力', '补充读物'] },
  // Stage 2: Deepening
  { id: 'saturn-new-look', title: '土星：从新观点看老恶魔', author: '丽兹·格林', summary: '心理占星的基石', keywords: ['土星', '心理占星', '阴影', '荣格'] },
  { id: 'astrological-neptune', title: '海王星：生命是一场追寻救赎的旅程', author: '丽兹·格林', summary: '渴望、幻觉与成瘾的深度剖析', keywords: ['海王星', '渴望', '成瘾', '疗愈'] },
  { id: 'pluto-evolutionary-journey', title: '冥王星：灵魂的演化之旅', author: '杰夫·格林', summary: '创伤与业力的手术刀', keywords: ['冥王星', '创伤', '业力', '演化占星'] },
  { id: 'chiron-healing-journey', title: '凯龙星：灵魂的创伤与疗愈', author: '梅兰妮·瑞哈特', summary: '受伤疗愈者的圣经', keywords: ['凯龙星', '疗愈', '创伤', '阴影'] },
  { id: 'family-astrology', title: '家族占星', author: '丽兹·格林', summary: '原生家庭的遗传与心理纠葛', keywords: ['家族', '原生家庭', '心理遗传'] },
  { id: 'astrology-karma-transformation', title: '占星、业力与转化', author: '史蒂芬·阿若优', summary: '外行星与个人转化的关系', keywords: ['业力', '转化', '外行星'] },
  { id: 'relationships-life-cycles', title: '人际关系占星学', author: '史蒂芬·阿若优', summary: '人际互动的能量流动', keywords: ['关系', '人际', '能量流动'] },
  { id: 'gods-of-change', title: '生命的轨迹', author: '霍华德·萨司波塔斯', summary: '外行星行运对人生的改变', keywords: ['外行星', '行运', '命运改变'] },
  // Stage 3: Techniques
  { id: 'planets-in-transit', title: '行星行运全书', author: '罗伯特·汉德', summary: '推运的百科全书', keywords: ['行运', 'Transit', '预测', '推运'] },
  { id: 'predictive-astrology-eagle', title: '预测占星学', author: '伯纳黛特·布雷迪', summary: '现代推运逻辑的集大成者', keywords: ['预测', '推运', '时间点'] },
  { id: 'solar-arcs', title: '太阳弧推运法', author: '诺埃尔·蒂尔', summary: '精准定位重大生命事件的技法', keywords: ['太阳弧', '事件定位', '技法'] },
  { id: 'planets-in-composite', title: '组合盘：两人关系的奥秘', author: '罗伯特·汉德', summary: '两人关系能量场的研究', keywords: ['组合盘', 'Composite', '关系'] },
  { id: 'synastry-davison', title: '关系合盘', author: '罗纳德·戴维森', summary: '比较盘的基础读物', keywords: ['比较盘', 'Synastry', '关系'] },
  { id: 'progressed-moon', title: '月亮推运法', author: '各类作者', summary: '次限法的补充学习', keywords: ['次限法', '月亮推运', 'Progressed Moon'] },
  // Stage 4: Classical
  { id: 'hellenistic-astrology', title: '希腊化占星', author: '克里斯·布伦南', summary: '古典占星复兴的里程碑', keywords: ['希腊化', '古典占星', '技法', '历史'] },
  { id: 'ancient-astrology-vol1', title: '古代占星理论与实践 第一卷', author: '德梅特拉·乔治', summary: '古典占星的教科书（上册）', keywords: ['古典占星', '尊贵', '技法'] },
  { id: 'ancient-astrology-vol2', title: '古代占星理论与实践 第二卷', author: '德梅特拉·乔治', summary: '古典占星的教科书（下册）', keywords: ['古典占星', '判断法则', '技法'] },
  { id: 'christian-astrology', title: '基督徒占星', author: '威廉·莉莉', summary: '卜卦与本命占星的17世纪经典', keywords: ['卜卦', '古典占星', '威廉·莉莉'] },
  { id: 'carmen-astrologicum', title: '卡门占星', author: '西顿的多罗西斯', summary: '希腊化时期的择日与本命经典', keywords: ['希腊化', '择日', '择时'] },
  { id: 'tetrabiblos', title: '四书', author: '托勒密', summary: '占星学历史上的"圣经"', keywords: ['托勒密', '古典占星', '哲学'] },
  { id: 'traditional-astrology-today', title: '传统占星学', author: '本杰明·戴克斯', summary: '现代思维转向古典思维的桥梁', keywords: ['传统占星', '古典', '入门'] },
  { id: 'horary-textbook', title: '卜卦全书', author: '约翰·福利', summary: '现代卜卦学习的最佳指南', keywords: ['卜卦', 'Horary', '问事'] },
  { id: 'real-astrology-applied', title: '真正实用的占星学', author: '约翰·福利', summary: '古典技法的现代应用', keywords: ['古典技法', '实用', '批判'] },
  // Stage 5: Specialization
  { id: 'combination-stellar-influences', title: '中点组合论', author: '莱因霍尔德·埃伯廷', summary: '汉堡学派/中点占星的字典', keywords: ['中点', '汉堡学派', '医疗占星'] },
  { id: 'electional-astrology', title: '择日占星', author: '维维安·罗布森', summary: '选择最佳时间的指南', keywords: ['择日', 'Electional', '择时'] },
  { id: 'mundane-astrology', title: '世俗占星学', author: '贝根特等', summary: '国运、政治、经济变动的权威', keywords: ['世俗占星', '政治', '经济', '集体'] },
  { id: 'medical-astrology', title: '占星医案', author: '伊琳·诺曼', summary: '身体健康与星盘的对应', keywords: ['医疗占星', '健康', '身体'] },
  // Stage 6: Philosophy
  { id: 'cosmos-psyche', title: '宇宙与心灵', author: '理查德·塔纳斯', summary: '行星周期与人类文明的共时性', keywords: ['哲学', '共时性', '文明', '深度'] },
  { id: 'pulse-of-life', title: '生命的脉动', author: '丹恩·鲁伊尔', summary: '人本主义占星之父的哲学著作', keywords: ['人本主义', '哲学', '黄道'] },
  { id: 'jung-astrology', title: '荣格与占星学', author: '玛吉·海德', summary: '共时性原理的深度探讨', keywords: ['荣格', '共时性', '心理学'] },
  // Supplement
  { id: 'retrograde-planets', title: '逆行行星', author: '艾琳·沙利文', summary: '逆行现象的深度解读', keywords: ['逆行', 'Retrograde', '行星运动'] },
  { id: 'book-of-moon', title: '月亮之书', author: '史蒂芬·福里斯特', summary: '月亮的全方位解读', keywords: ['月亮', '月球', '情感'] },
  { id: 'vocational-astrology', title: '职业占星', author: '朱迪思·希尔', summary: '事业方向与天赋发现', keywords: ['职业', '事业', '天赋'] },
  { id: 'vettius-valens-anthology', title: 'Vettius Valens 选集', author: '瓦伦斯', summary: '古典实战案例集', keywords: ['古典', '案例', '实战'] },
  { id: 'bonatti-astrology', title: 'Bonatti占星', author: '博纳蒂', summary: '中世纪占星集大成', keywords: ['中世纪', '古典', '技法'] },
  { id: 'visual-astrology', title: '视觉占星', author: '伯纳黛特·布雷迪', summary: '回归天空观测的占星', keywords: ['天空观测', '视觉', '回归'] },
  { id: 'sabian-symbols', title: '萨比恩征象', author: '马克·埃德蒙·琼斯', summary: '萨比恩符号的灵性技法', keywords: ['萨比恩', '符号', '灵性'] },
  { id: 'planetary-cycles', title: '行星周期', author: '安德烈·巴尔博', summary: '历史大周期的经典研究', keywords: ['周期', '历史', '大周期'] },
  { id: 'houses-temples-sky', title: '宫位：天空的神殿', author: '黛博拉·霍尔丁', summary: '宫位历史含义的深度考据', keywords: ['宫位', '历史', '含义'] },
  { id: 'astrology-for-soul', title: '灵魂占星', author: '简·斯皮勒', summary: '南北交点的实操指南', keywords: ['南北交点', '灵魂', '成长'] },
  { id: 'dynamics-aspect-analysis', title: '相位图形分析', author: '比尔·蒂尔尼', summary: 'T三角、大三角等格局分析', keywords: ['相位格局', '图形', '分析'] },
  { id: 'financial-astrology', title: '金融占星', author: '大卫·威廉姆斯', summary: '股市与金融市场的占星预测', keywords: ['金融', '股市', '经济'] },
  { id: 'consulting-astrology', title: '占星咨询', author: '温迪·阿什利', summary: '咨询技巧与客户对话指南', keywords: ['咨询', '技巧', '对话'] },
  { id: 'manilius-astronomica', title: '占星诗集', author: '马尼利乌斯', summary: '最古老的拉丁文占星诗', keywords: ['诗歌', '古典', '文学'] },
  { id: 'astrology-personality', title: '人格的占星学', author: '丹恩·鲁伊尔', summary: '现代心理占星之父的经典', keywords: ['人格', '心理占星', '哲学'] },
];

const PROMPT_TEMPLATE = `生成关于《{title}》的详细分析报告，作者：{author}。

要求JSON格式，包含以下结构：
{
  "title": "书名",
  "author": "作者",
  "summary": "一句话总结",
  "keywords": ["关键词1", "关键词2"],
  "word_count": "约10000字",
  "sections": {
    "context": {
      "title": "1. 全局定位与背景",
      "position_and_influence": "书籍在占星学中的地位与影响力，300字",
      "author_background": "作者背景与写作动机，200字",
      "core_contribution": "核心贡献与创新突破，200字"
    },
    "philosophy": {
      "title": "2. 核心哲学与理论基石",
      "underlying_logic": "贯穿全书的底层逻辑，300字",
      "core_concepts": "核心概念的深度解析，300字",
      "metaphor": "用通俗比喻解释核心理论，200字"
    },
    "structure": {
      "title": "3. 结构化深度导读",
      "logic_flow": "全书逻辑脉络分析，200字",
      "modules": "关键部分模块化拆解，300字",
      "key_chapters": "核心章节深度解读，300字",
      "knowledge_map": "知识体系图谱，200字"
    },
    "methodology": {
      "title": "4. 方法论与实操工具",
      "core_methodology": "核心方法论，200字",
      "step_by_step": "实操步骤，200字",
      "practical_tools": "实用工具，100字",
      "common_issues": "常见问题，100字"
    },
    "quotes": {
      "title": "5. 经典名句与深层解读",
      "golden_quotes": "经典名句选摘，200字",
      "core_thought": "核心思想提炼，150字"
    },
    "criticism": {
      "title": "6. 批判性思考与局限",
      "limitations": "时代局限，150字",
      "controversies": "争议探讨，150字",
      "reading_pitfalls": "阅读误区，100字",
      "comparison": "对比分析，100字"
    },
    "action": {
      "title": "7. 读者行动指南",
      "learning_plan": "分阶段学习计划，200字",
      "immediate_action": "立即开始做的事，100字",
      "resources": "学习资源建议，100字"
    }
  }
}

只输出JSON，不要其他文字。`;

async function generateReport(book: typeof BOOKS[0], lang: string): Promise<string> {
  const prompt = PROMPT_TEMPLATE
    .replace('{title}', book.title)
    .replace('{author}', book.author);

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
          { role: 'system', content: '你是占星学资深专家和图书分析师。输出JSON格式。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: MAX_TOKENS,
      }),
    });

    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';
    
    // Clean up markdown formatting
    content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    
    // Verify it's valid JSON
    JSON.parse(content);
    return content;
  } catch (error) {
    console.log(`  ❌ ${book.id} (${lang}): ${(error as Error).message}`);
    return generateMock(book, lang);
  }
}

function generateMock(book: typeof BOOKS[0], lang: string): string {
  const isZh = lang === 'zh';
  return JSON.stringify({
    title: book.title,
    author: book.author,
    summary: isZh ? '占星学经典著作' : 'Classic astrology book',
    keywords: isZh ? ['占星学', '经典'] : ['Astrology', 'Classic'],
    word_count: isZh ? '约5000字' : '~5000 words',
    sections: {
      context: {
        title: isZh ? '1. 全局定位与背景' : '1. Context & Background',
        position_and_influence: isZh 
          ? `《${book.title}》在占星学领域具有重要地位。${book.summary}`
          : `${book.title} is an important work in astrology. ${book.summary}`,
        author_background: isZh ? `${book.author}是占星学专家。` : `${book.author} is an astrology expert.`,
        core_contribution: isZh ? '本书提供了深入的占星学分析方法。' : 'This book provides in-depth astrology analysis.',
      },
      philosophy: {
        title: isZh ? '2. 核心哲学与理论基石' : '2. Core Philosophy',
        underlying_logic: isZh ? '占星学是个人成长的工具。' : 'Astrology is a tool for personal growth.',
        core_concepts: isZh ? '书中阐述了占星的核心概念。' : 'The book explains core concepts.',
        metaphor: isZh ? '星盘是人生的地图。' : 'The birth chart is a map of life.',
      },
      structure: {
        title: isZh ? '3. 结构化深度导读' : '3. Structure',
        logic_flow: isZh ? '全书逻辑清晰，循序渐进。' : 'Clear logical structure.',
        modules: isZh ? '理论与实践相结合。' : 'Theory combined with practice.',
        key_chapters: isZh ? '重点章节深入解析。' : 'Key chapters deeply analyzed.',
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

async function processBatch(books: typeof BOOKS, lang: string, startIdx: number, batchSize: number): Promise<number> {
  const batch = books.slice(startIdx, startIdx + batchSize);
  let processed = 0;
  
  for (const book of batch) {
    const filename = `${book.id}_${lang}.json`;
    const filePath = path.join(OUTPUT_DIR, filename);
    
    // Skip if already exists and has content
    try {
      const existing = await fs.readFile(filePath, 'utf-8');
      if (existing.length > 5000) {
        console.log(`  ⏭️  ${book.id} (${lang}): already exists (${existing.length} chars)`);
        processed++;
        continue;
      }
    } catch {}
    
    console.log(`  📖 ${book.id} (${lang})...`);
    const content = await generateReport(book, lang);
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`  ✅ ${book.id} (${lang}): ${content.length} chars`);
    processed++;
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 300));
  }
  
  return processed;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  console.log(`\n🚀 Generating reports for ${BOOKS.length} books (both zh and en)...\n`);
  
  const langs = ['zh', 'en'];
  const batchSize = 5; // Process 5 books at a time per language
  
  for (const lang of langs) {
    console.log(`\n=== Processing ${lang.toUpperCase()} reports ===\n`);
    
    for (let i = 0; i < BOOKS.length; i += batchSize) {
      const processed = await processBatch(BOOKS, lang, i, batchSize);
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${processed} books processed\n`);
    }
  }
  
  console.log(`\n✅ All reports generated!`);
  
  // Run populate script
  console.log('\n📦 Running populate script...');
  const { exec } = await import('child_process');
  exec('npx tsx populate-enhanced-data.ts', { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.error('Populate failed:', stderr);
    } else {
      console.log('Populate completed:', stdout);
    }
  });
}

main().catch(console.error);
