// INPUT: Wiki 经典书籍深度拆解 Prompt 模板（供 DeepSeek Reason 模型使用）。
// OUTPUT: 导出书籍拆解 Prompt 构建函数与类型定义。
// POS: Wiki Classics Prompt 模板；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import type { Language } from '../types/api.js';

export interface ClassicBookInfo {
  title: string;
  author: string;
  field?: string;
  targetAudience?: string;
}

/**
 * 构建经典书籍深度拆解的 Prompt
 * 用于调用 DeepSeek Reason 模型生成专业级书籍导读
 */
export function buildClassicBookPrompt(book: ClassicBookInfo, lang: Language): string {
  const field = book.field || (lang === 'zh' ? '占星学' : 'Astrology');
  const audience = book.targetAudience || (lang === 'zh'
    ? '希望从入门进阶到精通的占星爱好者'
    : 'Astrology enthusiasts seeking to advance from beginner to expert level');

  if (lang === 'zh') {
    return buildChinesePrompt(book.title, book.author, field, audience);
  }
  return buildEnglishPrompt(book.title, book.author, field, audience);
}

function buildChinesePrompt(
  title: string,
  author: string,
  field: string,
  audience: string
): string {
  return `# Role: ${field} 专家 & 资深图书主编

# Task: 对书籍《${title}》（作者：${author}）进行专家级深度拆解与导读

## 目标用户

${audience}。

风格要求：专业严谨但语言通俗易懂（深入浅出），逻辑清晰，具有启发性。

## 拆解框架与要求 (Output Format)

请严格按照以下 7 个模块进行深度拆解：

### 1. 全局定位与背景 (The Context)

* **书籍地位**：这本书在${field}中的地位如何？是被视为"圣经"、"入门必读"还是"颠覆之作"？
* **作者背景**：作者的核心资历是什么？其个人经历如何影响了这本书的写作视角？
* **核心贡献**：这本书解决了该领域的什么核心痛点？相比同类书籍，它最大的创新或不同点在哪里？

### 2. 核心哲学/理论基石 (The Core Philosophy)

* 不要罗列知识点，而是提炼出贯穿全书的**底层逻辑**或**世界观**。（例如《当代占星研究》中的"全息宇宙观"或"地图隐喻"）。
* 用一个通俗的比喻来解释这个核心理论。

### 3. 结构化深度导读 (Structural Breakdown)

* **逻辑脉络**：分析全书的目录结构，作者是按照什么逻辑编排的？（例如：从微观到宏观，或从理论到实操）。
* **分章拆解**：将书籍划分为几个关键部分（Module），总结每个部分的核心知识点。
* **重点挖掘**：挑出书中最具价值的 2-3 个核心章节进行详细解读，指出其打破认知的观点。

### 4. 方法论与实操工具 (Methodology & Tools)

* 提炼书中可落地的具体方法、步骤或模型。（例如：解盘步骤、沟通模型、思考框架）。
* 请以 Step-by-Step 的形式呈现，让读者看完就能上手尝试。

### 5. 经典名句与深层解读 (Golden Quotes & Exegesis)

* 摘录书中 3-5 句最具洞察力或治愈力的原文/金句。
* **重要**：不要只列出句子，请对每一句进行"赏析/解读"。解释这句话背后的深意，以及它为何能触动人心。

### 6. 批判性思考与局限 (Critical Analysis)

* 这本书是否有时代的局限性？
* 初学者在阅读时容易陷入哪些误区？
* 学术界或评论界对该书有哪些不同的声音？

### 7. 读者行动指南 (Action Plan)

* 设计一个分阶段的阅读或练习计划（例如：阶段一建立框架，阶段二深入细节）。
* 给读者一个立刻可以执行的小建议。

## 格式要求

* 使用 Markdown 格式，标题层级分明。
* 关键概念请标注英文原文（如有）。
* 语气要像一位耐心的导师，既有权威感又有亲和力。

## 输出格式

请将拆解内容组织成以下 JSON 结构：

\`\`\`json
{
  "title": "书名",
  "author": "作者",
  "summary": "一句话核心价值（20字以内）",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4"],
  "sections": {
    "context": {
      "title": "1. 全局定位与背景",
      "position": "书籍地位描述",
      "author_background": "作者背景描述",
      "contribution": "核心贡献描述"
    },
    "philosophy": {
      "title": "2. 核心哲学/理论基石",
      "core_logic": "底层逻辑描述",
      "metaphor": "通俗比喻"
    },
    "structure": {
      "title": "3. 结构化深度导读",
      "logic_flow": "逻辑脉络描述",
      "modules": [
        { "name": "模块一", "content": "核心知识点" },
        { "name": "模块二", "content": "核心知识点" },
        { "name": "模块三", "content": "核心知识点" }
      ],
      "highlights": [
        { "topic": "重点话题1", "insight": "打破认知的观点" },
        { "topic": "重点话题2", "insight": "打破认知的观点" }
      ]
    },
    "methodology": {
      "title": "4. 方法论与实操工具",
      "steps": [
        "Step 1: 具体步骤",
        "Step 2: 具体步骤",
        "Step 3: 具体步骤"
      ]
    },
    "quotes": {
      "title": "5. 经典名句与深层解读",
      "items": [
        { "quote": "金句原文", "interpretation": "深层解读" },
        { "quote": "金句原文", "interpretation": "深层解读" },
        { "quote": "金句原文", "interpretation": "深层解读" }
      ]
    },
    "criticism": {
      "title": "6. 批判性思考与局限",
      "limitations": "时代局限性",
      "misconceptions": "初学者误区",
      "debates": "不同声音"
    },
    "action": {
      "title": "7. 读者行动指南",
      "phases": [
        { "phase": "阶段一", "task": "具体任务" },
        { "phase": "阶段二", "task": "具体任务" },
        { "phase": "阶段三", "task": "具体任务" }
      ],
      "immediate_action": "立即行动建议"
    }
  }
}
\`\`\`

请确保输出是有效的 JSON 格式。`;
}

