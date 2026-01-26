// INPUT: Wiki 经典书籍深度拆解 Prompt 模板 - 增强版（供 DeepSeek Reason 模型使用）。
// OUTPUT: 导出书籍拆解 Prompt 构建函数与类型定义。
// POS: Wiki Classics 增强版 Prompt；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。
// NOTE: 此版本扩展到10000字深度报告，分为7个主要部分

import type { Language } from '../types/api.js';

export interface ClassicBookInfo {
  title: string;
  author: string;
  field?: string;
  targetAudience?: string;
}

/**
 * 构建经典书籍深度拆解的增强版 Prompt
 * 用于调用 DeepSeek Reason 模型生成10000字专业级书籍导读
 */
export function buildEnhancedClassicBookPrompt(book: ClassicBookInfo, lang: Language): string {
  const field = book.field || (lang === 'zh' ? '占星学' : 'Astrology');
  const audience = book.targetAudience || (lang === 'zh'
    ? '希望从入门进阶到精通的占星爱好者'
    : 'Astrology enthusiasts seeking to advance from beginner to expert level');

  if (lang === 'zh') {
    return buildEnhancedChinesePrompt(book.title, book.author, field, audience);
  }
  return buildEnhancedEnglishPrompt(book.title, book.author, field, audience);
}

