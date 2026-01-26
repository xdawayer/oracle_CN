// Script to populate wiki-classics-enhanced.ts from generated JSON files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GENERATED_DIR = path.join(__dirname, 'generated-reports');
const OUTPUT_FILE = path.join(__dirname, 'wiki-classics-enhanced.ts');

interface DeepAnalysis {
  title: string;
  author: string;
  summary: string;
  keywords: string[];
  word_count: string;
  sections: {
    context: {
      title: string;
      position_and_influence?: string;
      author_background?: string;
      core_contribution?: string;
    };
    philosophy: {
      title: string;
      underlying_logic?: string;
      core_concepts?: string;
      metaphor?: string;
    };
    structure: {
      title: string;
      logic_flow?: string;
      modules?: string | Array<{ name: string; content: string }>;
      key_chapters?: string | Array<{ topic: string; insight: string }>;
      knowledge_map?: string;
    };
    methodology: {
      title: string;
      core_methodology?: string;
      step_by_step?: string;
      practical_tools?: string;
      common_issues?: string;
    };
    quotes: {
      title: string;
      golden_quotes?: string | Array<{ quote: string; interpretation: string }>;
      core_thought?: string;
    };
    criticism: {
      title: string;
      limitations?: string;
      controversies?: string;
      reading_pitfalls?: string;
      comparison?: string;
    };
    action: {
      title: string;
      learning_plan?: string | Array<{ phase: string; task: string }>;
      immediate_action?: string;
      resources?: string;
    };
  };
}

interface WikiClassicEnhancedData {
  id: string;
  title: string;
  author: string;
  summary: string;
  cover_url: null;
  keywords: string[];
  stage: string;
  deep_analysis: string;
  generated_at: string;
}

// Book list data (hardcoded to avoid import issues)
const BOOK_STAGES: Record<string, string> = {
  'aspects-in-astrology': '第一阶段：奠基',
  'twelve-houses-sasportas': '第一阶段：奠基',
  'four-elements': '第一阶段：奠基',
  'chart-interpretation-handbook': '第一阶段：奠基',
  'inner-sky': '第一阶段：奠基',
  'twelve-houses-marks': '第一阶段：奠基',
  'saturn-new-look': '第二阶段：深化',
  'astrological-neptune': '第二阶段：深化',
  'pluto-evolutionary-journey': '第二阶段：深化',
  'chiron-healing-journey': '第二阶段：深化',
  'family-astrology': '第二阶段：深化',
  'astrology-karma-transformation': '第二阶段：深化',
  'relationships-life-cycles': '第二阶段：深化',
  'gods-of-change': '第二阶段：深化',
  'planets-in-transit': '第三阶段：技法',
  'predictive-astrology-eagle': '第三阶段：技法',
  'solar-arcs': '第三阶段：技法',
  'planets-in-composite': '第三阶段：技法',
  'synastry-davison': '第三阶段：技法',
  'progressed-moon': '第三阶段：技法',
  'hellenistic-astrology': '第四阶段：回溯',
  'ancient-astrology-vol1': '第四阶段：回溯',
  'ancient-astrology-vol2': '第四阶段：回溯',
  'christian-astrology': '第四阶段：回溯',
  'carmen-astrologicum': '第四阶段：回溯',
  'tetrabiblos': '第四阶段：回溯',
  'traditional-astrology-today': '第四阶段：回溯',
  'horary-textbook': '第四阶段：回溯',
  'real-astrology-applied': '第四阶段：回溯',
  'combination-stellar-influences': '第五阶段：专精',
  'electional-astrology': '第五阶段：专精',
  'mundane-astrology': '第五阶段：专精',
  'medical-astrology': '第五阶段：专精',
  'cosmos-psyche': '第六阶段：哲学',
  'pulse-of-life': '第六阶段：哲学',
  'jung-astrology': '第六阶段：哲学',
  'retrograde-planets': '补充书单',
  'book-of-moon': '补充书单',
  'vocational-astrology': '补充书单',
  'vettius-valens-anthology': '补充书单',
  'bonatti-astrology': '补充书单',
  'visual-astrology': '补充书单',
  'sabian-symbols': '补充书单',
  'planetary-cycles': '补充书单',
  'houses-temples-sky': '补充书单',
  'astrology-for-soul': '补充书单',
  'dynamics-aspect-analysis': '补充书单',
  'financial-astrology': '补充书单',
  'consulting-astrology': '补充书单',
  'manilius-astronomica': '补充书单',
  'astrology-personality': '补充书单',
};

function formatModules(modules: string | Array<{ name: string; content: string }> | undefined): string {
  if (!modules) return '';
  if (typeof modules === 'string') return modules;
  return modules.map(m => `▸ ${m.name}\n  ${m.content}`).join('\n\n');
}

function formatKeyChapters(chapters: string | Array<{ topic: string; insight: string }> | undefined): string {
  if (!chapters) return '';
  if (typeof chapters === 'string') return chapters;
  return chapters.map(c => `★ ${c.topic}\n  ${c.insight}`).join('\n\n');
}