function buildEnglishPrompt(
  title: string,
  author: string,
  field: string,
  audience: string
): string {
  return `# Role: ${field} Expert & Senior Book Editor

# Task: Provide an expert-level deep analysis and reading guide for "${title}" by ${author}

## Target Audience

${audience}.

Style Requirements: Professional yet accessible (in-depth but easy to understand), logically clear, and inspiring.

## Analysis Framework (Output Format)

Please strictly follow these 7 modules for the deep analysis:

### 1. Context & Background (The Context)

* **Book's Status**: What is this book's position in ${field}? Is it considered a "bible", "essential reading for beginners", or a "groundbreaking work"?
* **Author Background**: What are the author's core credentials? How did their personal experience influence the book's perspective?
* **Core Contribution**: What core pain point in the field does this book address? Compared to similar books, what is its greatest innovation or difference?

### 2. Core Philosophy/Theoretical Foundation (The Core Philosophy)

* Don't just list knowledge points. Extract the **underlying logic** or **worldview** that runs through the entire book.
* Use a simple metaphor to explain this core theory.

### 3. Structural Deep Reading (Structural Breakdown)

* **Logic Flow**: Analyze the book's table of contents structure. What logic did the author follow? (e.g., from micro to macro, or from theory to practice)
* **Chapter Breakdown**: Divide the book into several key modules, summarizing the core knowledge points of each part.
* **Key Highlights**: Select 2-3 most valuable core chapters for detailed interpretation, pointing out their paradigm-shifting insights.

### 4. Methodology & Practical Tools (Methodology & Tools)

* Extract concrete methods, steps, or models that can be implemented.
* Present in Step-by-Step format so readers can try immediately after reading.

### 5. Classic Quotes & Deep Interpretation (Golden Quotes & Exegesis)

* Extract 3-5 most insightful or healing original quotes from the book.
* **Important**: Don't just list sentences. Provide "appreciation/interpretation" for each. Explain the deep meaning behind the words and why they resonate.

### 6. Critical Thinking & Limitations (Critical Analysis)

* Does this book have limitations of its era?
* What misconceptions might beginners fall into when reading?
* What different voices exist in academia or among critics regarding this book?

### 7. Reader Action Plan (Action Plan)

* Design a phased reading or practice plan (e.g., Phase 1: build framework, Phase 2: deep dive into details).
* Give readers one immediately actionable suggestion.

## Format Requirements

* Use Markdown format with clear heading hierarchy.
* Mark key concepts with original terms where applicable.
* The tone should be like a patient mentor, both authoritative and approachable.

## Output Format

Please organize the analysis content into the following JSON structure:

\`\`\`json
{
  "title": "Book Title",
  "author": "Author Name",
  "summary": "One-sentence core value (under 100 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "sections": {
    "context": {
      "title": "1. Context & Background",
      "position": "Book's status description",
      "author_background": "Author background description",
      "contribution": "Core contribution description"
    },
    "philosophy": {
      "title": "2. Core Philosophy",
      "core_logic": "Underlying logic description",
      "metaphor": "Simple metaphor"
    },
    "structure": {
      "title": "3. Structural Deep Reading",
      "logic_flow": "Logic flow description",
      "modules": [
        { "name": "Module 1", "content": "Core knowledge points" },
        { "name": "Module 2", "content": "Core knowledge points" },
        { "name": "Module 3", "content": "Core knowledge points" }
      ],
      "highlights": [
        { "topic": "Key topic 1", "insight": "Paradigm-shifting insight" },
        { "topic": "Key topic 2", "insight": "Paradigm-shifting insight" }
      ]
    },
    "methodology": {
      "title": "4. Methodology & Tools",
      "steps": [
        "Step 1: Specific step",
        "Step 2: Specific step",
        "Step 3: Specific step"
      ]
    },
    "quotes": {
      "title": "5. Golden Quotes & Interpretation",
      "items": [
        { "quote": "Original quote", "interpretation": "Deep interpretation" },
        { "quote": "Original quote", "interpretation": "Deep interpretation" },
        { "quote": "Original quote", "interpretation": "Deep interpretation" }
      ]
    },
    "criticism": {
      "title": "6. Critical Analysis",
      "limitations": "Era limitations",
      "misconceptions": "Beginner misconceptions",
      "debates": "Different voices"
    },
    "action": {
      "title": "7. Reader Action Plan",
      "phases": [
        { "phase": "Phase 1", "task": "Specific task" },
        { "phase": "Phase 2", "task": "Specific task" },
        { "phase": "Phase 3", "task": "Specific task" }
      ],
      "immediate_action": "Immediate action suggestion"
    }
  }
}
\`\`\`

Please ensure the output is valid JSON format.`;
}

