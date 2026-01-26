import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/chat/completions';

if (!API_KEY) {
  console.error('DEEPSEEK_API_KEY is missing');
  process.exit(1);
}

const REPORTS_DIR = path.resolve(__dirname, '../src/data/classics_reports');

async function callDeepSeek(messages, temperature = 0.2) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages: [
        { role: 'system', content: 'You are a senior astrology expert and book editor. You write extremely detailed, authoritative, and exhaustive deep analysis reports. Your goal is to provide maximum depth and professional insight.' },
        ...messages
      ],
      temperature,
      stream: false
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

const PART_REQUIREMENTS = [
  // Part 1
  {
    title: "第一部分：全局定位与背景 (Context & Background)",
    targetWords: 1500,
    subsections: [
      "1.1 书籍在占星学中的地位与影响力 (Classic Status, Industry Impact, Reader Reception, Time Test)",
      "1.2 作者背景与写作动机 (Academic/Professional Background, Writing Context, Personal Influence)",
      "1.3 核心贡献与创新突破 (Pain Points Solved, Innovations, Theoretical/Methodological Breakthroughs)"
    ]
  },
  // Part 2
  {
    title: "第二部分：核心哲学与理论基石 (Core Philosophy & Theoretical Foundation)",
    targetWords: 1500,
    subsections: [
      "2.1 贯穿全书的底层逻辑 (Theoretical Framework, Assumptions, Philosophical Foundation)",
      "2.2 核心概念的深度解析 (Key Definitions, Relationships, Academic Origins)",
      "2.3 用通俗比喻解释核心理论 (Metaphors, Analogies, Counterexamples)"
    ]
  },
  // Part 3
  {
    title: "第三部分：结构化深度导读 (Structural Deep Reading)",
    targetWords: 2000,
    subsections: [
      "3.1 全书逻辑脉络分析 (ToC Structure, Chapter Connections, Pros/Cons)",
      "3.2 关键部分模块化拆解 (5-7 Modules: Overview, Knowledge Points, Excerpts, Connections)",
      "3.3 核心章节深度解读 (3-4 Chapters: Positioning, Arguments, Insights, Practical Significance)",
      "3.4 知识体系图谱 (Framework Map, Concept Network, Learning Path)"
    ]
  },
  // Part 4
  {
    title: "第四部分：方法论与实操工具 (Methodology & Practical Tools)",
    targetWords: 1500,
    subsections: [
      "4.1 核心方法论提炼 (Methodology Systems, Principles, Scope)",
      "4.2 Step-by-Step 实操指南 (Specific Methods, Operation Steps, Precautions, Cases)",
      "4.3 实用工具与模型 (Provided Tools, Usage, Improvement Suggestions)",
      "4.4 实践中的常见问题 (Pitfalls, Solutions, Advanced Tips)"
    ]
  },
  // Part 5
  {
    title: "第五部分：经典名句与深层解读 (Classic Quotes & Deep Interpretation)",
    targetWords: 1000,
    subsections: [
      "5.1 经典金句摘录 (5-8 Quotes: Context, Literal/Deep Meaning, Practice Significance)",
      "5.2 核心思想提炼 (One-sentence Summary, Thought's Position, Development)"
    ]
  },
  // Part 6
  {
    title: "第六部分：批判性思考与局限 (Critical Analysis & Limitations)",
    targetWords: 1000,
    subsections: [
      "6.1 时代的局限性 (Era Background, Content/Theoretical/Methodological Limitations)",
      "6.2 争议与不同声音 (Academic/Practical Controversies, Author Response)",
      "6.3 阅读的潜在误区 (Beginner Pitfalls, Deviations, Application Errors)",
      "6.4 与其他观点的对话 (Comparison with Similar Books, Supplementary Reading)"
    ]
  },
  // Part 7
  {
    title: "第七部分：读者行动指南 (Reader Action Plan)",
    targetWords: 1500,
    subsections: [
      "7.1 分阶段学习计划 (Phase 1-4: Goals, Tasks, Outputs)",
      "7.2 立即行动建议 (Specific Action, Execution, Outcome, Continuation)",
      "7.3 学习资源推荐 (Supporting Resources, Further Reading, Communities)"
    ]
  }
];

async function generateCanon(book) {
  console.log(`[Canon] Generating canon for: ${book.title}`);
  const prompt = `Task: Create a "Deep Interpretation Canon" for "${book.title}" by ${book.author}.
Return ONLY a JSON object.

Structure:
{
  "thesis": "...",
  "concepts": [{ "id": "C01", "name_zh": "...", "name_en": "...", "definition": "...", "implications": "..." }],
  "methods": [{ "id": "M01", "name_zh": "...", "name_en": "...", "steps": [...], "logic": "..." }],
  "structure_map": "...",
  "terminology": [{ "zh": "...", "en": "...", "context": "..." }]
}`;
  const content = await callDeepSeek([{ role: 'user', content: prompt }]);
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse Canon JSON');
  return JSON.parse(jsonMatch[0]);
}