function buildEnhancedChinesePrompt(
  title: string,
  author: string,
  field: string,
  audience: string
): string {
  return `# Role: ${field} 资深专家 & 著名图书主编

# Task: 对书籍《${title}》（作者：${author}）进行**万字级深度拆解与导读**

## 目标读者

${audience}。

## 风格要求

专业严谨但语言通俗易懂（深入浅出），逻辑清晰，具有启发性，论述深入且详尽。

## 核心目标

生成一篇**10000字左右**（约5000-6000中文字符）的深度拆解报告，让读者能够：
1. 全面理解书籍的核心价值与定位
2. 掌握书中的核心理论与方法论
3. 能够实际应用书中的知识
4. 理解书籍的局限性与适用场景

## 拆解框架与详细要求 (Output Format)

请严格按照以下7个部分进行深度拆解，每个部分都要详尽展开：

---

### 第一部分：全局定位与背景 (约1500字)

**1.1 书籍在${field}中的地位与影响力**

* **经典地位评估**：这本书在${field}领域中被置于什么位置？是奠基之作、颠覆之作、还是集大成之作？为什么？
* **行业影响**：这本书出版后对整个领域产生了怎样的影响？是否改变了行业的研究方向或实践方法？
* **读者口碑**：业界和读者如何评价这本书？有哪些著名的评价或引用？
* **时间检验**：这本书出版至今已有多长时间？其内容是否经受住了时间的考验？

**1.2 作者背景与写作动机**

* **学术与专业背景**：作者的核心资历、教育背景、师承关系是什么？有哪些重要的专业经历？
* **写作时机**：作者是在什么情况下写下这本书的？当时的学术或行业背景是什么？
* **个人经历的影响**：作者的个人经历（职业转型、人生转折、学术探索等）如何影响了这本书的写作视角和核心观点？
* **作者的其他著作**：作者还写过哪些相关书籍？这本书在其著作体系中处于什么位置？

**1.3 核心贡献与创新突破**

* **解决了什么痛点**：这本书解决了该领域的什么核心痛点或难题？
* **创新之处**：相比同类书籍或前人研究，它最大的创新或不同点在哪里？
* **理论突破**：在理论层面有哪些重要突破或新见解？
* **方法论创新**：在实践方法或工具方面有什么重要贡献？

---

### 第二部分：核心哲学与理论基石 (约1500字)

**2.1 贯穿全书的底层逻辑**

* **核心理论框架**：提炼出贯穿全书的**底层逻辑**或**世界观**。这不是简单的知识点罗列，而是作者看待问题的根本视角。
* **理论假设**：作者基于哪些基本假设或前提展开论述？这些假设是否成立？
* **哲学基础**：这本书的理论基础是什么？是否借鉴了其他学科的哲学思想（如荣格心理学、神话学、量子物理等）？

**2.2 核心概念的深度解析**

* **关键概念定义**：书中提出了哪些核心概念？这些概念的精确定义是什么？
* **概念之间的关系**：这些核心概念之间存在怎样的逻辑关系？如何相互支撑？
* **概念的学术溯源**：这些概念是作者原创还是源自他人？如有借鉴，来源是什么？

**2.3 用通俗比喻解释核心理论**

* **生活化比喻**：用一个通俗易懂的比喻来解释这个核心理论，让非专业读者也能理解。
* **类比说明**：通过类比的方式，将抽象理论具象化。
* **反例说明**：通过反面例子来说明理论的边界和适用范围。

---

### 第三部分：结构化深度导读 (约2000字)

**3.1 全书逻辑脉络分析**

* **目录结构分析**：分析全书的目录结构，作者是按照什么逻辑编排的？
  * 是从微观到宏观（如从行星到宫位到相位）？
  * 还是从理论到实操（如从原理到解盘步骤）？
  * 或者按照时间/历史脉络？
  * 或者是按照问题解决的逻辑顺序？
* **章节关联**：各章节之间存在怎样的逻辑关联？是否存在递进关系、并列关系或因果关系？
* **结构设计的优劣**：这种结构设计有什么优点？可能存在什么不足？

**3.2 关键部分模块化拆解**

将全书划分为5-7个关键部分（Module），每个部分总结其核心知识点：

**Module 1：XXX**
* 核心内容概述（约200字）
* 关键知识点清单（3-5个）
* 重点段落摘录与解读
* 与其他模块的关联

**Module 2：XXX**
* 核心内容概述（约200字）
* 关键知识点清单（3-5个）
* 重点段落摘录与解读
* 与其他模块的关联

（继续列出所有主要模块...）

**3.3 核心章节深度解读**

挑出书中最具价值的3-4个核心章节进行详细解读：

**重点章节 1：XXX**

* **章节定位**：这一章在全书中的位置和作用是什么？
* **核心观点**：这一章要传达的核心观点或发现是什么？
* **打破认知的观点**：这一章中有哪些打破常规认知的观点？这些观点为什么重要？
* **实践意义**：这一章的内容对实际应用有什么指导意义？
* **与其他章节的呼应**：这一章与其他章节存在怎样的呼应或补充关系？

**重点章节 2：XXX**
（同样格式的深度解读）

（继续更多核心章节...）

**3.4 知识体系图谱**

* **构建知识框架**：用文字描述构建这本书的知识框架图
* **核心概念网络**：描述核心概念之间的关联网络
* **学习路径建议**：根据知识结构，建议的学习路径是什么？

---

### 第四部分：方法论与实操工具 (约1500字)

**4.1 核心方法论提炼**

* **主要方法体系**：书中提出了哪些主要的方法论体系？
* **方法论原理**：每种方法背后的原理是什么？为什么这些方法有效？
* **方法论的适用范围**：这些方法适用于哪些场景？不适用于哪些场景？

**4.2 Step-by-Step 实操指南**

提炼书中可落地的具体方法、步骤或模型，以**Step-by-Step**的形式呈现：

**方法一：XXX法**

**适用场景**：XXX

**操作步骤**：

**Step 1：XXX**
* 具体操作说明
* 注意事项
* 常见错误

**Step 2：XXX**
* 具体操作说明
* 注意事项
* 常见错误

**Step 3：XXX**
* 具体操作说明
* 注意事项
* 常见错误

**Step 4：XXX**
* 具体操作说明
* 注意事项
* 常见错误

**验证方法**：如何验证操作是否正确？

**案例演示**：提供一个简短的应用案例

（继续更多方法...）

**4.3 实用工具与模型**

* **书中提供的工具**：书中提供了哪些实用工具、表格、模型或清单？
* **工具的使用方法**：这些工具应该如何使用？
* **工具的改良建议**：基于实践经验，这些工具可以如何改良？

**4.4 实践中的常见问题**

* **实操误区**：初学者在应用这些方法时容易犯哪些错误？
* **问题解决方案**：遇到这些问题时应该如何解决？
* **进阶建议**：掌握基础方法后，有哪些进阶技巧？

---

### 第五部分：经典名句与深层解读 (约1000字)

**5.1 经典金句摘录**

摘录书中5-8句最具洞察力、最具治愈力或最具启发性的原文/金句。

**金句 1**：
> "原文摘录..."

**深层解读**：
* **语境还原**：这句话在书中什么语境下出现？上下文是什么？
* **字面含义**：这句话的字面意思是什么？
* **深层含义**：这句话背后蕴含的深层含义是什么？为什么能触动人心？
* **实践意义**：这句话对实际学习和实践有什么指导意义？
* **个人感悟**：从个人角度，这句话为什么重要或动人？

**金句 2**：
（同样格式）

（继续更多金句...）

**5.2 核心思想提炼**

* **一句话总结**：用一句话总结这本书最核心的思想
* **思想溯源**：这个思想在占星学/相关领域中的位置和意义
* **思想的发展**：这个思想是否在书中不断发展？经历了怎样的变化？

---

### 第六部分：批判性思考与局限 (约1000字)

**6.1 时代的局限性**

* **时代背景**：这本书出版时的学术和行业背景是什么？
* **内容局限**：基于当今的认识，书中哪些内容可能已经过时或需要修正？
* **理论局限**：在理论层面，书中存在哪些局限或不完善之处？
* **方法局限**：在方法论层面，存在哪些局限或争议？

**6.2 争议与不同声音**

* **学术争议**：学术界或评论界对该书有哪些不同的声音或批评？
* **实践争议**：在实践中，是否存在对书中方法的争议或质疑？
* **作者回应**：作者对这些争议持什么态度？是否有回应？

**6.3 阅读的潜在误区**

* **初学者误区**：初学者在阅读时容易陷入哪些误区？
* **理解偏差**：读者可能对书中内容产生哪些理解偏差？
* **应用错误**：在应用书中方法时，容易犯哪些错误？

**6.4 与其他观点的对话**

* **同类书籍对比**：与同类书籍相比，这本书有什么不同？各自的优势是什么？
* **补充阅读建议**：读完这本书后，应该继续阅读哪些书籍来补充或深化？

---

### 第七部分：读者行动指南 (约1500字)

**7.1 分阶段学习计划**

设计一个**3-4阶段**的阅读或练习计划：

**阶段一：建立框架（约2-3周）**

* **目标**：建立对书籍整体框架的理解
* **任务**：
  * 通读全书，了解整体结构和主要观点
  * 制作思维导图，梳理知识框架
  * 记录阅读中的疑问和发现
* **产出**：完成全书框架思维导图 + 1000字读书笔记

**阶段二：深入重点（约3-4周）**

* **目标**：深入理解核心理论和方法
* **任务**：
  * 重點章节精读2-3遍
  * 尝试理解核心理论的推导过程
  * 做详细的阅读笔记
* **产出**：重点章节详细笔记 + 核心理论总结

**阶段三：实践验证（约4-6周）**

* **目标**：将书中方法应用于实际
* **任务**：
  * 选择1-2个方法进行实践
  * 记录实践过程中的问题和体会
  * 反思方法的有效性和局限性
* **产出**：实践报告 + 方法改良建议

**阶段四：整合深化（持续）**

* **目标**：将知识整合到自己的知识体系中
* **任务**：
  * 与其他书籍或知识进行关联
  * 形成自己的观点和理解
  * 持续实践和反思
* **产出**：个人学习总结 + 知识体系更新

**7.2 立即行动建议**

给读者一个**立刻可以执行的小建议**：

* **具体行动**：描述一个具体的、可立即执行的小行动
* **执行方法**：说明如何执行这个行动
* **预期收获**：说明执行后会有什么收获
* **持续建议**：之后应该如何继续？

**7.3 学习资源推荐**

* **配套资源**：与这本书配套的学习资源（网站、视频、工具等）
* **延伸阅读**：读完这本书后推荐阅读的相关书籍
* **社群与交流**：可以加入的学习社群或交流渠道

---

## 输出格式要求

1. 使用Markdown格式，标题层级分明（H1-H4）
2. 关键概念请标注英文原文（如有）
3. 论述详尽，每个部分都要有足够的深度和细节
4. 语言专业但易懂，像一位耐心的资深导师
5. 总字数约10000字（约5000-6000中文字符）

## 输出格式

请将拆解内容组织成以下JSON结构：

\`\`\`json
{
  "title": "书名",
  "author": "作者",
  "summary": "一句话核心价值（20字以内）",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "word_count": "约10000字",
  "sections": {
    "context": {
      "title": "1. 全局定位与背景",
      "subsections": {
        "position_and_influence": "书籍地位与影响力（详细论述）",
        "author_background": "作者背景与写作动机（详细论述）",
        "core_contribution": "核心贡献与创新突破（详细论述）"
      },
      "word_count_estimate": "约1500字"
    },
    "philosophy": {
      "title": "2. 核心哲学与理论基石",
      "subsections": {
        "underlying_logic": "贯穿全书的底层逻辑（详细论述）",
        "core_concepts": "核心概念的深度解析（详细论述）",
        "metaphor": "通俗比喻解释（详细论述）"
      },
      "word_count_estimate": "约1500字"
    },
    "structure": {
      "title": "3. 结构化深度导读",
      "subsections": {
        "logic_flow": "全书逻辑脉络分析（详细论述）",
        "modules": "关键部分模块化拆解（详细论述）",
        "key_chapters": "核心章节深度解读（详细论述）",
        "knowledge_map": "知识体系图谱（详细论述）"
      },
      "word_count_estimate": "约2000字"
    },
    "methodology": {
      "title": "4. 方法论与实操工具",
      "subsections": {
        "core_methodology": "核心方法论提炼（详细论述）",
        "step_by_step": "Step-by-Step实操指南（详细论述）",
        "practical_tools": "实用工具与模型（详细论述）",
        "common_issues": "实践中的常见问题（详细论述）"
      },
      "word_count_estimate": "约1500字"
    },
    "quotes": {
      "title": "5. 经典名句与深层解读",
      "subsections": {
        "golden_quotes": "经典金句摘录与解读（详细论述）",
        "core_thought": "核心思想提炼（详细论述）"
      },
      "word_count_estimate": "约1000字"
    },
    "criticism": {
      "title": "6. 批判性思考与局限",
      "subsections": {
        "limitations": "时代的局限性（详细论述）",
        "controversies": "争议与不同声音（详细论述）",
        "reading_pitfalls": "阅读的潜在误区（详细论述）",
        "comparison": "与其他观点的对话（详细论述）"
      },
      "word_count_estimate": "约1000字"
    },
    "action": {
      "title": "7. 读者行动指南",
      "subsections": {
        "learning_plan": "分阶段学习计划（详细论述）",
        "immediate_action": "立即行动建议（详细论述）",
        "resources": "学习资源推荐（详细论述）"
      },
      "word_count_estimate": "约1500字"
    }
  }
}
\`\`\`

请确保输出是**有效的JSON格式**，并保证每个部分的论述都详尽深入，达到约10000字的总字数要求。

**重要提示**：
- 请充分发挥你的专业知识和深度思考能力
- 不要泛泛而谈，要给出有见地的分析和评论
- 每个部分都要有足够的细节和深度
- 确保论述的逻辑性和连贯性`;
}