function formatGoldenQuotes(quotes: string | Array<{ quote: string; interpretation: string }> | undefined): string {
  if (!quotes) return '';
  if (typeof quotes === 'string') return quotes;
  return quotes.map(q => `**${q.quote}**\n解读 ${q.interpretation}`).join('\n\n');
}

function formatLearningPlan(plan: string | Array<{ phase: string; task: string }> | undefined): string {
  if (!plan) return '';
  if (typeof plan === 'string') return plan;
  return plan.map(p => `▸ ${p.phase}: ${p.task}`).join('\n');
}

function getField(obj: any, path: string): string {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return '';
    current = current[part];
  }
  return (current as string) || '';
}

function loadBookDataSync(lang: string): Record<string, WikiClassicEnhancedData> {
  const result: Record<string, WikiClassicEnhancedData> = {};
  const files = fs.readdirSync(GENERATED_DIR).filter(f => f.endsWith(`_${lang}.json`));

  for (const file of files) {
    const bookId = file.replace(`_${lang}.json`, '');
    const filePath = path.join(GENERATED_DIR, file);

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const data = JSON.parse(content) as DeepAnalysis;

      // Convert to the required format
      const deepAnalysisStr = JSON.stringify({
        title: data.title,
        author: data.author,
        summary: data.summary,
        keywords: data.keywords,
        word_count: data.word_count,
        sections: {
          context: {
            title: data.sections.context.title,
            position_and_influence: data.sections.context.position_and_influence || '',
            author_background: data.sections.context.author_background || '',
            core_contribution: data.sections.context.core_contribution || '',
          },
          philosophy: {
            title: data.sections.philosophy.title,
            underlying_logic: data.sections.philosophy.underlying_logic || '',
            core_concepts: data.sections.philosophy.core_concepts || '',
            metaphor: data.sections.philosophy.metaphor || '',
          },
          structure: {
            title: data.sections.structure.title,
            logic_flow: data.sections.structure.logic_flow || '',
            modules: formatModules(data.sections.structure.modules),
            key_chapters: formatKeyChapters(data.sections.structure.key_chapters),
            knowledge_map: data.sections.structure.knowledge_map || '',
          },
          methodology: {
            title: data.sections.methodology.title,
            core_methodology: data.sections.methodology.core_methodology || '',
            step_by_step: data.sections.methodology.step_by_step || '',
            practical_tools: data.sections.methodology.practical_tools || '',
            common_issues: data.sections.methodology.common_issues || '',
          },
          quotes: {
            title: data.sections.quotes.title,
            golden_quotes: formatGoldenQuotes(data.sections.quotes.golden_quotes),
            core_thought: data.sections.quotes.core_thought || '',
          },
          criticism: {
            title: data.sections.criticism.title,
            limitations: data.sections.criticism.limitations || '',
            controversies: data.sections.criticism.controversies || '',
            reading_pitfalls: data.sections.criticism.reading_pitfalls || '',
            comparison: data.sections.criticism.comparison || '',
          },
          action: {
            title: data.sections.action.title,
            learning_plan: formatLearningPlan(data.sections.action.learning_plan),
            immediate_action: data.sections.action.immediate_action || '',
            resources: data.sections.action.resources || '',
          },
        },
      });

      result[bookId] = {
        id: bookId,
        title: data.title,
        author: data.author,
        summary: data.summary,
        cover_url: null,
        keywords: data.keywords,
        stage: BOOK_STAGES[bookId] || '补充书单',
        deep_analysis: deepAnalysisStr,
        generated_at: new Date().toISOString(),
      };

      console.log(`✓ Loaded ${bookId} (${lang})`);
    } catch (e) {
      console.error(`✗ Failed to load ${file}:`, e);
    }
  }

  return result;
}

function main() {
  console.log('Loading Chinese reports...');
  const zhData = loadBookDataSync('zh');

  console.log('\nLoading English reports...');
  const enData = loadBookDataSync('en');

  const output = `// AUTO-GENERATED: Enhanced Classic Book Reports
// Generated at: ${new Date().toISOString()}
// Total books: ${Object.keys(zhData).length} Chinese + ${Object.keys(enData).length} English

export interface WikiClassicEnhanced {
  id: string;
  title: string;
  author: string;
  summary: string;
  cover_url: string | null;
  keywords: string[];
  stage: string;
  lang?: string;
  deep_analysis: string;
  generated_at: string;
}

export const WIKI_CLASSICS_ENHANCED_ZH: Record<string, WikiClassicEnhanced> = ${JSON.stringify(zhData, null, 2)};

export const WIKI_CLASSICS_ENHANCED_EN: Record<string, WikiClassicEnhanced> = ${JSON.stringify(enData, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`\n✅ Saved to: ${OUTPUT_FILE}`);
}

main();