async function generatePart(book, partIndex, canon, prevSummaries, lang, langDir) {
  const partFile = path.join(langDir, `part-${partIndex + 1}.md`);
  if (fs.existsSync(partFile)) {
    console.log(`  [Skip] Part ${partIndex + 1} already exists.`);
    return fs.readFileSync(partFile, 'utf8');
  }

  const req = PART_REQUIREMENTS[partIndex];
  console.log(`[Part ${partIndex + 1}] Generating for ${book.title} (${lang})`);

  let content = '';
  for (const sub of req.subsections) {
    console.log(`  [Sub] ${sub}`);
    const subPrompt = `You are writing a section of Part ${partIndex + 1} for a 10,000-word deep report on "${book.title}" by ${book.author}.
Language: ${lang === 'zh' ? 'Chinese' : 'English'}
Section to write: ${sub}
Target Length for this section: ~500 words.

# Reference Canon:
${JSON.stringify(canon, null, 2)}

# Previous Parts Context:
${prevSummaries.join('\n\n')}

# Current Progress in this Part:
${content ? 'I have already written the following for this part:\n' + content.substring(0, 1000) + '...' : 'Starting this part.'}

# Requirement:
Write an exhaustive, high-depth analysis for this specific subsection. 
- Use Concept IDs (C01, M01).
- Be professional and authoritative.
- Ensure the tone is consistent.
- Do NOT repeat what was already written.

Output only the Markdown content.`;

    let retry = 0;
    let subContent = '';
    while (retry < 3) {
      try {
        subContent = await callDeepSeek([{ role: 'user', content: subPrompt }]);
        break;
      } catch (e) {
        console.error(`    [Retry ${retry + 1}] Failed sub-section: ${e.message}`);
        retry++;
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    content += '\n\n' + subContent;
  }

  const finalContent = content.trim();
  fs.writeFileSync(partFile, finalContent);
  return finalContent;
}

async function processBook(book) {
  const bookDir = path.join(REPORTS_DIR, book.id);
  if (!fs.existsSync(bookDir)) fs.mkdirSync(bookDir, { recursive: true });

  const canonPath = path.join(bookDir, 'canon.json');
  let canon;
  if (fs.existsSync(canonPath)) {
    canon = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
  } else {
    canon = await generateCanon(book);
    fs.writeFileSync(canonPath, JSON.stringify(canon, null, 2));
  }

  const languages = ['zh', 'en'];
  for (const lang of languages) {
    const langDir = path.join(bookDir, lang);
    if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });

    const reportPath = path.join(langDir, 'full_report.md');
    if (fs.existsSync(reportPath)) {
      console.log(`[Skip] Report already exists for ${book.title} (${lang})`);
      continue;
    }

    const partContents = [];
    const summaries = [];

    for (let i = 0; i < 7; i++) {
      const partContent = await generatePart(book, i, canon, summaries, lang, langDir);
      partContents.push(partContent);
      
      const summaryPrompt = `Summarize Part ${i + 1} in 200 words, highlighting key claims and open loops:\n\n${partContent.substring(0, 2000)}`;
      const summary = await callDeepSeek([{ role: 'user', content: summaryPrompt }]);
      summaries.push(`Part ${i + 1} Summary: ${summary}`);
    }

    const fullReport = partContents.join('\n\n---\n\n');
    fs.writeFileSync(reportPath, fullReport);
    console.log(`[Success] Finished ${book.title} (${lang})`);
  }
}

const classicsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/wiki-classics.ts'), 'utf8');
const booksMatch = classicsContent.match(/export const WIKI_CLASSICS_ZH: ClassicSeed\[] = (\[[\s\S]*?\]);/);
function parseClassics(str) {
  const objects = [];
  const regex = /\{[\s\S]*?id: '(.*?)'[\s\S]*?\}/g;
  let m;
  while ((m = regex.exec(str)) !== null) {
    const objStr = m[0];
    const id = objStr.match(/id: '(.*?)'/)?.[1];
    const title = objStr.match(/title: '(.*?)'/)?.[1];
    const author = objStr.match(/author: '(.*?)'/)?.[1];
    const summary = objStr.match(/summary: '(.*?)'/)?.[1];
    if (id) objects.push({ id, title, author, summary });
  }
  return objects;
}
const books = parseClassics(booksMatch[1]);

const singleBookId = process.argv[2];
if (singleBookId) {
  const targetBook = books.find(b => b.id === singleBookId);
  if (targetBook) await processBook(targetBook);
} else {
  for (const book of books) {
    try { await processBook(book); } catch (err) { console.error(`Error processing ${book.title}:`, err); }
  }
}