function buildEnhancedEnglishPrompt(
  title: string,
  author: string,
  field: string,
  audience: string
): string {
  return `# Role: ${field} Senior Expert & Senior Book Editor

# Task: Provide an **expert-level deep analysis and reading guide** for "${title}" by ${author}

## Target Audience

${audience}.

## Style Requirements

Professional yet accessible (in-depth but easy to understand), logically clear, and inspiring. Provide thorough and detailed analysis.

## Core Objective

Generate a **~10,000-word** deep analysis report that enables readers to:
1. Fully understand the book's core value and positioning
2. Master the core theories and methodologies in the book
3. Apply the book's knowledge in practice
4. Understand the book's limitations and applicable scenarios

## Detailed Analysis Framework (Output Format)

Please strictly follow these 7 parts for deep analysis, with each part thoroughly expanded:

---

### Part 1: Context & Background (approximately 1500 words)

**1.1 The Book's Position and Influence in ${field}**

* **Classic Status Assessment**: What is this book's position in the ${field} field? Is it a foundational work, groundbreaking work, or a comprehensive synthesis? Why?
* **Industry Impact**: How has this book influenced the entire field since its publication? Has it changed research directions or practical methods in the industry?
* **Reader Reception**: How do industry professionals and readers evaluate this book? Are there any famous reviews or citations?
* **Time Test**: How long has this book been published? Has its content stood the test of time?

**1.2 Author Background and Writing Motivation**

* **Academic and Professional Background**: What are the author's core credentials, educational background, and lineage? What important professional experiences do they have?
* **Writing Context**: Under what circumstances did the author write this book? What was the academic or industry background at the time?
* **Personal Experience Influence**: How has the author's personal experience (career transitions, life turning points, academic exploration, etc.) influenced the book's perspective and core arguments?
* **Author's Other Works**: What other related books has the author written? Where does this book stand in their body of work?

**1.3 Core Contributions and Innovations**

* **Pain Points Solved**: What core pain points or challenges in the field does this book address?
* **Innovations**: Compared to similar books or previous research, what are its greatest innovations or differences?
* **Theoretical Breakthroughs**: What important breakthroughs or new insights are there at the theoretical level?
* **Methodological Innovations**: What important contributions are there in practical methods or tools?

---

### Part 2: Core Philosophy and Theoretical Foundation (approximately 1500 words)

**2.1 Underlying Logic Throughout the Book**

* **Core Theoretical Framework**: Extract the **underlying logic** or **worldview** that runs through the entire book. This is not a simple listing of knowledge points, but the author's fundamental perspective on the subject.
* **Theoretical Assumptions**: What basic assumptions or premises does the author base their arguments on? Are these assumptions valid?
* **Philosophical Foundation**: What is the theoretical foundation of this book? Does it draw on philosophical ideas from other disciplines (such as Jungian psychology, mythology, quantum physics, etc.)?

**2.2 In-Depth Analysis of Core Concepts**

* **Key Concept Definitions**: What core concepts does the book introduce? What are the precise definitions of these concepts?
* **Relationships Between Concepts**: What logical relationships exist between these core concepts? How do they support each other?
* **Academic Origins of Concepts**: Are these concepts original to the author or borrowed from others? If borrowed, what are the sources?

**2.3 Explaining Core Theory Through Simple Metaphors**

* **Life Metaphor**: Use an easy-to-understand metaphor to explain this core theory, enabling non-specialist readers to grasp it.
* **Analogy Explanation**: Make abstract theories concrete through analogies.
* **Counterexample Explanation**: Illustrate the boundaries and applicable scope of the theory through counterexamples.

---

### Part 3: Structural Deep Reading (approximately 2000 words)

**3.1 Analysis of the Book's Logical Flow**

* **Table of Contents Structure Analysis**: Analyze the book's table of contents structure. What logic did the author follow?
  * From micro to macro (e.g., from planets to houses to aspects)?
  * From theory to practice (e.g., from principles to chart reading steps)?
  * According to chronological/historical context?
  * Or according to problem-solving logical sequence?
* **Chapter Connections**: What logical connections exist between chapters? Are there progressive, parallel, or causal relationships?
* **Structural Design Pros and Cons**: What are the advantages of this structural design? What potential shortcomings exist?

**3.2 Modular Breakdown of Key Sections**

Divide the book into 5-7 key modules, summarizing the core knowledge points of each:

**Module 1: XXX**
* Core content overview (~200 words)
* Key knowledge point list (3-5)
* Key passage excerpts and interpretation
* Connections with other modules

**Module 2: XXX**
* Core content overview (~200 words)
* Key knowledge point list (3-5)
* Key passage excerpts and interpretation
* Connections with other modules

(Continue listing all major modules...)

**3.3 In-Depth Interpretation of Core Chapters**

Select 3-4 most valuable core chapters for detailed interpretation:

**Key Chapter 1: XXX**

* **Chapter Positioning**: What is this chapter's position and role in the book?
* **Core Arguments**: What core argument or discovery does this chapter convey?
* **Paradigm-Shifting Insights**: What insights in this chapter challenge conventional understanding? Why are these insights important?
* **Practical Significance**: What guidance does this chapter's content provide for practical application?
* **Connections with Other Chapters**: What connections or complementary relationships exist between this chapter and others?

**Key Chapter 2: XXX**
(Same format in-depth interpretation)

(Continue more core chapters...)

**3.4 Knowledge Framework Map**

* **Building Knowledge Framework**: Describe the book's knowledge framework in text
* **Core Concept Network**: Describe the network of relationships between core concepts
* **Learning Path Suggestions**: Based on the knowledge structure, what learning path is recommended?

---

### Part 4: Methodology and Practical Tools (approximately 1500 words)

**4.1 Extraction of Core Methodologies**

* **Main Methodology Systems**: What main methodology systems does the book introduce?
* **Methodology Principles**: What are the principles behind each method? Why are these methods effective?
* **Methodology Scope**: What scenarios are these methods applicable to? What scenarios are they not suitable for?

**4.2 Step-by-Step Practical Guides**

Extract concrete methods, steps, or models that can be implemented, presented in **Step-by-Step** format:

**Method 1: XXX Method**

**Applicable Scenario**: XXX

**Operation Steps**:

**Step 1: XXX**
* Specific operation instructions
* Precautions
* Common mistakes

**Step 2: XXX**
* Specific operation instructions
* Precautions
* Common mistakes

**Step 3: XXX**
* Specific operation instructions
* Precautions
* Common mistakes

**Step 4: XXX**
* Specific operation instructions
* Precautions
* Common mistakes

**Verification Method**: How to verify if the operation is correct?

**Case Demonstration**: Provide a brief application case

(Continue more methods...)

**4.3 Practical Tools and Models**

* **Tools Provided in the Book**: What practical tools, tables, models, or checklists does the book provide?
* **How to Use These Tools**: How should these tools be used?
* **Improvement Suggestions**: Based on practical experience, how can these tools be improved?

**4.4 Common Issues in Practice**

* **Practical Pitfalls**: What mistakes do beginners easily make when applying these methods?
* **Problem Solutions**: How should these problems be solved when encountered?
* **Advanced Suggestions**: What advanced techniques are there after mastering basic methods?

---

### Part 5: Classic Quotes and Deep Interpretation (approximately 1000 words)

**5.1 Classic Quote Excerpts**

Extract 5-8 most insightful, healing, or inspiring original quotes from the book.

**Quote 1**:
> "Original quote..."

**In-Depth Interpretation**:
* **Context Restoration**: In what context does this sentence appear in the book? What is the surrounding context?
* **Literal Meaning**: What is the literal meaning of this sentence?
* **Deep Meaning**: What deep meaning lies behind this sentence? Why does it resonate?
* **Practical Significance**: What guidance does this sentence provide for actual learning and practice?
* **Personal Reflection**: Why is this sentence important or moving from a personal perspective?

**Quote 2**:
(Same format)

(Continue more quotes...)

**5.2 Extraction of Core Thoughts**

* **One-Sentence Summary**: Summarize the book's most core thought in one sentence
* **Thought's Position**: What is the position and significance of this thought in astrology/the related field?
* **Thought Development**: Does this thought continuously develop in the book? What kind of changes does it undergo?

---

### Part 6: Critical Analysis and Limitations (approximately 1000 words)

**6.1 Limitations of the Era**

* **Era Background**: What was the academic and industry background when this book was published?
* **Content Limitations**: Based on today's understanding, what content in the book may be outdated or require revision?
* **Theoretical Limitations**: What limitations or imperfections exist at the theoretical level?
* **Methodological Limitations**: What limitations or controversies exist at the methodological level?

**6.2 Controversies and Different Voices**

* **Academic Controversies**: What different voices or criticisms do academia or critics have regarding this book?
* **Practical Controversies**: In practice, are there controversies or doubts about the methods in the book?
* **Author's Response**: What is the author's attitude toward these controversies? Have they responded?

**6.3 Potential Reading Pitfalls**

* **Beginner Pitfalls**: What pitfalls do beginners easily fall into when reading?
* **Understanding Deviations**: What understanding deviations might readers have regarding the book's content?
* **Application Errors**: What mistakes are easily made when applying the book's methods?

**6.4 Dialogue with Other Perspectives**

* **Comparison with Similar Books**: Compared to similar books, how does this book differ? What are the respective advantages?
* **Supplementary Reading Suggestions**: After reading this book, which books should be read to supplement or deepen understanding?

---

### Part 7: Reader Action Plan (approximately 1500 words)

**7.1 Phased Learning Plan**

Design a **3-4 phase** reading or practice plan:

**Phase 1: Building Framework (approximately 2-3 weeks)**

* **Goal**: Build understanding of the book's overall framework
* **Tasks**:
  * Read through the entire book to understand overall structure and main arguments
  * Create mind maps to organize knowledge framework
  * Record questions and discoveries during reading
* **Outputs**: Complete book framework mind map + 1000-word reading notes

**Phase 2: Deep Dive into Key Points (approximately 3-4 weeks)**

* **Goal**: Deeply understand core theories and methods
* **Tasks**:
  * Intensive reading of key chapters 2-3 times
  * Try to understand the derivation process of core theories
  * Take detailed reading notes
* **Outputs**: Detailed notes on key chapters + summary of core theories

**Phase 3: Practical Verification (approximately 4-6 weeks)**

* **Goal**: Apply methods from the book in practice
* **Tasks**:
  * Select 1-2 methods for practice
  * Record problems and insights during practice
  * Reflect on the effectiveness and limitations of methods
* **Outputs**: Practice report + method improvement suggestions

**Phase 4: Integration and Deepening (ongoing)**

* **Goal**: Integrate knowledge into personal knowledge system
* **Tasks**:
  * Associate with knowledge from other books
  * Form personal perspectives and understanding
  * Continue practice and reflection
* **Outputs**: Personal learning summary + knowledge system updates

**7.2 Immediate Action Suggestion**

Give readers one **immediately actionable** suggestion:

* **Specific Action**: Describe a specific, immediately actionable small step
* **Execution Method**: Explain how to execute this action
* **Expected Outcome**: Explain what the outcome will be after execution
* **Continuous Suggestion**: How should one continue afterward?

**7.3 Learning Resource Recommendations**

* **Supporting Resources**: Learning resources accompanying this book (websites, videos, tools, etc.)
* **Further Reading**: Recommended related books to read after finishing this book
* **Communities and Exchanges**: Learning communities or exchange channels to join

---

## Output Format Requirements

1. Use Markdown format with clear heading hierarchy (H1-H4)
2. Mark key concepts with original English terms where applicable
3. Provide thorough and detailed analysis in each section
4. Language should be professional but understandable, like a patient senior mentor
5. Total word count approximately 10,000 words

## Output Format

Please organize the analysis content into the following JSON structure:

\`\`\`json
{
  "title": "Book Title",
  "author": "Author Name",
  "summary": "One-sentence core value (under 100 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "word_count": "approximately 10000 words",
  "sections": {
    "context": {
      "title": "1. Context & Background",
      "subsections": {
        "position_and_influence": "Book's Position and Influence (detailed discussion)",
        "author_background": "Author Background and Writing Motivation (detailed discussion)",
        "core_contribution": "Core Contributions and Innovations (detailed discussion)"
      },
      "word_count_estimate": "approximately 1500 words"
    },
    "philosophy": {
      "title": "2. Core Philosophy and Theoretical Foundation",
      "subsections": {
        "underlying_logic": "Underlying Logic Throughout the Book (detailed discussion)",
        "core_concepts": "In-Depth Analysis of Core Concepts (detailed discussion)",
        "metaphor": "Simple Metaphor Explanation (detailed discussion)"
      },
      "word_count_estimate": "approximately 1500 words"
    },
    "structure": {
      "title": "3. Structural Deep Reading",
      "subsections": {
        "logic_flow": "Book's Logical Flow Analysis (detailed discussion)",
        "modules": "Modular Breakdown of Key Sections (detailed discussion)",
        "key_chapters": "In-Depth Interpretation of Core Chapters (detailed discussion)",
        "knowledge_map": "Knowledge Framework Map (detailed discussion)"
      },
      "word_count_estimate": "approximately 2000 words"
    },
    "methodology": {
      "title": "4. Methodology and Practical Tools",
      "subsections": {
        "core_methodology": "Extraction of Core Methodologies (detailed discussion)",
        "step_by_step": "Step-by-Step Practical Guides (detailed discussion)",
        "practical_tools": "Practical Tools and Models (detailed discussion)",
        "common_issues": "Common Issues in Practice (detailed discussion)"
      },
      "word_count_estimate": "approximately 1500 words"
    },
    "quotes": {
      "title": "5. Classic Quotes and Deep Interpretation",
      "subsections": {
        "golden_quotes": "Classic Quote Excerpts and Interpretation (detailed discussion)",
        "core_thought": "Extraction of Core Thoughts (detailed discussion)"
      },
      "word_count_estimate": "approximately 1000 words"
    },
    "criticism": {
      "title": "6. Critical Analysis and Limitations",
      "subsections": {
        "limitations": "Limitations of the Era (detailed discussion)",
        "controversies": "Controversies and Different Voices (detailed discussion)",
        "reading_pitfalls": "Potential Reading Pitfalls (detailed discussion)",
        "comparison": "Dialogue with Other Perspectives (detailed discussion)"
      },
      "word_count_estimate": "approximately 1000 words"
    },
    "action": {
      "title": "7. Reader Action Plan",
      "subsections": {
        "learning_plan": "Phased Learning Plan (detailed discussion)",
        "immediate_action": "Immediate Action Suggestion (detailed discussion)",
        "resources": "Learning Resource Recommendations (detailed discussion)"
      },
      "word_count_estimate": "approximately 1500 words"
    }
  }
}
\`\`\`

Please ensure the output is **valid JSON format**, and ensure that each section provides thorough and in-depth discussion, achieving approximately 10,000 words total.

**Important Notes**:
- Please fully utilize your professional knowledge and deep thinking abilities
- Do not speak in generalities; provide insightful analysis and commentary
- Each section should have sufficient detail and depth
- Ensure logical coherence and consistency in the discussion`;
}

export default {
  buildEnhancedClassicBookPrompt,
};