/**
 * 将 JSON 结构的拆解内容转换为 Markdown 格式的文本内容
 * 用于存储到 wiki-classics.ts 中
 */
export function convertSectionsToContent(
  sections: Record<string, any>,
  title: string,
  author: string,
  lang: Language
): string {
  const parts: string[] = [];

  parts.push(lang === 'zh'
    ? `深度拆解报告｜《${title}》`
    : `Deep Analysis Report | "${title}"`);

  parts.push(lang === 'zh'
    ? `作者：${author}`
    : `Author: ${author}`);

  // 1. Context
  if (sections.context) {
    const ctx = sections.context;
    parts.push(ctx.title);
    parts.push(lang === 'zh'
      ? `书籍地位：${ctx.position}\n作者背景：${ctx.author_background}\n核心贡献：${ctx.contribution}`
      : `Book's Status: ${ctx.position}\nAuthor Background: ${ctx.author_background}\nCore Contribution: ${ctx.contribution}`);
  }

  // 2. Philosophy
  if (sections.philosophy) {
    const phil = sections.philosophy;
    parts.push(phil.title);
    parts.push(lang === 'zh'
      ? `底层逻辑：${phil.core_logic}\n比喻：${phil.metaphor}`
      : `Core Logic: ${phil.core_logic}\nMetaphor: ${phil.metaphor}`);
  }

  // 3. Structure
  if (sections.structure) {
    const struct = sections.structure;
    parts.push(struct.title);

    let structContent = lang === 'zh'
      ? `逻辑脉络：${struct.logic_flow}\n模块拆解：`
      : `Logic Flow: ${struct.logic_flow}\nModule Breakdown:`;

    if (struct.modules) {
      struct.modules.forEach((mod: any) => {
        structContent += `\n- ${mod.name}：${mod.content}`;
      });
    }

    if (struct.highlights) {
      structContent += lang === 'zh' ? '\n重点挖掘：' : '\nKey Highlights:';
      struct.highlights.forEach((h: any, i: number) => {
        structContent += `\n${i + 1}) ${h.topic}：${h.insight}`;
      });
    }

    parts.push(structContent);
  }

  // 4. Methodology
  if (sections.methodology) {
    const meth = sections.methodology;
    parts.push(meth.title);
    parts.push(`Step-by-Step：\n${meth.steps.map((s: string, i: number) => `${i + 1}. ${s.replace(/^Step \d+:\s*/i, '')}`).join('\n')}`);
  }

  // 5. Quotes
  if (sections.quotes) {
    const quotes = sections.quotes;
    parts.push(quotes.title);
    let quotesContent = '';
    quotes.items.forEach((q: any, i: number) => {
      quotesContent += lang === 'zh'
        ? `金句 ${i + 1}（精炼复述）：${q.quote}\n解读 ${i + 1}：${q.interpretation}\n`
        : `Quote ${i + 1}: ${q.quote}\nInterpretation ${i + 1}: ${q.interpretation}\n`;
    });
    parts.push(quotesContent.trim());
  }

  // 6. Criticism
  if (sections.criticism) {
    const crit = sections.criticism;
    parts.push(crit.title);
    parts.push(lang === 'zh'
      ? `时代局限：${crit.limitations}\n初学误区：${crit.misconceptions}\n不同声音：${crit.debates}`
      : `Era Limitations: ${crit.limitations}\nBeginner Misconceptions: ${crit.misconceptions}\nDifferent Voices: ${crit.debates}`);
  }

  // 7. Action
  if (sections.action) {
    const act = sections.action;
    parts.push(act.title);
    let actContent = '';
    act.phases.forEach((p: any) => {
      actContent += `${p.phase}：${p.task}\n`;
    });
    actContent += lang === 'zh'
      ? `立即行动：${act.immediate_action}`
      : `Immediate Action: ${act.immediate_action}`;
    parts.push(actContent.trim());
  }

  return parts.filter(Boolean).join('\n\n');
}

export default {
  buildClassicBookPrompt,
  convertSectionsToContent,
};
